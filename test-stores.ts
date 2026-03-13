import { addWater, getWaterForDate } from './server/services/hydrationStore';
import { logActivity, getActivityForDate } from './server/services/activityStore';

const testUserId = 543471992; // user from logs

console.log('--- HYDRATION TEST ---');
console.log('Adding 250ml water...');
addWater(testUserId, 250);

const waterNow = getWaterForDate(testUserId, new Date());
console.log('Water for date:', waterNow);

console.log('\n--- ACTIVITY TEST ---');
console.log('Adding run 30m for 75kg...');
logActivity(testUserId, 'run', 30, 75);

const actNow = getActivityForDate(testUserId, new Date());
console.log('Activity for date:', actNow);
