import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import userRoutes from './routes/user.js';
import { cleanExpiredOtps } from './db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

/**
 * =========================
 * CORS CONFIG (PRODUCTION READY)
 * =========================
 */
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'https://your-frontend.vercel.app' // 🔴 CHANGE THIS AFTER DEPLOYMENT
];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true
  })
);

/**
 * =========================
 * MIDDLEWARE
 * =========================
 */
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

/**
 * =========================
 * REQUEST LOGGER
 * =========================
 */
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} | ${req.method} ${req.path}`);
  next();
});

/**
 * =========================
 * HEALTH CHECK
 * =========================
 */
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Western Commercial Bank API is running',
    timestamp: new Date().toISOString()
  });
});

/**
 * =========================
 * ROUTES
 * =========================
 */
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/user', userRoutes);

/**
 * =========================
 * 404 HANDLER
 * =========================
 */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

/**
 * =========================
 * GLOBAL ERROR HANDLER
 * =========================
 */
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);

  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

/**
 * =========================
 * CLEANUP JOB (OTP)
 * =========================
 */
setInterval(() => {
  try {
    cleanExpiredOtps();
  } catch (err) {
    console.error('OTP cleanup error:', err);
  }
}, 2 * 60 * 1000);

/**
 * =========================
 * START SERVER (RENDER READY)
 * =========================
 */
app.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔══════════════════════════════════════╗
║   WESTERN COMMERCIAL BANK API       ║
╠══════════════════════════════════════╣
║  Port: ${PORT}
║  Environment: ${process.env.NODE_ENV || 'development'}
║  Status: Running
╚══════════════════════════════════════╝
  `);
});