import express from 'express';
import { userQueries, transactionQueries } from '../db.js';
import { authenticateToken, requireUser } from '../middleware/auth.js';

const router = express.Router();

async function rejectIfRestricted(req, res) {
  const user = await userQueries.findById(req.user.id);
  if (user?.is_restricted) {
    res.status(403).json({
      success: false,
      error: 'Your account has been restricted. Please contact your bank administrator.',
      is_restricted: true,
    });
    return true;
  }
  return false;
}

// Protect all user routes
router.use(authenticateToken);
router.use(requireUser);

/**
 * GET /api/user/profile
 * Get current logged-in user's profile + balance
 */
router.get('/profile', async (req, res) => {
  try {
    const user = await userQueries.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        balance: user.balance,
        account_number: user.account_number,
        routing_number: user.routing_number || '121000248',
        is_restricted: !!user.is_restricted,
        created_at: user.created_at
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to load profile.' });
  }
});

/**
 * GET /api/user/transactions
 * Recent transaction history for current user
 */
router.get('/transactions', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const offset = parseInt(req.query.offset) || 0;
    const transactions = await transactionQueries.getUserTransactions(req.user.id, limit, offset);
    const total = await transactionQueries.countUserTransactions(req.user.id);

    res.json({ success: true, transactions, total });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to load transactions.' });
  }
});

/**
 * GET /api/user/lookup/:username
 * Validate a transfer recipient before sending
 */
router.get('/lookup/:username', async (req, res) => {
  try {
    const username = req.params.username?.trim();
    if (!username) {
      return res.status(400).json({ success: false, error: 'Username is required.' });
    }

    if (username === req.user.username) {
      return res.status(400).json({ success: false, error: 'You cannot transfer money to yourself.' });
    }

    const recipient = await userQueries.findByUsernameOrEmail(username);
    if (!recipient || recipient.role !== 'user') {
      return res.status(404).json({ success: false, error: 'Recipient not found.' });
    }

    if (recipient.is_restricted) {
      return res.status(400).json({ success: false, error: 'This recipient account cannot receive transfers.' });
    }

    res.json({
      success: true,
      recipient: {
        username: recipient.username,
        full_name: recipient.full_name,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Lookup failed.' });
  }
});

/**
 * GET /api/user/deposit-info
 * Direct deposit & mobile deposit details for the account
 */
router.get('/deposit-info', async (req, res) => {
  try {
    const user = await userQueries.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    res.json({
      success: true,
      depositInfo: {
        account_holder: user.full_name || user.username,
        account_number: user.account_number,
        routing_number: user.routing_number || '121000248',
        bank_name: 'Western Commercial Bank',
        account_type: 'Checking',
        mobile_deposit_limit: 10000,
        wire_instructions: 'Use routing 121000248 for domestic wires to Western Commercial Bank.',
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to load deposit information.' });
  }
});

/**
 * POST /api/user/transfer/external
 * External ACH / wire transfer
 */
router.post('/transfer/external', async (req, res) => {
  try {
    if (await rejectIfRestricted(req, res)) return;

    const {
      routing_number,
      account_number,
      amount,
      recipient_name,
      description = 'External transfer',
    } = req.body;
    const senderId = req.user.id;
    const transferAmount = parseFloat(amount);

    if (!routing_number || !account_number || !transferAmount || transferAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Routing number, account number, and a valid amount are required.',
      });
    }

    if (routing_number.length !== 9) {
      return res.status(400).json({ success: false, error: 'Routing number must be 9 digits.' });
    }

    const sender = await userQueries.findById(senderId);
    if (!sender) {
      return res.status(404).json({ success: false, error: 'Account not found.' });
    }

    if (sender.balance < transferAmount) {
      return res.status(400).json({ success: false, error: 'Insufficient balance for this transfer.' });
    }

    const newBalance = sender.balance - transferAmount;
    await userQueries.updateBalance(senderId, newBalance);

    const desc = description.trim() || `External transfer to ${recipient_name || account_number}`;
    const txn = await transactionQueries.create(
      senderId,
      senderId,
      transferAmount,
      `${desc} (Routing: ${routing_number}, Acct: ••••${String(account_number).slice(-4)})`,
      'external_transfer'
    );

    console.log(`🌐 External transfer: ${sender.username} → ${account_number} | $${transferAmount}`);

    res.json({
      success: true,
      message: 'External transfer initiated successfully.',
      transaction: {
        id: txn.id,
        amount: transferAmount,
        new_balance: newBalance,
      },
    });
  } catch (error) {
    console.error('External transfer error:', error);
    res.status(500).json({ success: false, error: 'External transfer failed. Please try again.' });
  }
});

/**
 * POST /api/user/deposit
 * @deprecated Use deposit-info for funding instructions
 */
router.post('/deposit', async (req, res) => {
  try {
    if (await rejectIfRestricted(req, res)) return;

    const { amount, description = 'Mobile deposit' } = req.body;
    const depositAmount = parseFloat(amount);

    if (!depositAmount || depositAmount <= 0) {
      return res.status(400).json({ success: false, error: 'A valid deposit amount is required.' });
    }

    if (depositAmount > 10000) {
      return res.status(400).json({ success: false, error: 'Deposit limit is $10,000 per transaction.' });
    }

    const user = await userQueries.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    const newBalance = user.balance + depositAmount;
    await userQueries.updateBalance(req.user.id, newBalance);
    await transactionQueries.create(
      req.user.id,
      req.user.id,
      depositAmount,
      description.trim() || 'Mobile deposit',
      'deposit'
    );

    res.json({
      success: true,
      message: `Deposit of $${depositAmount.toFixed(2)} completed successfully.`,
      new_balance: newBalance,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Deposit failed.' });
  }
});

/**
 * POST /api/user/change-password
 */
router.post('/change-password', async (req, res) => {
  try {
    const bcrypt = await import('bcryptjs');
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, error: 'Current and new passwords are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'New password must be at least 6 characters.' });
    }

    const user = await userQueries.findById(req.user.id);
    if (!user || !(await bcrypt.default.compare(currentPassword, user.password_hash))) {
      return res.status(401).json({ success: false, error: 'Current password is incorrect.' });
    }

    const hash = await bcrypt.default.hash(newPassword, 10);
    await userQueries.updatePassword(req.user.id, hash);

    res.json({ success: true, message: 'Password updated successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update password.' });
  }
});

/**
 * POST /api/user/transfer
 * Transfer funds to another user by username
 */
router.post('/transfer', async (req, res) => {
  try {
    if (await rejectIfRestricted(req, res)) return;

    const { recipient_username, amount, description = 'Bank transfer' } = req.body;
    const senderId = req.user.id;

    if (!recipient_username || !amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Recipient username and positive amount are required.' 
      });
    }

    const transferAmount = parseFloat(amount);

    // Get sender
    const sender = await userQueries.findById(senderId);
    if (!sender) {
      return res.status(404).json({ success: false, error: 'Sender not found.' });
    }

    if (sender.balance < transferAmount) {
      return res.status(400).json({ 
        success: false, 
        error: 'Insufficient balance for this transfer.' 
      });
    }

    // Find recipient
    const recipient = await userQueries.findByUsernameOrEmail(recipient_username.trim());
    if (!recipient) {
      return res.status(404).json({ 
        success: false, 
        error: 'Recipient not found. Please check the username.' 
      });
    }

    if (recipient.id === senderId) {
      return res.status(400).json({ 
        success: false, 
        error: 'You cannot transfer money to yourself.' 
      });
    }

    if (recipient.is_restricted) {
      return res.status(400).json({ success: false, error: 'This recipient account cannot receive transfers.' });
    }

    // Perform atomic balance updates
    const newSenderBalance = sender.balance - transferAmount;
    const newRecipientBalance = recipient.balance + transferAmount;

    await userQueries.updateBalance(senderId, newSenderBalance);
    await userQueries.updateBalance(recipient.id, newRecipientBalance);

    // Record transaction
    const txn = await transactionQueries.create(
      senderId, 
      recipient.id, 
      transferAmount, 
      description.trim() || 'Bank transfer'
    );

    console.log(`💸 Transfer: ${sender.username} → ${recipient.username} | $${transferAmount}`);

    res.json({
      success: true,
      message: 'Transfer completed successfully.',
      transaction: {
        id: txn.id,
        amount: transferAmount,
        recipient: recipient.full_name || recipient.username,
        new_balance: newSenderBalance
      }
    });
  } catch (error) {
    console.error('Transfer error:', error);
    res.status(500).json({ success: false, error: 'Transfer failed. Please try again.' });
  }
});

export default router;
