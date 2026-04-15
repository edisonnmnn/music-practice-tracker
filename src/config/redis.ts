import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null, // required by connect-redis
  enableReadyCheck: false,
  lazyConnect: true,
});

redis.on('connect', () => console.log('✅ Connected to Redis'));
redis.on('error', (err: Error) => console.error('❌ Redis error:', err));

export default redis;
