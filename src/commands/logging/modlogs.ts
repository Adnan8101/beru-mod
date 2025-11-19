/**
 * Moderation Logs Command - Configure moderation action logging
 */

import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  TextChannel,
} from 'discord.js';
import { EmbedColors } from '../../types';
import { CustomEmojis } from '../../utils/emoji';

interface ModLogsServices {
  prisma: any;
}

export const data = new SlashCommandBuilder()
  .setName('moderation-logs')
  .setDescription('Configure moderation action logging')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addChannelOption(opt =>
    opt
      .setName('channel')
      .setDescription('Channel to log moderation actions')
      .setRequired(true)
  );

export async function execute(
  interaction: ChatInputCommandInteraction,
  services: { prisma: any }
) {
  const channel = interaction.options.getChannel('channel', true) as TextChannel;
  const guildId = interaction.guild!.id;

  // Verify it's a text channel
  if (!channel.isTextBased()) {
    const errorEmbed = new EmbedBuilder()
      .setColor(EmbedColors.ERROR)
      .setDescription(`${CustomEmojis.CROSS} Please select a text channel for moderation logs.`);
    await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    return;
  }

  // Check bot permissions in that channel
  const permissions = channel.permissionsFor(interaction.guild!.members.me!);
  if (!permissions?.has(PermissionFlagsBits.SendMessages) || !permissions?.has(PermissionFlagsBits.EmbedLinks)) {
    const errorEmbed = new EmbedBuilder()
      .setColor(EmbedColors.ERROR)
      .setDescription(
        `${CustomEmojis.CROSS} I need **Send Messages** and **Embed Links** permissions in ${channel}!`
      );
    await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    return;
  }

  // Save to database
  await services.prisma.guildLogging.upsert({
    where: { guildId },
    create: {
      guildId,
      modChannel: channel.id,
    },
    update: {
      modChannel: channel.id,
    },
  });

  const embed = new EmbedBuilder()
    .setColor(EmbedColors.SUCCESS)
    .setTitle(`${CustomEmojis.TICK} Moderation Logs Enabled`)
    .setDescription(
      `Moderation actions will now be logged to ${channel}!\n\n` +
      `**Actions Logged:**\n` +
      `${CustomEmojis.STAFF} Ban/Unban\n` +
      `${CustomEmojis.STAFF} Kick\n` +
      `${CustomEmojis.STAFF} Mute/Unmute\n` +
      `${CustomEmojis.STAFF} Warn\n` +
      `${CustomEmojis.STAFF} Softban\n` +
      `${CustomEmojis.STAFF} Quarantine\n` +
      `${CustomEmojis.CHANNEL} Purge`
    )
    .setFooter({ text: `Set by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });

  // Send test message to log channel
  const testEmbed = new EmbedBuilder()
    .setColor(EmbedColors.INFO)
    .setTitle(`${CustomEmojis.STAFF} Moderation Logging Activated`)
    .setDescription(`Moderation logging has been enabled by ${interaction.user}.\n\nThis channel will receive moderation action logs.`)
    .setTimestamp();

  await channel.send({ embeds: [testEmbed] });
}
