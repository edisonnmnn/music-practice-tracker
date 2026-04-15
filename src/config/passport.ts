import passport from 'passport';
import { Strategy as GoogleStrategy, Profile } from 'passport-google-oauth20';
import pool from './db';
import { User } from '../types';

// Only register the Google strategy if credentials are configured
if (
  process.env.GOOGLE_CLIENT_ID &&
  process.env.GOOGLE_CLIENT_SECRET &&
  process.env.GOOGLE_CALLBACK_URL
) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
      },
      async (
        _accessToken: string,
        _refreshToken: string,
        profile: Profile,
        done: (error: Error | null, user?: User | false) => void,
      ) => {
        try {
          const email = profile.emails?.[0]?.value ?? null;
          const name = profile.displayName;
          const googleId = profile.id;
          const profilePicture = profile.photos?.[0]?.value ?? null;

          // Check if user already exists
          const existing = await pool.query<User>(
            'SELECT * FROM users WHERE google_id = $1',
            [googleId],
          );

          if (existing.rows.length > 0) {
            return done(null, existing.rows[0]);
          }

          // Create new user on first login
          const result = await pool.query<User>(
            `INSERT INTO users (name, email, google_id, profile_picture)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [name, email, googleId, profilePicture],
          );

          return done(null, result.rows[0]);
        } catch (error) {
          return done(error as Error);
        }
      },
    ),
  );
}

passport.serializeUser((user, done) => {
  done(null, (user as User).id);
});

passport.deserializeUser(async (id: number, done) => {
  try {
    const result = await pool.query<User>('SELECT * FROM users WHERE id = $1', [id]);
    done(null, result.rows[0] ?? false);
  } catch (error) {
    done(error as Error);
  }
});

export default passport;
