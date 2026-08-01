import app from './app.js';
import { env } from './config/env.js';
import { startHoldCleanupInterval } from './jobs/releaseExpiredHolds.js';

const PORT = env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`===========================================`);
  console.log(`🎬 CineBook API Server running on port ${PORT}`);
  console.log(`📡 CORS Origin allowed: ${env.CLIENT_URL}`);
  console.log(`===========================================`);

  // Start background job for seat hold cleanup
  startHoldCleanupInterval(60000);
});
