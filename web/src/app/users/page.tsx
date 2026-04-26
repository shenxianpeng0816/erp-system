'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { User, UserRole } from '@/types/erp'

const ROLES: UserRole[] = ['ADMIN', 'SALES', 'FINANCE', 'WAREHOUSE', 'INBOUND']
const ROLE_COLOR: Record<string, string> = {
  ADMIN: 'bg-purple-100 text-purple-700',
  SALES: 'bg-blue-100 text-blue-700',
  FINANCE: 'bg-emerald-100 text-emerald-700',
  WAREHOUSE: 'bg-amber-100 text-amber-700',
  INBOUND: 'bg-orange-100 text-orange-700',
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editUser, setEditUser] = useState<Partial<User & { password?: string }>>({ role: 'SALES' })
  const [editId, setEditId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadUsers() }, [])

  const loadUsers = async () => {
    setLoading(true)
    try { setUsers(await api.get<User[]>('/users')) }
    finally { setLoading(false) }
  }

  const handleSave = async () => {
    if (!editUser.username || !editUser.realName) return
    setSaving(true)
    try {
      if (editId) await api.put(`/users/${editId}`, editUser)
      else await api.post('/users', editUser)
      setShowForm(false); setEditUser({ role: 'SALES' }); setEditId(null)
      loadUsers()
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Disable this user?')) return
    await api.delete(`/users/${id}`)
    loadUsers()
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">User Management</h1>
          <p className="text-slate-500 text-sm mt-1">Manage staff accounts & roles</p>
        </div>
        <button onClick={() => { setShowForm(true); setEditUser({ role: 'SALES' }); setEditId(null) }}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg">
          + Add User
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr className="text-left text-slate-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-3">Name</th>
                <th className="px-6 py-3">Username</th>
                <th className="px-6 py-3">Role</th>
                <th className="px-6 py-3">Phone</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-3 font-semibold text-slate-800">{u.realName}</td>
                  <td className="px-6 py-3 font-mono text-slate-600">{u.username}</td>
                  <td className="px-6 py-3">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${ROLE_COLOR[u.role] ?? 'bg-gray-100 text-gray-600'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-slate-600">{u.phone ?? '—'}</td>
                  <td className="px-6 py-3 text-right space-x-2">
                    <button onClick={() => { setEditUser({ ...u }); setEditId(u.id); setShowForm(true) }}
                      className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-200">Edit</button>
                    <button onClick={() => handleDelete(u.id)}
                      className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-semibold hover:bg-red-100">Disable</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && users.length === 0 && <div className="text-center py-12 text-slate-400">No users found</div>}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-5">{editId ? 'Edit User' : 'Add User'}</h3>
            <div className="space-y-4">
              {[
                { label: 'Full Name *', key: 'realName' },
                { label: 'Username *', key: 'username' },
                { label: editId ? 'New Password (leave blank to keep)' : 'Password *', key: 'password', type: 'password' },
                { label: 'Phone', key: 'phone' },
                { label: 'Email', key: 'email' },
              ].map(({ label, key, type }) => (
                <div key={key}>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">{label}</label>
                  <input type={type || 'text'}
                    value={(editUser as any)[key] ?? ''}
                    onChange={e => setEditUser(u => ({ ...u, [key]: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              ))}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Role *</label>
                <select value={editUser.role ?? 'SALES'} onChange={e => setEditUser(u => ({ ...u, role: e.target.value as UserRole }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => { setShowForm(false); setEditUser({ role: 'SALES' }); setEditId(null) }}
                className="flex-1 border border-slate-200 text-slate-700 py-2.5 rounded-lg text-sm font-semibold">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white py-2.5 rounded-lg text-sm font-semibold">
                {saving ? 'Saving…' : editId ? 'Update' : 'Create User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
