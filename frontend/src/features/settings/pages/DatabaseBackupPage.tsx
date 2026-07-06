import { useState } from 'react';
import { api } from '../../../lib/api-client';
import { toast } from 'sonner';
import * as Icons from 'lucide-react';

export default function DatabaseBackupPage() {
  const [isExporting, setIsExporting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [showClearModal, setShowClearModal] = useState(false);

  // 1. Export & Download Backup Database
  const handleExportBackup = async () => {
    try {
      setIsExporting(true);
      const res = await api.get<any>('/settings/backup/export');
      const dataStr = JSON.stringify(res.data, null, 2);
      
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      
      const timestamp = new Date().toISOString().replace(/[-:T]/g, '').substring(0, 14);
      link.href = url;
      link.download = `backup_bayaran_madrasah_${timestamp}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Backup database berhasil diunduh');
    } catch (err: any) {
      toast.error(err.message || 'Gagal membuat backup database');
    } finally {
      setIsExporting(false);
    }
  };

  // 2. Clear Database Handler
  const handleClearDatabase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmText.trim().toUpperCase() !== 'KOSONGKAN') {
      toast.error('Ketik "KOSONGKAN" untuk mengonfirmasi tindakan ini.');
      return;
    }

    try {
      setIsClearing(true);
      const res = await api.post<any>('/settings/backup/clear');
      toast.success(res.data?.message || 'Database berhasil dikosongkan.');
      setShowClearModal(false);
      setConfirmText('');
    } catch (err: any) {
      toast.error(err.message || 'Gagal mengosongkan database');
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', maxWidth: '900px' }} className="animate-fade-in">
      {/* Header */}
      <div>
        <h1 style={{ fontSize: 'var(--text-2xl)' }}>Backup & Clear Database</h1>
        <p className="text-muted">
          Manajemen cadangan data (Backup snapshot) dan fitur reset/kosongkan seluruh data transaksi & master.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 'var(--space-6)' }}>
        
        {/* CARD 1: BACKUP DATABASE */}
        <div className="card card-interactive" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(56, 189, 248, 0.15)',
                color: 'var(--color-accent-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icons.Download size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: 'var(--text-lg)', margin: 0 }}>1. Backup Database</h3>
              <span className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>
                Ekspor snapshot cadangan data sistem
              </span>
            </div>
          </div>

          <p className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>
            Unduh seluruh berkas cadangan data master (siswa, kelas, diskon) dan riwayat transaksi (tagihan, POS, tabungan, pengeluaran) dalam format JSON terenkripsi.
          </p>

          <div
            style={{
              padding: 'var(--space-3) var(--space-4)',
              backgroundColor: 'var(--color-bg-tertiary)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              fontSize: 'var(--text-xs)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-1)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="text-muted">Format Ekspor:</span>
              <span className="font-semibold">JSON Snapshot (.json)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="text-muted">Status Engine:</span>
              <span className="badge badge-success">Siap Diekspor</span>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            onClick={handleExportBackup}
            disabled={isExporting}
            style={{ marginTop: 'auto' }}
          >
            {isExporting ? (
              <>
                <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }}></span>
                <span>Memproses Backup...</span>
              </>
            ) : (
              <>
                <Icons.Download size={18} />
                <span>Unduh Backup Database (.json)</span>
              </>
            )}
          </button>
        </div>

        {/* CARD 2: CLEAR DATABASE */}
        <div
          className="card card-interactive"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-4)',
            borderColor: 'rgba(239, 68, 68, 0.3)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                color: 'var(--color-danger)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icons.Trash2 size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: 'var(--text-lg)', margin: 0, color: 'var(--color-danger)' }}>2. Clear Database</h3>
              <span className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>
                Reset & kosongkan seluruh data sistem
              </span>
            </div>
          </div>

          <p className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>
            Menghapus seluruh record data siswa, kelas, tagihan, transaksi kasir, tabungan, dan pengeluaran. <strong style={{ color: 'var(--color-danger)' }}>Akun pengguna/administrator tetap aman tersimpan.</strong>
          </p>

          <div
            style={{
              padding: 'var(--space-3) var(--space-4)',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              fontSize: 'var(--text-xs)',
              color: 'var(--color-danger)',
            }}
          >
            ⚠️ <strong>PERATURAN KEAMANAN:</strong> Tindakan ini bersifat permanen dan tidak dapat dibatalkan. Pastikan Anda sudah mengunduh Backup Database terlebih dahulu.
          </div>

          <button
            type="button"
            className="btn"
            style={{
              backgroundColor: 'var(--color-danger)',
              color: '#ffffff',
              border: 'none',
              marginTop: 'auto',
            }}
            onClick={() => {
              setConfirmText('');
              setShowClearModal(true);
            }}
          >
            <Icons.AlertTriangle size={18} />
            <span>Kosongkan Database</span>
          </button>
        </div>
      </div>

      {/* CONFIRMATION CLEAR MODAL */}
      {showClearModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowClearModal(false)}
        >
          <div
            className="card animate-scale-in"
            style={{
              width: '100%',
              maxWidth: '520px',
              margin: 'var(--space-4)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--color-danger)' }}>
                <Icons.AlertOctagon size={24} />
                <h3 style={{ margin: 0, color: 'var(--color-danger)' }}>Konfirmasi Kosongkan Database</h3>
              </div>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setShowClearModal(false)}>
                <Icons.X size={18} />
              </button>
            </div>

            <form onSubmit={handleClearDatabase} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                Apakah Anda benar-benar yakin ingin mengosongkan seluruh isi database? Seluruh data <strong>Siswa, Tagihan, Tabungan, Kasir, dan Pengeluaran</strong> akan dihapus secara permanen.
              </p>

              <div className="form-group">
                <label className="form-label" style={{ color: 'var(--color-danger)' }}>
                  Ketik kata "<strong>KOSONGKAN</strong>" di bawah ini untuk mengonfirmasi:
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ketik KOSONGKAN"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowClearModal(false)}>
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn"
                  disabled={isClearing || confirmText.trim().toUpperCase() !== 'KOSONGKAN'}
                  style={{
                    backgroundColor: 'var(--color-danger)',
                    color: '#ffffff',
                    opacity: confirmText.trim().toUpperCase() === 'KOSONGKAN' ? 1 : 0.5,
                  }}
                >
                  {isClearing ? (
                    <>
                      <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }}></span>
                      <span>Mengosongkan Database...</span>
                    </>
                  ) : (
                    'Ya, Kosongkan Database Sekarang'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
