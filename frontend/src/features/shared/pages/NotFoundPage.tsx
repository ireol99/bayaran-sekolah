import { useNavigate } from 'react-router-dom';
import * as Icons from 'lucide-react';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      textAlign: 'center',
      padding: 'var(--space-6)'
    }} className="animate-fade-in">
      <div style={{
        background: 'var(--color-accent-secondary-muted)',
        color: 'var(--color-accent-secondary)',
        padding: 'var(--space-4)',
        borderRadius: '50%',
        marginBottom: 'var(--space-4)',
        display: 'inline-flex'
      }}>
        <Icons.MapPinOff size={48} />
      </div>
      <h1 style={{ marginBottom: 'var(--space-2)', fontSize: 'var(--text-4xl)' }}>404</h1>
      <h3 style={{ marginBottom: 'var(--space-2)' }}>Halaman Tidak Ditemukan</h3>
      <p style={{ color: 'var(--color-text-secondary)', maxWidth: '400px', marginBottom: 'var(--space-6)' }}>
        Halaman yang Anda cari mungkin telah dipindahkan, dihapus, atau tidak pernah ada.
      </p>
      <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>
        Kembali ke Dashboard
      </button>
    </div>
  );
}
