import type { Knex } from "knex";
import * as dotenv from 'dotenv';
import path from 'path';

// Load .env explicitly for knex CLI
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const config: { [key: string]: Knex.Config } = {
  development: {
    client: "pg",
    connection: process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/saral_hashtag_tracker",
    migrations: {
      directory: path.resolve(__dirname, "migrations"),
      extension: "ts"
    }
  }
};

export default config;
