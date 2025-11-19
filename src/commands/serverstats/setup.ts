import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction, 
  Message, 
  PermissionFlagsBits, 
  EmbedBuilder,
  GuildMember,
  ChannelType,
  CategoryChannel
} from 'discord.js';
import { SlashCommand, PrefixCommand } from '../../types';
import { DatabaseManager } from '../../utils/DatabaseManager';

const slashCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Setup a server stats panel')
    .addStringOption(option =>
      option.setName('type')
        .setDescription('Channel type for the stats')
        .setRequired(true)
        .addChoices(
          { name: 'Voice Channels', value: 'vc' },
          { name: 'Text Channels', value: 'text' }
        )
    )
    .addStringOption(option =>
      option.setName('name')
        .setDescription('Name for this stats panel')
        .setRequired(true)
        .setMaxLength(50)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guild) {
      await interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
      return;
    }

    const member = interaction.member as GuildMember;
    if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
      await interaction.reply({ content: 'You need Administrator permissions to use this command.', ephemeral: true });
      return;
    }

    const channelType = interaction.options.getString('type') as 'vc' | 'text';
    const panelName = interaction.options.getString('name')!;

    await interaction.deferReply({ ephemeral: true });

    try {
      const db = DatabaseManager.getInstance();
      
      // Check if panel already exists
      const existingPanel = db.getPanel(interaction.guild.id, panelName);
      if (existingPanel) {
        await interaction.editReply(`A panel named "${panelName}" already exists!`);
        return;
      }

      // Create category
      const category = await interaction.guild.channels.create({
        name: `📊 ${panelName}`,
        type: ChannelType.GuildCategory,
        position: 0 // Put at the top
      });

      // Get server stats
      const guild = interaction.guild;
      await guild.members.fetch(); // Fetch all members

      const totalMembers = guild.memberCount;
      const users = guild.members.cache.filter(member => !member.user.bot).size;
      const bots = guild.members.cache.filter(member => member.user.bot).size;

      // Create channels based on type
      let totalChannel, usersChannel, botsChannel;

      if (channelType === 'vc') {
        totalChannel = await interaction.guild.channels.create({
          name: `Total: ${totalMembers}`,
          type: ChannelType.GuildVoice,
          parent: category,
          permissionOverwrites: [
            {
              id: interaction.guild.roles.everyone,
              deny: [PermissionFlagsBits.Connect]
            }
          ]
        });

        usersChannel = await interaction.guild.channels.create({
          name: `Users: ${users}`,
          type: ChannelType.GuildVoice,
          parent: category,
          permissionOverwrites: [
            {
              id: interaction.guild.roles.everyone,
              deny: [PermissionFlagsBits.Connect]
            }
          ]
        });

        botsChannel = await interaction.guild.channels.create({
          name: `Bots: ${bots}`,
          type: ChannelType.GuildVoice,
          parent: category,
          permissionOverwrites: [
            {
              id: interaction.guild.roles.everyone,
              deny: [PermissionFlagsBits.Connect]
            }
          ]
        });
      } else {
        totalChannel = await interaction.guild.channels.create({
          name: `total-${totalMembers}`,
          type: ChannelType.GuildText,
          parent: category,
          permissionOverwrites: [
            {
              id: interaction.guild.roles.everyone,
              deny: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.AddReactions]
            }
          ]
        });

        usersChannel = await interaction.guild.channels.create({
          name: `users-${users}`,
          type: ChannelType.GuildText,
          parent: category,
          permissionOverwrites: [
            {
              id: interaction.guild.roles.everyone,
              deny: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.AddReactions]
            }
          ]
        });

        botsChannel = await interaction.guild.channels.create({
          name: `bots-${bots}`,
          type: ChannelType.GuildText,
          parent: category,
          permissionOverwrites: [
            {
              id: interaction.guild.roles.everyone,
              deny: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.AddReactions]
            }
          ]
        });
      }

      // Save to database
      db.createPanel({
        guildId: interaction.guild.id,
        panelName: panelName,
        channelType: channelType,
        categoryId: category.id,
        totalChannelId: totalChannel.id,
        usersChannelId: usersChannel.id,
        botsChannelId: botsChannel.id
      });

      const embed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle('Server Stats Panel Created')
        .setDescription(`Successfully created "${panelName}" stats panel`)
        .addFields([
          { name: 'Panel Name', value: panelName, inline: false },
          { name: 'Channel Type', value: channelType === 'vc' ? 'Voice Channels' : 'Text Channels', inline: false },
          { name: 'Total Members', value: totalMembers.toString(), inline: false },
          { name: 'Users', value: users.toString(), inline: false },
          { name: 'Bots', value: bots.toString(), inline: false }
        ])
        .setTimestamp()
        .setFooter({ text: 'Server Stats will auto-update every 20 minutes' });

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Error setting up stats panel:', error);
      await interaction.editReply('An error occurred while setting up the stats panel.');
    }
  },
};

const prefixCommand: PrefixCommand = {
  name: 'setup',
  description: 'Setup a server stats panel',
  usage: 'setup <vc|text> <panel_name>',
  permissions: [PermissionFlagsBits.Administrator],
  example: 'setup vc "Main Stats"',

  async execute(message: Message, args: string[]): Promise<void> {
    if (!message.guild) {
      await message.reply('This command can only be used in a server.');
      return;
    }

    const member = message.member;
    if (!member || !member.permissions.has(PermissionFlagsBits.Administrator)) {
      await message.reply('You need Administrator permissions to use this command.');
      return;
    }

    if (args.length < 2) {
      await message.reply('Usage: `setup <vc|text> <panel_name>`\nExample: `setup vc "Main Stats"`');
      return;
    }

    const channelType = args[0].toLowerCase();
    if (channelType !== 'vc' && channelType !== 'text') {
      await message.reply('Channel type must be either "vc" (voice) or "text".');
      return;
    }

    const panelName = args.slice(1).join(' ').replace(/['"]/g, '');
    if (!panelName) {
      await message.reply('Please provide a panel name.');
      return;
    }

    const statusMessage = await message.reply('Setting up server stats panel...');

    try {
      const db = DatabaseManager.getInstance();
      
      // Check if panel already exists
      const existingPanel = db.getPanel(message.guild.id, panelName);
      if (existingPanel) {
        await statusMessage.edit(`A panel named "${panelName}" already exists!`);
        return;
      }

      // Create category
      const category = await message.guild.channels.create({
        name: `📊 ${panelName}`,
        type: ChannelType.GuildCategory,
        position: 0 // Put at the top
      });

      // Get server stats
      const guild = message.guild;
      await guild.members.fetch(); // Fetch all members

      const totalMembers = guild.memberCount;
      const users = guild.members.cache.filter(member => !member.user.bot).size;
      const bots = guild.members.cache.filter(member => member.user.bot).size;

      // Create channels based on type
      let totalChannel, usersChannel, botsChannel;

      if (channelType === 'vc') {
        totalChannel = await message.guild.channels.create({
          name: `Total: ${totalMembers}`,
          type: ChannelType.GuildVoice,
          parent: category,
          permissionOverwrites: [
            {
              id: message.guild.roles.everyone,
              deny: [PermissionFlagsBits.Connect]
            }
          ]
        });

        usersChannel = await message.guild.channels.create({
          name: `Users: ${users}`,
          type: ChannelType.GuildVoice,
          parent: category,
          permissionOverwrites: [
            {
              id: message.guild.roles.everyone,
              deny: [PermissionFlagsBits.Connect]
            }
          ]
        });

        botsChannel = await message.guild.channels.create({
          name: `Bots: ${bots}`,
          type: ChannelType.GuildVoice,
          parent: category,
          permissionOverwrites: [
            {
              id: message.guild.roles.everyone,
              deny: [PermissionFlagsBits.Connect]
            }
          ]
        });
      } else {
        totalChannel = await message.guild.channels.create({
          name: `total-${totalMembers}`,
          type: ChannelType.GuildText,
          parent: category,
          permissionOverwrites: [
            {
              id: message.guild.roles.everyone,
              deny: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.AddReactions]
            }
          ]
        });

        usersChannel = await message.guild.channels.create({
          name: `users-${users}`,
          type: ChannelType.GuildText,
          parent: category,
          permissionOverwrites: [
            {
              id: message.guild.roles.everyone,
              deny: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.AddReactions]
            }
          ]
        });

        botsChannel = await message.guild.channels.create({
          name: `bots-${bots}`,
          type: ChannelType.GuildText,
          parent: category,
          permissionOverwrites: [
            {
              id: message.guild.roles.everyone,
              deny: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.AddReactions]
            }
          ]
        });
      }

      // Save to database
      db.createPanel({
        guildId: message.guild.id,
        panelName: panelName,
        channelType: channelType as 'vc' | 'text',
        categoryId: category.id,
        totalChannelId: totalChannel.id,
        usersChannelId: usersChannel.id,
        botsChannelId: botsChannel.id
      });

      const embed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle('Server Stats Panel Created')
        .setDescription(`Successfully created "${panelName}" stats panel`)
        .addFields([
          { name: 'Panel Name', value: panelName, inline: false },
          { name: 'Channel Type', value: channelType === 'vc' ? 'Voice Channels' : 'Text Channels', inline: false },
          { name: 'Total Members', value: totalMembers.toString(), inline: false },
          { name: 'Users', value: users.toString(), inline: false },
          { name: 'Bots', value: bots.toString(), inline: false }
        ])
        .setTimestamp()
        .setFooter({ text: 'Server Stats will auto-update every 20 minutes' });

      await statusMessage.edit({ content: '', embeds: [embed] });

    } catch (error) {
      console.error('Error setting up stats panel:', error);
      await statusMessage.edit('An error occurred while setting up the stats panel.');
    }
  },
};

export const data = slashCommand.data;
export const execute = slashCommand.execute;
export { slashCommand, prefixCommand };
