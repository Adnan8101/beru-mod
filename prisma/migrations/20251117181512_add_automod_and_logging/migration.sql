-- CreateTable
CREATE TABLE "automod_config" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guild_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "max_messages" INTEGER DEFAULT 5,
    "time_span_ms" INTEGER DEFAULT 5000,
    "max_lines" INTEGER DEFAULT 10,
    "max_mentions" INTEGER DEFAULT 5,
    "punishment_type" TEXT DEFAULT 'timeout',
    "punishment_duration" INTEGER DEFAULT 300,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "automod_whitelist" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guild_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "logging_config" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guild_id" TEXT NOT NULL,
    "channel_id" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "log_role_create" BOOLEAN NOT NULL DEFAULT true,
    "log_role_edit" BOOLEAN NOT NULL DEFAULT true,
    "log_role_delete" BOOLEAN NOT NULL DEFAULT true,
    "log_channel_create" BOOLEAN NOT NULL DEFAULT true,
    "log_channel_edit" BOOLEAN NOT NULL DEFAULT true,
    "log_channel_delete" BOOLEAN NOT NULL DEFAULT true,
    "log_message_edit" BOOLEAN NOT NULL DEFAULT true,
    "log_message_delete" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "automod_config_guild_id_idx" ON "automod_config"("guild_id");

-- CreateIndex
CREATE UNIQUE INDEX "automod_config_guild_id_type_key" ON "automod_config"("guild_id", "type");

-- CreateIndex
CREATE INDEX "automod_whitelist_guild_id_type_idx" ON "automod_whitelist"("guild_id", "type");

-- CreateIndex
CREATE UNIQUE INDEX "automod_whitelist_guild_id_type_target_id_key" ON "automod_whitelist"("guild_id", "type", "target_id");

-- CreateIndex
CREATE UNIQUE INDEX "logging_config_guild_id_key" ON "logging_config"("guild_id");
