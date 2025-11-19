/**
 * Help Command - Universal help system with category dropdown
 */

import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ComponentType,
} from 'discord.js';
import { EmbedColors } from '../types';
import { CustomEmojis } from '../utils/emoji';
import { GuildConfigService } from '../services/GuildConfigService';

export const data = new SlashCommandBuilder()
  .setName('help')
  .setDescription('View bot commands and features');

const commandCategories = {
  antinuke: {
    name: 'Anti-Nuke Protection',
    emoji: CustomEmojis.CAUTION,
    description: 'Protect your server from raids and malicious actions',
    commands: [
      {
        name: 'antinuke',
        description: 'Enable/disable anti-nuke protection',
        permission: 'Administrator',
        syntax: '/antinuke <enable|disable|status>',
        example: '/antinuke enable',
      },
      {
        name: 'setlimit',
        description: 'Configure action limits for anti-nuke',
        permission: 'Administrator',
        syntax: '/setlimit <action> <limit>',
        example: '/setlimit ban_members 3',
      },
      {
        name: 'setpunishment',
        description: 'Set punishment for anti-nuke violations',
        permission: 'Administrator',
        syntax: '/setpunishment <action> <punishment>',
        example: '/setpunishment ban_members ban',
      },
      {
        name: 'whitelist',
        description: 'Manage anti-nuke whitelist',
        permission: 'Administrator',
        syntax: '/whitelist <add_user|add_role|remove_user|remove_role|view|list>',
        example: '/whitelist add_user @user all',
      },
    ],
  },
  moderation: {
    name: 'Moderation Tools',
    emoji: CustomEmojis.STAFF,
    description: 'Comprehensive member moderation commands',
    commands: [
      {
        name: 'ban',
        description: 'Ban a member from the server',
        permission: 'Ban Members',
        syntax: '/ban <user> [reason] [delete_days]',
        example: '/ban @user raiding',
      },
      {
        name: 'unban',
        description: 'Unban a user from the server',
        permission: 'Ban Members',
        syntax: '/unban <user_id> [reason]',
        example: '/unban 123456789 appealed',
      },
      {
        name: 'kick',
        description: 'Kick a member from the server',
        permission: 'Kick Members',
        syntax: '/kick <user> [reason]',
        example: '/kick @user spamming',
      },
      {
        name: 'mute',
        description: 'Timeout a member',
        permission: 'Moderate Members',
        syntax: '/mute <user> <duration> [reason]',
        example: '/mute @user 10m spamming',
      },
      {
        name: 'unmute',
        description: 'Remove timeout from a member',
        permission: 'Moderate Members',
        syntax: '/unmute <user> [reason]',
        example: '/unmute @user',
      },
      {
        name: 'warn',
        description: 'Issue a warning to a member',
        permission: 'Moderate Members',
        syntax: '/warn <user> [reason]',
        example: '/warn @user breaking rules',
      },
      {
        name: 'checkwarn',
        description: 'View warnings for a member',
        permission: 'Moderate Members',
        syntax: '/checkwarn <user>',
        example: '/checkwarn @user',
      },
      {
        name: 'softban',
        description: 'Ban and immediately unban to clear messages',
        permission: 'Ban Members',
        syntax: '/softban <user> [reason]',
        example: '/softban @user spam',
      },
      {
        name: 'purge',
        description: 'Bulk delete messages',
        permission: 'Manage Messages',
        syntax: '/purge <all|bots|human> <amount>',
        example: '/purge bots 50',
      },
      {
        name: 'nick',
        description: 'Change a member\'s nickname',
        permission: 'Manage Nicknames',
        syntax: '/nick <user> [nickname] [reason]',
        example: '/nick @user NewName',
      },
      {
        name: 'role',
        description: 'Add or remove a role from a member',
        permission: 'Manage Roles',
        syntax: '/role <user> <role> [reason]',
        example: '/role @user @VIP',
      },
    ],
  },
  channels: {
    name: 'Channel Management',
    emoji: CustomEmojis.CHANNEL,
    description: 'Lock, unlock, hide, and manage channels',
    commands: [
      {
        name: 'channel lock',
        description: 'Lock a channel to prevent messages',
        permission: 'Manage Channels',
        syntax: '/channel lock [channel] [reason]',
        example: '/channel lock #general raid',
      },
      {
        name: 'channel unlock',
        description: 'Unlock a previously locked channel',
        permission: 'Manage Channels',
        syntax: '/channel unlock [channel] [reason]',
        example: '/channel unlock #general',
      },
      {
        name: 'channel hide',
        description: 'Hide a channel from @everyone',
        permission: 'Manage Channels',
        syntax: '/channel hide [channel] [reason]',
        example: '/channel hide #staff',
      },
      {
        name: 'channel unhide',
        description: 'Unhide a previously hidden channel',
        permission: 'Manage Channels',
        syntax: '/channel unhide [channel] [reason]',
        example: '/channel unhide #general',
      },
      {
        name: 'channel slowmode',
        description: 'Set slowmode for a channel',
        permission: 'Manage Channels',
        syntax: '/channel slowmode [channel] <duration> [reason]',
        example: '/channel slowmode #chat 5s',
      },
      {
        name: 'nuke',
        description: 'Clone and delete a channel (nuke)',
        permission: 'Manage Channels',
        syntax: '/nuke',
        example: '/nuke',
      },
    ],
  },
  automod: {
    name: 'AutoMod System',
    emoji: CustomEmojis.SETTING,
    description: 'Automated moderation with anti-spam, anti-link, and more',
    commands: [
      {
        name: 'automod setup',
        description: 'Configure automod features interactively',
        permission: 'Manage Server',
        syntax: '/automod setup',
        example: '/automod setup',
      },
      {
        name: 'automod edit',
        description: 'Edit existing automod configuration',
        permission: 'Manage Server',
        syntax: '/automod edit',
        example: '/automod edit',
      },
      {
        name: 'automod disable',
        description: 'Disable all automod features',
        permission: 'Manage Server',
        syntax: '/automod disable',
        example: '/automod disable',
      },
    ],
  },
  logging: {
    name: 'Logging System',
    emoji: CustomEmojis.LOGGING,
    description: 'Track server events and moderation actions',
    commands: [
      {
        name: 'logging enable',
        description: 'Enable server audit logging',
        permission: 'Manage Server',
        syntax: '/logging enable <channel>',
        example: '/logging enable #logs',
      },
      {
        name: 'logging disable',
        description: 'Disable server logging',
        permission: 'Manage Server',
        syntax: '/logging disable',
        example: '/logging disable',
      },
      {
        name: 'logging status',
        description: 'View current logging configuration',
        permission: 'Manage Server',
        syntax: '/logging status',
        example: '/logging status',
      },
      {
        name: 'logs',
        description: 'View server audit logs',
        permission: 'Manage Server',
        syntax: '/logs [type] [limit]',
        example: '/logs member_ban 10',
      },
      {
        name: 'modlogs',
        description: 'Configure moderation logs channel',
        permission: 'Manage Server',
        syntax: '/modlogs <channel>',
        example: '/modlogs #mod-logs',
      },
    ],
  },
  autoresponder: {
    name: 'Auto Responder',
    emoji: CustomEmojis.FILES,
    description: 'Create automated message responses',
    commands: [
      {
        name: 'autoresponder add',
        description: 'Add a new autoresponder',
        permission: 'Manage Server',
        syntax: '/autoresponder add <trigger> <response>',
        example: '/autoresponder add hello Hi there!',
      },
      {
        name: 'autoresponder delete',
        description: 'Remove an autoresponder',
        permission: 'Manage Server',
        syntax: '/autoresponder delete <trigger>',
        example: '/autoresponder delete hello',
      },
      {
        name: 'autoresponder edit',
        description: 'Edit an existing autoresponder',
        permission: 'Manage Server',
        syntax: '/autoresponder edit <trigger>',
        example: '/autoresponder edit hello',
      },
      {
        name: 'autoresponder list',
        description: 'List all autoresponders',
        permission: 'Manage Server',
        syntax: '/autoresponder list',
        example: '/autoresponder list',
      },
      {
        name: 'autoresponder toggle',
        description: 'Enable or disable an autoresponder',
        permission: 'Manage Server',
        syntax: '/autoresponder toggle <trigger>',
        example: '/autoresponder toggle hello',
      },
    ],
  },
  quarantine: {
    name: 'Quarantine System',
    emoji: CustomEmojis.USER,
    description: 'Isolate suspicious members',
    commands: [
      {
        name: 'quarantine setup',
        description: 'Setup quarantine system',
        permission: 'Manage Roles',
        syntax: '/quarantine setup <role> <channel>',
        example: '/quarantine setup @Quarantined #quarantine',
      },
      {
        name: 'quarantine add',
        description: 'Quarantine a member',
        permission: 'Manage Roles',
        syntax: '/quarantine add <user> [reason]',
        example: '/quarantine add @user suspicious',
      },
      {
        name: 'quarantine remove',
        description: 'Remove a member from quarantine',
        permission: 'Manage Roles',
        syntax: '/quarantine remove <user> [reason]',
        example: '/quarantine remove @user',
      },
      {
        name: 'quarantine status',
        description: 'View quarantine system status',
        permission: 'Manage Roles',
        syntax: '/quarantine status',
        example: '/quarantine status',
      },
    ],
  },
  utility: {
    name: 'Utility Commands',
    emoji: '⚙️',
    description: 'General server utilities',
    commands: [
      {
        name: 'setprefix',
        description: 'Change the bot prefix',
        permission: 'Manage Server',
        syntax: '/setprefix <new_prefix>',
        example: '/setprefix !',
      },
      {
        name: 'server',
        description: 'View detailed server information',
        permission: 'None',
        syntax: '/server',
        example: '/server',
      },
      {
        name: 'help',
        description: 'View this help menu',
        permission: 'None',
        syntax: '/help',
        example: '/help',
      },
    ],
  },
};

export async function execute(
  interaction: ChatInputCommandInteraction,
  services: { guildConfigService: GuildConfigService }
) {
  const prefix = await services.guildConfigService.getPrefix(interaction.guild!.id);

  const mainEmbed = new EmbedBuilder()
    .setColor(EmbedColors.INFO)
    .setTitle(`${CustomEmojis.SETTING} Bot Help & Commands`)
    .setDescription(
      `Welcome to the help menu! Select a category below to view commands.\n\n` +
      `**Current Prefix:** \`${prefix}\`\n` +
      `**Total Commands:** 45+\n\n` +
      `Use slash commands (\`/\`) or prefix commands (\`${prefix}\`)`
    )
    .addFields(
      { name: `${CustomEmojis.CAUTION} Anti-Nuke`, value: 'Server protection', inline: true },
      { name: `${CustomEmojis.STAFF} Moderation`, value: 'Member management', inline: true },
      { name: `${CustomEmojis.CHANNEL} Channels`, value: 'Channel control', inline: true },
      { name: `${CustomEmojis.SETTING} AutoMod`, value: 'Auto moderation', inline: true },
      { name: `${CustomEmojis.LOGGING} Logging`, value: 'Event logs', inline: true },
      { name: `${CustomEmojis.FILES} Auto Responder`, value: 'Auto replies', inline: true },
      { name: `${CustomEmojis.USER} Quarantine`, value: 'Member isolation', inline: true },
      { name: '⚙️ Utility', value: 'Server utilities', inline: true }
    )
    .setFooter({ text: 'Select a category from the dropdown below' })
    .setTimestamp();

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`help_category_${interaction.user.id}`)
    .setPlaceholder('🔍 Select a category to view commands')
    .addOptions([
      {
        label: 'Anti-Nuke Protection',
        value: 'antinuke',
        description: 'Server raid protection & whitelist',
        emoji: CustomEmojis.CAUTION,
      },
      {
        label: 'Moderation Tools',
        value: 'moderation',
        description: 'Ban, kick, warn, mute members',
        emoji: CustomEmojis.STAFF,
      },
      {
        label: 'Channel Management',
        value: 'channels',
        description: 'Lock, unlock, hide channels',
        emoji: CustomEmojis.CHANNEL,
      },
      {
        label: 'AutoMod System',
        value: 'automod',
        description: 'Anti-spam, anti-link automation',
        emoji: CustomEmojis.SETTING,
      },
      {
        label: 'Logging System',
        value: 'logging',
        description: 'Track events & mod actions',
        emoji: CustomEmojis.LOGGING,
      },
      {
        label: 'Auto Responder',
        value: 'autoresponder',
        description: 'Automated message responses',
        emoji: CustomEmojis.FILES,
      },
      {
        label: 'Quarantine System',
        value: 'quarantine',
        description: 'Isolate suspicious members',
        emoji: CustomEmojis.USER,
      },
      {
        label: 'Utility Commands',
        value: 'utility',
        description: 'Server info & settings',
        emoji: '⚙️',
      },
    ]);

  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

  const response = await interaction.reply({
    embeds: [mainEmbed],
    components: [row],
  });

  // Handle category selection
  const collector = response.createMessageComponentCollector({
    filter: i => i.user.id === interaction.user.id && i.customId === `help_category_${interaction.user.id}`,
    time: 300000, // 5 minutes
    componentType: ComponentType.StringSelect,
  });

  collector.on('collect', async (i) => {
    const category = commandCategories[i.values[0] as keyof typeof commandCategories];

    const categoryEmbed = new EmbedBuilder()
      .setColor(EmbedColors.INFO)
      .setTitle(`${category.emoji} ${category.name}`)
      .setDescription(category.description + '\n');

    // Add commands to embed
    for (const cmd of category.commands) {
      categoryEmbed.addFields({
        name: `\`${cmd.name}\``,
        value:
          `**Description:** ${cmd.description}\n` +
          `**Permission:** ${cmd.permission}\n` +
          `**Syntax:** \`${cmd.syntax}\`\n` +
          `**Example:** \`${cmd.example}\``,
        inline: false,
      });
    }

    categoryEmbed.setFooter({ text: `Prefix: ${prefix} | Select another category from dropdown` });
    categoryEmbed.setTimestamp();

    await i.update({ embeds: [categoryEmbed], components: [row] });
  });

  collector.on('end', () => {
    interaction.editReply({ components: [] }).catch(() => {});
  });
}
