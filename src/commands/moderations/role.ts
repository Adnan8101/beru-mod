/**
 * Role Command - Add or remove a role from a member
 */

import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} from 'discord.js';
import { EmbedColors } from '../../types';
import { CustomEmojis } from '../../utils/emoji';
import { LoggingService } from '../../services/LoggingService';
import { createErrorEmbed } from '../../utils/embedHelpers';

export const data = new SlashCommandBuilder()
  .setName('role')
  .setDescription('Add or remove a role from a member')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
  .addUserOption(option =>
    option
      .setName('user')
      .setDescription('The member to modify')
      .setRequired(true)
  )
  .addRoleOption(option =>
    option
      .setName('role')
      .setDescription('The role to add/remove')
      .setRequired(true)
  )
  .addStringOption(option =>
    option
      .setName('reason')
      .setDescription('Reason for the role change')
      .setRequired(false)
  );

export const category = 'moderation';
export const syntax = '!role <user> <role> [reason]';
export const example = '!role @user @Member Promotion';
export const permission = 'Manage Roles';

export async function execute(
  interaction: ChatInputCommandInteraction,
  services: { loggingService: LoggingService }
): Promise<void> {
  await interaction.deferReply();

  const user = interaction.options.getUser('user', true);
  const role = interaction.options.getRole('role', true);
  const reason = interaction.options.getString('reason') || 'No reason provided';
  const guild = interaction.guild!;
  const moderator = interaction.member as any;

  // Validate role
  if (role.id === guild.roles.everyone.id) {
    const errorEmbed = createErrorEmbed('Cannot modify the @everyone role.');
    await interaction.editReply({ embeds: [errorEmbed] });
    return;
  }

  // Check if moderator can manage this role
  if (role.position >= moderator.roles.highest.position && moderator.id !== guild.ownerId) {
    const errorEmbed = createErrorEmbed('You cannot manage a role equal to or higher than your highest role.');
    await interaction.editReply({ embeds: [errorEmbed] });
    return;
  }

  // Check if bot can manage this role
  const botMember = guild.members.me!;
  if (role.position >= botMember.roles.highest.position) {
    const errorEmbed = createErrorEmbed('I cannot manage a role equal to or higher than my highest role.');
    await interaction.editReply({ embeds: [errorEmbed] });
    return;
  }

  // Get member
  let target;
  try {
    target = await guild.members.fetch(user.id);
  } catch {
    const errorEmbed = createErrorEmbed('User is not a member of this server.');
    await interaction.editReply({ embeds: [errorEmbed] });
    return;
  }

  // Check if member already has the role
  const hasRole = target.roles.cache.has(role.id);
  const action = hasRole ? 'remove' : 'add';

  try {
    if (hasRole) {
      await target.roles.remove(role.id, reason);
    } else {
      await target.roles.add(role.id, reason);
    }

    const embed = new EmbedBuilder()
      .setTitle(hasRole ? `${CustomEmojis.TICK} Role Removed` : `${CustomEmojis.TICK} Role Added`)
      .setDescription(
        hasRole
          ? `Removed ${role} from ${user.tag}.`
          : `Added ${role} to ${user.tag}.`
      )
      .setColor(EmbedColors.SUCCESS)
      .addFields(
        { name: 'User', value: `${user.tag} (${user.id})`, inline: true },
        { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
        { name: 'Role', value: `${role}`, inline: true },
        { name: 'Action', value: hasRole ? 'Removed' : 'Added', inline: true },
        { name: 'Reason', value: reason, inline: false }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

    // Send to logging channel
    await services.loggingService.logModeration(guild.id, {
      action: hasRole ? 'Role Removed' : 'Role Added',
      target: user,
      moderator: interaction.user,
      reason: `${role.name}`,
    });
  } catch (error: any) {
    const errorEmbed = createErrorEmbed(`Failed to ${action} role: ${error.message}`);
    await interaction.editReply({ embeds: [errorEmbed] });
  }
}
