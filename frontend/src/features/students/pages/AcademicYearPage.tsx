/**
 * Academic Year Management Page
 * Kelola tahun ajaran aktif madrasah
 * Fix: Optimistic UI update + direct state mutation on set-current
 */
import { useState, useEffect, useCallback } from 'react';
import { studentService, type AcademicYearItem } from '../studentService';
import { toast } from 'sonner';
import * as Icons from 'lucide-react';

export default function AcademicYearPage() {
  const [years, setYears] = useState<AcademicYearItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [isCurrent, setIsCurrent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [settingId, setSettingId] = useState<string | null>(null); // loading state per-row

  const loadYears = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await studentService.getAcademicYears();
      // Sort: current first, then by name desc
      const sorted = [...data].sort((a, b) => {
        if (a.isCurrent !== b.isCurrent) return a.isCurrent ? -1 : 1;
        return b.name.localeCompare(a.name);
      });
      setYears(sorted);
    } catch (err: any) {
      toast.error(err.message || 'Gagal memuat daftar tahun ajaran');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadYears(); }, [loadYears]);

  const openAddModal = () => {
    setName('');
    setIsCurrent(false);
    setModalOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Nama tahun ajaran harus diisi (contoh: 2026/2027)');
      return;
    }
    setSubmitting(true);
    try {
      await studentService.createAcademicYear({ name: name.trim(), isCurrent });
      toast.success(`Tahun ajaran "${name.trim()}" berhasil ditambahkan`);
      setModalOpen(false);
      await loadYears();
    } catch (err: any) {
      toast.error(err.message || 'Gagal menambahkan tahun ajaran');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetCurrent = async (id: string, yearName: string) => {
    setSettingId(id);
    // ✅ Optimistic UI: update state immediately before API completes
    setYears((prev) => {
      const updated = prev.map((y) => ({ ...y, isCurrent: y.id === id }));
      return [...updated].sort((a, b) => {
        if (a.isCurrent !== b.isCurrent) return a.isCurrent ? -1 : 1;
        return b.name.localeCompare(a.name);
      });
    });
    try {
      await studentService.setCurrentAcademicYear(id);
      toast.success(`"${yearName}" sekarang aktif sebagai Tahun Ajaran Utama`);
      // Re-fetch to ensure DB state is correct
      await loadYears();
    } catch (err: any) {
      toast.error(err.message || 'Gagal mengubah tahun ajaran aktif');
      // Rollback on failure
      await loadYears();
    } finally {
      setSettingId(null);
    }
  };

  const handleDelete = async (id: string, yearName: string) => {
    const target = years.find((y) => y.id === id);
    if (target?.isCurrent) {
      toast.error('Tidak dapat menghapus tahun ajaran yang sedang aktif');
      return;
    }
    if (!window.confirm(`Hapus tahun ajaran "${yearName}"?`)) return;
    try {
      await studentService.deleteAcademicYear(id);
      // Optimistic remove
      setYears((prev) => prev.filter((y) => y.id !== id));
      toast.success(`Tahun ajaran "${yearName}" berhasil dihapus`);
    } catch (err: any) {
      toast.error(err.message || 'Gagal menghapus tahun ajaran');
      await loadYears();
    }
  };

  const currentYear = years.find((y) => y.isCurrent);

  return (
    <div className="page-content">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Kelola Tahun Ajaran</h1>
          <p className="page-subtitle">
            Kelola periode tahun ajaran madrasah. Hanya satu tahun ajaran yang dapat aktif pada satu waktu.
          </p>
        </div>
        <button className="btn btn-primary" onClick={openAddModal}>
          <Icons.Plus size={16} />
          Tambah Tahun Ajaran
        </button>
      </div>

      {/* Active Year Banner */}
      {currentYear && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-4)',
            padding: 'var(--space-4) var(--space-5)',
            background: 'linear-gradient(135deg, var(--color-success-muted), rgba(16,185,129,0.05))',
            border: '1px solid rgba(16,185,129,0.25)',
            borderLeft: '4px solid var(--color-success)',
            borderRadius: 'var(--radius-lg)',
            marginBottom: 'var(--space-5)',
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              background: 'var(--color-success-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Icons.CalendarCheck size={22} style={{ color: 'var(--color-success)' }} />
          </div>
          <div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-success)', fontWeight: 600, marginBottom: '2px' }}>
              TAHUN AJARAN AKTIF SAAT INI
            </div>
            <div style={{ fontSize: 'var(--text-xl)', fontWeight: 800, color: 'var(--color-text-primary)' }}>
              {currentYear.name}
            </div>
          </div>
        </div>
      )}

      {/* Year List */}
      {isLoading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Memuat tahun ajaran...</p>
        </div>
      ) : years.length === 0 ? (
        <div className="empty-state">
          <Icons.Calendar size={48} className="empty-state-icon" />
          <h3 className="empty-state-title">Belum ada tahun ajaran</h3>
          <p className="empty-state-desc">Tambahkan tahun ajaran untuk memulai</p>
          <button className="btn btn-primary" onClick={openAddModal}>
            <Icons.Plus size={16} /> Tambah Tahun Ajaran
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {years.map((year) => (
            <div
              key={year.id}
              className="card"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-4)',
                padding: 'var(--space-4) var(--space-5)',
                borderLeft: year.isCurrent
                  ? '4px solid var(--color-success)'
                  : '4px solid transparent',
                transition: 'all 0.2s ease',
                opacity: settingId === year.id ? 0.7 : 1,
              }}
            >
              {/* Year Icon */}
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: 'var(--radius-lg)',
                  background: year.isCurrent
                    ? 'var(--color-success-muted)'
                    : 'var(--color-bg-tertiary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Icons.Calendar
                  size={20}
                  style={{ color: year.isCurrent ? 'var(--color-success)' : 'var(--color-text-muted)' }}
                />
              </div>

              {/* Info */}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: '4px' }}>
                  <span style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>{year.name}</span>
                  {year.isCurrent && (
                    <span
                      className="badge badge-success"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '10px' }}
                    >
                      <Icons.CheckCircle2 size={11} />
                      Aktif Utama
                    </span>
                  )}
                </div>
                <div className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>
                  {year.isCurrent
                    ? 'Tahun ajaran yang digunakan untuk tagihan dan laporan aktif'
                    : 'Klik "Jadikan Aktif" untuk menggunakan tahun ajaran ini'}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexShrink: 0 }}>
                {!year.isCurrent && (
                  <button
                    type="button"
                    className="btn btn-success btn-sm"
                    onClick={() => handleSetCurrent(year.id, year.name)}
                    disabled={settingId !== null}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    {settingId === year.id ? (
                      <><div className="spinner spinner-sm" /> Memproses...</>
                    ) : (
                      <><Icons.CheckCircle size={14} /> Jadikan Aktif</>
                    )}
                  </button>
                )}
                {year.isCurrent && (
                  <span
                    style={{
                      fontSize: '11px',
                      color: 'var(--color-success)',
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Icons.ShieldCheck size={14} />
                    Sedang Aktif
                  </span>
                )}
                <button
                  type="button"
                  className="btn btn-ghost btn-icon btn-sm"
                  onClick={() => handleDelete(year.id, year.name)}
                  disabled={year.isCurrent || settingId !== null}
                  title={year.isCurrent ? 'Tidak dapat menghapus tahun ajaran aktif' : 'Hapus'}
                  style={{ color: year.isCurrent ? 'var(--color-text-muted)' : 'var(--color-danger)' }}
                >
                  <Icons.Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── Add Year Modal ───────────────────────────────────── */}
      {modalOpen && (
        <div className="modal-backdrop" onClick={() => setModalOpen(false)}>
          <div
            className="modal animate-scale-in"
            style={{ maxWidth: '440px', width: '92%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 className="modal-title">
                <Icons.Plus size={16} style={{ display: 'inline', marginRight: '6px' }} />
                Tambah Tahun Ajaran
              </h3>
              <button
                className="btn btn-ghost btn-icon btn-sm"
                onClick={() => setModalOpen(false)}
                disabled={submitting}
              >
                <Icons.X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreate}>
              <div
                className="modal-body"
                style={{ padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}
              >
                <div className="form-group">
                  <label className="form-label">
                    Nama Tahun Ajaran <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Contoh: 2026/2027, 2027/2028"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoFocus
                    required
                  />
                  <span className="form-hint">Gunakan format Tahun/Tahun+1 (contoh: 2026/2027).</span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 'var(--space-3)',
                    padding: 'var(--space-3)',
                    background: isCurrent ? 'var(--color-success-muted)' : 'var(--color-bg-tertiary)',
                    borderRadius: 'var(--radius-md)',
                    border: isCurrent ? '1px solid rgba(16,185,129,0.3)' : '1px solid var(--color-border)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onClick={() => setIsCurrent(!isCurrent)}
                >
                  <div
                    style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '4px',
                      border: isCurrent ? 'none' : '2px solid var(--color-border)',
                      background: isCurrent ? 'var(--color-success)' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: '1px',
                    }}
                  >
                    {isCurrent && <Icons.Check size={11} style={{ color: '#fff' }} />}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>
                      Jadikan sebagai Tahun Ajaran Aktif
                    </div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                      Tahun ajaran yang sedang aktif sebelumnya akan dinonaktifkan
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setModalOpen(false)}
                  disabled={submitting}
                >
                  Batal
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? (
                    <><div className="spinner spinner-sm" style={{ marginRight: '6px' }} />Menyimpan...</>
                  ) : (
                    'Simpan Tahun Ajaran'
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
