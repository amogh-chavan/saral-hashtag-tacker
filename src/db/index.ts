import knex from 'knex';
import knexConfig from './knexfile';
import { config as envConfig } from '../config/env';

const environment = envConfig.nodeEnv;
const config = (knexConfig as any)[environment];

const db = knex(config);

export default db;
