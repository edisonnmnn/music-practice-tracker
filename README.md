# Music Practice Tracker

A full-stack web app to log music practice sessions and track progress over time.

> **Note:** Currently in development — some features may be incomplete or unstable.

## Features

- Log practice sessions with instrument, duration, date, and notes
- View progress with charts and statistics
- Calendar view of practice history
- User accounts with secure authentication

## Tech Stack

- **Frontend:** React, Vite, Chart.js
- **Backend:** Node.js, Express
- **Database:** PostgreSQL
- **Auth:** JWT

## Running Locally

**Prerequisites:** Node.js, PostgreSQL

1. Clone the repo and install dependencies:

   ```bash
   npm install
   cd client && npm install
   ```

2. Create a `.env` file in the root:

   ```env
   DATABASE_URL=postgresql://your_user@localhost:5432/music_tracker_v1
   JWT_SECRET=your_secret
   PORT=3001
   ```

3. Set up the database:

   ```bash
   psql -d music_tracker_v1 -f init.sql
   ```

4. Start the backend and frontend (separate terminals):

   ```bash
   npm run dev
   ```

   ```bash
   cd client && npm run dev
   ```

App runs at `http://localhost:5173`

## Deployment

- Backend hosted on [Railway](https://railway.app)
- Frontend hosted on [Vercel](https://vercel.com)
- Database hosted on Railway PostgreSQL

---

Created by Edison
