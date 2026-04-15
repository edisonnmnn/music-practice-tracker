import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import session from 'express-session';
import { RedisStore } from 'connect-redis';
import passport from './config/passport';
import redis from './config/redis';
import authRouter from './routes/auth';
import sessionsRouter from './routes/sessions';
import coachingRouter from './routes/coaching';

// ── Validate required environment variables at startup ───────────────────────

const REQUIRED_ENV = [
  'DATABASE_URL',
  'SESSION_SECRET',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'GOOGLE_CALLBACK_URL',
  'REDIS_URL',
  'ANTHROPIC_API_KEY',
] as const;

for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`❌ Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

// ── App setup ────────────────────────────────────────────────────────────────

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  }),
);

app.use(express.json());

// ── Session store (Redis) ────────────────────────────────────────────────────

app.use(
  session({
    store: new RedisStore({ client: redis }),
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 1000 * 60 * 60 * 24 * 14, // 14 days
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    },
  }),
);

// ── Passport ─────────────────────────────────────────────────────────────────

app.use(passport.initialize());
app.use(passport.session());

// ── Routes ───────────────────────────────────────────────────────────────────

app.use('/auth', authRouter);
app.use('/api/sessions', sessionsRouter);
app.use('/api/coaching', coachingRouter);

app.get('/', (_req, res) => {
  res.json({ message: 'Practice Tracker API is running!' });
});

// ── Start ─────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
