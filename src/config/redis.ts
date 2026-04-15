import { createClient } from 'redis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const redis = createClient({ url: redisUrl });

redis.on('connect', () => console.log('✅ Connected to Redis'));
redis.on('error', (err: Error) => console.error('❌ Redis error:', err.message));

redis.connect().catch((err) => {
  console.error('❌ Redis initial connection failed:', err.message);
});

export default redis;
