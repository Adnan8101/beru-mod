/**
 * Command Help Embed Generator
 */

import { EmbedBuilder } from 'discord.js';
import { EmbedColors } from '../types';
import { CustomEmojis } from './emoji';

export interface CommandHelp {
  name: string;
  description: string;
  permission: string;
  syntax: string;
  examples: string[];
}

export function createHelpEmbed(help: CommandHelp): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(EmbedColors.INFO)
    .setTitle(`${CustomEmojis.SETTING} Command Help: ${help.name}`)
    .addFields(
      { name: 'Description', value: help.description, inline: false },
      { name: `${CustomEmojis.ADMIN} Permission Required`, value: help.permission, inline: false },
      { name: 'Syntax', value: `\`\`\`${help.syntax}\`\`\``, inline: false },
      {
        name: 'Examples',
        value: help.examples.map(ex => `\`${ex}\``).join('\n'),
        inline: false,
      }
    )
    .setFooter({ text: 'Use @ to mention users/roles' });
}

export function createSuccessEmbed(title: string, description: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(EmbedColors.SUCCESS)
    .setTitle(`${CustomEmojis.TICK} ${title}`)
    .setDescription(description)
    .setTimestamp();
}

export function createErrorEmbed(description: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(EmbedColors.ERROR)
    .setDescription(`${CustomEmojis.CROSS} ${description}`)
    .setTimestamp();
}

export function createWarningEmbed(title: string, description: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(EmbedColors.WARNING)
    .setTitle(`${CustomEmojis.CAUTION} ${title}`)
    .setDescription(description)
    .setTimestamp();
}
