/**
 * Warn Command - Issue a warning to a member
 */

import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} from 'discord.js';
import { EmbedColors } from '../../types';
import { CustomEmojis } from '../../utils/emoji';
import { canModerate } from '../../utils/moderation';
import { ModerationService } from '../../services/ModerationService';
import { LoggingService } from '../../services/LoggingService';

export const data = new SlashCommandBuilder()
  .setName('warn')
  .setDescription('Issue a warning to a member')
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
  .addUserOption(option =>
    option
      .setName('user')
      .setDescription('The member to warn')
      .setRequired(true)
  )
  .addStringOption(option =>
    option
      .setName('reason')
      .setDescription('Reason for the warning')
      .setRequired(false)
  );

export async function execute(
  interaction: ChatInputCommandInteraction,
  services: { moderationService: ModerationService; loggingService: LoggingService }
): Promise<void> {
  await interaction.deferReply();

  const user = interaction.options.getUser('user', true);
  const reason = interaction.options.getString('reason') || 'No reason provided';
  const guild = interaction.guild!;
  const moderator = interaction.member as any;

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
  const moderatorCheck = canModerate(moderator, target, PermissionFlagsBits.ModerateMembers);
  if (!moderatorCheck.allowed) {
    await interaction.editReply({
      content: `❌ ${moderatorCheck.reason}`,
    });
    return;
  }

  // Add warning
  try {
    await services.moderationService.addWarn(guild.id, target.id, interaction.user.id, reason);
    const warnCount = await services.moderationService.getWarnCount(guild.id, target.id);

    const embed = new EmbedBuilder()
      .setTitle('⚠️ Member Warned')
      .setDescription(`${target.user.tag} has been warned.`)
      .setColor(EmbedColors.WARNING)
      .addFields(
        { name: 'User', value: `${target.user.tag} (${target.id})`, inline: true },
        { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
        { name: 'Total Warnings', value: warnCount.toString(), inline: true },
        { name: 'Reason', value: reason, inline: false }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

    // Send to logging channel
    await services.loggingService.logModeration(guild.id, {
      action: 'Warn',
      target: target.user,
      moderator: interaction.user,
      reason,
    });

    // Try to DM the user
    try {
      const dmEmbed = new EmbedBuilder()
        .setTitle(`⚠️ Warning in ${guild.name}`)
        .setColor(EmbedColors.WARNING)
        .addFields(
          { name: 'Reason', value: reason, inline: false },
          { name: 'Total Warnings', value: warnCount.toString(), inline: true }
        )
        .setTimestamp();

      await target.send({ embeds: [dmEmbed] });
    } catch {
      // DM failed, ignore
    }
  } catch (error: any) {
    await interaction.editReply({
      content: `❌ Failed to warn member: ${error.message}`,
    });
  }
}
