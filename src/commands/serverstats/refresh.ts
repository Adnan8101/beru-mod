import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction, 
  Message, 
  PermissionFlagsBits, 
  EmbedBuilder,
  GuildMember,
  VoiceChannel,
  TextChannel,
  Client,
  Guild
} from 'discord.js';
import { SlashCommand, PrefixCommand } from '../../types';
import { DatabaseManager } from '../../utils/DatabaseManager';

async function updateServerStats(guild: Guild): Promise<{ updated: number; errors: string[] }> {
  const db = DatabaseManager.getInstance();
  const panels = db.getPanels(guild.id);
  
  let updated = 0;
  const errors: string[] = [];

  for (const panel of panels) {
    try {
      await guild.members.fetch();

      const totalMembers = guild.memberCount;
      const users = guild.members.cache.filter((member: GuildMember) => !member.user.bot).size;
      const bots = guild.members.cache.filter((member: GuildMember) => member.user.bot).size;

      // Update channels
      const totalChannel = await guild.channels.fetch(panel.totalChannelId);
      const usersChannel = await guild.channels.fetch(panel.usersChannelId);
      const botsChannel = await guild.channels.fetch(panel.botsChannelId);

      if (totalChannel && usersChannel && botsChannel) {
        if (panel.channelType === 'vc') {
          await (totalChannel as VoiceChannel).setName(`Total: ${totalMembers}`);
          await (usersChannel as VoiceChannel).setName(`Users: ${users}`);
          await (botsChannel as VoiceChannel).setName(`Bots: ${bots}`);
        } else {
          await (totalChannel as TextChannel).setName(`total-${totalMembers}`);
          await (usersChannel as TextChannel).setName(`users-${users}`);
          await (botsChannel as TextChannel).setName(`bots-${bots}`);
        }
        updated++;
      } else {
        errors.push(`Some channels for panel "${panel.panelName}" could not be found`);
      }

    } catch (error) {
      errors.push(`Error updating panel "${panel.panelName}": ${error}`);
    }
  }

  return { updated, errors };
}

const slashCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('refresh')
    .setDescription('Manually refresh all server stats panels')
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

    await interaction.deferReply({ ephemeral: true });

    try {
      const { updated, errors } = await updateServerStats(interaction.guild);

      if (updated === 0 && errors.length === 0) {
        await interaction.editReply('No server stats panels found to refresh.');
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(updated > 0 ? 0x00ff00 : 0xff6b6b)
        .setTitle('Server Stats Refresh')
        .setDescription(`Refreshed ${updated} panel(s)`)
        .setTimestamp()
        .setFooter({ text: 'Manual Refresh' });

      if (errors.length > 0) {
        embed.addFields([{
          name: 'Errors',
          value: errors.slice(0, 5).join('\n'),
          inline: false
        }]);
      }

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Error refreshing stats:', error);
      await interaction.editReply('An error occurred while refreshing server stats.');
    }
  },
};

const prefixCommand: PrefixCommand = {
  name: 'refresh',
  aliases: ['update'],
  description: 'Manually refresh all server stats panels',
  usage: 'refresh',
  permissions: [PermissionFlagsBits.ManageChannels],
  example: 'refresh',

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

    const statusMessage = await message.reply('Refreshing server stats...');

    try {
      const { updated, errors } = await updateServerStats(message.guild);

      if (updated === 0 && errors.length === 0) {
        await statusMessage.edit('No server stats panels found to refresh.');
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(updated > 0 ? 0x00ff00 : 0xff6b6b)
        .setTitle('Server Stats Refresh')
        .setDescription(`Refreshed ${updated} panel(s)`)
        .setTimestamp()
        .setFooter({ text: 'Manual Refresh' });

      if (errors.length > 0) {
        embed.addFields([{
          name: 'Errors',
          value: errors.slice(0, 5).join('\n'),
          inline: false
        }]);
      }

      await statusMessage.edit({ content: '', embeds: [embed] });

    } catch (error) {
      console.error('Error refreshing stats:', error);
      await statusMessage.edit('An error occurred while refreshing server stats.');
    }
  },
};

export const data = slashCommand.data;
export const execute = slashCommand.execute;
export { slashCommand, prefixCommand, updateServerStats };
