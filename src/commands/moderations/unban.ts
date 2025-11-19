/**
 * Unban Command - Unban a user from the server
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
  .setName('unban')
  .setDescription('Unban a user from the server')
  .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
  .addStringOption(option =>
    option
      .setName('user_id')
      .setDescription('The user ID to unban')
      .setRequired(true)
  )
  .addStringOption(option =>
    option
      .setName('reason')
      .setDescription('Reason for the unban')
      .setRequired(false)
  );

export async function execute(
  interaction: ChatInputCommandInteraction,
  services: { caseService: CaseService; loggingService: LoggingService }
): Promise<void> {
  await interaction.deferReply();

  const userId = interaction.options.getString('user_id', true);
  const reason = interaction.options.getString('reason') || 'No reason provided';
  const guild = interaction.guild!;

  // Check if user is banned
  try {
    const ban = await guild.bans.fetch(userId);
    
    // Unban the user
    await guild.bans.remove(userId, reason);

    const embed = new EmbedBuilder()
      .setTitle('<:tcet_tick:1437995479567962184> User Unbanned')
      .setDescription(`${ban.user.tag} has been unbanned from the server.`)
      .setColor(EmbedColors.SUCCESS)
      .addFields(
        { name: 'User', value: `${ban.user.tag} (${ban.user.id})`, inline: true },
        { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
        { name: 'Reason', value: reason, inline: false }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

    // Log case
    const modCase = await services.caseService.createCase({
      guildId: guild.id,
      targetId: userId,
      moderatorId: interaction.user.id,
      action: 'unban',
      reason,
    });

    // Send to logging channel
    await services.loggingService.logModeration(guild.id, {
      action: 'Unban',
      target: ban.user,
      moderator: interaction.user,
      reason,
      caseNumber: modCase.caseNumber,
    });
  } catch (error: any) {
    if (error.code === 10026) {
      await interaction.editReply({
        content: '❌ This user is not banned.',
      });
    } else {
      await interaction.editReply({
        content: `❌ Failed to unban user: ${error.message}`,
      });
    }
  }
}
