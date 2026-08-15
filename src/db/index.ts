import knex from 'knex';
import knexConfig from './knexfile';

const environment = process.env.NODE_ENV || 'development';
const config = (knexConfig as any)[environment];

const db = knex(config);

export default db;
