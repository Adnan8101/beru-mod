/**
 * Mute Command - Timeout a member
 */

import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} from 'discord.js';
import { EmbedColors } from '../../types';
import { CustomEmojis } from '../../utils/emoji';
import { canModerate, botCanModerate, parseDuration, formatDuration } from '../../utils/moderation';
import { CaseService } from '../../services/CaseService';
import { LoggingService } from '../../services/LoggingService';

export const data = new SlashCommandBuilder()
  .setName('mute')
  .setDescription('Timeout a member')
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
  .addUserOption(option =>
    option
      .setName('user')
      .setDescription('The member to mute')
      .setRequired(true)
  )
  .addStringOption(option =>
    option
      .setName('duration')
      .setDescription('Duration (e.g., 5m, 1h, 2d)')
      .setRequired(true)
  )
  .addStringOption(option =>
    option
      .setName('reason')
      .setDescription('Reason for the mute')
      .setRequired(false)
  );

export async function execute(
  interaction: ChatInputCommandInteraction,
  services: { caseService: CaseService; loggingService: LoggingService }
): Promise<void> {
  await interaction.deferReply();

  const user = interaction.options.getUser('user', true);
  const durationStr = interaction.options.getString('duration', true);
  const reason = interaction.options.getString('reason') || 'No reason provided';
  const guild = interaction.guild!;
  const moderator = interaction.member as any;

  // Parse duration
  const duration = parseDuration(durationStr);
  if (!duration) {
    const errorEmbed = new EmbedBuilder()
      .setColor(EmbedColors.ERROR)
      .setDescription(`${CustomEmojis.CROSS} Invalid duration format. Use formats like: 5s, 10m, 1h, 2d`);
    await interaction.editReply({ embeds: [errorEmbed] });
    return;
  }

  // Max 28 days
  const maxDuration = 28 * 24 * 60 * 60 * 1000;
  if (duration > maxDuration) {
    const errorEmbed = new EmbedBuilder()
      .setColor(EmbedColors.ERROR)
      .setDescription(`${CustomEmojis.CROSS} Duration cannot exceed 28 days.`);
    await interaction.editReply({ embeds: [errorEmbed] });
    return;
  }

  // Get member
  let target;
  try {
    target = await guild.members.fetch(user.id);
  } catch {
    const errorEmbed = new EmbedBuilder()
      .setColor(EmbedColors.ERROR)
      .setDescription(`${CustomEmojis.CROSS} User is not a member of this server.`);
    await interaction.editReply({ embeds: [errorEmbed] });
    return;
  }

  // Check permissions
  const moderatorCheck = canModerate(moderator, target, PermissionFlagsBits.ModerateMembers);
  if (!moderatorCheck.allowed) {
    const errorEmbed = new EmbedBuilder()
      .setColor(EmbedColors.ERROR)
      .setDescription(`${CustomEmojis.CROSS} ${moderatorCheck.reason}`);
    await interaction.editReply({ embeds: [errorEmbed] });
    return;
  }

  const botCheck = botCanModerate(guild.members.me!, target, PermissionFlagsBits.ModerateMembers);
  if (!botCheck.allowed) {
    const errorEmbed = new EmbedBuilder()
      .setColor(EmbedColors.ERROR)
      .setDescription(`${CustomEmojis.CROSS} ${botCheck.reason}`);
    await interaction.editReply({ embeds: [errorEmbed] });
    return;
  }

  // Perform timeout
  try {
    await target.timeout(duration, reason);

    const embed = new EmbedBuilder()
      .setTitle(`${CustomEmojis.TICK} Member Muted`)
      .setDescription(`**${target.user.tag}** has been timed out.`)
      .setColor(EmbedColors.SUCCESS)
      .addFields(
        { name: `${CustomEmojis.USER} User`, value: `${target.user.tag} (${target.id})`, inline: true },
        { name: `${CustomEmojis.STAFF} Moderator`, value: `${interaction.user.tag}`, inline: true },
        { name: 'Duration', value: formatDuration(duration), inline: true },
        { name: 'Reason', value: reason, inline: false }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

    // Log case
    const modCase = await services.caseService.createCase({
      guildId: guild.id,
      targetId: target.id,
      moderatorId: interaction.user.id,
      action: 'mute',
      reason,
      metadata: { duration: formatDuration(duration) },
    });

    // Send to logging channel
    await services.loggingService.logModeration(guild.id, {
      action: 'Mute',
      target: target.user,
      moderator: interaction.user,
      reason,
      caseNumber: modCase.caseNumber,
      duration: formatDuration(duration),
    });
  } catch (error: any) {
    const errorEmbed = new EmbedBuilder()
      .setColor(EmbedColors.ERROR)
      .setDescription(`${CustomEmojis.CROSS} Failed to mute member: ${error.message}`);
    await interaction.editReply({ embeds: [errorEmbed] });
  }
}
