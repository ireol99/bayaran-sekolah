import { useNavigate } from 'react-router-dom';
import * as Icons from 'lucide-react';

export default function UnauthorizedPage() {
  const navigate = useNavigate();

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 'calc(100vh - var(--topbar-height) - 48px)',
      textAlign: 'center',
      padding: 'var(--space-6)'
    }} className="animate-fade-in">
      <div style={{
        background: 'var(--color-danger-muted)',
        color: 'var(--color-danger)',
        padding: 'var(--space-4)',
        borderRadius: '50%',
        marginBottom: 'var(--space-4)',
        display: 'inline-flex'
      }}>
        <Icons.ShieldAlert size={48} />
      </div>
      <h1 style={{ marginBottom: 'var(--space-2)' }}>Akses Ditolak</h1>
      <p style={{ color: 'var(--color-text-secondary)', maxWidth: '400px', marginBottom: 'var(--space-6)' }}>
        Anda tidak memiliki hak akses (permission) yang cukup untuk melihat halaman ini. Hubungi administrator jika Anda merasa ini adalah kesalahan.
      </p>
      <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
        <button className="btn btn-secondary" onClick={() => navigate(-1)}>
          Kembali
        </button>
        <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>
          Ke Dashboard
        </button>
      </div>
    </div>
  );
}
