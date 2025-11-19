import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction, 
  Message, 
  PermissionFlagsBits, 
  EmbedBuilder,
  GuildMember,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ComponentType
} from 'discord.js';
import { SlashCommand, PrefixCommand } from '../../types';
import { DatabaseManager } from '../../utils/DatabaseManager';

const slashCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('panel')
    .setDescription('View and manage server stats panels')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guild) {
      await interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
      return;
    }

    const member = interaction.member as GuildMember;
    if (!member.permissions.has(PermissionFlagsBits.ManageChannels)) {
      await interaction.reply({ content: 'You need Manage Channels permissions to use this command.', ephemeral: true });
      return;
    }

    const db = DatabaseManager.getInstance();
    const panels = db.getPanels(interaction.guild.id);

    if (panels.length === 0) {
      await interaction.reply({ 
        content: 'No server stats panels found. Use `/setup` to create one.', 
        ephemeral: true 
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('Server Stats Panels')
      .setDescription('Here are all the active stats panels on this server')
      .setTimestamp()
      .setFooter({ text: 'Panel Management' });

    // Add panels to embed
    for (const panel of panels) {
      const channelTypeText = panel.channelType === 'vc' ? 'Voice Channels' : 'Text Channels';
      const createdDate = new Date(panel.createdAt).toLocaleDateString();
      
      embed.addFields([{
        name: `📊 ${panel.panelName}`,
        value: `Type: ${channelTypeText}\nCreated: ${createdDate}`,
        inline: false
      }]);
    }

    // Create select menu for deletion
    if (panels.length > 0) {
      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('delete_panel')
        .setPlaceholder('Select a panel to delete...')
        .addOptions(panels.map(panel => ({
          label: panel.panelName,
          value: panel.panelName,
          description: `${panel.channelType === 'vc' ? 'Voice' : 'Text'} channels panel`,
        })));

      const row = new ActionRowBuilder<StringSelectMenuBuilder>()
        .addComponents(selectMenu);

      const response = await interaction.reply({ 
        embeds: [embed], 
        components: [row], 
        ephemeral: true 
      });

      try {
        const selection = await response.awaitMessageComponent({
          componentType: ComponentType.StringSelect,
          time: 60000,
          filter: (i) => i.user.id === interaction.user.id
        });

        const selectedPanelName = selection.values[0];
        const selectedPanel = panels.find(p => p.panelName === selectedPanelName);

        if (!selectedPanel) {
          await selection.update({ content: 'Panel not found.', components: [], embeds: [] });
          return;
        }

        // Delete channels and category
        try {
          const guild = interaction.guild;
          
          // Delete channels
          const channels = [
            selectedPanel.totalChannelId,
            selectedPanel.usersChannelId,
            selectedPanel.botsChannelId
          ];

          for (const channelId of channels) {
            try {
              const channel = await guild.channels.fetch(channelId);
              if (channel) await channel.delete();
            } catch (error) {
              console.error(`Error deleting channel ${channelId}:`, error);
            }
          }

          // Delete category
          try {
            const category = await guild.channels.fetch(selectedPanel.categoryId);
            if (category) await category.delete();
          } catch (error) {
            console.error(`Error deleting category ${selectedPanel.categoryId}:`, error);
          }

          // Remove from database
          db.deletePanel(interaction.guild.id, selectedPanelName);

          const successEmbed = new EmbedBuilder()
            .setColor(0x00ff00)
            .setTitle('Panel Deleted')
            .setDescription(`Successfully deleted the "${selectedPanelName}" panel and all its channels.`)
            .setTimestamp();

          await selection.update({ embeds: [successEmbed], components: [] });

        } catch (error) {
          console.error('Error deleting panel:', error);
          await selection.update({ 
            content: 'An error occurred while deleting the panel.', 
            components: [], 
            embeds: [] 
          });
        }

      } catch (error) {
        await interaction.editReply({ 
          content: 'No panel selected. Operation cancelled.', 
          components: [], 
          embeds: [embed] 
        });
      }
    } else {
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};

const prefixCommand: PrefixCommand = {
  name: 'panel',
  aliases: ['panels'],
  description: 'View and manage server stats panels',
  usage: 'panel',
  permissions: [PermissionFlagsBits.ManageChannels],
  example: 'panel',

  async execute(message: Message, args: string[]): Promise<void> {
    if (!message.guild) {
      await message.reply('This command can only be used in a server.');
      return;
    }

    const member = message.member;
    if (!member || !member.permissions.has(PermissionFlagsBits.ManageChannels)) {
      await message.reply('You need Manage Channels permissions to use this command.');
      return;
    }

    const db = DatabaseManager.getInstance();
    const panels = db.getPanels(message.guild.id);

    if (panels.length === 0) {
      await message.reply('No server stats panels found. Use `setup` to create one.');
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('Server Stats Panels')
      .setDescription('Here are all the active stats panels on this server')
      .setTimestamp()
      .setFooter({ text: 'Panel Management' });

    // Add panels to embed
    for (const panel of panels) {
      const channelTypeText = panel.channelType === 'vc' ? 'Voice Channels' : 'Text Channels';
      const createdDate = new Date(panel.createdAt).toLocaleDateString();
      
      embed.addFields([{
        name: `📊 ${panel.panelName}`,
        value: `Type: ${channelTypeText}\nCreated: ${createdDate}`,
        inline: false
      }]);
    }

    await message.reply({ embeds: [embed] });
  },
};

export const data = slashCommand.data;
export const execute = slashCommand.execute;
export { slashCommand, prefixCommand };
