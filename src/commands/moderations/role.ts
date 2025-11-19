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
      .setDescription('Reason for the change')
      .setRequired(false)
  );

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
    await interaction.editReply({
      content: '❌ Cannot modify the @everyone role.',
    });
    return;
  }

  // Check if moderator can manage this role
  if (role.position >= moderator.roles.highest.position && moderator.id !== guild.ownerId) {
    await interaction.editReply({
      content: '❌ You cannot manage a role equal to or higher than your highest role.',
    });
    return;
  }

  // Check if bot can manage this role
  const botMember = guild.members.me!;
  if (role.position >= botMember.roles.highest.position) {
    await interaction.editReply({
      content: '❌ I cannot manage a role equal to or higher than my highest role.',
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
      .setTitle(hasRole ? '<:tcet_tick:1437995479567962184> Role Removed' : '<:tcet_tick:1437995479567962184> Role Added')
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
    await interaction.editReply({
      content: `❌ Failed to ${action} role: ${error.message}`,
    });
  }
}
