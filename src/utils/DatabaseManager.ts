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

  getUserInviteCount(guildId: string, userId: string): number {
    // TODO: Implement with Prisma when invite tracking schema is added
    return 0;
  }

  getUserLeftCount(guildId: string, userId: string): number {
    // TODO: Implement with Prisma when invite tracking schema is added
    return 0;
  }

  getUserFakeCount(guildId: string, userId: string): number {
    // TODO: Implement with Prisma when invite tracking schema is added
    return 0;
  }

  getUserBonusInvites(guildId: string, userId: string): number {
    // TODO: Implement with Prisma when invite tracking schema is added
    return 0;
  }

  addBonusInvites(guildId: string, userId: string, amount: number): void {
    // TODO: Implement with Prisma when invite tracking schema is added
    console.log(`Add ${amount} bonus invites for ${userId} in ${guildId}`);
  }

  removeBonusInvites(guildId: string, userId: string, amount: number): void {
    // TODO: Implement with Prisma when invite tracking schema is added
    console.log(`Remove ${amount} bonus invites for ${userId} in ${guildId}`);
  }

  removeNormalInvites(guildId: string, userId: string, amount: number): number {
    // TODO: Implement with Prisma when invite tracking schema is added
    console.log(`Remove ${amount} normal invites for ${userId} in ${guildId}`);
    return amount;
  }

  resetInvites(guildId: string, userId: string): void {
    // TODO: Implement with Prisma when invite tracking schema is added
    console.log(`Reset invites for ${userId} in ${guildId}`);
  }

  resetUserInvites(guildId: string, userId: string): { regular: number; left: number; fake: number; bonus: number; normalRemoved: number; bonusRemoved: number } {
    // TODO: Implement with Prisma when invite tracking schema is added
    console.log(`Reset invites for ${userId} in ${guildId}`);
    return { regular: 0, left: 0, fake: 0, bonus: 0, normalRemoved: 0, bonusRemoved: 0 };
  }

  getInviteData(guildId: string, userId: string): { inviterId: string | null; inviteCode: string | null; isVanity: boolean } {
    // TODO: Implement with Prisma when invite tracking schema is added
    return { inviterId: null, inviteCode: null, isVanity: false };
  }

  getInviteTrackers(guildId: string, userId: string): Array<{ inviteCode: string; uses: number; createdAt: Date; expiresAt: Date | null; maxUses: number | null }> {
    // TODO: Implement with Prisma when invite tracking schema is added
    return [];
  }

  // ===========================
  // Server stats panel methods (stub implementations)
  // ===========================

  createPanel(data: {
    guildId: string;
    panelName: string;
    channelType: 'vc' | 'text';
    categoryId: string;
    totalChannelId: string;
    usersChannelId: string;
    botsChannelId: string;
  }): void {
    // TODO: Implement with Prisma when server stats schema is added
    console.log(`Created panel ${data.panelName} for ${data.guildId}`);
  }

  getPanel(guildId: string, panelName: string): any {
    // TODO: Implement with Prisma when server stats schema is added
    return null;
  }

  getPanels(guildId: string): any[] {
    // TODO: Implement with Prisma when server stats schema is added
    return [];
  }

  getAllPanels(guildId: string): any[] {
    // TODO: Implement with Prisma when server stats schema is added
    return [];
  }

  deletePanel(guildId: string, panelName: string): boolean {
    // TODO: Implement with Prisma when server stats schema is added
    console.log(`Deleted panel ${panelName} for ${guildId}`);
    return true;
  }
}
