/**
 * LoggingService - Manages logging channels and posts formatted embeds
 */

import { PrismaClient } from '@prisma/client';
import { Client, EmbedBuilder, TextChannel, ChannelType } from 'discord.js';
import { EmbedColors } from '../types';

export class LoggingService {
  private cache: Map<string, { modChannel?: string; securityChannel?: string }> = new Map();

  constructor(
    private prisma: PrismaClient,
    private client: Client
  ) {
    this.setupNotificationListeners();
  }

  /**
   * Setup Postgres NOTIFY listeners (PostgreSQL only)
   */
  private async setupNotificationListeners(): Promise<void> {
    // Skip for SQLite - LISTEN is PostgreSQL only
    return;
  }

  /**
   * Set mod log channel
   */
  async setModChannel(guildId: string, channelId: string): Promise<void> {
    await this.prisma.guildLogging.upsert({
      where: { guildId },
      create: {
        guildId,
        modChannel: channelId,
      },
      update: {
        modChannel: channelId,
      },
    });

    // Invalidate cache
    this.cache.delete(guildId);

    // Emit NOTIFY
    await this.notifyLoggingChange(guildId);
  }

  /**
   * Set security log channel
   */
  async setSecurityChannel(guildId: string, channelId: string): Promise<void> {
    await this.prisma.guildLogging.upsert({
      where: { guildId },
      create: {
        guildId,
        securityChannel: channelId,
      },
      update: {
        securityChannel: channelId,
      },
    });

    // Invalidate cache
    this.cache.delete(guildId);

    // Emit NOTIFY
    await this.notifyLoggingChange(guildId);
  }

  /**
   * Get logging configuration
   */
  async getConfig(guildId: string): Promise<{ modChannel?: string; securityChannel?: string }> {
    // Check cache
    if (this.cache.has(guildId)) {
      return this.cache.get(guildId)!;
    }

    // Fetch from database
    const config = await this.prisma.guildLogging.findUnique({
      where: { guildId },
    });

    const result = {
      modChannel: config?.modChannel ?? undefined,
      securityChannel: config?.securityChannel ?? undefined,
    };

    // Cache it
    this.cache.set(guildId, result);
    return result;
  }

  /**
   * Log to mod channel
   */
  async logMod(guildId: string, embed: EmbedBuilder): Promise<boolean> {
    const config = await this.getConfig(guildId);
    if (!config.modChannel) {
      return false;
    }

    return await this.sendToChannel(config.modChannel, embed);
  }

  /**
   * Log to security channel
   */
  async logSecurity(guildId: string, embed: EmbedBuilder): Promise<boolean> {
    const config = await this.getConfig(guildId);
    if (!config.securityChannel) {
      return false;
    }

    return await this.sendToChannel(config.securityChannel, embed);
  }

  /**
   * Log moderation action
   */
  async logModeration(
    guildId: string,
    data: {
      action: string;
      target: { tag: string; id: string };
      moderator: { tag: string; id: string };
      reason: string;
      caseNumber?: number;
      duration?: string;
    }
  ): Promise<boolean> {
    const embed = new EmbedBuilder()
      .setTitle(`🔨 ${data.action}`)
      .setColor(EmbedColors.MODERATION)
      .addFields(
        { name: 'Target', value: `${data.target.tag} (${data.target.id})`, inline: true },
        { name: 'Moderator', value: `${data.moderator.tag} (${data.moderator.id})`, inline: true },
        { name: 'Reason', value: data.reason, inline: false }
      )
      .setTimestamp();

    if (data.caseNumber) {
      embed.addFields({ name: 'Case', value: `#${data.caseNumber}`, inline: true });
    }

    if (data.duration) {
      embed.addFields({ name: 'Duration', value: data.duration, inline: true });
    }

    return await this.logMod(guildId, embed);
  }

  /**
   * Send embed to a channel
   */
  private async sendToChannel(channelId: string, embed: EmbedBuilder): Promise<boolean> {
    try {
      const channel = await this.client.channels.fetch(channelId);
      
      if (!channel || channel.type !== ChannelType.GuildText) {
        return false;
      }

      await (channel as TextChannel).send({ embeds: [embed] });
      return true;
    } catch (error) {
      console.error(`Failed to send to channel ${channelId}:`, error);
      return false;
    }
  }

  /**
   * Create security action embed
   */
  createSecurityActionEmbed(data: {
    title: string;
    executorId: string;
    executorTag: string;
    action: string;
    limit?: number;
    count?: number;
    punishment?: string;
    caseId?: number;
  }): EmbedBuilder {
    const embed = new EmbedBuilder()
      .setTitle(data.title)
      .setColor(EmbedColors.SECURITY)
      .addFields(
        { name: 'Executor', value: `<@${data.executorId}> (${data.executorTag})\nID: ${data.executorId}`, inline: false },
        { name: 'Action', value: data.action, inline: true }
      )
      .setTimestamp();

    if (data.limit !== undefined) {
      embed.addFields({ name: 'Limit', value: data.limit.toString(), inline: true });
    }

    if (data.count !== undefined) {
      embed.addFields({ name: 'Count', value: data.count.toString(), inline: true });
    }

    if (data.punishment) {
      embed.addFields({ name: 'Punishment', value: data.punishment.toUpperCase(), inline: true });
    }

    if (data.caseId) {
      embed.addFields({ name: 'Case ID', value: `#${data.caseId}`, inline: true });
    }

    return embed;
  }

  /**
   * Create mod action embed
   */
  createModActionEmbed(data: {
    title: string;
    targetId: string;
    targetTag: string;
    moderatorId: string;
    moderatorTag: string;
    action: string;
    reason?: string;
    caseId?: number;
  }): EmbedBuilder {
    const embed = new EmbedBuilder()
      .setTitle(data.title)
      .setColor(EmbedColors.MODERATION)
      .addFields(
        { name: 'Target', value: `<@${data.targetId}> (${data.targetTag})\nID: ${data.targetId}`, inline: false },
        { name: 'Moderator', value: `<@${data.moderatorId}> (${data.moderatorTag})`, inline: false },
        { name: 'Action', value: data.action, inline: true }
      )
      .setTimestamp();

    if (data.reason) {
      embed.addFields({ name: 'Reason', value: data.reason, inline: false });
    }

    if (data.caseId) {
      embed.addFields({ name: 'Case ID', value: `#${data.caseId}`, inline: true });
    }

    return embed;
  }

  /**
   * Notify logging change (PostgreSQL only)
   */
  private async notifyLoggingChange(guildId: string): Promise<void> {
    // Skip for SQLite - NOTIFY is PostgreSQL only
    return;
  }

  /**
   * Reload cache for a guild
   */
  async reloadGuildCache(guildId: string): Promise<void> {
    this.cache.delete(guildId);
    await this.getConfig(guildId);
  }
}
