import sequelize from './database.js';
import '../models/index.js';

// Runs sequelize.sync() once per process (once per cold start on Vercel).
let ready = null;
export function initDb() {
    if (!ready) {
        ready = sequelize.sync().catch((err) => {
            ready = null; // retry on the next request
            throw err;
        });
    }
    return ready;
}
