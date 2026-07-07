import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function generateAccountNumber() {
  while (true) {
    const number = String(Math.floor(100000000000 + Math.random() * 900000000000));
    const existing = await db.user.findUnique({ where: { account_number: number } });
    if (!existing) return number;
  }
}

async function backfillAccountNumbers() {
  const users = await db.user.findMany({
    where: { OR: [{ account_number: null }, { account_number: '' }] },
    select: { id: true },
  });
  for (const user of users) {
    await db.user.update({
      where: { id: user.id },
      data: {
        account_number: await generateAccountNumber(),
        routing_number: '121000248',
      },
    });
  }
}

async function seedInitialData() {
  const adminExists = await db.user.findUnique({ where: { username: 'admin' }, select: { id: true } });
  if (!adminExists) {
    await db.user.create({
      data: {
        username: 'admin',
        email: 'admin@westernbank.com',
        password_hash: await bcrypt.hash('SecureAdmin2026!', 12),
        role: 'admin',
        full_name: 'System Administrator',
        balance: 0,
      },
    });
    console.log('👑 Default admin account created: admin / SecureAdmin2026!');
  }

  const userCount = await db.user.count({ where: { role: 'user' } });
  if (userCount === 0) {
    const demoUsers = [
      { username: 'chinedu_okafor', email: 'chinedu.okafor@email.com', full_name: 'Chinedu Okafor', balance: 5420.75 },
      { username: 'amara_eze', email: 'amara.eze@email.com', full_name: 'Amara Eze', balance: 12850.0 },
      { username: 'oluwaseun_ade', email: 'oluwaseun.ade@email.com', full_name: 'Oluwaseun Adebayo', balance: 3200.5 },
    ];

    for (const user of demoUsers) {
      await db.user.create({
        data: {
          ...user,
          password_hash: await bcrypt.hash('DemoUser2026!', 10),
          role: 'user',
          account_number: await generateAccountNumber(),
          routing_number: '121000248',
        },
      });
    }
    console.log('👥 Demo user accounts seeded (password: DemoUser2026! for all)');
  }
}

export async function initializeDatabase() {
  await seedInitialData();
  await backfillAccountNumbers();
  await cleanExpiredOtps();
  console.log('✅ Prisma database initialized');
}

export async function cleanExpiredOtps() {
  const result = await db.user.updateMany({
    where: { otp_expires_at: { lt: new Date() } },
    data: { current_otp: null, otp_expires_at: null },
  });
  if (result.count > 0) {
    console.log(`🧹 Cleaned ${result.count} expired OTP(s)`);
  }
  return result.count;
}

export const userQueries = {
  findByUsernameOrEmail: async (identifier) =>
    db.user.findFirst({
      where: { OR: [{ username: identifier }, { email: identifier }] },
    }),

  findById: async (id) => db.user.findUnique({ where: { id: Number(id) } }),

  createUser: async (userData) => {
    const { username, email, password_hash, role = 'user', full_name, balance = 0 } = userData;
    return db.user.create({
      data: {
        username,
        email,
        password_hash,
        role,
        full_name,
        balance,
        account_number: await generateAccountNumber(),
        routing_number: '121000248',
      },
    });
  },

  updateBalance: async (userId, newBalance) =>
    db.user.update({
      where: { id: Number(userId) },
      data: { balance: newBalance },
    }),

  setOtp: async (userId, otp, expiresAt) =>
    db.user.update({
      where: { id: Number(userId) },
      data: { current_otp: otp, otp_expires_at: new Date(expiresAt) },
    }),

  clearOtp: async (userId) =>
    db.user.update({
      where: { id: Number(userId) },
      data: { current_otp: null, otp_expires_at: null },
    }),

  updatePassword: async (userId, passwordHash) =>
    db.user.update({
      where: { id: Number(userId) },
      data: { password_hash: passwordHash },
    }),

  getAllUsers: async () => {
    const users = await db.user.findMany({
      include: {
        manager: {
          select: { full_name: true, username: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });
    return users.map((u) => ({
      ...u,
      managed_by_name: u.manager?.full_name || null,
      managed_by_username: u.manager?.username || null,
    }));
  },

  getUsersByModerator: async (moderatorId) =>
    db.user.findMany({
      where: { managed_by_id: Number(moderatorId), role: 'user' },
      orderBy: { created_at: 'desc' },
    }),

  getModerators: async () =>
    db.user.findMany({
      where: { role: 'moderator' },
      select: { id: true, username: true, email: true, full_name: true },
      orderBy: { full_name: 'asc' },
    }),

  setRestricted: async (userId, restricted) =>
    db.user.update({
      where: { id: Number(userId) },
      data: {
        is_restricted: !!restricted,
        is_transfer_restricted: !!restricted,
      },
    }),

  assignModerator: async (userId, moderatorId) =>
    db.user.update({
      where: { id: Number(userId) },
      data: { managed_by_id: moderatorId ? Number(moderatorId) : null },
    }),

  getActiveOtps: async () =>
    db.user.findMany({
      where: {
        current_otp: { not: null },
        otp_expires_at: { gt: new Date() },
      },
      select: {
        id: true,
        username: true,
        full_name: true,
        current_otp: true,
        otp_expires_at: true,
      },
      orderBy: { otp_expires_at: 'asc' },
    }),
};

export const transactionQueries = {
  create: async (fromUserId, toUserId, amount, description, type = 'transfer', createdAt = null) =>
    db.transaction.create({
      data: {
        from_user_id: Number(fromUserId),
        to_user_id: Number(toUserId),
        amount: Number(amount),
        description: description || null,
        type,
        created_at: createdAt ? new Date(createdAt) : undefined,
      },
      select: { id: true },
    }),

  createSeedTransactions: async (userId, transactions) => {
    const created = [];
    await db.$transaction(
      transactions.map((txn) => {
        const daysAgo = parseInt(txn.days_ago, 10) || 0;
        const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
        const type = txn.type || 'deposit';
        return db.transaction
          .create({
            data: {
              from_user_id: Number(userId),
              to_user_id: Number(userId),
              amount: Number(txn.amount),
              description: txn.description || type,
              type,
              created_at: createdAt,
            },
          })
          .then((result) => {
            created.push({ id: result.id, ...txn, created_at: createdAt.toISOString() });
          });
      })
    );
    return created;
  },

  getUserTransactions: async (userId, limit = 10, offset = 0) => {
    const rows = await db.transaction.findMany({
      where: {
        OR: [{ from_user_id: Number(userId) }, { to_user_id: Number(userId) }],
      },
      include: {
        from_user: { select: { full_name: true, username: true } },
        to_user: { select: { full_name: true, username: true } },
      },
      orderBy: { created_at: 'desc' },
      skip: Number(offset),
      take: Number(limit),
    });
    return rows.map((t) => ({
      ...t,
      from_name: t.from_user?.full_name || null,
      from_username: t.from_user?.username || null,
      to_name: t.to_user?.full_name || null,
      to_username: t.to_user?.username || null,
    }));
  },

  countUserTransactions: async (userId) =>
    db.transaction.count({
      where: {
        OR: [{ from_user_id: Number(userId) }, { to_user_id: Number(userId) }],
      },
    }),
};

export default db;
