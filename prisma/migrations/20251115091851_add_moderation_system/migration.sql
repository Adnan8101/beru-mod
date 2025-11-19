-- CreateTable
CREATE TABLE "warns" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guild_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "moderator_id" TEXT NOT NULL,
    "reason" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "quarantine_config" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guild_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "access_channel_id" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "warns_guild_id_user_id_idx" ON "warns"("guild_id", "user_id");

-- CreateIndex
CREATE INDEX "warns_guild_id_created_at_idx" ON "warns"("guild_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "quarantine_config_guild_id_key" ON "quarantine_config"("guild_id");
