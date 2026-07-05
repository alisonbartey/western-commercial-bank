import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-very-long-random-string-in-production-2026!';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

/**
 * Generate a full access JWT for authenticated + OTP-verified users
 */
export function generateAccessToken(user) {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role,
      full_name: user.full_name
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * Generate a short-lived pre-OTP token (used between password validation and OTP verification)
 */
export function generatePreOtpToken(userId) {
  return jwt.sign(
    {
      id: userId,
      step: 'otp-pending'
    },
    JWT_SECRET,
    { expiresIn: '10m' } // Short window for OTP entry
  );
}

/**
 * Middleware: Verify JWT token and attach user to req
 */
export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      error: 'Access denied. No token provided.' 
    });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ 
        success: false, 
        error: 'Invalid or expired token. Please log in again.' 
      });
    }

    // Block pre-OTP tokens from accessing protected routes
    if (decoded.step === 'otp-pending') {
      return res.status(403).json({ 
        success: false, 
        error: 'OTP verification required before accessing this resource.' 
      });
    }

    req.user = decoded; // { id, username, role, full_name }
    next();
  });
}

/**
 * Middleware: Require admin role (strict RBAC)
 */
export function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Authentication required.' });
  }
  
  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      success: false, 
      error: 'Access denied. Administrator privileges required.' 
    });
  }
  
  next();
}

/**
 * Middleware: Require admin or moderator role
 */
export function requireAdminOrModerator(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Authentication required.' });
  }

  if (req.user.role !== 'admin' && req.user.role !== 'moderator') {
    return res.status(403).json({
      success: false,
      error: 'Access denied. Staff privileges required.',
    });
  }

  next();
}

/**
 * Check if actor can manage a target user account
 */
export function canManageUser(actor, targetUser) {
  if (!actor || !targetUser) return false;
  if (actor.role === 'admin') return targetUser.role === 'user';
  if (actor.role === 'moderator') {
    return targetUser.role === 'user' && targetUser.managed_by_id === actor.id;
  }
  return false;
}

/**
 * Middleware: Require regular user role (or any authenticated)
 */
export function requireUser(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Authentication required.' });
  }
  
  if (req.user.role !== 'user' && req.user.role !== 'admin' && req.user.role !== 'moderator') {
    return res.status(403).json({ success: false, error: 'Invalid user role.' });
  }
  
  next();
}

export { JWT_SECRET };
