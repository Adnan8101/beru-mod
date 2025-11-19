/**
 * Channel Moderation Commands - Lock, unlock, hide, unhide, slowmode
 */

import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ChannelType,
  TextChannel,
  PermissionsBitField,
} from 'discord.js';
import { EmbedColors } from '../../types';
import { CustomEmojis } from '../../utils/emoji';
import { parseDuration, formatDuration } from '../../utils/moderation';
import { LoggingService } from '../../services/LoggingService';

export const data = new SlashCommandBuilder()
  .setName('channel')
  .setDescription('Channel moderation commands')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
  .addSubcommand(subcommand =>
    subcommand
      .setName('lock')
      .setDescription('Lock a channel (prevent @everyone from sending messages)')
      .addChannelOption(option =>
        option
          .setName('channel')
          .setDescription('Channel to lock (defaults to current)')
          .setRequired(false)
          .addChannelTypes(ChannelType.GuildText)
      )
      .addStringOption(option =>
        option
          .setName('reason')
          .setDescription('Reason for locking')
          .setRequired(false)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('unlock')
      .setDescription('Unlock a channel')
      .addChannelOption(option =>
        option
          .setName('channel')
          .setDescription('Channel to unlock (defaults to current)')
          .setRequired(false)
          .addChannelTypes(ChannelType.GuildText)
      )
      .addStringOption(option =>
        option
          .setName('reason')
          .setDescription('Reason for unlocking')
          .setRequired(false)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('hide')
      .setDescription('Hide a channel from @everyone')
      .addChannelOption(option =>
        option
          .setName('channel')
          .setDescription('Channel to hide (defaults to current)')
          .setRequired(false)
          .addChannelTypes(ChannelType.GuildText)
      )
      .addStringOption(option =>
        option
          .setName('reason')
          .setDescription('Reason for hiding')
          .setRequired(false)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('unhide')
      .setDescription('Unhide a channel')
      .addChannelOption(option =>
        option
          .setName('channel')
          .setDescription('Channel to unhide (defaults to current)')
          .setRequired(false)
          .addChannelTypes(ChannelType.GuildText)
      )
      .addStringOption(option =>
        option
          .setName('reason')
          .setDescription('Reason for unhiding')
          .setRequired(false)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('slowmode')
      .setDescription('Set slowmode for a channel')
      .addStringOption(option =>
        option
          .setName('duration')
          .setDescription('Slowmode duration (e.g., 5s, 10s, 1m) or 0 to disable')
          .setRequired(true)
      )
      .addChannelOption(option =>
        option
          .setName('channel')
          .setDescription('Channel to set slowmode (defaults to current)')
          .setRequired(false)
          .addChannelTypes(ChannelType.GuildText)
      )
      .addStringOption(option =>
        option
          .setName('reason')
          .setDescription('Reason for slowmode')
          .setRequired(false)
      )
  );

export async function execute(
  interaction: ChatInputCommandInteraction,
  services: { loggingService: LoggingService }
): Promise<void> {
  const subcommand = interaction.options.getSubcommand();

  switch (subcommand) {
    case 'lock':
      await handleLock(interaction, services);
      break;
    case 'unlock':
      await handleUnlock(interaction, services);
      break;
    case 'hide':
      await handleHide(interaction, services);
      break;
    case 'unhide':
      await handleUnhide(interaction, services);
      break;
    case 'slowmode':
      await handleSlowmode(interaction, services);
      break;
  }
}

async function handleLock(
  interaction: ChatInputCommandInteraction,
  services: { loggingService: LoggingService }
): Promise<void> {
  await interaction.deferReply();

  const channel =
    (interaction.options.getChannel('channel') as TextChannel) || (interaction.channel as TextChannel);
  const reason = interaction.options.getString('reason') || 'No reason provided';
  const guild = interaction.guild!;

  try {
    await channel.permissionOverwrites.edit(guild.roles.everyone, {
      SendMessages: false,
    });

    const embed = new EmbedBuilder()
      .setTitle('🔒 Channel Locked')
      .setDescription(`${channel} has been locked.`)
      .setColor(EmbedColors.SUCCESS)
      .addFields(
        { name: 'Channel', value: `${channel}`, inline: true },
        { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
        { name: 'Reason', value: reason, inline: false }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

    // Send notification in channel
    await channel.send({
      embeds: [
        new EmbedBuilder()
          .setDescription(`🔒 This channel has been locked by ${interaction.user}.`)
          .setColor(EmbedColors.WARNING),
      ],
    });
  } catch (error: any) {
    await interaction.editReply({
      content: `❌ Failed to lock channel: ${error.message}`,
    });
  }
}

async function handleUnlock(
  interaction: ChatInputCommandInteraction,
  services: { loggingService: LoggingService }
): Promise<void> {
  await interaction.deferReply();

  const channel =
    (interaction.options.getChannel('channel') as TextChannel) || (interaction.channel as TextChannel);
  const reason = interaction.options.getString('reason') || 'No reason provided';
  const guild = interaction.guild!;

  try {
    await channel.permissionOverwrites.edit(guild.roles.everyone, {
      SendMessages: null,
    });

    const embed = new EmbedBuilder()
      .setTitle('🔓 Channel Unlocked')
      .setDescription(`${channel} has been unlocked.`)
      .setColor(EmbedColors.SUCCESS)
      .addFields(
        { name: 'Channel', value: `${channel}`, inline: true },
        { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
        { name: 'Reason', value: reason, inline: false }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

    // Send notification in channel
    await channel.send({
      embeds: [
        new EmbedBuilder()
          .setDescription(`🔓 This channel has been unlocked by ${interaction.user}.`)
          .setColor(EmbedColors.SUCCESS),
      ],
    });
  } catch (error: any) {
    await interaction.editReply({
      content: `❌ Failed to unlock channel: ${error.message}`,
    });
  }
}

async function handleHide(
  interaction: ChatInputCommandInteraction,
  services: { loggingService: LoggingService }
): Promise<void> {
  await interaction.deferReply();

  const channel =
    (interaction.options.getChannel('channel') as TextChannel) || (interaction.channel as TextChannel);
  const reason = interaction.options.getString('reason') || 'No reason provided';
  const guild = interaction.guild!;

  try {
    await channel.permissionOverwrites.edit(guild.roles.everyone, {
      ViewChannel: false,
    });

    const embed = new EmbedBuilder()
      .setTitle('👁️ Channel Hidden')
      .setDescription(`${channel} has been hidden from @everyone.`)
      .setColor(EmbedColors.SUCCESS)
      .addFields(
        { name: 'Channel', value: `${channel}`, inline: true },
        { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
        { name: 'Reason', value: reason, inline: false }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (error: any) {
    await interaction.editReply({
      content: `❌ Failed to hide channel: ${error.message}`,
    });
  }
}

async function handleUnhide(
  interaction: ChatInputCommandInteraction,
  services: { loggingService: LoggingService }
): Promise<void> {
  await interaction.deferReply();

  const channel =
    (interaction.options.getChannel('channel') as TextChannel) || (interaction.channel as TextChannel);
  const reason = interaction.options.getString('reason') || 'No reason provided';
  const guild = interaction.guild!;

  try {
    await channel.permissionOverwrites.edit(guild.roles.everyone, {
      ViewChannel: null,
    });

    const embed = new EmbedBuilder()
      .setTitle('👁️ Channel Unhidden')
      .setDescription(`${channel} is now visible to @everyone.`)
      .setColor(EmbedColors.SUCCESS)
      .addFields(
        { name: 'Channel', value: `${channel}`, inline: true },
        { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
        { name: 'Reason', value: reason, inline: false }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (error: any) {
    await interaction.editReply({
      content: `❌ Failed to unhide channel: ${error.message}`,
    });
  }
}

async function handleSlowmode(
  interaction: ChatInputCommandInteraction,
  services: { loggingService: LoggingService }
): Promise<void> {
  await interaction.deferReply();

  const durationStr = interaction.options.getString('duration', true);
  const channel =
    (interaction.options.getChannel('channel') as TextChannel) || (interaction.channel as TextChannel);
  const reason = interaction.options.getString('reason') || 'No reason provided';

  // Parse duration
  let duration: number;
  if (durationStr === '0' || durationStr === '0s') {
    duration = 0;
  } else {
    const parsed = parseDuration(durationStr);
    if (!parsed) {
      await interaction.editReply({
        content: '❌ Invalid duration format. Use formats like: 5s, 10s, 1m or 0 to disable',
      });
      return;
    }
    duration = Math.floor(parsed / 1000); // Convert to seconds
  }

  // Max 6 hours (21600 seconds)
  if (duration > 21600) {
    await interaction.editReply({
      content: '❌ Slowmode duration cannot exceed 6 hours.',
    });
    return;
  }

  try {
    await channel.setRateLimitPerUser(duration, reason);

    const embed = new EmbedBuilder()
      .setTitle(duration === 0 ? '⏱️ Slowmode Disabled' : '⏱️ Slowmode Enabled')
      .setDescription(
        duration === 0
          ? `Slowmode has been disabled in ${channel}.`
          : `Slowmode set to ${formatDuration(duration * 1000)} in ${channel}.`
      )
      .setColor(EmbedColors.SUCCESS)
      .addFields(
        { name: 'Channel', value: `${channel}`, inline: true },
        { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
        { name: 'Duration', value: duration === 0 ? 'Disabled' : formatDuration(duration * 1000), inline: true },
        { name: 'Reason', value: reason, inline: false }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (error: any) {
    await interaction.editReply({
      content: `❌ Failed to set slowmode: ${error.message}`,
    });
  }
}
