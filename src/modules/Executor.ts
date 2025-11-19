/**
 * Executor - Enforces punishments and cleanup actions
 */

import { PrismaClient } from '@prisma/client';
import { Client, Guild, GuildMember, PermissionsBitField } from 'discord.js';
import { PunishmentType, SecurityEvent } from '../types';
import { ConfigService } from '../services/ConfigService';
import { CaseService } from '../services/CaseService';
import { LoggingService } from '../services/LoggingService';

export class Executor {
  // Track locks per guild+executor to prevent duplicate punishments
  private activeLocks: Set<string> = new Set();

  constructor(
    private prisma: PrismaClient,
    private client: Client,
    private configService: ConfigService,
    private caseService: CaseService,
    private loggingService: LoggingService
  ) {}

  /**
   * Execute punishment for a security event
   */
  async executePunishment(event: SecurityEvent, count: number, limit: number): Promise<void> {
    const lockKey = `${event.guildId}:${event.userId}`;

    // Check if already processing this executor
    if (this.activeLocks.has(lockKey)) {
      console.log(`Skipping duplicate punishment for ${lockKey}`);
      return;
    }

    try {
      // Acquire lock
      this.activeLocks.add(lockKey);

      // Skip advisory locks for SQLite (PostgreSQL feature)
      // In production with PostgreSQL, enable pg_try_advisory_lock

      // Get punishment configuration (default to BAN if not configured)
      let punishmentConfig = await this.configService.getPunishment(event.guildId, event.action);
      
      if (!punishmentConfig) {
        console.log(`No punishment configured for ${event.action} in guild ${event.guildId}, defaulting to BAN`);
        // Default punishment: BAN
        punishmentConfig = {
          action: event.action,
          punishment: PunishmentType.BAN,
        };
      }

      // Fetch guild and member
      const guild = await this.client.guilds.fetch(event.guildId);
      const member = await guild.members.fetch(event.userId).catch(() => null);

      if (!member) {
        console.log(`Member ${event.userId} not found in guild ${event.guildId}`);
        return;
      }

      // Safety check: don't punish guild owner
      if (member.id === guild.ownerId) {
        console.log(`Skipping punishment for guild owner ${member.id}`);
        return;
      }

      // Safety check: don't punish if bot can't (role hierarchy)
      if (!this.canPunishMember(guild, member)) {
        console.log(`Cannot punish ${member.id} due to role hierarchy`);
        return;
      }

      // Execute punishment
      let success = false;
      let reason = `Anti-Nuke: ${event.action} limit exceeded (${count}/${limit})`;

      switch (punishmentConfig.punishment) {
        case PunishmentType.BAN:
          success = await this.banMember(guild, member, reason);
          break;
        case PunishmentType.KICK:
          success = await this.kickMember(guild, member, reason);
          break;
        case PunishmentType.TIMEOUT:
          success = await this.timeoutMember(guild, member, reason, punishmentConfig.durationSeconds ?? 600);
          break;
      }

      if (success) {
        // Create case
        const modCase = await this.caseService.createCase({
          guildId: event.guildId,
          targetId: event.userId,
          moderatorId: this.client.user!.id,
          action: punishmentConfig.punishment,
          reason,
          metadata: {
            antiNuke: true,
            triggerAction: event.action,
            count,
            limit,
            auditLogId: event.auditLogId,
          },
        });

        // Log to security channel
        const embed = this.loggingService.createSecurityActionEmbed({
          title: '🚨 Anti-Nuke Action — User Punished',
          executorId: event.userId,
          executorTag: member.user.tag,
          action: event.action,
          limit,
          count,
          punishment: punishmentConfig.punishment,
          caseId: modCase.caseNumber,
        });

        await this.loggingService.logSecurity(event.guildId, embed);
      }

      // Lock released by in-memory lock timeout
    } finally {
      // Remove in-memory lock
      this.activeLocks.delete(lockKey);
    }
  }

  /**
   * Ban a member
   */
  private async banMember(guild: Guild, member: GuildMember, reason: string): Promise<boolean> {
    try {
      await guild.members.ban(member, { reason });
      return true;
    } catch (error) {
      console.error(`Failed to ban ${member.id}:`, error);
      return false;
    }
  }

  /**
   * Kick a member
   */
  private async kickMember(guild: Guild, member: GuildMember, reason: string): Promise<boolean> {
    try {
      await member.kick(reason);
      return true;
    } catch (error) {
      console.error(`Failed to kick ${member.id}:`, error);
      return false;
    }
  }

  /**
   * Timeout a member
   */
  private async timeoutMember(
    guild: Guild,
    member: GuildMember,
    reason: string,
    durationSeconds: number
  ): Promise<boolean> {
    try {
      const timeoutUntil = new Date(Date.now() + durationSeconds * 1000);
      await member.timeout(timeoutUntil.getTime() - Date.now(), reason);
      return true;
    } catch (error) {
      console.error(`Failed to timeout ${member.id}:`, error);
      return false;
    }
  }

  /**
   * Check if bot can punish a member (role hierarchy check)
   */
  private canPunishMember(guild: Guild, member: GuildMember): boolean {
    const botMember = guild.members.me;
    if (!botMember) return false;

    // Check if bot has required permissions
    if (!botMember.permissions.has(PermissionsBitField.Flags.BanMembers)) {
      return false;
    }

    // Check role hierarchy
    if (member.roles.highest.position >= botMember.roles.highest.position) {
      return false;
    }

    return true;
  }

  /**
   * Kick all bots (used for ADD_BOTS protection)
   */
  async kickRecentBots(guildId: string, exceptBotId?: string): Promise<number> {
    try {
      const guild = await this.client.guilds.fetch(guildId);
      const members = await guild.members.fetch();
      
      let kickCount = 0;
      const now = Date.now();
      const fiveMinutesAgo = now - 5 * 60 * 1000;

      for (const [_, member] of members) {
        if (
          member.user.bot &&
          member.id !== this.client.user!.id &&
          member.id !== exceptBotId &&
          member.joinedTimestamp &&
          member.joinedTimestamp > fiveMinutesAgo
        ) {
          try {
            await member.kick('Anti-Nuke: Unauthorized bot addition');
            kickCount++;
          } catch (error) {
            console.error(`Failed to kick bot ${member.id}:`, error);
          }
        }
      }

      return kickCount;
    } catch (error) {
      console.error(`Failed to kick bots in guild ${guildId}:`, error);
      return 0;
    }
  }

  /**
   * Remove dangerous roles from a user
   */
  async removeDangerousRoles(guildId: string, userId: string): Promise<number> {
    try {
      const guild = await this.client.guilds.fetch(guildId);
      const member = await guild.members.fetch(userId);
      
      let removeCount = 0;

      for (const [_, role] of member.roles.cache) {
        if (
          role.permissions.has(PermissionsBitField.Flags.Administrator) ||
          role.permissions.has(PermissionsBitField.Flags.ManageGuild) ||
          role.permissions.has(PermissionsBitField.Flags.ManageRoles)
        ) {
          try {
            await member.roles.remove(role, 'Anti-Nuke: Dangerous role detected');
            removeCount++;
          } catch (error) {
            console.error(`Failed to remove role ${role.id}:`, error);
          }
        }
      }

      return removeCount;
    } catch (error) {
      console.error(`Failed to remove dangerous roles from ${userId}:`, error);
      return 0;
    }
  }
}
