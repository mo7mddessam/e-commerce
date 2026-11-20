import 'dotenv/config';
import pg from 'pg';
import { Sequelize } from 'sequelize';

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  dialectModule: pg,
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
  pool: { max: 5, min: 0, idle: 10000, acquire: 30000 },
  logging: false,
});

export default sequelize;
