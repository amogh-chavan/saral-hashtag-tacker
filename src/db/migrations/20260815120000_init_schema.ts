import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // 1. Create tracked_hashtags table
  await knex.schema.createTable("tracked_hashtags", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.string("name").notNullable().unique();
    table.string("ig_hashtag_id").notNullable().unique();
    table.boolean("is_active").notNullable().defaultTo(true);
    table.timestamps(true, true);
  });

  // 2. Create media table (Cold Data)
  await knex.schema.createTable("media", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.string("ig_media_id").notNullable().unique();
    table.enum("media_type", ["IMAGE", "VIDEO", "CAROUSEL_ALBUM"], { useNative: true, enumName: "media_type_enum" }).notNullable();
    table.string("caption", 10000);
    table.string("permalink").notNullable();
    table.string("asset_key", 2048);
    table.timestamp("posted_at").notNullable();
    table.timestamps(true, true);

    // Use a partial index for posted_at to only track media that has been downloaded
    // This perfectly optimizes the `WHERE asset_key IS NOT NULL ORDER BY posted_at DESC` query
    table.index(['posted_at'], 'idx_media_posted_at_has_asset', { 
      predicate: knex.whereNotNull('asset_key')
    });
  });

  // 3. Create media_metrics table (Hot Data - 1 to 1 relation with media)
  await knex.schema.createTable("media_metrics", (table) => {
    table.uuid("media_id").primary().references("id").inTable("media").onDelete("CASCADE");
    table.integer("like_count").notNullable().defaultTo(0);
    table.integer("comments_count").notNullable().defaultTo(0);
    table.timestamp("last_synced_at").notNullable().defaultTo(knex.fn.now());
  });

  // 4. Create media_hashtags join table
  await knex.schema.createTable("media_hashtags", (table) => {
    table.uuid("media_id").notNullable().references("id").inTable("media").onDelete("CASCADE");
    table.uuid("hashtag_id").notNullable().references("id").inTable("tracked_hashtags").onDelete("CASCADE");
    table.specificType("sources", "text[]").notNullable().defaultTo(knex.raw("ARRAY[]::text[]"));
    
    table.primary(["media_id", "hashtag_id"]);
    table.index("hashtag_id");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("media_hashtags");
  await knex.schema.dropTableIfExists("media_metrics");
  await knex.schema.dropTableIfExists("media");
  await knex.schema.dropTableIfExists("tracked_hashtags");
}
