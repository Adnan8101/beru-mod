/**
 * Quarantine Command - Quarantine/unquarantine members and setup
 */

import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ChannelType,
  PermissionsBitField,
} from 'discord.js';
import { PrismaClient } from '@prisma/client';
import { EmbedColors } from '../../types';
import { CustomEmojis } from '../../utils/emoji';
import { canModerate, botCanModerate } from '../../utils/moderation';
import { ModerationService } from '../../services/ModerationService';
import { CaseService } from '../../services/CaseService';
import { LoggingService } from '../../services/LoggingService';

export const data = new SlashCommandBuilder()
  .setName('quarantine')
  .setDescription('Manage quarantine system')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
  .addSubcommand(subcommand =>
    subcommand
      .setName('setup')
      .setDescription('Setup quarantine system')
      .addRoleOption(option =>
        option
          .setName('role')
          .setDescription('Role to assign when quarantined')
          .setRequired(true)
      )
      .addChannelOption(option =>
        option
          .setName('channel')
          .setDescription('Channel quarantined users can access')
          .setRequired(true)
          .addChannelTypes(ChannelType.GuildText)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('add')
      .setDescription('Quarantine a member')
      .addUserOption(option =>
        option
          .setName('user')
          .setDescription('Member to quarantine')
          .setRequired(true)
      )
      .addStringOption(option =>
        option
          .setName('reason')
          .setDescription('Reason for quarantine')
          .setRequired(false)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('remove')
      .setDescription('Remove member from quarantine')
      .addUserOption(option =>
        option
          .setName('user')
          .setDescription('Member to unquarantine')
          .setRequired(true)
      )
      .addStringOption(option =>
        option
          .setName('reason')
          .setDescription('Reason for removal')
          .setRequired(false)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('config')
      .setDescription('View quarantine configuration')
  );

export async function execute(
  interaction: ChatInputCommandInteraction,
  services: {
    moderationService: ModerationService;
    caseService: CaseService;
    loggingService: LoggingService;
  }
): Promise<void> {
  const subcommand = interaction.options.getSubcommand();

  switch (subcommand) {
    case 'setup':
      await handleSetup(interaction, services);
      break;
    case 'add':
      await handleAdd(interaction, services);
      break;
    case 'remove':
      await handleRemove(interaction, services);
      break;
    case 'config':
      await handleConfig(interaction, services);
      break;
  }
}

async function handleSetup(
  interaction: ChatInputCommandInteraction,
  services: { moderationService: ModerationService }
): Promise<void> {
  await interaction.deferReply();

  const role = interaction.options.getRole('role', true);
  const channel = interaction.options.getChannel('channel', true);
  const guild = interaction.guild!;

  // Validate role
  if (role.id === guild.roles.everyone.id) {
    await interaction.editReply({
      content: '❌ Cannot use @everyone role for quarantine.',
    });
    return;
  }

  const botMember = guild.members.me!;
  if (role.position >= botMember.roles.highest.position) {
    await interaction.editReply({
      content: '❌ Quarantine role must be below my highest role.',
    });
    return;
  }

  // Save configuration
  await services.moderationService.setupQuarantine(guild.id, role.id, channel.id);

  // Auto-configure role permissions
  try {
    // Get all channels
    const channels = await guild.channels.fetch();
    
    // Hide all channels from quarantine role
    for (const [channelId, guildChannel] of channels) {
      if (!guildChannel) continue;
      
      try {
        if ('permissionOverwrites' in guildChannel) {
          await guildChannel.permissionOverwrites.create(role.id, {
            ViewChannel: false,
            SendMessages: false,
            Connect: false,
          });
        }
      } catch (err) {
        console.error(`Failed to configure channel ${channelId}:`, err);
      }
    }

    // Allow access to the designated channel
    const accessChannel = await guild.channels.fetch(channel.id);
    if (accessChannel && 'permissionOverwrites' in accessChannel) {
      await accessChannel.permissionOverwrites.create(role.id, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true,
      });
    }

    const embed = new EmbedBuilder()
      .setTitle('<:tcet_tick:1437995479567962184> Quarantine System Configured')
      .setDescription('Quarantine system has been set up successfully with automatic permissions.')
      .setColor(EmbedColors.SUCCESS)
      .addFields(
        { name: 'Quarantine Role', value: `${role}`, inline: true },
        { name: 'Access Channel', value: `${channel}`, inline: true },
        {
          name: 'Configuration',
          value:
            '✓ All channels hidden from quarantine role\n' +
            '✓ Access channel configured for quarantined users',
          inline: false,
        }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (error: any) {
    await interaction.editReply({
      content: `⚠️ Configuration saved but failed to set permissions: ${error.message}`,
    });
  }
}

async function handleAdd(
  interaction: ChatInputCommandInteraction,
  services: {
    moderationService: ModerationService;
    caseService: CaseService;
    loggingService: LoggingService;
  }
): Promise<void> {
  await interaction.deferReply();

  const user = interaction.options.getUser('user', true);
  const reason = interaction.options.getString('reason') || 'No reason provided';
  const guild = interaction.guild!;
  const moderator = interaction.member as any;

  // Get quarantine config
  const config = await services.moderationService.getQuarantineConfig(guild.id);
  if (!config) {
    await interaction.editReply({
      content: '❌ Quarantine system is not configured. Use `/quarantine setup` first.',
    });
    return;
  }

  // Get member
  let target;
  try {
    target = await guild.members.fetch(user.id);
  } catch {
    await interaction.editReply({
      content: '❌ User is not a member of this server.',
    });
    return;
  }

  // Check permissions
  const moderatorCheck = canModerate(moderator, target, PermissionFlagsBits.ManageRoles);
  if (!moderatorCheck.allowed) {
    await interaction.editReply({
      content: `❌ ${moderatorCheck.reason}`,
    });
    return;
  }

  const botCheck = botCanModerate(guild.members.me!, target, PermissionFlagsBits.ManageRoles);
  if (!botCheck.allowed) {
    await interaction.editReply({
      content: `❌ ${botCheck.reason}`,
    });
    return;
  }

  // Check if already quarantined
  if (target.roles.cache.has(config.roleId)) {
    await interaction.editReply({
      content: '❌ This member is already quarantined.',
    });
    return;
  }

  // Add quarantine role
  try {
    await target.roles.add(config.roleId, reason);

    const embed = new EmbedBuilder()
      .setTitle('<:tcet_tick:1437995479567962184> Member Quarantined')
      .setDescription(`${target.user.tag} has been quarantined.`)
      .setColor(EmbedColors.SUCCESS)
      .addFields(
        { name: 'User', value: `${target.user.tag} (${target.id})`, inline: true },
        { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
        { name: 'Reason', value: reason, inline: false }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

    // Log case
    const modCase = await services.caseService.createCase({
      guildId: guild.id,
      targetId: target.id,
      moderatorId: interaction.user.id,
      action: 'quarantine',
      reason,
    });

    // Send to logging channel
    await services.loggingService.logModeration(guild.id, {
      action: 'Quarantine',
      target: target.user,
      moderator: interaction.user,
      reason,
      caseNumber: modCase.caseNumber,
    });
  } catch (error: any) {
    await interaction.editReply({
      content: `❌ Failed to quarantine member: ${error.message}`,
    });
  }
}

async function handleRemove(
  interaction: ChatInputCommandInteraction,
  services: {
    moderationService: ModerationService;
    caseService: CaseService;
    loggingService: LoggingService;
  }
): Promise<void> {
  await interaction.deferReply();

  const user = interaction.options.getUser('user', true);
  const reason = interaction.options.getString('reason') || 'No reason provided';
  const guild = interaction.guild!;

  // Get quarantine config
  const config = await services.moderationService.getQuarantineConfig(guild.id);
  if (!config) {
    await interaction.editReply({
      content: '❌ Quarantine system is not configured.',
    });
    return;
  }

  // Get member
  let target;
  try {
    target = await guild.members.fetch(user.id);
  } catch {
    await interaction.editReply({
      content: '❌ User is not a member of this server.',
    });
    return;
  }

  // Check if quarantined
  if (!target.roles.cache.has(config.roleId)) {
    await interaction.editReply({
      content: '❌ This member is not quarantined.',
    });
    return;
  }

  // Remove quarantine role
  try {
    await target.roles.remove(config.roleId, reason);

    const embed = new EmbedBuilder()
      .setTitle('<:tcet_tick:1437995479567962184> Member Unquarantined')
      .setDescription(`${target.user.tag} has been removed from quarantine.`)
      .setColor(EmbedColors.SUCCESS)
      .addFields(
        { name: 'User', value: `${target.user.tag} (${target.id})`, inline: true },
        { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
        { name: 'Reason', value: reason, inline: false }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

    // Log case
    const modCase = await services.caseService.createCase({
      guildId: guild.id,
      targetId: target.id,
      moderatorId: interaction.user.id,
      action: 'unquarantine',
      reason,
    });

    // Send to logging channel
    await services.loggingService.logModeration(guild.id, {
      action: 'Unquarantine',
      target: target.user,
      moderator: interaction.user,
      reason,
      caseNumber: modCase.caseNumber,
    });
  } catch (error: any) {
    await interaction.editReply({
      content: `❌ Failed to remove quarantine: ${error.message}`,
    });
  }
}

async function handleConfig(
  interaction: ChatInputCommandInteraction,
  services: { moderationService: ModerationService }
): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const guild = interaction.guild!;
  const config = await services.moderationService.getQuarantineConfig(guild.id);

  if (!config) {
    await interaction.editReply({
      content: '❌ Quarantine system is not configured. Use `/quarantine setup` to configure it.',
    });
    return;
  }

  const role = guild.roles.cache.get(config.roleId);
  const channel = guild.channels.cache.get(config.accessChannelId);

  const embed = new EmbedBuilder()
    .setTitle('📋 Quarantine Configuration')
    .setColor(EmbedColors.INFO)
    .addFields(
      { name: 'Quarantine Role', value: role ? `${role}` : `Unknown (${config.roleId})`, inline: true },
      {
        name: 'Access Channel',
        value: channel ? `${channel}` : `Unknown (${config.accessChannelId})`,
        inline: true,
      }
    )
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}
