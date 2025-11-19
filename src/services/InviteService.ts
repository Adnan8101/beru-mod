/**
 * InviteService - Handles invite tracking with database persistence
 */

import { PrismaClient } from '@prisma/client';
import { Collection, Guild, Invite } from 'discord.js';

export class InviteService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Cache all invites for a guild in the database
   */
  async cacheGuildInvites(guild: Guild): Promise<void> {
    try {
      const invites = await guild.invites.fetch();
      
      // Delete old cache for this guild
      await this.prisma.inviteCache.deleteMany({
        where: { guildId: guild.id }
      });

      // Insert new cache
      const inviteData = invites.map(invite => ({
        guildId: guild.id,
        code: invite.code,
        inviterId: invite.inviter?.id || null,
        inviterTag: invite.inviter?.tag || null,
        uses: invite.uses || 0,
        maxUses: invite.maxUses || 0,
        temporary: invite.temporary || false,
      }));

      if (inviteData.length > 0) {
        await this.prisma.inviteCache.createMany({
          data: inviteData,
        });
      }
    } catch (error: any) {
      if (error.code === 50013) {
        console.warn(`⚠️ Missing permissions to cache invites for guild ${guild.name} (${guild.id})`);
      } else {
        throw error;
      }
    }
  }

  /**
   * Update invite cache for a guild
   */
  async updateInviteCache(guild: Guild): Promise<void> {
    await this.cacheGuildInvites(guild);
  }

  /**
   * Find which invite was used by comparing old and new invite data
   */
  async findUsedInvite(guildId: string, newInvites: Collection<string, Invite>): Promise<{
    inviterId: string | null;
    inviterTag: string | null;
    inviteCode: string | null;
    joinType: 'invite' | 'vanity' | 'unknown' | 'oauth';
  }> {
    try {
      // Get cached invites from database
      const cachedInvites = await this.prisma.inviteCache.findMany({
        where: { guildId }
      });

      // Convert to map for easy lookup
      const oldInvitesMap = new Map(
        cachedInvites.map(inv => [inv.code, inv])
      );

      // Find invite with increased use count
      for (const [code, newInvite] of newInvites) {
        const oldInvite = oldInvitesMap.get(code);
        
        if (oldInvite && newInvite.uses! > oldInvite.uses) {
          // This invite was used!
          return {
            inviterId: newInvite.inviter?.id || null,
            inviterTag: newInvite.inviter?.tag || null,
            inviteCode: code,
            joinType: code === newInvite.guild?.vanityURLCode ? 'vanity' : 'invite'
          };
        } else if (!oldInvite && newInvite.uses! > 0) {
          // New invite that was immediately used (edge case)
          return {
            inviterId: newInvite.inviter?.id || null,
            inviterTag: newInvite.inviter?.tag || null,
            inviteCode: code,
            joinType: 'invite'
          };
        }
      }

      // Check for vanity URL
      const guild = newInvites.first()?.guild;
      if (guild && 'vanityURLCode' in guild && guild.vanityURLCode) {
        const vanityInvite = newInvites.find(inv => inv.code === guild.vanityURLCode);
        const oldVanity = oldInvitesMap.get(guild.vanityURLCode);
        
        if (vanityInvite && oldVanity && vanityInvite.uses! > oldVanity.uses) {
          return {
            inviterId: null,
            inviterTag: null,
            inviteCode: guild.vanityURLCode,
            joinType: 'vanity'
          };
        }
      }

      // Could be OAuth2 (bot add), widget, discovery, etc.
      return {
        inviterId: null,
        inviterTag: null,
        inviteCode: null,
        joinType: 'unknown'
      };
    } catch (error) {
      console.error('Error finding used invite:', error);
      return {
        inviterId: null,
        inviterTag: null,
        inviteCode: null,
        joinType: 'unknown'
      };
    }
  }

  /**
   * Store member join data
   */
  async storeMemberJoin(
    guildId: string,
    userId: string,
    inviterId: string | null,
    inviterTag: string | null,
    inviteCode: string | null,
    joinType: 'invite' | 'vanity' | 'unknown' | 'oauth'
  ): Promise<void> {
    await this.prisma.memberJoinData.upsert({
      where: {
        guildId_userId: {
          guildId,
          userId
        }
      },
      create: {
        guildId,
        userId,
        inviterId,
        inviterTag,
        inviteCode,
        joinType
      },
      update: {
        inviterId,
        inviterTag,
        inviteCode,
        joinType,
        joinedAt: new Date()
      }
    });
  }

  /**
   * Get member join data
   */
  async getMemberJoinData(guildId: string, userId: string) {
    return await this.prisma.memberJoinData.findUnique({
      where: {
        guildId_userId: {
          guildId,
          userId
        }
      }
    });
  }

  /**
   * Delete member join data (cleanup after leave)
   */
  async deleteMemberJoinData(guildId: string, userId: string): Promise<void> {
    await this.prisma.memberJoinData.deleteMany({
      where: {
        guildId,
        userId
      }
    });
  }

  /**
   * Get total invites for a user in a guild (net invites = total - left - fake + bonus)
   */
  async getUserInviteCount(guildId: string, userId: string): Promise<number> {
    const tracker = await this.prisma.inviteTracker.findUnique({
      where: {
        guildId_userId: {
          guildId,
          userId
        }
      }
    });

    if (!tracker) return 0;

    return tracker.totalInvites - tracker.leftInvites - tracker.fakeInvites + tracker.bonusInvites;
  }

  /**
   * Increment invite count for a user (someone joined using their invite)
   */
  async incrementInvites(guildId: string, userId: string): Promise<number> {
    const tracker = await this.prisma.inviteTracker.upsert({
      where: {
        guildId_userId: {
          guildId,
          userId
        }
      },
      create: {
        guildId,
        userId,
        totalInvites: 1,
        leftInvites: 0,
        fakeInvites: 0,
        bonusInvites: 0
      },
      update: {
        totalInvites: {
          increment: 1
        }
      }
    });

    return tracker.totalInvites - tracker.leftInvites - tracker.fakeInvites + tracker.bonusInvites;
  }

  /**
   * Decrement invite count when someone leaves (increment leftInvites)
   */
  async decrementInvites(guildId: string, userId: string): Promise<number> {
    const tracker = await this.prisma.inviteTracker.upsert({
      where: {
        guildId_userId: {
          guildId,
          userId
        }
      },
      create: {
        guildId,
        userId,
        totalInvites: 0,
        leftInvites: 1,
        fakeInvites: 0,
        bonusInvites: 0
      },
      update: {
        leftInvites: {
          increment: 1
        }
      }
    });

    return tracker.totalInvites - tracker.leftInvites - tracker.fakeInvites + tracker.bonusInvites;
  }

  /**
   * Get all members invited by a specific user
   */
  async getMembersInvitedBy(guildId: string, inviterId: string) {
    return await this.prisma.memberJoinData.findMany({
      where: {
        guildId,
        inviterId,
        joinType: 'invite'
      }
    });
  }

  /**
   * Get invite tracker stats for a user
   */
  async getInviteStats(guildId: string, userId: string) {
    return await this.prisma.inviteTracker.findUnique({
      where: {
        guildId_userId: {
          guildId,
          userId
        }
      }
    });
  }
}
