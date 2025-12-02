/**
 * Security Test Script
 * Simulates attacks to test Antinuke and Automod features
 * 
 * Usage: npx ts-node scripts/security-test.ts
 */

import { Client, GatewayIntentBits, PermissionFlagsBits, ChannelType, Guild } from 'discord.js';
import * as readline from 'readline';
import * as dotenv from 'dotenv';

dotenv.config();

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (query: string): Promise<string> => {
    return new Promise((resolve) => {
        rl.question(query, resolve);
    });
};

async function main() {
    console.log('🛡️  Beru Security Test Script 🛡️');
    console.log('-----------------------------------');

    // Get configuration
    let token = process.env.TEST_BOT_TOKEN;
    if (!token) {
        token = await question('Enter TEST BOT Token (Secondary Bot): ');
    } else {
        console.log('✔ Using TEST_BOT_TOKEN from .env');
    }

    let guildId = process.env.TEST_GUILD_ID;
    if (!guildId) {
        guildId = await question('Enter Target Guild ID: ');
    } else {
        console.log('✔ Using TEST_GUILD_ID from .env');
    }

    token = token?.trim();
    guildId = guildId?.trim();

    if (!token || !guildId) {
        console.error('❌ Token and Guild ID are required.');
        process.exit(1);
    }

    const client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMembers,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.MessageContent,
        ]
    });

    try {
        console.log('🔄 Connecting to Discord...');
        await client.login(token);
        console.log(`✔ Connected as ${client.user?.tag}`);

        const guild = await client.guilds.fetch(guildId);
        if (!guild) {
            console.error('❌ Guild not found. Make sure the test bot is in the server.');
            process.exit(1);
        }
        console.log(`✔ Target Guild: ${guild.name}`);

        // Main Menu
        while (true) {
            console.log('\nSelect Event to Test:');
            console.log('1. Create Channel');
            console.log('2. Delete Channel');
            console.log('3. Create Role');
            console.log('4. Delete Role');
            console.log('5. Give Dangerous Perms (Manage Channels)');
            console.log('6. Give Admin Role');
            console.log('7. Kick Member');
            console.log('8. Ban Member');
            console.log('9. Exit');

            const choice = await question('Enter choice (1-9): ');

            switch (choice) {
                case '1': await testCreateChannel(guild); break;
                case '2': await testDeleteChannel(guild); break;
                case '3': await testCreateRole(guild); break;
                case '4': await testDeleteRole(guild); break;
                case '5': await testDangerousPerms(guild); break;
                case '6': await testGiveAdmin(guild); break;
                case '7': await testKickMember(guild); break;
                case '8': await testBanMember(guild); break;
                case '9':
                    console.log('👋 Exiting...');
                    client.destroy();
                    process.exit(0);
                    break;
                default:
                    console.log('❌ Invalid choice.');
            }

            await question('\nPress Enter to continue...');
        }

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

async function testCreateChannel(guild: Guild) {
    console.log('\n[Testing Create Channel]');
    const count = parseInt(await question('How many channels to create? (1): ') || '1');

    for (let i = 0; i < count; i++) {
        try {
            const channel = await guild.channels.create({
                name: `test-channel-${Date.now()}-${i}`,
                type: ChannelType.GuildText,
                reason: 'Security Test: Create Channel'
            });
            console.log(`✔ Created channel: ${channel.name}`);
        } catch (e: any) {
            console.log(`✖ Failed to create channel: ${e.message}`);
        }
    }
}

async function testDeleteChannel(guild: Guild) {
    console.log('\n[Testing Delete Channel]');
    const channelId = await question('Enter Channel ID to delete (leave empty to create and delete one): ');

    if (channelId) {
        try {
            const channel = await guild.channels.fetch(channelId);
            if (channel) {
                await channel.delete('Security Test: Delete Channel');
                console.log(`✔ Deleted channel: ${channel.name}`);
            } else {
                console.log('✖ Channel not found');
            }
        } catch (e: any) {
            console.log(`✖ Failed to delete channel: ${e.message}`);
        }
    } else {
        const count = parseInt(await question('How many channels to create and delete? (1): ') || '1');

        for (let i = 0; i < count; i++) {
            try {
                const channel = await guild.channels.create({
                    name: `test-delete-${Date.now()}-${i}`,
                    type: ChannelType.GuildText
                });
                console.log(`✔ Created temp channel: ${channel.name}`);
                await new Promise(r => setTimeout(r, 1000));
                await channel.delete('Security Test: Delete Channel');
                console.log(`✔ Deleted temp channel: ${channel.name}`);
            } catch (e: any) {
                console.log(`✖ Failed to test delete: ${e.message}`);
            }
            // Small delay between iterations
            if (i < count - 1) await new Promise(r => setTimeout(r, 500));
        }
    }
}

async function testCreateRole(guild: Guild) {
    console.log('\n[Testing Create Role]');
    const count = parseInt(await question('How many roles to create? (1): ') || '1');

    for (let i = 0; i < count; i++) {
        try {
            const role = await guild.roles.create({
                name: `test-role-${Date.now()}-${i}`,
                reason: 'Security Test: Create Role'
            });
            console.log(`✔ Created role: ${role.name}`);
        } catch (e: any) {
            console.log(`✖ Failed to create role: ${e.message}`);
        }
    }
}

async function testDeleteRole(guild: Guild) {
    console.log('\n[Testing Delete Role]');
    const roleId = await question('Enter Role ID to delete (leave empty to create and delete one): ');

    if (roleId) {
        try {
            const role = await guild.roles.fetch(roleId);
            if (role) {
                await role.delete('Security Test: Delete Role');
                console.log(`✔ Deleted role: ${role.name}`);
            } else {
                console.log('✖ Role not found');
            }
        } catch (e: any) {
            console.log(`✖ Failed to delete role: ${e.message}`);
        }
    } else {
        const count = parseInt(await question('How many roles to create and delete? (1): ') || '1');

        for (let i = 0; i < count; i++) {
            try {
                const role = await guild.roles.create({
                    name: `test-delete-${Date.now()}-${i}`
                });
                console.log(`✔ Created temp role: ${role.name}`);
                await new Promise(r => setTimeout(r, 1000));
                await role.delete('Security Test: Delete Role');
                console.log(`✔ Deleted temp role: ${role.name}`);
            } catch (e: any) {
                console.log(`✖ Failed to test delete: ${e.message}`);
            }
            // Small delay between iterations
            if (i < count - 1) await new Promise(r => setTimeout(r, 500));
        }
    }
}

async function testDangerousPerms(guild: Guild) {
    console.log('\n[Testing Dangerous Perms]');
    try {
        const role = await guild.roles.create({
            name: `test-dangerous-${Date.now()}`,
            reason: 'Security Test: Setup Dangerous Role'
        });
        console.log(`✔ Created temp role: ${role.name}`);

        await new Promise(r => setTimeout(r, 1000));

        await role.setPermissions([PermissionFlagsBits.ManageChannels], 'Security Test: Give Dangerous Perms');
        console.log(`✔ Gave ManageChannels permission to ${role.name}`);

        console.log('Waiting 5s to see if bot reacts...');
        await new Promise(r => setTimeout(r, 5000));

        // Cleanup if not deleted
        try {
            await role.delete();
        } catch { }
    } catch (e: any) {
        console.log(`✖ Failed to test dangerous perms: ${e.message}`);
    }
}

async function testGiveAdmin(guild: Guild) {
    console.log('\n[Testing Give Admin Role]');
    const targetId = await question('Enter Target User ID (leave empty to use a random member): ');
    let member;

    if (targetId) {
        member = await guild.members.fetch(targetId).catch(() => null);
    } else {
        const members = await guild.members.fetch({ limit: 10 });
        member = members.find(m => !m.user.bot && m.id !== guild.ownerId);
    }

    if (!member) {
        console.log('✖ No suitable member found.');
        return;
    }

    try {
        // Create an admin role first
        const adminRole = await guild.roles.create({
            name: `test-admin-${Date.now()}`,
            permissions: [PermissionFlagsBits.Administrator],
            reason: 'Security Test: Create Admin Role'
        });
        console.log(`✔ Created temp admin role: ${adminRole.name}`);

        await member.roles.add(adminRole, 'Security Test: Give Admin Role');
        console.log(`✔ Gave admin role to ${member.user.tag}`);

        console.log('Waiting 5s to see if bot reacts...');
        await new Promise(r => setTimeout(r, 5000));

        // Cleanup
        try { await adminRole.delete(); } catch { }
    } catch (e: any) {
        console.log(`✖ Failed to test give admin: ${e.message}`);
    }
}

async function testKickMember(guild: Guild) {
    console.log('\n[Testing Kick Member]');
    const targetId = await question('Enter Target User ID to kick: ');

    if (!targetId) {
        console.log('✖ Target ID required for safety.');
        return;
    }

    try {
        const member = await guild.members.fetch(targetId);
        if (member) {
            await member.kick('Security Test: Kick Member');
            console.log(`✔ Kicked member: ${member.user.tag}`);
        } else {
            console.log('✖ Member not found');
        }
    } catch (e: any) {
        console.log(`✖ Failed to kick member: ${e.message}`);
    }
}

async function testBanMember(guild: Guild) {
    console.log('\n[Testing Ban Member]');
    const targetId = await question('Enter Target User ID to ban: ');

    if (!targetId) {
        console.log('✖ Target ID required for safety.');
        return;
    }

    try {
        const member = await guild.members.fetch(targetId);
        if (member) {
            await member.ban({ reason: 'Security Test: Ban Member' });
            console.log(`✔ Banned member: ${member.user.tag}`);

            // Unban for cleanup
            await new Promise(r => setTimeout(r, 2000));
            await guild.members.unban(targetId, 'Security Test: Cleanup');
            console.log(`✔ Unbanned member for cleanup`);
        } else {
            console.log('✖ Member not found');
        }
    } catch (e: any) {
        console.log(`✖ Failed to ban member: ${e.message}`);
    }
}

main();
