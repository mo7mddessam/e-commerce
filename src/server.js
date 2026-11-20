import 'dotenv/config';
import app from './app.js';
import { initDb } from './config/initDb.js';
import { startReservationScheduler } from './reservationScheduler.js';

// Local / traditional hosting only. On Vercel the app is served by api/index.js.
await initDb();
startReservationScheduler();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
