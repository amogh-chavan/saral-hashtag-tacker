import { Knex } from "knex";

export async function seed(knex: Knex): Promise<void> {
  // Deletes ALL existing entries
  await knex("tracked_hashtags").del();

  // Inserts seed entries
  await knex("tracked_hashtags").insert([
    { 
      name: "matcha",
      ig_hashtag_id: "17843758702042126",
      is_active: true 
    }
  ]);
}
