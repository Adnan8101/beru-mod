/**
 * Logs Command - Configure logging channels
 */

import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ChannelType,
  TextChannel,
} from 'discord.js';
import { LoggingService } from '../../services/LoggingService';
import { EmbedColors } from '../../types';

export const data = new SlashCommandBuilder()
  .setName('logs')
  .setDescription('Configure logging channels')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand(subcommand =>
    subcommand
      .setName('mod')
      .setDescription('Set moderation log channel')
      .addChannelOption(option =>
        option
          .setName('channel')
          .setDescription('Channel for moderation logs')
          .setRequired(true)
          .addChannelTypes(ChannelType.GuildText)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('security')
      .setDescription('Set security log channel')
      .addChannelOption(option =>
        option
          .setName('channel')
          .setDescription('Channel for security/anti-nuke logs')
          .setRequired(true)
          .addChannelTypes(ChannelType.GuildText)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('view')
      .setDescription('View current logging configuration')
  );

export async function execute(
  interaction: ChatInputCommandInteraction,
  services: { loggingService: LoggingService }
): Promise<void> {
  const subcommand = interaction.options.getSubcommand();
  const guildId = interaction.guildId!;

  switch (subcommand) {
    case 'mod':
      await handleModChannel(interaction, services, guildId);
      break;
    case 'security':
      await handleSecurityChannel(interaction, services, guildId);
      break;
    case 'view':
      await handleView(interaction, services, guildId);
      break;
  }
}

async function handleModChannel(
  interaction: ChatInputCommandInteraction,
  services: { loggingService: LoggingService },
  guildId: string
): Promise<void> {
  await interaction.deferReply();

  const channel = interaction.options.getChannel('channel', true);
  
  if (channel.type !== ChannelType.GuildText) {
    await interaction.editReply({
      content: '❌ Please select a text channel.',
    });
    return;
  }

  const textChannel = channel as TextChannel;

  // Check bot permissions in the channel
  const botMember = interaction.guild!.members.me!;
  const permissions = textChannel.permissionsFor(botMember);

  if (!permissions?.has(PermissionFlagsBits.SendMessages)) {
    await interaction.editReply({
      content: `❌ I don't have permission to send messages in ${channel}.`,
    });
    return;
  }

  if (!permissions?.has(PermissionFlagsBits.EmbedLinks)) {
    await interaction.editReply({
      content: `❌ I need the **Embed Links** permission in ${channel}.`,
    });
    return;
  }

  // Set the channel
  await services.loggingService.setModChannel(guildId, channel.id);

  // Send test message
  const testEmbed = new EmbedBuilder()
    .setTitle('<:tcet_tick:1437995479567962184> Moderation Logs Configured')
    .setDescription('This channel will now receive moderation action logs.')
    .setColor(EmbedColors.SUCCESS)
    .setTimestamp();

  try {
    await textChannel.send({ embeds: [testEmbed] });
  } catch (error) {
    console.error('Failed to send test message:', error);
    await interaction.editReply({
      content: `⚠️ Channel configured but failed to send test message. Please check permissions.`,
    });
    return;
  }

  // Success response
  const embed = new EmbedBuilder()
    .setTitle('<:tcet_tick:1437995479567962184> Mod Logs Configured')
    .setDescription(`Moderation logs will be sent to ${channel}`)
    .setColor(EmbedColors.SUCCESS)
    .setFooter({
      text: `Configured by ${interaction.user.tag}`,
    })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

async function handleSecurityChannel(
  interaction: ChatInputCommandInteraction,
  services: { loggingService: LoggingService },
  guildId: string
): Promise<void> {
  await interaction.deferReply();

  const channel = interaction.options.getChannel('channel', true);
  
  if (channel.type !== ChannelType.GuildText) {
    await interaction.editReply({
      content: '❌ Please select a text channel.',
    });
    return;
  }

  const textChannel = channel as TextChannel;

  // Check bot permissions in the channel
  const botMember = interaction.guild!.members.me!;
  const permissions = textChannel.permissionsFor(botMember);

  if (!permissions?.has(PermissionFlagsBits.SendMessages)) {
    await interaction.editReply({
      content: `❌ I don't have permission to send messages in ${channel}.`,
    });
    return;
  }

  if (!permissions?.has(PermissionFlagsBits.EmbedLinks)) {
    await interaction.editReply({
      content: `❌ I need the **Embed Links** permission in ${channel}.`,
    });
    return;
  }

  // Set the channel
  await services.loggingService.setSecurityChannel(guildId, channel.id);

  // Send test message
  const testEmbed = new EmbedBuilder()
    .setTitle('🔒 Security Logs Configured')
    .setDescription('This channel will now receive anti-nuke and security event logs.')
    .setColor(EmbedColors.SECURITY)
    .setTimestamp();

  try {
    await textChannel.send({ embeds: [testEmbed] });
  } catch (error) {
    console.error('Failed to send test message:', error);
    await interaction.editReply({
      content: `⚠️ Channel configured but failed to send test message. Please check permissions.`,
    });
    return;
  }

  // Success response
  const embed = new EmbedBuilder()
    .setTitle('<:tcet_tick:1437995479567962184> Security Logs Configured')
    .setDescription(`Security logs will be sent to ${channel}`)
    .setColor(EmbedColors.SUCCESS)
    .setFooter({
      text: `Configured by ${interaction.user.tag}`,
    })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

async function handleView(
  interaction: ChatInputCommandInteraction,
  services: { loggingService: LoggingService },
  guildId: string
): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const config = await services.loggingService.getConfig(guildId);

  const embed = new EmbedBuilder()
    .setTitle('📋 Logging Configuration')
    .setColor(EmbedColors.INFO)
    .setTimestamp();

  const fields: { name: string; value: string; inline?: boolean }[] = [];

  if (config.modChannel) {
    fields.push({
      name: 'Moderation Logs',
      value: `<#${config.modChannel}>`,
      inline: true,
    });
  } else {
    fields.push({
      name: 'Moderation Logs',
      value: 'Not configured',
      inline: true,
    });
  }

  if (config.securityChannel) {
    fields.push({
      name: 'Security Logs',
      value: `<#${config.securityChannel}>`,
      inline: true,
    });
  } else {
    fields.push({
      name: 'Security Logs',
      value: 'Not configured',
      inline: true,
    });
  }

  if (!config.modChannel && !config.securityChannel) {
    embed.setDescription('No logging channels have been configured yet.');
    fields.push({
      name: 'Setup Commands',
      value: '• `/logs mod` - Configure moderation logs\n• `/logs security` - Configure security logs',
      inline: false,
    });
  }

  embed.addFields(fields);

  await interaction.editReply({ embeds: [embed] });
}
