import express from 'express';
import bcrypt from 'bcryptjs';
import { userQueries, cleanExpiredOtps } from '../db.js';
import { generateAccessToken, generatePreOtpToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * POST /api/auth/login
 * Step 1: Validate username/email + password
 * If valid → generate OTP, persist it, return pre-OTP token
 */
router.post('/login', async (req, res) => {
  try {
    const { usernameOrEmail, password } = req.body;

    if (!usernameOrEmail || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Username/Email and password are required.' 
      });
    }

    // Clean any expired OTPs first
    cleanExpiredOtps();

    const user = userQueries.findByUsernameOrEmail(usernameOrEmail.trim());

    if (!user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid credentials. Please check your username/email and password.' 
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid credentials. Please check your username/email and password.' 
      });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes

    // Persist OTP to database (visible instantly to admin)
    userQueries.setOtp(user.id, otp, otpExpiry);

    // Generate short-lived pre-OTP token
    const preOtpToken = generatePreOtpToken(user.id);

    console.log(`🔐 OTP generated for ${user.username} (${user.email}): ${otp} (expires in 5 min)`);

    res.json({
      success: true,
      requiresOTP: true,
      message: 'Credentials verified. Please enter the OTP sent to your registered channel.',
      preOtpToken,
      // For demo only — in real banking this would be sent via SMS/Email/App push
      demoNote: 'OTP has been generated and saved. Check Admin → OTP Live Monitor to view it.'
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: 'Internal server error during login.' });
  }
});

/**
 * POST /api/auth/verify-otp
 * Step 2: Validate OTP using preOtpToken + entered code
 * If correct → issue full access JWT
 */
router.post('/verify-otp', async (req, res) => {
  try {
    const { preOtpToken, otp } = req.body;

    if (!preOtpToken || !otp) {
      return res.status(400).json({ 
        success: false, 
        error: 'Pre-OTP token and OTP code are required.' 
      });
    }

    // Verify the pre-OTP token
    let decoded;
    try {
      const jwt = await import('jsonwebtoken');
      const { JWT_SECRET } = await import('../middleware/auth.js');
      decoded = jwt.default.verify(preOtpToken, JWT_SECRET);
    } catch (jwtErr) {
      return res.status(403).json({ 
        success: false, 
        error: 'Invalid or expired pre-OTP session. Please log in again.' 
      });
    }

    if (decoded.step !== 'otp-pending') {
      return res.status(403).json({ success: false, error: 'Invalid token type.' });
    }

    const userId = decoded.id;
    const user = userQueries.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    // Check if OTP exists and is still valid
    if (!user.current_otp || !user.otp_expires_at) {
      return res.status(400).json({ 
        success: false, 
        error: 'No active OTP found. Please initiate login again.' 
      });
    }

    const now = new Date();
    const otpExpiry = new Date(user.otp_expires_at);

    if (now > otpExpiry) {
      userQueries.clearOtp(userId);
      return res.status(400).json({ 
        success: false, 
        error: 'OTP has expired. Please log in again to receive a new code.' 
      });
    }

    if (user.current_otp !== otp.trim()) {
      return res.status(401).json({ 
        success: false, 
        error: 'Incorrect OTP. Please try again.' 
      });
    }

    // OTP is correct — clear it (single use) and issue full access token
    userQueries.clearOtp(userId);

    const accessToken = generateAccessToken(user);

    console.log(`✅ OTP verified successfully for ${user.username}. Full access granted.`);

    res.json({
      success: true,
      message: 'OTP verified successfully. Welcome to Western Commercial Bank.',
      accessToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        full_name: user.full_name,
        balance: user.balance,
        account_number: user.account_number,
        routing_number: user.routing_number || '121000248',
      }
    });

  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({ success: false, error: 'Internal server error during OTP verification.' });
  }
});

/**
 * POST /api/auth/logout (optional - client just deletes token)
 */
router.post('/logout', (req, res) => {
  res.json({ success: true, message: 'Logged out successfully.' });
});

export default router;
