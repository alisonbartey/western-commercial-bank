import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { UserPlus, Ban, CheckCircle, Plus, Trash2 } from 'lucide-react';

const EMPTY_TXN = { amount: '', description: '', type: 'deposit', days_ago: 1 };

const ROLE_STYLES = {
  admin: 'bg-purple-100 text-purple-700',
  moderator: 'bg-blue-100 text-blue-700',
  user: 'bg-slate-200 text-slate-700',
};

export default function AdminUsersTab({ isAdmin }) {
  const [users, setUsers] = useState([]);
  const [moderators, setModerators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    full_name: '',
    password: '',
    initial_balance: 1000,
    role: 'user',
    managed_by_id: '',
    initial_transactions: [],
  });
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [showTxnSection, setShowTxnSection] = useState(false);
  const [pendingTxns, setPendingTxns] = useState([{ ...EMPTY_TXN }]);

  const fetchUsers = async () => {
    try {
      const { data } = await api.get('/api/admin/users');
      if (data.success) setUsers(data.users);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchModerators = async () => {
    if (!isAdmin) return;
    try {
      const { data } = await api.get('/api/admin/moderators');
      if (data.success) setModerators(data.moderators);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchModerators();
  }, [isAdmin]);

  const resetCreateForm = () => {
    setNewUser({
      username: '',
      email: '',
      full_name: '',
      password: '',
      initial_balance: 1000,
      role: 'user',
      managed_by_id: '',
      initial_transactions: [],
    });
    setPendingTxns([{ ...EMPTY_TXN }]);
    setShowTxnSection(false);
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setMessage(null);

    const payload = {
      ...newUser,
      managed_by_id: newUser.managed_by_id || undefined,
    };

    if (newUser.role === 'user' && showTxnSection) {
      payload.initial_transactions = pendingTxns
        .filter((t) => t.amount && parseFloat(t.amount) > 0)
        .map((t) => ({
          amount: parseFloat(t.amount),
          description: t.description || 'Account activity',
          type: t.type,
          days_ago: parseInt(t.days_ago, 10) || 0,
        }));
    }

    try {
      const { data } = await api.post('/api/admin/users', payload);
      if (data.success) {
        const txnNote = data.user.seeded_transactions_count
          ? ` (${data.user.seeded_transactions_count} transaction(s) added)`
          : '';
        setMessage({ type: 'success', text: data.message + txnNote });
        setShowCreateModal(false);
        resetCreateForm();
        fetchUsers();
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to create user.' });
    } finally {
      setActionLoading(false);
    }
  };

  const adjustBalance = async (userId, operation) => {
    const amountStr = prompt(`Enter amount to ${operation} (in USD):`, '1000');
    if (!amountStr) return;

    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) return alert('Invalid amount');

    try {
      const { data } = await api.put(`/api/admin/users/${userId}/balance`, { amount, operation });
      if (data.success) {
        alert(`Balance updated. New balance: $${data.user.new_balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
        fetchUsers();
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update balance');
    }
  };

  const toggleRestrict = async (userId, currentlyRestricted) => {
    const action = currentlyRestricted ? 'remove restrictions from' : 'restrict';
    if (!confirm(`Are you sure you want to ${action} this account?`)) return;

    try {
      const { data } = await api.put(`/api/admin/users/${userId}/restrict`, {
        restricted: !currentlyRestricted,
      });
      if (data.success) {
        setMessage({ type: 'success', text: data.message });
        fetchUsers();
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update restriction');
    }
  };

  const assignModerator = async (userId, moderatorId) => {
    try {
      const { data } = await api.put(`/api/admin/users/${userId}/assign-moderator`, {
        moderator_id: moderatorId || null,
      });
      if (data.success) fetchUsers();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to assign moderator');
    }
  };

  const formatCurrency = (amt) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amt || 0);

  const customerUsers = users.filter((u) => u.role === 'user');

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-semibold text-navy">User Management</h2>
          <p className="text-slate-600">
            {isAdmin
              ? 'Manage all customer accounts, moderators, and restrictions'
              : 'Manage accounts assigned to you'}
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary flex items-center gap-2 text-sm px-5"
        >
          <UserPlus className="w-4 h-4" /> New Account
        </button>
      </div>

      {message && (
        <div
          className={`mb-4 p-3 rounded-2xl text-sm ${
            message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="admin-table w-full min-w-[800px]">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Username</th>
              <th>Balance</th>
              <th>Status</th>
              <th>Role</th>
              {isAdmin && <th>Moderator</th>}
              <th>Joined</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={isAdmin ? 8 : 7} className="p-8 text-center text-slate-400">
                  Loading users...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 8 : 7} className="p-8 text-center">
                  No users found.
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className={`hover:bg-slate-50 ${u.is_restricted ? 'bg-red-50/40' : ''}`}>
                  <td>
                    <div className="font-medium">{u.full_name}</div>
                    <div className="text-xs text-slate-500">{u.email}</div>
                  </td>
                  <td className="font-mono text-sm text-slate-600">@{u.username}</td>
                  <td>
                    <span className="font-semibold tabular-nums">{formatCurrency(u.balance)}</span>
                  </td>
                  <td>
                    {u.role === 'user' ? (
                      u.is_restricted ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-700 font-medium">
                          <Ban className="w-3 h-3" /> Restricted
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-emerald-100 text-emerald-700 font-medium">
                          <CheckCircle className="w-3 h-3" /> Active
                        </span>
                      )
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  <td>
                    <span
                      className={`inline-block px-3 py-0.5 text-xs rounded-full font-medium ${
                        ROLE_STYLES[u.role] || ROLE_STYLES.user
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="text-xs">
                      {u.role === 'user' ? (
                        <select
                          value={u.managed_by_id || ''}
                          onChange={(e) => assignModerator(u.id, e.target.value)}
                          className="border rounded-lg px-2 py-1 text-xs max-w-[140px]"
                        >
                          <option value="">Unassigned</option>
                          {moderators.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.full_name}
                            </option>
                          ))}
                        </select>
                      ) : u.managed_by_name ? (
                        <span className="text-slate-500">{u.managed_by_name}</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  )}
                  <td className="text-xs text-slate-500">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td className="text-right">
                    {u.role === 'user' && (
                      <div className="flex flex-wrap justify-end gap-x-2 gap-y-1">
                        <button
                          onClick={() => adjustBalance(u.id, 'credit')}
                          className="text-emerald-600 hover:underline text-xs font-medium"
                        >
                          + Credit
                        </button>
                        <button
                          onClick={() => adjustBalance(u.id, 'debit')}
                          className="text-red-600 hover:underline text-xs font-medium"
                        >
                          - Debit
                        </button>
                        <button
                          onClick={() => toggleRestrict(u.id, u.is_restricted)}
                          className={`text-xs font-medium hover:underline ${
                            u.is_restricted ? 'text-emerald-600' : 'text-orange-600'
                          }`}
                        >
                          {u.is_restricted ? 'Unrestrict' : 'Restrict'}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!loading && isAdmin && (
        <p className="text-xs text-slate-500 mt-3">
          {customerUsers.length} customer account(s) ·{' '}
          {customerUsers.filter((u) => u.is_restricted).length} restricted
        </p>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[100] p-4 overflow-y-auto">
          <div className="card w-full max-w-lg p-7 my-8">
            <h3 className="font-semibold text-xl mb-5 flex items-center gap-2">
              <UserPlus className="w-5 h-5" /> Create New Account
            </h3>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <input
                type="text"
                placeholder="Full Name"
                value={newUser.full_name}
                onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                className="w-full border rounded-2xl px-4 py-3"
                required
              />
              <input
                type="text"
                placeholder="Username (lowercase)"
                value={newUser.username}
                onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                className="w-full border rounded-2xl px-4 py-3 font-mono"
                required
              />
              <input
                type="email"
                placeholder="Email Address"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                className="w-full border rounded-2xl px-4 py-3"
                required
              />
              <input
                type="password"
                placeholder="Initial Password (min 8 chars)"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                className="w-full border rounded-2xl px-4 py-3"
                required
                minLength={8}
              />

              {isAdmin && (
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Account Type
                  </label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                    className="w-full border rounded-2xl px-4 py-3 mt-1"
                  >
                    <option value="user">Customer</option>
                    <option value="moderator">Moderator</option>
                  </select>
                </div>
              )}

              {isAdmin && newUser.role === 'user' && moderators.length > 0 && (
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Assign Moderator (optional)
                  </label>
                  <select
                    value={newUser.managed_by_id}
                    onChange={(e) => setNewUser({ ...newUser, managed_by_id: e.target.value })}
                    className="w-full border rounded-2xl px-4 py-3 mt-1"
                  >
                    <option value="">None</option>
                    {moderators.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.full_name} (@{m.username})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {newUser.role === 'user' && (
                <input
                  type="number"
                  placeholder="Initial Balance (USD)"
                  value={newUser.initial_balance}
                  onChange={(e) =>
                    setNewUser({ ...newUser, initial_balance: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full border rounded-2xl px-4 py-3"
                />
              )}

              {newUser.role === 'user' && (
                <div className="border border-slate-200 rounded-2xl p-4">
                  <button
                    type="button"
                    onClick={() => setShowTxnSection(!showTxnSection)}
                    className="text-sm font-medium text-navy flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    {showTxnSection ? 'Hide' : 'Add'} Recent Transaction History
                  </button>

                  {showTxnSection && (
                    <div className="mt-4 space-y-3">
                      <p className="text-xs text-slate-500">
                        Seed past transactions so the new user has activity on their account.
                      </p>
                      {pendingTxns.map((txn, idx) => (
                        <div key={idx} className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl">
                          <input
                            type="number"
                            placeholder="Amount"
                            value={txn.amount}
                            onChange={(e) => {
                              const updated = [...pendingTxns];
                              updated[idx] = { ...updated[idx], amount: e.target.value };
                              setPendingTxns(updated);
                            }}
                            className="border rounded-xl px-3 py-2 text-sm col-span-1"
                            step="0.01"
                            min="0.01"
                          />
                          <select
                            value={txn.type}
                            onChange={(e) => {
                              const updated = [...pendingTxns];
                              updated[idx] = { ...updated[idx], type: e.target.value };
                              setPendingTxns(updated);
                            }}
                            className="border rounded-xl px-3 py-2 text-sm"
                          >
                            <option value="deposit">Deposit</option>
                            <option value="transfer">Transfer</option>
                            <option value="external_transfer">External Transfer</option>
                            <option value="payment">Payment</option>
                          </select>
                          <input
                            type="text"
                            placeholder="Description"
                            value={txn.description}
                            onChange={(e) => {
                              const updated = [...pendingTxns];
                              updated[idx] = { ...updated[idx], description: e.target.value };
                              setPendingTxns(updated);
                            }}
                            className="border rounded-xl px-3 py-2 text-sm col-span-2"
                          />
                          <div className="col-span-2 flex items-center gap-2">
                            <label className="text-xs text-slate-500 whitespace-nowrap">Days ago:</label>
                            <input
                              type="number"
                              value={txn.days_ago}
                              min="0"
                              onChange={(e) => {
                                const updated = [...pendingTxns];
                                updated[idx] = { ...updated[idx], days_ago: e.target.value };
                                setPendingTxns(updated);
                              }}
                              className="border rounded-xl px-3 py-2 text-sm w-20"
                            />
                            {pendingTxns.length > 1 && (
                              <button
                                type="button"
                                onClick={() => setPendingTxns(pendingTxns.filter((_, i) => i !== idx))}
                                className="ml-auto text-red-500 p-1"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => setPendingTxns([...pendingTxns, { ...EMPTY_TXN }])}
                        className="text-xs text-navy font-medium flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Add another transaction
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    resetCreateForm();
                  }}
                  className="flex-1 btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" disabled={actionLoading} className="flex-1 btn-primary">
                  {actionLoading ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
