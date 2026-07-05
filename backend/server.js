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

// CORS - allow frontend during development
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging (simple)
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} | ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Western Commercial Bank API is running',
    timestamp: new Date().toISOString()
  });
});

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/user', userRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    error: 'Endpoint not found. Please check the API documentation.' 
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    success: false, 
    error: 'An unexpected error occurred. Our team has been notified.' 
  });
});

// Periodic cleanup of expired OTPs (every 2 minutes)
setInterval(() => {
  cleanExpiredOtps();
}, 2 * 60 * 1000);

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║   🏦 WESTERN COMMERCIAL BANK - Backend Server Started      ║
╠════════════════════════════════════════════════════════════╣
║   API URL:      http://localhost:${PORT}                     ║
║   Health:       http://localhost:${PORT}/api/health          ║
║   Environment:  ${process.env.NODE_ENV || 'development'}                    ║
╚════════════════════════════════════════════════════════════╝

Ready to accept connections from the React frontend.
  `);
});
