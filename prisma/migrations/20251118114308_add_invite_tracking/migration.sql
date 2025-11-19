-- CreateTable
CREATE TABLE "invite_cache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guild_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "inviter_id" TEXT,
    "inviter_tag" TEXT,
    "uses" INTEGER NOT NULL DEFAULT 0,
    "max_uses" INTEGER NOT NULL DEFAULT 0,
    "temporary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "member_join_data" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guild_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "inviter_id" TEXT,
    "inviter_tag" TEXT,
    "invite_code" TEXT,
    "join_type" TEXT NOT NULL,
    "joined_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "invite_cache_guild_id_idx" ON "invite_cache"("guild_id");

-- CreateIndex
CREATE INDEX "invite_cache_inviter_id_idx" ON "invite_cache"("inviter_id");

-- CreateIndex
CREATE UNIQUE INDEX "invite_cache_guild_id_code_key" ON "invite_cache"("guild_id", "code");

-- CreateIndex
CREATE INDEX "member_join_data_guild_id_idx" ON "member_join_data"("guild_id");

-- CreateIndex
CREATE INDEX "member_join_data_inviter_id_idx" ON "member_join_data"("inviter_id");

-- CreateIndex
CREATE UNIQUE INDEX "member_join_data_guild_id_user_id_key" ON "member_join_data"("guild_id", "user_id");
