// ── Database row shapes ──────────────────────────────────────────────────────

export interface User {
  id: number;
  name: string;
  email: string;
  google_id: string;
  profile_picture: string | null;
  created_at: Date;
}

export interface PracticeSession {
  id: number;
  user_id: number;
  instrument: string;
  duration: number; // minutes
  notes: string | null;
  date: Date;
  created_at: Date;
}

export interface CoachingHistory {
  id: number;
  user_id: number;
  response_text: string;
  session_count: number;
  created_at: Date;
}

// ── Stats shape returned by /api/sessions/stats ──────────────────────────────

export interface SessionStats {
  totalSessions: number;
  totalMinutes: number;
  totalHours: number;
  practiceByDate: Array<{ date: Date; minutes: number }>;
}

// ── Express request augmentation ─────────────────────────────────────────────
// Passport serialises the full User into req.user; userId is the numeric PK.

declare global {
  namespace Express {
    interface User {
      id: number;
      name: string;
      email: string;
      google_id: string;
      profile_picture: string | null;
      created_at: Date;
    }
  }
}
