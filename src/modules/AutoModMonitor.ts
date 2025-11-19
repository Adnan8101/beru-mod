/**
 * AutoMod Monitor - Real-time message monitoring for automod features
 */

import { Message, Client, GuildMember, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { AutoModService } from '../services/AutoModService';
import { ModerationService } from '../services/ModerationService';
import { EmbedColors } from '../types';
import { CustomEmojis } from '../utils/emoji';

export class AutoModMonitor {
  private messageCache: Map<string, { count: number; timestamps: number[]; lines: number }> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor(
    private client: Client,
    private autoModService: AutoModService,
    private moderationService: ModerationService
  ) {
    this.setupMessageListener();
    
    // Cleanup old cache entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanupCache();
    }, 60000);
    
    console.log('<:tcet_tick:1437995479567962184> AutoMod Monitor initialized');
  }

  private setupMessageListener() {
    this.client.on('messageCreate', async (message: Message) => {
      // Ignore bots and DMs
      if (message.author.bot || !message.guild) return;

      const guildId = message.guild.id;
      const userId = message.author.id;
      const channelId = message.channel.id;

      try {
        // Check anti-spam
        await this.checkAntiSpam(message, guildId, userId);

        // Check mass mentions
        await this.checkMassMention(message, guildId, userId);

        // Check server invites
        await this.checkServerInvite(message, guildId, userId, channelId);

        // Check anti-link
        await this.checkAntiLink(message, guildId, userId, channelId);
      } catch (error) {
        console.error('AutoMod error:', error);
      }
    });
  }

  private async checkAntiSpam(message: Message, guildId: string, userId: string) {
    const config = await this.autoModService.getConfig(guildId, 'anti_spam');
    if (!config?.enabled) return;

    // Check if user/role/channel is whitelisted
    if (await this.isWhitelisted(guildId, 'anti_spam', userId, message.member!, message.channel.id)) {
      return;
    }

    const cacheKey = `${guildId}:${userId}`;
    const now = Date.now();
    const timeSpan = config.timeSpanMs || 5000;
    
    let cache = this.messageCache.get(cacheKey);
    if (!cache) {
      cache = { count: 0, timestamps: [], lines: 0 };
      this.messageCache.set(cacheKey, cache);
    }

    // Remove old timestamps outside time window
    cache.timestamps = cache.timestamps.filter(ts => now - ts < timeSpan);
    
    // Add current message
    cache.timestamps.push(now);
    cache.count = cache.timestamps.length;
    
    // Count lines in current message
    const currentLines = (message.content.match(/\n/g) || []).length + 1;

    // Check violations
    const maxMessages = config.maxMessages || 5;
    const maxLines = config.maxLines || 10;

    if (cache.count > maxMessages) {
      await this.handleViolation(
        message,
        config.punishmentType || 'timeout',
        config.actionType || 'delete',
        `Anti-spam: ${cache.count} messages in ${timeSpan / 1000}s`
      );
      // Clear cache after action
      this.messageCache.delete(cacheKey);
    } else if (currentLines > maxLines) {
      await this.handleViolation(
        message,
        config.punishmentType || 'timeout',
        config.actionType || 'delete',
        `Anti-spam: ${currentLines} lines in single message`
      );
      // Clear cache after action
      this.messageCache.delete(cacheKey);
    }
  }

  private async checkMassMention(message: Message, guildId: string, userId: string) {
    const config = await this.autoModService.getConfig(guildId, 'mass_mention');
    if (!config?.enabled) return;

    // Check if whitelisted
    if (await this.isWhitelisted(guildId, 'mass_mention', userId, message.member!, message.channel.id)) {
      return;
    }

    const mentions = message.mentions.users.size + message.mentions.roles.size;
    const maxMentions = config.maxMentions || 5;

    if (mentions > maxMentions) {
      await this.handleViolation(
        message,
        config.punishmentType || 'timeout',
        config.actionType || 'delete',
        `Mass mention violation (${mentions} mentions)`
      );
    }
  }

  private async checkServerInvite(message: Message, guildId: string, userId: string, channelId: string) {
    const config = await this.autoModService.getConfig(guildId, 'server_invite');
    if (!config?.enabled) return;

    // Check if whitelisted
    if (await this.isWhitelisted(guildId, 'server_invite', userId, message.member!, channelId)) {
      return;
    }

    // Precise regex for Discord invite links (all official Discord invite formats)
    const inviteRegex = /(?:https?:\/\/)?(?:www\.)?(?:discord\.(?:gg|io|me|li|com)\/(?:invite\/)?|discordapp\.com\/invite\/|discord\.com\/invite\/)[a-zA-Z0-9-]{2,32}/gi;
    
    if (inviteRegex.test(message.content)) {
      await this.handleViolation(
        message,
        config.punishmentType || 'kick',
        config.actionType || 'delete',
        'Server invite link detected'
      );
    }
  }

  private async checkAntiLink(message: Message, guildId: string, userId: string, channelId: string) {
    const config = await this.autoModService.getConfig(guildId, 'anti_link');
    if (!config?.enabled) return;

    // Check if whitelisted
    if (await this.isWhitelisted(guildId, 'anti_link', userId, message.member!, channelId)) {
      return;
    }

    // Check if it's a Discord invite first - if so, skip anti-link check
    // (Server invite feature will handle it if enabled)
    const inviteRegex = /(?:https?:\/\/)?(?:www\.)?(?:discord\.(?:gg|io|me|li|com)\/(?:invite\/)?|discordapp\.com\/invite\/|discord\.com\/invite\/)[a-zA-Z0-9-]{2,32}/gi;
    if (inviteRegex.test(message.content)) {
      return; // Let server_invite feature handle Discord invites
    }

    // Precise regex for external URLs (proper http://, https://, or www. prefix)
    // This matches:
    // - https://example.com
    // - http://example.com  
    // - www.example.com
    // But NOT: example.com (without protocol or www)
    const urlRegex = /(?:https?:\/\/[^\s]+)|(?:www\.[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?)/gi;
    
    if (urlRegex.test(message.content)) {
      await this.handleViolation(
        message,
        config.punishmentType || 'timeout',
        config.actionType || 'delete',
        'External link detected'
      );
    }
  }

  private async isWhitelisted(
    guildId: string,
    feature: string,
    userId: string,
    member: GuildMember | null,
    channelId: string
  ): Promise<boolean> {
    // Always whitelist administrators and moderators
    if (member && (member.permissions.has('Administrator') || member.permissions.has('ManageGuild'))) {
      return true;
    }

    // Get all whitelists (feature-specific + global)
    const allWhitelists = await this.autoModService.getAllWhitelists(guildId, feature);

    // Check user whitelist
    if (allWhitelists.some((w: any) => w.targetType === 'user' && w.targetId === userId)) {
      return true;
    }

    // Check role whitelist
    if (member) {
      for (const roleId of member.roles.cache.keys()) {
        if (allWhitelists.some((w: any) => w.targetType === 'role' && w.targetId === roleId)) {
          return true;
        }
      }
    }

    // Check channel whitelist (if whitelisted, all messages in that channel are ignored)
    if (allWhitelists.some((w: any) => w.targetType === 'channel' && w.targetId === channelId)) {
      return true;
    }

    return false;
  }

  private async handleViolation(
    message: Message,
    punishment: string,
    actionType: string,
    reason: string
  ) {
    const member = message.member;
    if (!member) return;

    const botMember = message.guild!.members.me;
    if (!botMember) return;

    try {
      // Handle action type (delete, warn, or delete & warn)
      switch (actionType) {
        case 'delete':
          await message.delete().catch(() => {});
          await this.takePunishment(message, member, botMember, punishment, reason);
          break;

        case 'warn':
          await this.warnUser(message, member, reason);
          break;

        case 'delete_warn':
          await message.delete().catch(() => {});
          await this.warnUser(message, member, reason);
          await this.takePunishment(message, member, botMember, punishment, reason);
          break;

        default:
          await message.delete().catch(() => {});
          await this.takePunishment(message, member, botMember, punishment, reason);
      }

      // Send simple punishment notification (auto-deletes after 5 seconds)
      await this.sendPunishmentNotification(message, member, reason, actionType);
    } catch (error) {
      console.error('Failed to handle automod violation:', error);
    }
  }

  private async sendPunishmentNotification(
    message: Message,
    member: GuildMember,
    reason: string,
    actionType: string
  ) {
    try {
      if (!message.channel.isSendable()) return;

      const embed = new EmbedBuilder()
        .setColor(0xff6b6b)
        .setTitle(`${CustomEmojis.CAUTION} User Punished`)
        .setDescription(
          `${CustomEmojis.USER} **Name:** ${member.user.tag}\n` +
          `${CustomEmojis.FILES} **Rule Break:** ${reason}\n` +
          `${CustomEmojis.SETTING} **Action:** ${actionType.replace('_', ' & ')}`
        )
        .setTimestamp();

      const notificationMsg = await message.channel.send({ embeds: [embed] });

      // Auto-delete after 5 seconds
      setTimeout(() => {
        notificationMsg.delete().catch(() => {});
      }, 5000);
    } catch (error) {
      console.error('Failed to send punishment notification:', error);
    }
  }



  private async warnUser(message: Message, member: GuildMember, reason: string) {
    try {
      // Add warning using moderation service
      await this.moderationService.addWarn(
        message.guild!.id,
        member.id,
        this.client.user!.id,
        `AutoMod: ${reason}`
      );

      // Get warn count
      const warnCount = await this.moderationService.getWarnCount(
        message.guild!.id,
        member.id
      );

      // Try to DM the user
      try {
        await member.send(
          `⚠️ **Warning in ${message.guild!.name}**\n\n` +
          `**Reason:** ${reason}\n` +
          `**Total Warnings:** ${warnCount}\n\n` +
          `Please follow the server rules to avoid further action.`
        );
      } catch {
        // DM failed, ignore
      }
    } catch (error) {
      console.error('Failed to warn user:', error);
    }
  }

  private async takePunishment(
    message: Message,
    member: GuildMember,
    botMember: GuildMember,
    punishment: string,
    reason: string
  ) {
    try {
      // Try to DM the user before punishment
      const dmSent = await this.tryDMUser(member, punishment, reason);

      switch (punishment) {
        case 'timeout':
          if (botMember.permissions.has('ModerateMembers') && !member.permissions.has('Administrator')) {
            await member.timeout(10 * 60 * 1000, `AutoMod: ${reason}`); // 10 minutes
          }
          break;

        case 'kick':
          if (botMember.permissions.has('KickMembers') && member.kickable) {
            await member.kick(`AutoMod: ${reason}`);
          }
          break;

        case 'ban':
          if (botMember.permissions.has('BanMembers') && member.bannable) {
            await member.ban({ reason: `AutoMod: ${reason}` });
          }
          break;
      }
    } catch (error) {
      console.error('Failed to take punishment:', error);
    }
  }

  private async tryDMUser(member: GuildMember, punishment: string, reason: string): Promise<boolean> {
    try {
      let message = `⚠️ **AutoMod Action in ${member.guild.name}**\n\n`;
      message += `**Action:** ${punishment}\n`;
      message += `**Reason:** ${reason}\n\n`;
      
      if (punishment === 'timeout') {
        message += `You have been timed out for 10 minutes. Please follow server rules.`;
      } else if (punishment === 'kick') {
        message += `You have been kicked from the server. You can rejoin, but please follow the rules.`;
      } else if (punishment === 'ban') {
        message += `You have been banned from the server.`;
      }

      await member.send(message);
      return true;
    } catch {
      return false;
    }
  }

  private cleanupCache() {
    const now = Date.now();
    const maxAge = 60000; // 1 minute

    for (const [key, cache] of this.messageCache.entries()) {
      if (cache.timestamps.length === 0 || now - cache.timestamps[cache.timestamps.length - 1] > maxAge) {
        this.messageCache.delete(key);
      }
    }
  }

  public destroy() {
    clearInterval(this.cleanupInterval);
  }
}
