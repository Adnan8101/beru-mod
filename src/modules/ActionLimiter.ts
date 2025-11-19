/**
 * ActionLimiter - Records events and evaluates sliding window counters
 */

import { PrismaClient } from '@prisma/client';
import { SecurityEvent, ProtectionAction } from '../types';
import { ConfigService } from '../services/ConfigService';

export class ActionLimiter {
  constructor(
    private prisma: PrismaClient,
    private configService: ConfigService
  ) {}

  /**
   * Record a security event and check if limit exceeded
   * Returns the count and whether limit was exceeded
   */
  async recordAndCheck(event: SecurityEvent): Promise<{ count: number; limitExceeded: boolean; limit?: number }> {
    // Record the action
    await this.prisma.antiNukeAction.create({
      data: {
        guildId: event.guildId,
        userId: event.userId,
        action: event.action,
        targetId: event.targetId,
        timestamp: event.timestamp,
        auditLogId: event.auditLogId,
        metadata: event.metadata ? JSON.stringify(event.metadata) : null,
      },
    });

    // Get limit configuration
    const limitConfig = await this.configService.getLimit(event.guildId, event.action);
    
    if (!limitConfig) {
      // No limit configured, allow action
      return { count: 1, limitExceeded: false };
    }

    // Calculate window start time
    const windowStart = new Date(event.timestamp.getTime() - limitConfig.windowMs);

    // Count actions in the sliding window
    const count = await this.prisma.antiNukeAction.count({
      where: {
        guildId: event.guildId,
        userId: event.userId,
        action: event.action,
        timestamp: {
          gte: windowStart,
          lte: event.timestamp,
        },
      },
    });

    const limitExceeded = count > limitConfig.limitCount;

    return {
      count,
      limitExceeded,
      limit: limitConfig.limitCount,
    };
  }

  /**
   * Get action count for a user in a time window
   */
  async getActionCount(
    guildId: string,
    userId: string,
    action: ProtectionAction,
    windowMs: number
  ): Promise<number> {
    const windowStart = new Date(Date.now() - windowMs);

    return await this.prisma.antiNukeAction.count({
      where: {
        guildId,
        userId,
        action,
        timestamp: {
          gte: windowStart,
        },
      },
    });
  }

  /**
   * Get recent actions for a guild
   */
  async getRecentActions(guildId: string, limit: number = 10): Promise<SecurityEvent[]> {
    const actions = await this.prisma.antiNukeAction.findMany({
      where: { guildId },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });

    return actions.map(action => ({
      guildId: action.guildId,
      userId: action.userId,
      action: action.action as ProtectionAction,
      targetId: action.targetId ?? undefined,
      auditLogId: action.auditLogId ?? undefined,
      timestamp: action.timestamp,
      metadata: action.metadata ? JSON.parse(action.metadata) : undefined,
    }));
  }

  /**
   * Clean up old actions (should be run periodically)
   */
  async cleanupOldActions(olderThanDays: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await this.prisma.antiNukeAction.deleteMany({
      where: {
        timestamp: {
          lt: cutoffDate,
        },
      },
    });

    return result.count;
  }

  /**
   * Clear all actions for a guild
   */
  async clearAllActions(guildId: string): Promise<void> {
    await this.prisma.antiNukeAction.deleteMany({
      where: { guildId },
    });
  }
}
