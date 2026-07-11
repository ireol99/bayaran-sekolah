/**
 * UserProfilePage Component
 * Provides personal user profile editing, avatar upload, and change password options
 */
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { api } from '../../../lib/api-client';
import { useAuth } from '../../auth/AuthContext';
import { ROLE_LABELS } from '../../../lib/utils';
import * as Icons from 'lucide-react';

export default function UserProfilePage() {
  const { user, updateUser } = useAuth();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  
  // Password states
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Sync user info on mount/change
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setAvatar(user.avatar || null);
    }
  }, [user]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Limit to 1MB
      if (file.size > 1024 * 1024) {
        toast.error('Ukuran file maksimal 1MB');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveAvatar = () => {
    setAvatar(null);
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast.error('Nama dan Email tidak boleh kosong');
      return;
    }

    setIsUpdatingProfile(true);
    try {
      const res = await api.put<any>('/auth/profile', {
        name,
        email,
        avatar
      });

      const updatedUser = res.data?.data || res.data;
      if (updatedUser) {
        updateUser(updatedUser);
        toast.success('Profil berhasil diperbarui');
      }
    } catch (err: any) {
      toast.error(err.message || 'Gagal memperbarui profil');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword) {
      toast.error('Harap masukkan password lama');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Password baru minimal harus 6 karakter');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Konfirmasi password baru tidak cocok');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      await api.put('/auth/profile', {
        oldPassword,
        newPassword
      });
      toast.success('Password berhasil diperbarui');
      // Reset password fields
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err.message || 'Gagal memperbarui password');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }} className="animate-fade-in">
      <div>
        <h1 style={{ fontSize: 'var(--text-2xl)' }}>Pengaturan Akun</h1>
        <p className="text-muted">Kelola informasi profil pribadi Anda, foto profil, dan keamanan password.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 'var(--space-6)', alignItems: 'start' }}>
        
        {/* Sidebar Avatar Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-4)', textAlign: 'center' }}>
            <h3 className="card-title">Foto Profil</h3>
            
            <div style={{
              width: '140px',
              height: '140px',
              borderRadius: '50%',
              border: '3px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              backgroundColor: 'var(--color-bg-tertiary)',
              position: 'relative',
              boxShadow: 'var(--shadow-md)'
            }}>
              {avatar ? (
                <img src={avatar} alt="Foto Profil" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <Icons.User size={64} style={{ color: 'var(--color-text-muted)', opacity: 0.5 }} />
              )}
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <div style={{ position: 'relative' }}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    opacity: 0,
                    cursor: 'pointer'
                  }}
                />
                <button type="button" className="btn btn-secondary btn-sm" style={{ pointerEvents: 'none' }}>
                  <Icons.Upload size={14} />
                  <span>Pilih Foto</span>
                </button>
              </div>

              {avatar && (
                <button type="button" className="btn btn-secondary btn-sm danger-text" onClick={handleRemoveAvatar} style={{ color: 'var(--color-danger)' }}>
                  <Icons.Trash2 size={14} />
                </button>
              )}
            </div>
            <span className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>
              Ukuran file maks 1MB. Format yang didukung: JPG, PNG, WEBP.
            </span>
          </div>

          {/* User Details info Card */}
          <div className="card">
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <Icons.Shield size={16} />
              <span>Detail Hak Akses</span>
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
              <div>
                <span className="text-muted" style={{ fontSize: 'var(--text-xs)', display: 'block' }}>Peran Sistem</span>
                <strong style={{ fontSize: 'var(--text-sm)' }}>
                  {user ? ROLE_LABELS[user.role] : 'Guest'}
                </strong>
              </div>
              <div>
                <span className="text-muted" style={{ fontSize: 'var(--text-xs)', display: 'block' }}>ID Pengguna</span>
                <code style={{ fontSize: '10px', wordBreak: 'break-all' }}>{user?.id}</code>
              </div>
            </div>
          </div>
        </div>

        {/* Form settings details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          
          {/* Card: Personal Info */}
          <div className="card">
            <form onSubmit={handleProfileSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <Icons.User size={18} />
                <span>Informasi Pribadi</span>
              </h3>

              <div className="form-group">
                <label className="form-label">Nama Lengkap</label>
                <input
                  type="text"
                  className="form-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Nama Lengkap Anda"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Alamat Email</label>
                <input
                  type="email"
                  className="form-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="name@domain.com"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-2)' }}>
                <button type="submit" className="btn btn-primary" disabled={isUpdatingProfile}>
                  <Icons.Save size={16} />
                  <span>{isUpdatingProfile ? 'Menyimpan...' : 'Simpan Profil'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Card: Change Password */}
          <div className="card">
            <form onSubmit={handlePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <Icons.Lock size={18} style={{ color: 'var(--color-warning)' }} />
                <span>Ubah Password</span>
              </h3>

              <div className="form-group">
                <label className="form-label">Password Lama</label>
                <input
                  type="password"
                  className="form-input"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                <div className="form-group">
                  <label className="form-label">Password Baru</label>
                  <input
                    type="password"
                    className="form-input"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Konfirmasi Password Baru</label>
                  <input
                    type="password"
                    className="form-input"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ulangi password baru"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-2)' }}>
                <button type="submit" className="btn btn-primary" style={{ backgroundColor: 'var(--color-warning)', borderColor: 'var(--color-warning)' }} disabled={isUpdatingPassword}>
                  <Icons.Key size={16} />
                  <span>{isUpdatingPassword ? 'Memperbarui...' : 'Ubah Password'}</span>
                </button>
              </div>
            </form>
          </div>

        </div>

      </div>
    </div>
  );
}
