-- CreateTable
CREATE TABLE "auto_responders" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guild_id" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_by" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "auto_responders_guild_id_enabled_idx" ON "auto_responders"("guild_id", "enabled");

-- CreateIndex
CREATE UNIQUE INDEX "auto_responders_guild_id_trigger_key" ON "auto_responders"("guild_id", "trigger");
