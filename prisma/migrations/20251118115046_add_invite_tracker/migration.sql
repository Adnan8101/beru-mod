-- CreateTable
CREATE TABLE "invite_tracker" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guild_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "total_invites" INTEGER NOT NULL DEFAULT 0,
    "left_invites" INTEGER NOT NULL DEFAULT 0,
    "fake_invites" INTEGER NOT NULL DEFAULT 0,
    "bonus_invites" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "invite_tracker_guild_id_idx" ON "invite_tracker"("guild_id");

-- CreateIndex
CREATE INDEX "invite_tracker_user_id_idx" ON "invite_tracker"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "invite_tracker_guild_id_user_id_key" ON "invite_tracker"("guild_id", "user_id");
