import type { Knex } from "knex";
import * as dotenv from 'dotenv';
import path from 'path';
import { config as envConfig } from '../config/env';

const config: { [key: string]: Knex.Config } = {
  development: {
    client: "pg",
    connection: envConfig.db.url || "postgres://postgres:postgres@localhost:15432/saral_hashtag_tracker",
    migrations: {
      directory: path.resolve(__dirname, "migrations"),
      extension: "ts"
    },
    seeds: {
      directory: path.resolve(__dirname, "seeds"),
      extension: "ts"
    }
  }
};

export default config;
