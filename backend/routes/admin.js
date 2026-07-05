import express from 'express';
import bcrypt from 'bcryptjs';
import db, { userQueries, transactionQueries } from '../db.js';
import {
  authenticateToken,
  requireAdmin,
  requireAdminOrModerator,
  canManageUser,
} from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);
router.use(requireAdminOrModerator);

function getManageableUsers(req) {
  if (req.user.role === 'admin') {
    return userQueries.getAllUsers();
  }
  return userQueries.getUsersByModerator(req.user.id);
}

function assertCanManage(req, res, targetUser) {
  if (!targetUser) {
    res.status(404).json({ success: false, error: 'User not found.' });
    return false;
  }
  if (!canManageUser(req.user, targetUser)) {
    res.status(403).json({
      success: false,
      error: 'You do not have permission to manage this account.',
    });
    return false;
  }
  return true;
}

/**
 * GET /api/admin/users
 */
router.get('/users', (req, res) => {
  try {
    const users = getManageableUsers(req);
    const safeUsers = users.map((u) => ({
      ...u,
      is_restricted: !!u.is_restricted,
      password_hash: undefined,
      current_otp: u.current_otp ? '••••••' : null,
    }));
    res.json({ success: true, users: safeUsers });
  } catch (error) {
    console.error('Admin get users error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch users.' });
  }
});

/**
 * GET /api/admin/moderators (admin only)
 */
router.get('/moderators', requireAdmin, (req, res) => {
  try {
    const moderators = userQueries.getModerators();
    res.json({ success: true, moderators });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch moderators.' });
  }
});

/**
 * POST /api/admin/users
 */
router.post('/users', async (req, res) => {
  try {
    const {
      username,
      email,
      password,
      full_name,
      initial_balance = 0,
      role = 'user',
      managed_by_id,
      initial_transactions = [],
    } = req.body;

    if (!username || !email || !password || !full_name) {
      return res.status(400).json({
        success: false,
        error: 'Username, email, password, and full name are required.',
      });
    }

    if (password.length < 8) {
      return res.status(400).json({ success: false, error: 'Password must be at least 8 characters.' });
    }

    let resolvedRole = 'user';
    if (role === 'moderator') {
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Only administrators can create moderator accounts.',
        });
      }
      resolvedRole = 'moderator';
    } else if (role === 'admin' && req.user.role === 'admin') {
      resolvedRole = 'admin';
    }

    let resolvedManagedBy = null;
    if (resolvedRole === 'user') {
      if (req.user.role === 'moderator') {
        resolvedManagedBy = req.user.id;
      } else if (managed_by_id) {
        const moderator = userQueries.findById(parseInt(managed_by_id, 10));
        if (!moderator || moderator.role !== 'moderator') {
          return res.status(400).json({ success: false, error: 'Invalid moderator assignment.' });
        }
        resolvedManagedBy = moderator.id;
      }
    }

    const existing =
      userQueries.findByUsernameOrEmail(username) ||
      userQueries.findByUsernameOrEmail(email);
    if (existing) {
      return res.status(409).json({ success: false, error: 'Username or email already exists.' });
    }

    const password_hash = await bcrypt.hash(password, 12);

    const newUser = userQueries.createUser({
      username: username.trim().toLowerCase(),
      email: email.trim().toLowerCase(),
      password_hash,
      role: resolvedRole,
      full_name: full_name.trim(),
      balance: parseFloat(initial_balance) || 0,
    });

    if (resolvedManagedBy) {
      userQueries.assignModerator(newUser.id, resolvedManagedBy);
    }

    db.prepare(`
      UPDATE users
      SET account_number = ?, routing_number = COALESCE(routing_number, '121000248')
      WHERE id = ? AND (account_number IS NULL OR account_number = '')
    `).run(
      String(Math.floor(100000000000 + Math.random() * 900000000000)),
      newUser.id
    );

    let seededTransactions = [];
    if (
      resolvedRole === 'user' &&
      Array.isArray(initial_transactions) &&
      initial_transactions.length > 0
    ) {
      const validTxns = initial_transactions
        .filter((t) => t.amount && parseFloat(t.amount) > 0)
        .map((t) => ({
          amount: parseFloat(t.amount),
          description: (t.description || 'Account activity').trim(),
          type: t.type || 'deposit',
          days_ago: parseInt(t.days_ago, 10) || 0,
        }));

      if (validTxns.length > 0) {
        seededTransactions = transactionQueries.createSeedTransactions(newUser.id, validTxns);
      }
    }

    console.log(`👤 New ${resolvedRole} created by ${req.user.username}: ${newUser.username} (ID: ${newUser.id})`);

    res.status(201).json({
      success: true,
      message: 'User account created successfully.',
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        full_name: newUser.full_name,
        role: resolvedRole,
        balance: newUser.balance,
        managed_by_id: resolvedManagedBy,
        seeded_transactions_count: seededTransactions.length,
      },
    });
  } catch (error) {
    console.error('Admin create user error:', error);
    res.status(500).json({ success: false, error: 'Failed to create user account.' });
  }
});

/**
 * PUT /api/admin/users/:id/balance
 */
router.put('/users/:id/balance', (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const { amount, operation = 'credit' } = req.body;

    if (!userId || isNaN(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Valid user ID and positive amount are required.',
      });
    }

    const user = userQueries.findById(userId);
    if (!assertCanManage(req, res, user)) return;

    let newBalance;
    if (operation === 'credit') {
      newBalance = user.balance + parseFloat(amount);
    } else if (operation === 'debit') {
      if (user.balance < parseFloat(amount)) {
        return res.status(400).json({ success: false, error: 'Insufficient balance for debit operation.' });
      }
      newBalance = user.balance - parseFloat(amount);
    } else {
      return res.status(400).json({ success: false, error: 'Operation must be "credit" or "debit".' });
    }

    userQueries.updateBalance(userId, newBalance);
    console.log(`💰 Balance ${operation} for ${user.username}: $${amount} → New balance: $${newBalance}`);

    res.json({
      success: true,
      message: `Balance ${operation}ed successfully.`,
      user: {
        id: user.id,
        username: user.username,
        previous_balance: user.balance,
        new_balance: newBalance,
      },
    });
  } catch (error) {
    console.error('Admin balance update error:', error);
    res.status(500).json({ success: false, error: 'Failed to update balance.' });
  }
});

/**
 * PUT /api/admin/users/:id/restrict
 */
router.put('/users/:id/restrict', (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const { restricted = true } = req.body;

    const user = userQueries.findById(userId);
    if (!assertCanManage(req, res, user)) return;

    userQueries.setRestricted(userId, !!restricted);

    res.json({
      success: true,
      message: restricted
        ? 'Account has been restricted. User cannot perform banking operations.'
        : 'Account restriction has been removed.',
      user: {
        id: user.id,
        username: user.username,
        is_restricted: !!restricted,
      },
    });
  } catch (error) {
    console.error('Admin restrict user error:', error);
    res.status(500).json({ success: false, error: 'Failed to update account restriction.' });
  }
});

/**
 * PUT /api/admin/users/:id/assign-moderator (admin only)
 */
router.put('/users/:id/assign-moderator', requireAdmin, (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const { moderator_id } = req.body;

    const user = userQueries.findById(userId);
    if (!user || user.role !== 'user') {
      return res.status(404).json({ success: false, error: 'Customer account not found.' });
    }

    if (moderator_id) {
      const moderator = userQueries.findById(parseInt(moderator_id, 10));
      if (!moderator || moderator.role !== 'moderator') {
        return res.status(400).json({ success: false, error: 'Invalid moderator.' });
      }
      userQueries.assignModerator(userId, moderator.id);
    } else {
      userQueries.assignModerator(userId, null);
    }

    res.json({
      success: true,
      message: 'Moderator assignment updated.',
      user: { id: user.id, managed_by_id: moderator_id || null },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to assign moderator.' });
  }
});

/**
 * GET /api/admin/otps
 */
router.get('/otps', (req, res) => {
  try {
    const activeOtps = userQueries.getActiveOtps();
    const manageableIds = new Set(
      getManageableUsers(req)
        .filter((u) => u.role === 'user')
        .map((u) => u.id)
    );

    const filtered =
      req.user.role === 'admin'
        ? activeOtps
        : activeOtps.filter((o) => manageableIds.has(o.id));

    const otpsWithTimeLeft = filtered.map((otpUser) => {
      const expiresAt = new Date(otpUser.otp_expires_at);
      const msLeft = Math.max(0, expiresAt.getTime() - Date.now());
      const minutesLeft = Math.floor(msLeft / 60000);
      const secondsLeft = Math.floor((msLeft % 60000) / 1000);

      return {
        user_id: otpUser.id,
        username: otpUser.username,
        full_name: otpUser.full_name,
        otp: otpUser.current_otp,
        expires_at: otpUser.otp_expires_at,
        time_remaining: `${minutesLeft}m ${secondsLeft}s`,
      };
    });

    res.json({
      success: true,
      count: otpsWithTimeLeft.length,
      active_otps: otpsWithTimeLeft,
    });
  } catch (error) {
    console.error('Admin OTP monitor error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch active OTPs.' });
  }
});

/**
 * GET /api/admin/dashboard-stats
 */
router.get('/dashboard-stats', (req, res) => {
  try {
    const users = getManageableUsers(req);
    const customerUsers = users.filter((u) => u.role === 'user');
    const totalBalance = customerUsers.reduce((sum, u) => sum + (u.balance || 0), 0);
    const restrictedCount = customerUsers.filter((u) => u.is_restricted).length;

    res.json({
      success: true,
      stats: {
        total_users: customerUsers.length,
        total_system_balance: totalBalance,
        restricted_accounts: restrictedCount,
        active_otps_count: userQueries.getActiveOtps().length,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to load dashboard stats.' });
  }
});

export default router;
