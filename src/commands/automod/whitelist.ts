/**
 * Whitelist Command - Manage Anti-Nuke and AutoMod whitelist entries
 * NOTE: AutoMod whitelist is managed via /automod whitelist subcommands
 */

import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ComponentType,
  MessageComponentInteraction,
} from 'discord.js';
import { WhitelistService } from '../../services/WhitelistService';
import { WhitelistCategory, EmbedColors } from '../../types';
import { CustomEmojis } from '../../utils/emoji';

export const data = new SlashCommandBuilder()
  .setName('whitelist')
  .setDescription('Manage anti-nuke whitelist')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand(subcommand =>
    subcommand
      .setName('add_role')
      .setDescription('Add a role to the whitelist')
      .addRoleOption(option =>
        option
          .setName('role')
          .setDescription('Role to whitelist')
          .setRequired(true)
      )
      .addStringOption(option =>
        option
          .setName('category')
          .setDescription('What to whitelist for')
          .setRequired(true)
          .addChoices(
            { name: 'Banning Members', value: WhitelistCategory.BAN_MEMBERS },
            { name: 'Kicking Members', value: WhitelistCategory.KICK_MEMBERS },
            { name: 'Deleting Roles', value: WhitelistCategory.DELETE_ROLES },
            { name: 'Creating Roles', value: WhitelistCategory.CREATE_ROLES },
            { name: 'Deleting Channels', value: WhitelistCategory.DELETE_CHANNELS },
            { name: 'Creating Channels', value: WhitelistCategory.CREATE_CHANNELS },
            { name: 'Adding Bots', value: WhitelistCategory.ADD_BOTS },
            { name: 'Dangerous Permissions', value: WhitelistCategory.DANGEROUS_PERMS },
            { name: 'Giving Admin Roles', value: WhitelistCategory.GIVE_ADMIN_ROLE },
            { name: 'Pruning Members', value: WhitelistCategory.PRUNE_MEMBERS },
            { name: 'ALL (bypass everything)', value: WhitelistCategory.ALL }
          )
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('add_user')
      .setDescription('Add a user to the whitelist')
      .addUserOption(option =>
        option
          .setName('user')
          .setDescription('User to whitelist')
          .setRequired(true)
      )
      .addStringOption(option =>
        option
          .setName('category')
          .setDescription('What to whitelist for')
          .setRequired(true)
          .addChoices(
            { name: 'Banning Members', value: WhitelistCategory.BAN_MEMBERS },
            { name: 'Kicking Members', value: WhitelistCategory.KICK_MEMBERS },
            { name: 'Deleting Roles', value: WhitelistCategory.DELETE_ROLES },
            { name: 'Creating Roles', value: WhitelistCategory.CREATE_ROLES },
            { name: 'Deleting Channels', value: WhitelistCategory.DELETE_CHANNELS },
            { name: 'Creating Channels', value: WhitelistCategory.CREATE_CHANNELS },
            { name: 'Adding Bots', value: WhitelistCategory.ADD_BOTS },
            { name: 'Dangerous Permissions', value: WhitelistCategory.DANGEROUS_PERMS },
            { name: 'Giving Admin Roles', value: WhitelistCategory.GIVE_ADMIN_ROLE },
            { name: 'Pruning Members', value: WhitelistCategory.PRUNE_MEMBERS },
            { name: 'ALL (bypass everything)', value: WhitelistCategory.ALL }
          )
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('remove_role')
      .setDescription('Remove a role from the whitelist')
      .addRoleOption(option =>
        option
          .setName('role')
          .setDescription('Role to remove')
          .setRequired(true)
      )
      .addStringOption(option =>
        option
          .setName('category')
          .setDescription('Category to remove (leave empty for all)')
          .setRequired(false)
          .addChoices(
            { name: 'Banning Members', value: WhitelistCategory.BAN_MEMBERS },
            { name: 'Kicking Members', value: WhitelistCategory.KICK_MEMBERS },
            { name: 'Deleting Roles', value: WhitelistCategory.DELETE_ROLES },
            { name: 'Creating Roles', value: WhitelistCategory.CREATE_ROLES },
            { name: 'Deleting Channels', value: WhitelistCategory.DELETE_CHANNELS },
            { name: 'Creating Channels', value: WhitelistCategory.CREATE_CHANNELS },
            { name: 'Adding Bots', value: WhitelistCategory.ADD_BOTS },
            { name: 'Dangerous Permissions', value: WhitelistCategory.DANGEROUS_PERMS },
            { name: 'Giving Admin Roles', value: WhitelistCategory.GIVE_ADMIN_ROLE },
            { name: 'Pruning Members', value: WhitelistCategory.PRUNE_MEMBERS },
            { name: 'ALL', value: WhitelistCategory.ALL }
          )
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('remove_user')
      .setDescription('Remove a user from the whitelist')
      .addUserOption(option =>
        option
          .setName('user')
          .setDescription('User to remove')
          .setRequired(true)
      )
      .addStringOption(option =>
        option
          .setName('category')
          .setDescription('Category to remove (leave empty for all)')
          .setRequired(false)
          .addChoices(
            { name: 'Banning Members', value: WhitelistCategory.BAN_MEMBERS },
            { name: 'Kicking Members', value: WhitelistCategory.KICK_MEMBERS },
            { name: 'Deleting Roles', value: WhitelistCategory.DELETE_ROLES },
            { name: 'Creating Roles', value: WhitelistCategory.CREATE_ROLES },
            { name: 'Deleting Channels', value: WhitelistCategory.DELETE_CHANNELS },
            { name: 'Creating Channels', value: WhitelistCategory.CREATE_CHANNELS },
            { name: 'Adding Bots', value: WhitelistCategory.ADD_BOTS },
            { name: 'Dangerous Permissions', value: WhitelistCategory.DANGEROUS_PERMS },
            { name: 'Giving Admin Roles', value: WhitelistCategory.GIVE_ADMIN_ROLE },
            { name: 'Pruning Members', value: WhitelistCategory.PRUNE_MEMBERS },
            { name: 'ALL', value: WhitelistCategory.ALL }
          )
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('view')
      .setDescription('View whitelist for a role or user')
      .addRoleOption(option =>
        option
          .setName('role')
          .setDescription('Role to view')
          .setRequired(false)
      )
      .addUserOption(option =>
        option
          .setName('user')
          .setDescription('User to view')
          .setRequired(false)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('list')
      .setDescription('List all whitelist entries')
      .addStringOption(option =>
        option
          .setName('filter')
          .setDescription('Filter by type')
          .setRequired(false)
          .addChoices(
            { name: 'Roles only', value: 'role' },
            { name: 'Users only', value: 'user' },
            { name: 'All', value: 'all' }
          )
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('reset')
      .setDescription('⚠️ Remove all whitelist entries')
      .addBooleanOption(option =>
        option
          .setName('confirm')
          .setDescription('Confirm reset (required)')
          .setRequired(true)
      )
  );

export async function execute(
  interaction: ChatInputCommandInteraction,
  services: { whitelistService: WhitelistService }
): Promise<void> {
  const subcommand = interaction.options.getSubcommand();
  const guildId = interaction.guildId!;

  switch (subcommand) {
    case 'add_role':
      await handleAddRole(interaction, services, guildId);
      break;
    case 'add_user':
      await handleAddUser(interaction, services, guildId);
      break;
    case 'remove_role':
      await handleRemoveRole(interaction, services, guildId);
      break;
    case 'remove_user':
      await handleRemoveUser(interaction, services, guildId);
      break;
    case 'view':
      await handleView(interaction, services, guildId);
      break;
    case 'list':
      await handleList(interaction, services, guildId);
      break;
    case 'reset':
      await handleReset(interaction, services, guildId);
      break;
  }
}

async function handleAddRole(
  interaction: ChatInputCommandInteraction,
  services: { whitelistService: WhitelistService },
  guildId: string
): Promise<void> {
  await interaction.deferReply();

  const role = interaction.options.getRole('role', true);
  const category = interaction.options.getString('category', true) as WhitelistCategory;
  const guild = interaction.guild!;
  const botMember = guild.members.me!;

  // Safety checks
  if (role.id === guild.roles.everyone.id) {
    const errorEmbed = new EmbedBuilder()
      .setColor(EmbedColors.ERROR)
      .setDescription(`${CustomEmojis.CROSS} Cannot whitelist @everyone role.`);
    await interaction.editReply({ embeds: [errorEmbed] });
    return;
  }

  // Warn if role is higher than bot's role
  if (role.position >= botMember.roles.highest.position) {
    const embed = new EmbedBuilder()
      .setTitle('⚠️ Role Hierarchy Warning')
      .setDescription(
        `The role ${role} is equal to or higher than my highest role. ` +
        `I may not be able to take actions against users with this role if needed.`
      )
      .setColor(EmbedColors.WARNING);
    
    await interaction.followUp({ embeds: [embed], ephemeral: true });
  }

  // Warn if role has Administrator permission and whitelisting for ALL
  if (typeof role.permissions !== 'string' && role.permissions.has(PermissionFlagsBits.Administrator) && category === WhitelistCategory.ALL) {
    const embed = new EmbedBuilder()
      .setTitle('⚠️ Security Warning')
      .setDescription(
        `${role} has **Administrator** permission and you're whitelisting it for **ALL** categories. ` +
        `This means users with this role will bypass all anti-nuke protections.`
      )
      .setColor(EmbedColors.WARNING);
    
    await interaction.followUp({ embeds: [embed], ephemeral: true });
  }

  // Add to whitelist
  await services.whitelistService.addRole(guildId, role.id, [category], interaction.user.id);

  // Success embed
  const embed = new EmbedBuilder()
    .setTitle(`<:tcet_tick:1437995479567962184> Role Whitelisted - ${formatCategoryName(category)}`)
    .setDescription(`${role} has been added to the whitelist.`)
    .setColor(EmbedColors.SUCCESS)
    .addFields(
      { name: 'Role', value: `${role} (${role.id})`, inline: false },
      { name: 'Category', value: formatCategoryName(category), inline: false },
      { name: 'Effect', value: 'Users with this role will bypass anti-nuke checks for this category.', inline: false }
    )
    .setFooter({
      text: `Added by ${interaction.user.tag} (${interaction.user.id})`,
    })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

async function handleAddUser(
  interaction: ChatInputCommandInteraction,
  services: { whitelistService: WhitelistService },
  guildId: string
): Promise<void> {
  await interaction.deferReply();

  const user = interaction.options.getUser('user', true);
  const category = interaction.options.getString('category', true) as WhitelistCategory;
  const guild = interaction.guild!;

  // Safety checks
  if (user.bot && user.id === interaction.client.user.id) {
    const errorEmbed = new EmbedBuilder()
      .setColor(EmbedColors.ERROR)
      .setDescription(`${CustomEmojis.CROSS} Cannot whitelist the bot itself.`);
    await interaction.editReply({ embeds: [errorEmbed] });
    return;
  }

  if (user.id === guild.ownerId) {
    const errorEmbed = new EmbedBuilder()
      .setColor(EmbedColors.ERROR)
      .setDescription(`${CustomEmojis.CROSS} Guild owner is already implicitly whitelisted.`);
    await interaction.editReply({ embeds: [errorEmbed] });
    return;
  }

  // Add to whitelist
  await services.whitelistService.addUser(guildId, user.id, [category], interaction.user.id);

  // Success embed
  const embed = new EmbedBuilder()
    .setTitle(`<:tcet_tick:1437995479567962184> User Whitelisted - ${formatCategoryName(category)}`)
    .setDescription(`${user} has been added to the whitelist.`)
    .setColor(EmbedColors.SUCCESS)
    .addFields(
      { name: 'User', value: `${user.tag} (${user.id})`, inline: false },
      { name: 'Category', value: formatCategoryName(category), inline: false },
      { name: 'Effect', value: 'This user will bypass anti-nuke checks for this category.', inline: false }
    )
    .setFooter({
      text: `Added by ${interaction.user.tag} (${interaction.user.id})`,
    })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

async function handleRemoveRole(
  interaction: ChatInputCommandInteraction,
  services: { whitelistService: WhitelistService },
  guildId: string
): Promise<void> {
  await interaction.deferReply();

  const role = interaction.options.getRole('role', true);
  const category = interaction.options.getString('category');

  if (category) {
    await services.whitelistService.removeRole(guildId, role.id, [category as WhitelistCategory]);
  } else {
    await services.whitelistService.removeRole(guildId, role.id, 'ALL');
  }

  const embed = new EmbedBuilder()
    .setTitle(`<:tcet_tick:1437995479567962184> Role Removed from Whitelist${category ? ' - ' + formatCategoryName(category as WhitelistCategory) : ''}`)
    .setDescription(`${role} has been removed from the whitelist.`)
    .setColor(EmbedColors.SUCCESS)
    .addFields(
      { name: 'Role', value: `${role} (${role.id})`, inline: false },
      { name: 'Category', value: category ? formatCategoryName(category as WhitelistCategory) : 'All categories', inline: false }
    )
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

async function handleRemoveUser(
  interaction: ChatInputCommandInteraction,
  services: { whitelistService: WhitelistService },
  guildId: string
): Promise<void> {
  await interaction.deferReply();

  const user = interaction.options.getUser('user', true);
  const category = interaction.options.getString('category');

  if (category) {
    await services.whitelistService.removeUser(guildId, user.id, [category as WhitelistCategory]);
  } else {
    await services.whitelistService.removeUser(guildId, user.id, 'ALL');
  }

  const embed = new EmbedBuilder()
    .setTitle(`<:tcet_tick:1437995479567962184> User Removed from Whitelist${category ? ' - ' + formatCategoryName(category as WhitelistCategory) : ''}`)
    .setDescription(`${user} has been removed from the whitelist.`)
    .setColor(EmbedColors.SUCCESS)
    .addFields(
      { name: 'User', value: `${user.tag} (${user.id})`, inline: false },
      { name: 'Category', value: category ? formatCategoryName(category as WhitelistCategory) : 'All categories', inline: false }
    )
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

async function handleView(
  interaction: ChatInputCommandInteraction,
  services: { whitelistService: WhitelistService },
  guildId: string
): Promise<void> {
  await interaction.deferReply({ flags: 64 }); // 64 = Ephemeral

  const role = interaction.options.getRole('role');
  const user = interaction.options.getUser('user');

  if (!role && !user) {
    const errorEmbed = new EmbedBuilder()
      .setColor(EmbedColors.ERROR)
      .setDescription(`${CustomEmojis.CROSS} Please specify either a role or a user to view.`);
    await interaction.editReply({ embeds: [errorEmbed] });
    return;
  }

  const targetId = role?.id ?? user!.id;
  const entries = await services.whitelistService.getEntriesForTarget(guildId, targetId);

  if (entries.length === 0) {
    const infoEmbed = new EmbedBuilder()
      .setColor(EmbedColors.INFO)
      .setDescription(`ℹ️ ${role ?? user} is not whitelisted.`);
    await interaction.editReply({ embeds: [infoEmbed] });
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle(`📋 Whitelist: ${role?.name ?? user!.tag}`)
    .setColor(EmbedColors.INFO)
    .setDescription(`ID: ${targetId}`)
    .addFields({
      name: 'Categories',
      value: entries.map(e => 
        `• ${formatCategoryName(e.category)} (added <t:${Math.floor(e.createdAt.getTime() / 1000)}:R>)`
      ).join('\n'),
      inline: false,
    })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

async function handleList(
  interaction: ChatInputCommandInteraction,
  services: { whitelistService: WhitelistService },
  guildId: string
): Promise<void> {
  await interaction.deferReply({ flags: 64 }); // MessageFlags.Ephemeral

  const filterOption = interaction.options.getString('filter');
  const filter = (filterOption === 'role' || filterOption === 'user') ? filterOption : undefined;
  const entries = await services.whitelistService.listAll(guildId, filter);

  if (entries.length === 0) {
    const infoEmbed = new EmbedBuilder()
      .setColor(EmbedColors.INFO)
      .setDescription(`ℹ️ No whitelist entries found.`);
    await interaction.editReply({ embeds: [infoEmbed] });
    return;
  }

  // Group by target
  const grouped = new Map<string, typeof entries>();
  for (const entry of entries) {
    if (!grouped.has(entry.targetId)) {
      grouped.set(entry.targetId, []);
    }
    grouped.get(entry.targetId)!.push(entry);
  }

  // Fetch actual names for roles and users
  const guild = interaction.guild!;
  const lines: string[] = [];
  for (const [targetId, targetEntries] of grouped) {
    const isRole = targetEntries[0].isRole;
    const categoriesList = targetEntries.map(e => formatCategoryName(e.category as WhitelistCategory));
    
    let displayName = targetId;
    try {
      if (isRole) {
        const role = await guild.roles.fetch(targetId).catch(() => null);
        displayName = role ? role.name : `Unknown Role (${targetId})`;
      } else {
        const user = await guild.members.fetch(targetId).catch(() => null);
        displayName = user ? user.user.tag : `Unknown User (${targetId})`;
      }
    } catch (error) {
      // Keep targetId as displayName
    }

    // Create checkboxes for each category
    const categoryChecks = Object.values(WhitelistCategory).map(cat => {
      const isChecked = categoriesList.includes(formatCategoryName(cat));
      return `${isChecked ? '✅' : '❌'} ${formatCategoryName(cat)}`;
    }).join('\n    ');

    const icon = isRole ? '🔷' : '👤';
    lines.push(`${icon} **${displayName}**\n    ${categoryChecks}`);
  }

  // Split into pages if too long
  const pageSize = 5; // Reduced because of expanded format
  const pages: string[][] = [];
  for (let i = 0; i < lines.length; i += pageSize) {
    pages.push(lines.slice(i, i + pageSize));
  }

  const embed = new EmbedBuilder()
    .setTitle('📋 Whitelist Entries (✅ = Whitelisted, ❌ = Not Whitelisted)')
    .setDescription(pages[0].join('\n\n'))
    .setColor(EmbedColors.INFO)
    .setFooter({
      text: `Page 1/${pages.length} • ${entries.length} total entries`,
    })
    .setTimestamp();

  // Add management buttons
  const removeButton = new ButtonBuilder()
    .setCustomId(`whitelist_remove_${interaction.user.id}`)
    .setLabel('Remove Entries')
    .setStyle(ButtonStyle.Danger)
    .setEmoji('🗑️');

  const addButton = new ButtonBuilder()
    .setCustomId(`whitelist_add_${interaction.user.id}`)
    .setLabel('Add New Entry')
    .setStyle(ButtonStyle.Success)
    .setEmoji('➕');

  const components: ActionRowBuilder<ButtonBuilder>[] = [];
  if (entries.length > 0) {
    components.push(new ActionRowBuilder<ButtonBuilder>().addComponents(removeButton, addButton));
  } else {
    components.push(new ActionRowBuilder<ButtonBuilder>().addComponents(addButton));
  }

  const response = await interaction.editReply({ 
    embeds: [embed], 
    components 
  });

  // Create collector for buttons
  const collector = response.createMessageComponentCollector({
    componentType: ComponentType.Button,
    filter: (i) => i.user.id === interaction.user.id && 
      (i.customId === `whitelist_remove_${interaction.user.id}` || i.customId === `whitelist_add_${interaction.user.id}`),
    time: 300000,
  });

  collector.on('collect', async (i: MessageComponentInteraction) => {
    try {
      if (i.customId === `whitelist_add_${interaction.user.id}`) {
        await handleAddInterface(i, services, guildId, interaction);
      } else if (i.customId === `whitelist_remove_${interaction.user.id}`) {
        await handleRemoveInterface(i, services, guildId, interaction, grouped);
      }
    } catch (error) {
      console.error('Error in whitelist handler:', error);
    }
  });

  collector.on('end', () => {
    interaction.editReply({ components: [] }).catch(() => {});
  });
}

// New helper function for add interface
async function handleAddInterface(
  i: MessageComponentInteraction,
  services: { whitelistService: WhitelistService },
  guildId: string,
  originalInteraction: ChatInputCommandInteraction
): Promise<void> {
  if (!i.deferred && !i.replied) {
    await i.deferUpdate();
  }

  const typeSelectMenu = new StringSelectMenuBuilder()
    .setCustomId(`whitelist_add_type_${originalInteraction.user.id}`)
    .setPlaceholder('Select what to add')
    .addOptions(
      {
        label: 'Add Role',
        description: 'Whitelist a role',
        value: 'role',
        emoji: '🔷'
      },
      {
        label: 'Add User',
        description: 'Whitelist a user',
        value: 'user',
        emoji: '👤'
      }
    );

  const cancelButton = new ButtonBuilder()
    .setCustomId(`whitelist_add_cancel_${originalInteraction.user.id}`)
    .setLabel('Cancel')
    .setStyle(ButtonStyle.Secondary);

  await i.editReply({
    embeds: [new EmbedBuilder()
      .setColor(EmbedColors.INFO)
      .setTitle('➕ Add Whitelist Entry')
      .setDescription('Choose what type of entry you want to add to the whitelist.')
    ],
    components: [
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(typeSelectMenu),
      new ActionRowBuilder<ButtonBuilder>().addComponents(cancelButton)
    ]
  });

  // Handle type selection
  const typeCollector = i.message!.createMessageComponentCollector({
    filter: (si) => si.user.id === originalInteraction.user.id && 
      (si.customId === `whitelist_add_type_${originalInteraction.user.id}` || 
       si.customId === `whitelist_add_cancel_${originalInteraction.user.id}`),
    time: 120000,
    max: 1,
  });

  typeCollector.on('collect', async (si: any) => {
    if (si.customId === `whitelist_add_cancel_${originalInteraction.user.id}`) {
      await si.deferUpdate();
      await handleList(originalInteraction, services, guildId);
      return;
    }

    await si.deferUpdate();
    const selectedType = si.values[0];

    // Show instruction for next step
    const instructionEmbed = new EmbedBuilder()
      .setColor(EmbedColors.INFO)
      .setTitle('➕ Add Whitelist Entry')
      .setDescription(
        `You selected to add a **${selectedType}**. ` +
        `Please use the following command to add a ${selectedType} to the whitelist:\n\n` +
        `\`/whitelist add_${selectedType} ${selectedType}:@${selectedType === 'role' ? 'role' : 'user'} category:[select category]\`\n\n` +
        `Available categories:\n` +
        Object.values(WhitelistCategory).map(cat => `• ${formatCategoryName(cat)}`).join('\n')
      )
      .setFooter({ text: 'This interface will close in 30 seconds' });

    const backButton = new ButtonBuilder()
      .setCustomId(`whitelist_add_back_${originalInteraction.user.id}`)
      .setLabel('Back to List')
      .setStyle(ButtonStyle.Secondary);

    await si.editReply({
      embeds: [instructionEmbed],
      components: [new ActionRowBuilder<ButtonBuilder>().addComponents(backButton)]
    });

    // Auto-return to list after 30 seconds
    setTimeout(async () => {
      await handleList(originalInteraction, services, guildId);
    }, 30000);

    // Handle back button
    const backCollector = si.message!.createMessageComponentCollector({
      filter: (bi: MessageComponentInteraction) => bi.user.id === originalInteraction.user.id && 
        bi.customId === `whitelist_add_back_${originalInteraction.user.id}`,
      time: 30000,
      max: 1,
    });

    backCollector.on('collect', async (bi: MessageComponentInteraction) => {
      await bi.deferUpdate();
      await handleList(originalInteraction, services, guildId);
    });
  });
}

// New helper function for remove interface
async function handleRemoveInterface(
  i: MessageComponentInteraction,
  services: { whitelistService: WhitelistService },
  guildId: string,
  originalInteraction: ChatInputCommandInteraction,
  grouped: Map<string, any[]>
): Promise<void> {
  if (!i.deferred && !i.replied) {
    await i.deferUpdate();
  }

  // Show selection menu with all whitelisted entries
  const guild = originalInteraction.guild!;
  const options: Array<{ label: string; description: string; value: string }> = [];
  
  for (const [targetId, targetEntries] of grouped.entries()) {
    const isRole = targetEntries[0].isRole;
    const categories = targetEntries.map(e => formatCategoryName(e.category as WhitelistCategory)).join(', ');
    
    let displayName = targetId;
    try {
      if (isRole) {
        const role = await guild.roles.fetch(targetId).catch(() => null);
        displayName = role ? role.name : `Unknown Role (${targetId})`;
      } else {
        const user = await guild.members.fetch(targetId).catch(() => null);
        displayName = user ? user.user.tag : `Unknown User (${targetId})`;
      }
    } catch (error) {
      displayName = targetId;
    }
    
    const label = `${isRole ? 'Role' : 'User'}: ${displayName}`;
    options.push({
      label: label.slice(0, 100),
      description: categories.slice(0, 100),
      value: `${targetId}:${isRole ? 'role' : 'user'}`,
    });
    
    if (options.length >= 25) break; // Discord limit
  }

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`whitelist_remove_select_${originalInteraction.user.id}`)
    .setPlaceholder('Select entries to remove')
    .setMinValues(1)
    .setMaxValues(Math.min(options.length, 25))
    .addOptions(options);

  const cancelButton = new ButtonBuilder()
    .setCustomId(`whitelist_remove_cancel_${originalInteraction.user.id}`)
    .setLabel('Cancel')
    .setStyle(ButtonStyle.Secondary);

  await i.editReply({
    embeds: [new EmbedBuilder()
      .setColor(EmbedColors.INFO)
      .setTitle('🗑️ Remove Whitelist Entries')
      .setDescription('Select the entries you want to remove from the whitelist. ✅ marks will be removed.')
    ],
    components: [
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu),
      new ActionRowBuilder<ButtonBuilder>().addComponents(cancelButton)
    ]
  });

  // Wait for selection
  const selectCollector = i.message!.createMessageComponentCollector({
    filter: (si) => si.user.id === originalInteraction.user.id && 
      (si.customId === `whitelist_remove_select_${originalInteraction.user.id}` || 
       si.customId === `whitelist_remove_cancel_${originalInteraction.user.id}`),
    time: 120000,
    max: 1,
  });

  selectCollector.on('collect', async (si: any) => {
    if (si.customId === `whitelist_remove_cancel_${originalInteraction.user.id}`) {
      await si.deferUpdate();
      await handleList(originalInteraction, services, guildId);
      return;
    }

    await si.deferUpdate();

    // Remove selected entries
    let removedCount = 0;
    for (const value of si.values) {
      const [targetId, targetType] = value.split(':');
      try {
        if (targetType === 'role') {
          await services.whitelistService.removeRole(guildId, targetId, 'ALL');
        } else {
          await services.whitelistService.removeUser(guildId, targetId, 'ALL');
        }
        removedCount++;
      } catch (error) {
        console.error(`Failed to remove ${targetType} ${targetId}:`, error);
      }
    }

    const successEmbed = new EmbedBuilder()
      .setColor(EmbedColors.SUCCESS)
      .setTitle('<:tcet_tick:1437995479567962184> Entries Removed')
      .setDescription(`Successfully removed ${removedCount} whitelist entry(ies). All ✅ marks have been removed.`)
      .setTimestamp();

    await si.editReply({ embeds: [successEmbed], components: [] });

    // Refresh the list after 2 seconds
    setTimeout(async () => {
      await handleList(originalInteraction, services, guildId);
    }, 2000);
  });

  selectCollector.on('end', (collected) => {
    if (collected.size === 0) {
      i.editReply({ 
        embeds: [new EmbedBuilder()
          .setColor(EmbedColors.ERROR)
          .setDescription(`${CustomEmojis.CROSS} Selection timed out.`)
        ], 
        components: [] 
      }).catch(() => {});
    }
  });
}

async function handleReset(
  interaction: ChatInputCommandInteraction,
  services: { whitelistService: WhitelistService },
  guildId: string
): Promise<void> {
  await interaction.deferReply();

  const confirm = interaction.options.getBoolean('confirm', true);

  if (!confirm) {
    const errorEmbed = new EmbedBuilder()
      .setColor(EmbedColors.ERROR)
      .setDescription(`${CustomEmojis.CROSS} You must confirm the reset by setting \`confirm\` to \`True\`.`);
    await interaction.editReply({ embeds: [errorEmbed] });
    return;
  }

  // Count entries before reset
  const entries = await services.whitelistService.listAll(guildId);
  const count = entries.length;

  if (count === 0) {
    const infoEmbed = new EmbedBuilder()
      .setColor(EmbedColors.INFO)
      .setDescription(`ℹ️ Whitelist is already empty.`);
    await interaction.editReply({ embeds: [infoEmbed] });
    return;
  }

  // Reset
  await services.whitelistService.reset(guildId);

  const embed = new EmbedBuilder()
    .setTitle('⚠️ Whitelist Reset')
    .setDescription(`All ${count} whitelist entries have been removed.`)
    .setColor(EmbedColors.WARNING)
    .setFooter({
      text: `Reset by ${interaction.user.tag} (${interaction.user.id})`,
    })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

function formatCategoryName(category: WhitelistCategory): string {
  const names: Record<WhitelistCategory, string> = {
    [WhitelistCategory.BAN_MEMBERS]: 'Banning Members',
    [WhitelistCategory.KICK_MEMBERS]: 'Kicking Members',
    [WhitelistCategory.DELETE_ROLES]: 'Deleting Roles',
    [WhitelistCategory.CREATE_ROLES]: 'Creating Roles',
    [WhitelistCategory.DELETE_CHANNELS]: 'Deleting Channels',
    [WhitelistCategory.CREATE_CHANNELS]: 'Creating Channels',
    [WhitelistCategory.ADD_BOTS]: 'Adding Bots',
    [WhitelistCategory.DANGEROUS_PERMS]: 'Dangerous Permissions',
    [WhitelistCategory.GIVE_ADMIN_ROLE]: 'Giving Admin Roles',
    [WhitelistCategory.PRUNE_MEMBERS]: 'Pruning Members',
    [WhitelistCategory.ALL]: 'ALL (Full Bypass)',
  };
  return names[category] || category;
}
