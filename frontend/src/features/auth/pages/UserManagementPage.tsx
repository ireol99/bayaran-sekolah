import { useEffect, useState } from 'react';
import { DataTable } from '../../../components/shared/DataTable';
import { ROLE_LABELS } from '../../../lib/utils';
import { api } from '../../../lib/api-client';
import { toast } from 'sonner';
import { type ColumnDef } from '@tanstack/react-table';
import * as Icons from 'lucide-react';
import type { UserRole } from '../../../lib/constants';

interface AppUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
}

export default function UserManagementPage() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('ADMIN_TU');
  const [password, setPassword] = useState('');
  const [isActive, setIsActive] = useState(true);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get<AppUser[]>('/settings/users');
      setUsers(res.data);
    } catch (err: any) {
      toast.error(err.message || 'Gagal memuat daftar pengguna');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const openAddModal = () => {
    setEditingUser(null);
    setName('');
    setEmail('');
    setRole('ADMIN_TU');
    setPassword('');
    setIsActive(true);
    setModalOpen(true);
  };

  const openEditModal = (user: AppUser) => {
    setEditingUser(user);
    setName(user.name);
    setEmail(user.email);
    setRole(user.role);
    setPassword('');
    setIsActive(user.isActive);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast.error('Nama dan Email wajib diisi');
      return;
    }

    try {
      if (editingUser) {
        const payload: any = { name, email, role, isActive };
        if (password) payload.password = password;
        
        const res = await api.put<AppUser>(`/settings/users/${editingUser.id}`, payload);
        
        setUsers((prev) =>
          prev.map((u) => (u.id === editingUser.id ? res.data : u))
        );
        toast.success(`User "${name}" berhasil diperbarui`);
      } else {
        const res = await api.post<AppUser>('/settings/users', { name, email, password, role });
        setUsers((prev) => [...prev, res.data]);
        toast.success(`User "${name}" berhasil ditambahkan ke database`);
      }
      setModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyimpan user');
    }
  };

  const handleDelete = async (id: string, userName: string) => {
    if (userName === 'Super Administrator' || userName === 'Superadmin') {
      toast.error('Akun master Super Administrator tidak dapat dihapus');
      return;
    }
    if (window.confirm(`Apakah Anda yakin ingin menghapus akun "${userName}"?`)) {
      try {
        await api.delete(`/settings/users/${id}`);
        setUsers((prev) => prev.filter((u) => u.id !== id));
        toast.success(`Akun "${userName}" berhasil dihapus dari database`);
      } catch (err: any) {
        toast.error(err.message || 'Gagal menghapus akun');
      }
    }
  };

  const columns: ColumnDef<AppUser>[] = [
    {
      accessorKey: 'name',
      header: 'Nama Pengguna',
      cell: ({ row }) => (
        <div>
          <div className="font-semibold">{row.original.name}</div>
          <div className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>{row.original.email}</div>
        </div>
      ),
    },
    {
      accessorKey: 'role',
      header: 'Hak Akses (Role)',
      cell: ({ row }) => {
        const r = row.original.role;
        const badgeClass =
          r === 'SUPERADMIN'
            ? 'badge-primary'
            : r === 'ADMIN_TU'
            ? 'badge-accent'
            : r === 'KEPALA_SEKOLAH'
            ? 'badge-warning'
            : 'badge-secondary';
        return <span className={`badge ${badgeClass}`}>{ROLE_LABELS[r] || r}</span>;
      },
    },
    {
      accessorKey: 'createdAt',
      header: 'Tanggal Dibuat',
    },
    {
      id: 'actions',
      header: 'Aksi',
      cell: ({ row }) => (
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button
            type="button"
            className="btn btn-ghost btn-icon btn-sm"
            onClick={() => openEditModal(row.original)}
            title="Edit User"
          >
            <Icons.Edit2 size={16} />
          </button>
          {row.original.name !== 'Super Administrator' && (
            <button
              type="button"
              className="btn btn-ghost btn-icon btn-sm text-danger"
              onClick={() => handleDelete(row.original.id, row.original.name)}
              title="Hapus User"
            >
              <Icons.Trash2 size={16} />
            </button>
          )}
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
        <div className="spinner spinner-lg"></div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }} className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)' }}>Manajemen Pengguna</h1>
          <p className="text-muted">Kelola akun pengguna dan hak akses (RBAC) sistem dari database.</p>
        </div>

        <button className="btn btn-primary" onClick={openAddModal}>
          <Icons.UserPlus size={16} />
          <span>Tambah Pengguna</span>
        </button>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <DataTable data={users} columns={columns} />
      </div>

      {modalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setModalOpen(false)}
        >
          <div
            className="card animate-scale-in"
            style={{ width: '100%', maxWidth: '500px', margin: 'var(--space-4)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
              <h3>{editingUser ? 'Edit Pengguna' : 'Tambah Pengguna Baru'}</h3>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setModalOpen(false)}>
                <Icons.X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div className="form-group">
                <label className="form-label">Nama Lengkap</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Contoh: Ahmad Kasir"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email Log in</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="user@madrasah.id"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              {!editingUser && (
                <div className="form-group">
                  <label className="form-label">Password</label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="Minimal 6 karakter"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Peran (Role Akses)</label>
                <select className="form-select" value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
                  <option value="SUPERADMIN">Super Administrator (Akses Penuh)</option>
                  <option value="ADMIN_TU">Admin TU (Kasir & Operasional)</option>
                  <option value="KEPALA_SEKOLAH">Kepala Sekolah (Laporan & Executive)</option>
                  <option value="YAYASAN">Pengurus Yayasan (Laporan & Executive)</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingUser ? 'Simpan Perubahan' : 'Tambah Pengguna'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
