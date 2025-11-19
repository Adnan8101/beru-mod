/**
 * Unmute Command - Remove timeout from a member
 */

import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} from 'discord.js';
import { EmbedColors } from '../../types';
import { CustomEmojis } from '../../utils/emoji';
import { CaseService } from '../../services/CaseService';
import { LoggingService } from '../../services/LoggingService';

export const data = new SlashCommandBuilder()
  .setName('unmute')
  .setDescription('Remove timeout from a member')
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
  .addUserOption(option =>
    option
      .setName('user')
      .setDescription('The member to unmute')
      .setRequired(true)
  )
  .addStringOption(option =>
    option
      .setName('reason')
      .setDescription('Reason for the unmute')
      .setRequired(false)
  );

export async function execute(
  interaction: ChatInputCommandInteraction,
  services: { caseService: CaseService; loggingService: LoggingService }
): Promise<void> {
  await interaction.deferReply();

  const user = interaction.options.getUser('user', true);
  const reason = interaction.options.getString('reason') || 'No reason provided';
  const guild = interaction.guild!;

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

  // Check if member is muted
  if (!target.isCommunicationDisabled()) {
    await interaction.editReply({
      content: '❌ This member is not muted.',
    });
    return;
  }

  // Remove timeout
  try {
    await target.timeout(null, reason);

    const embed = new EmbedBuilder()
      .setTitle('<:tcet_tick:1437995479567962184> Member Unmuted')
      .setDescription(`${target.user.tag} has been unmuted.`)
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
      action: 'unmute',
      reason,
    });

    // Send to logging channel
    await services.loggingService.logModeration(guild.id, {
      action: 'Unmute',
      target: target.user,
      moderator: interaction.user,
      reason,
      caseNumber: modCase.caseNumber,
    });
  } catch (error: any) {
    await interaction.editReply({
      content: `❌ Failed to unmute member: ${error.message}`,
    });
  }
}
