/**
 * DatabaseManager - Implementation for invite tracking, welcome/leave, and server stats
 * Integrates with the existing Prisma database
 */

import { PrismaClient } from '@prisma/client';

export class DatabaseManager {
  private static instance: DatabaseManager;
  private prisma: PrismaClient;

  private constructor() {
    this.prisma = new PrismaClient();
  }

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  // ===========================
  // Welcome/Leave Configuration
  // ===========================

  async setWelcomeChannel(guildId: string, channelId: string): Promise<void> {
    try {
      await this.prisma.welcomeConfig.upsert({
        where: { guildId },
        update: {
          welcomeChannelId: channelId,
          welcomeEnabled: true,
          updatedAt: new Date()
        },
        create: {
          guildId,
          welcomeChannelId: channelId,
          welcomeEnabled: true
        }
      });
    } catch (error) {
      console.error('Failed to set welcome channel:', error);
      throw error;
    }
  }

  async getWelcomeChannel(guildId: string): Promise<string | null> {
    try {
      const config = await this.prisma.welcomeConfig.findUnique({
        where: { guildId }
      });
      return config?.welcomeChannelId || null;
    } catch (error) {
      console.error('Failed to get welcome channel:', error);
      return null;
    }
  }

  async setLeaveChannel(guildId: string, channelId: string): Promise<void> {
    try {
      await this.prisma.welcomeConfig.upsert({
        where: { guildId },
        update: {
          leaveChannelId: channelId,
          leaveEnabled: true,
          updatedAt: new Date()
        },
        create: {
          guildId,
          leaveChannelId: channelId,
          leaveEnabled: true
        }
      });
    } catch (error) {
      console.error('Failed to set leave channel:', error);
      throw error;
    }
  }

  async getLeaveChannel(guildId: string): Promise<string | null> {
    try {
      const config = await this.prisma.welcomeConfig.findUnique({
        where: { guildId }
      });
      return config?.leaveChannelId || null;
    } catch (error) {
      console.error('Failed to get leave channel:', error);
      return null;
    }
  }

  async getWelcomeConfig(guildId: string): Promise<{
    channelId: string | null;
    message: string | null;
    enabled: boolean;
    welcomeChannelId: string | null;
    leaveChannelId: string | null;
    welcomeEnabled: boolean;
    leaveEnabled: boolean;
    welcomeMessage: string | null;
    leaveMessage: string | null;
  }> {
    try {
      const config = await this.prisma.welcomeConfig.findUnique({
        where: { guildId }
      });

      return {
        channelId: config?.welcomeChannelId || null,
        message: config?.welcomeMessage || null,
        enabled: config?.welcomeEnabled || false,
        welcomeChannelId: config?.welcomeChannelId || null,
        leaveChannelId: config?.leaveChannelId || null,
        welcomeEnabled: config?.welcomeEnabled || false,
        leaveEnabled: config?.leaveEnabled || false,
        welcomeMessage: config?.welcomeMessage || null,
        leaveMessage: config?.leaveMessage || null
      };
    } catch (error) {
      console.error('Failed to get welcome config:', error);
      return {
        channelId: null,
        message: null,
        enabled: false,
        welcomeChannelId: null,
        leaveChannelId: null,
        welcomeEnabled: false,
        leaveEnabled: false,
        welcomeMessage: null,
        leaveMessage: null
      };
    }
  }

  // ===========================
  // Invite tracking methods (stub implementations)
  // ===========================

  async getUserInviteCount(guildId: string, userId: string): Promise<number> {
    try {
      const tracker = await this.prisma.inviteTracker.findUnique({
        where: { guildId_userId: { guildId, userId } }
      });
      return tracker?.totalInvites || 0;
    } catch (error) {
      console.error('Failed to get user invite count:', error);
      return 0;
    }
  }

  async getUserLeftCount(guildId: string, userId: string): Promise<number> {
    try {
      const tracker = await this.prisma.inviteTracker.findUnique({
        where: { guildId_userId: { guildId, userId } }
      });
      return tracker?.leftInvites || 0;
    } catch (error) {
      console.error('Failed to get user left count:', error);
      return 0;
    }
  }

  async getUserFakeCount(guildId: string, userId: string): Promise<number> {
    try {
      const tracker = await this.prisma.inviteTracker.findUnique({
        where: { guildId_userId: { guildId, userId } }
      });
      return tracker?.fakeInvites || 0;
    } catch (error) {
      console.error('Failed to get user fake count:', error);
      return 0;
    }
  }

  async getUserBonusInvites(guildId: string, userId: string): Promise<number> {
    try {
      const tracker = await this.prisma.inviteTracker.findUnique({
        where: { guildId_userId: { guildId, userId } }
      });
      return tracker?.bonusInvites || 0;
    } catch (error) {
      console.error('Failed to get user bonus invites:', error);
      return 0;
    }
  }

  async addBonusInvites(guildId: string, userId: string, amount: number): Promise<void> {
    try {
      await this.prisma.inviteTracker.upsert({
        where: { guildId_userId: { guildId, userId } },
        update: { bonusInvites: { increment: amount } },
        create: { guildId, userId, bonusInvites: amount }
      });
    } catch (error) {
      console.error('Failed to add bonus invites:', error);
    }
  }

  async removeBonusInvites(guildId: string, userId: string, amount: number): Promise<void> {
    try {
      await this.prisma.inviteTracker.upsert({
        where: { guildId_userId: { guildId, userId } },
        update: { bonusInvites: { decrement: amount } },
        create: { guildId, userId, bonusInvites: -amount }
      });
    } catch (error) {
      console.error('Failed to remove bonus invites:', error);
    }
  }

  async removeNormalInvites(guildId: string, userId: string, amount: number): Promise<number> {
    try {
      const tracker = await this.prisma.inviteTracker.upsert({
        where: { guildId_userId: { guildId, userId } },
        update: { totalInvites: { decrement: amount } },
        create: { guildId, userId, totalInvites: -amount }
      });
      return tracker.totalInvites;
    } catch (error) {
      console.error('Failed to remove normal invites:', error);
      return 0;
    }
  }

  async resetInvites(guildId: string, userId: string): Promise<void> {
    try {
      await this.prisma.inviteTracker.delete({
        where: { guildId_userId: { guildId, userId } }
      });
    } catch (error) {
      // Ignore if not found
    }
  }

  async resetUserInvites(guildId: string, userId: string): Promise<{ regular: number; left: number; fake: number; bonus: number; normalRemoved: number; bonusRemoved: number }> {
    try {
      const tracker = await this.prisma.inviteTracker.findUnique({
        where: { guildId_userId: { guildId, userId } }
      });

      if (!tracker) {
        return { regular: 0, left: 0, fake: 0, bonus: 0, normalRemoved: 0, bonusRemoved: 0 };
      }

      await this.prisma.inviteTracker.delete({
        where: { guildId_userId: { guildId, userId } }
      });

      return {
        regular: tracker.totalInvites,
        left: tracker.leftInvites,
        fake: tracker.fakeInvites,
        bonus: tracker.bonusInvites,
        normalRemoved: tracker.totalInvites,
        bonusRemoved: tracker.bonusInvites
      };
    } catch (error) {
      console.error('Failed to reset user invites:', error);
      return { regular: 0, left: 0, fake: 0, bonus: 0, normalRemoved: 0, bonusRemoved: 0 };
    }
  }

  async getInviteData(guildId: string, userId: string): Promise<{ inviterId: string | null; inviteCode: string | null; isVanity: boolean }> {
    try {
      const data = await this.prisma.memberJoinData.findUnique({
        where: { guildId_userId: { guildId, userId } }
      });

      return {
        inviterId: data?.inviterId || null,
        inviteCode: data?.inviteCode || null,
        isVanity: data?.joinType === 'vanity'
      };
    } catch (error) {
      console.error('Failed to get invite data:', error);
      return { inviterId: null, inviteCode: null, isVanity: false };
    }
  }

  async getInviteTrackers(guildId: string, userId: string): Promise<Array<{ inviteCode: string; uses: number; createdAt: Date; expiresAt: Date | null; maxUses: number | null }>> {
    try {
      const invites = await this.prisma.inviteCache.findMany({
        where: { guildId, inviterId: userId }
      });

      return invites.map(inv => ({
        inviteCode: inv.code,
        uses: inv.uses,
        createdAt: inv.createdAt,
        expiresAt: null,
        maxUses: inv.maxUses
      }));
    } catch (error) {
      console.error('Failed to get invite trackers:', error);
      return [];
    }
  }

  // ===========================
  // Server stats panel methods (stub implementations)
  // ===========================

  async createPanel(data: {
    guildId: string;
    panelName: string;
    channelType: 'vc' | 'text';
    categoryId: string;
    totalChannelId: string;
    usersChannelId: string;
    botsChannelId: string;
    onlineChannelId?: string;
    idleChannelId?: string;
    dndChannelId?: string;
    offlineChannelId?: string;
  }): Promise<void> {
    try {
      await this.prisma.serverStatsPanel.create({
        data: {
          guildId: data.guildId,
          panelName: data.panelName,
          channelType: data.channelType,
          categoryId: data.categoryId,
          totalChannelId: data.totalChannelId,
          usersChannelId: data.usersChannelId,
          botsChannelId: data.botsChannelId,
          onlineChannelId: data.onlineChannelId,
          idleChannelId: data.idleChannelId,
          dndChannelId: data.dndChannelId,
          offlineChannelId: data.offlineChannelId
        }
      });
    } catch (error) {
      console.error('Failed to create stats panel:', error);
      throw error;
    }
  }

  async getPanel(guildId: string, panelName: string): Promise<any> {
    try {
      return await this.prisma.serverStatsPanel.findUnique({
        where: {
          guildId_panelName: {
            guildId,
            panelName
          }
        }
      });
    } catch (error) {
      console.error('Failed to get stats panel:', error);
      return null;
    }
  }

  async getPanels(guildId: string): Promise<any[]> {
    try {
      return await this.prisma.serverStatsPanel.findMany({
        where: { guildId }
      });
    } catch (error) {
      console.error('Failed to get stats panels:', error);
      return [];
    }
  }

  async getAllPanels(): Promise<any[]> {
    try {
      return await this.prisma.serverStatsPanel.findMany();
    } catch (error) {
      console.error('Failed to get all stats panels:', error);
      return [];
    }
  }

  async deletePanel(guildId: string, panelName: string): Promise<boolean> {
    try {
      await this.prisma.serverStatsPanel.delete({
        where: {
          guildId_panelName: {
            guildId,
            panelName
          }
        }
      });
      return true;
    } catch (error) {
      console.error('Failed to delete stats panel:', error);
      return false;
    }
  }
}
