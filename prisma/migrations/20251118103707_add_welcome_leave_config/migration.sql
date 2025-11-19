-- CreateTable
CREATE TABLE "welcome_config" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guild_id" TEXT NOT NULL,
    "welcome_channel_id" TEXT,
    "leave_channel_id" TEXT,
    "welcome_message" TEXT,
    "leave_message" TEXT,
    "welcome_enabled" BOOLEAN NOT NULL DEFAULT false,
    "leave_enabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "welcome_config_guild_id_key" ON "welcome_config"("guild_id");
