-- CreateTable
CREATE TABLE "antinuke_config" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guild_id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "protections" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "antinuke_limits" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guild_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "limit_count" INTEGER NOT NULL,
    "window_ms" INTEGER NOT NULL DEFAULT 10000,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "antinuke_punishments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guild_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "punishment" TEXT NOT NULL,
    "duration_seconds" INTEGER,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "antinuke_actions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guild_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "target_id" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "audit_log_id" TEXT,
    "metadata" TEXT
);

-- CreateTable
CREATE TABLE "whitelist" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guild_id" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "is_role" BOOLEAN NOT NULL,
    "category" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "guild_logging" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guild_id" TEXT NOT NULL,
    "mod_channel" TEXT,
    "security_channel" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "moderation_cases" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "case_number" INTEGER NOT NULL,
    "guild_id" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "moderator_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "reason" TEXT,
    "metadata" TEXT,
    "overturned" BOOLEAN NOT NULL DEFAULT false,
    "overturned_by" TEXT,
    "overturned_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "role_backups" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guild_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "permissions" TEXT NOT NULL,
    "hoist" BOOLEAN NOT NULL,
    "mentionable" BOOLEAN NOT NULL,
    "icon" TEXT,
    "metadata" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "channel_backups" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guild_id" TEXT NOT NULL,
    "channel_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "parent_id" TEXT,
    "topic" TEXT,
    "nsfw" BOOLEAN NOT NULL DEFAULT false,
    "permission_overwrites" TEXT,
    "metadata" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "job_queue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "state" TEXT NOT NULL DEFAULT 'created',
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "retry_limit" INTEGER NOT NULL DEFAULT 3,
    "error" TEXT,
    "started_at" DATETIME,
    "completed_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "antinuke_config_guild_id_key" ON "antinuke_config"("guild_id");

-- CreateIndex
CREATE INDEX "antinuke_config_guild_id_idx" ON "antinuke_config"("guild_id");

-- CreateIndex
CREATE INDEX "antinuke_limits_guild_id_idx" ON "antinuke_limits"("guild_id");

-- CreateIndex
CREATE UNIQUE INDEX "antinuke_limits_guild_id_action_key" ON "antinuke_limits"("guild_id", "action");

-- CreateIndex
CREATE INDEX "antinuke_punishments_guild_id_idx" ON "antinuke_punishments"("guild_id");

-- CreateIndex
CREATE UNIQUE INDEX "antinuke_punishments_guild_id_action_key" ON "antinuke_punishments"("guild_id", "action");

-- CreateIndex
CREATE INDEX "antinuke_actions_guild_id_user_id_action_timestamp_idx" ON "antinuke_actions"("guild_id", "user_id", "action", "timestamp");

-- CreateIndex
CREATE INDEX "antinuke_actions_guild_id_timestamp_idx" ON "antinuke_actions"("guild_id", "timestamp");

-- CreateIndex
CREATE INDEX "whitelist_guild_id_target_id_idx" ON "whitelist"("guild_id", "target_id");

-- CreateIndex
CREATE INDEX "whitelist_guild_id_category_idx" ON "whitelist"("guild_id", "category");

-- CreateIndex
CREATE UNIQUE INDEX "whitelist_guild_id_target_id_category_key" ON "whitelist"("guild_id", "target_id", "category");

-- CreateIndex
CREATE UNIQUE INDEX "guild_logging_guild_id_key" ON "guild_logging"("guild_id");

-- CreateIndex
CREATE INDEX "moderation_cases_guild_id_target_id_idx" ON "moderation_cases"("guild_id", "target_id");

-- CreateIndex
CREATE INDEX "moderation_cases_guild_id_created_at_idx" ON "moderation_cases"("guild_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "moderation_cases_guild_id_case_number_key" ON "moderation_cases"("guild_id", "case_number");

-- CreateIndex
CREATE INDEX "role_backups_guild_id_created_at_idx" ON "role_backups"("guild_id", "created_at");

-- CreateIndex
CREATE INDEX "channel_backups_guild_id_created_at_idx" ON "channel_backups"("guild_id", "created_at");

-- CreateIndex
CREATE INDEX "job_queue_state_priority_created_at_idx" ON "job_queue"("state", "priority", "created_at");

-- CreateIndex
CREATE INDEX "job_queue_name_state_idx" ON "job_queue"("name", "state");
