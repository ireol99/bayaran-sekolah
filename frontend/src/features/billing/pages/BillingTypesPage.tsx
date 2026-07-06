/**
 * Billing Types Management Page (Jenis Tagihan)
 * CRUD untuk kategori / jenis tagihan sekolah
 * Data disimpan di tabel `billing_types` di PostgreSQL
 */
import { useState, useEffect, useCallback } from 'react';
import { billingService, type BillingType } from '../billingService';
import { DataTable } from '../../../components/shared/DataTable';
import { type ColumnDef } from '@tanstack/react-table';
import { toast } from 'sonner';
import * as Icons from 'lucide-react';

type ModalMode = 'add' | 'edit' | null;

interface FormState {
  code: string;
  name: string;
  description: string;
}

const EMPTY_FORM: FormState = { code: '', name: '', description: '' };



export default function BillingTypesPage() {
  const [billingTypes, setBillingTypes] = useState<BillingType[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Modal state
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editTarget, setEditTarget] = useState<BillingType | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<BillingType | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await billingService.getBillingTypes();
      setBillingTypes(Array.isArray(data) ? data : []);
    } catch (err: any) {
      toast.error(err.message || 'Gagal memuat data jenis tagihan');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setEditTarget(null);
    setModalMode('add');
  };

  const openEdit = (bt: BillingType) => {
    setForm({ code: bt.code, name: bt.name, description: bt.description ?? '' });
    setEditTarget(bt);
    setModalMode('edit');
  };

  const closeModal = () => { setModalMode(null); setEditTarget(null); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Nama jenis tagihan wajib diisi'); return; }

    setSubmitting(true);
    try {
      if (modalMode === 'add') {
        await billingService.createBillingType({
          name: form.name,
          description: form.description || undefined,
        });
        toast.success(`Jenis tagihan "${form.name}" berhasil ditambahkan`);
      } else if (modalMode === 'edit' && editTarget) {
        await billingService.updateBillingType(editTarget.id, {
          name: form.name,
          description: form.description,
        });
        toast.success(`Jenis tagihan "${form.name}" berhasil diperbarui`);
      }
      await fetchData();
      closeModal();
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyimpan jenis tagihan');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSubmitting(true);
    try {
      await billingService.deleteBillingType(deleteTarget.id);
      toast.success(`Jenis tagihan "${deleteTarget.name}" berhasil dihapus`);
      await fetchData();
      setDeleteTarget(null);
    } catch (err: any) {
      toast.error(err.message || 'Gagal menghapus jenis tagihan');
    } finally {
      setSubmitting(false);
    }
  };

  const columns: ColumnDef<BillingType>[] = [
    {
      accessorKey: 'code',
      header: 'Kode',
      cell: ({ row }) => (
        <span
          style={{
            fontFamily: 'monospace',
            fontWeight: 700,
            background: 'var(--color-bg-tertiary)',
            color: 'var(--color-text)',
            padding: '4px 8px',
            borderRadius: 'var(--radius-sm)',
            letterSpacing: '0.05em',
          }}
        >
          {row.original.code}
        </span>
      ),
    },
    {
      accessorKey: 'name',
      header: 'Nama Jenis Tagihan',
      cell: ({ row }) => <span className="font-semibold">{row.original.name}</span>,
    },
    {
      accessorKey: 'description',
      header: 'Deskripsi',
      cell: ({ row }) => (
        <span className="text-muted text-sm">
          {row.original.description ?? <em style={{ opacity: 0.5 }}>Tidak ada deskripsi</em>}
        </span>
      ),
    },
    {
      id: 'actions',
      header: 'Aksi',
      cell: ({ row }) => {
        const bt = row.original;
        return (
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <button
              className="btn btn-ghost btn-icon btn-sm"
              onClick={() => openEdit(bt)}
              title="Edit"
            >
              <Icons.Pencil size={15} />
            </button>
            <button
              className="btn btn-ghost btn-icon btn-sm"
              onClick={() => setDeleteTarget(bt)}
              title="Hapus"
              style={{ color: 'var(--color-danger)' }}
            >
              <Icons.Trash2 size={15} />
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }} className="animate-fade-in">
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)' }}>Jenis Tagihan</h1>
          <p className="text-muted">Kelola kategori tagihan yang tersedia untuk penerbitan tagihan massal.</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd} id="btn-add-billing-type">
          <Icons.Plus size={16} />
          <span>Tambah Jenis Tagihan</span>
        </button>
      </div>

      {/* Item List using DataTable */}
      <div className="card">
        <DataTable
          columns={columns}
          data={billingTypes}
          searchKey="name"
          searchPlaceholder="Cari berdasarkan nama atau kode tagihan..."
          isLoading={loading}
        />
      </div>

      {/* Add / Edit Modal */}
      {modalMode && (
        <div className="modal-backdrop">
          <div className="modal animate-scale-in" style={{ maxWidth: '480px', width: '92%' }}>
            <div className="modal-header">
              <h3 className="modal-title">
                {modalMode === 'add' ? (
                  <><Icons.Plus size={16} style={{ display: 'inline', marginRight: '6px' }} />Tambah Jenis Tagihan</>
                ) : (
                  <><Icons.Pencil size={16} style={{ display: 'inline', marginRight: '6px' }} />Edit: {editTarget?.name}</>
                )}
              </h3>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={closeModal} disabled={submitting}>
                <Icons.X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>


                {/* Name */}
                <div className="form-group">
                  <label className="form-label">
                    Nama Jenis Tagihan <span className="required">*</span>
                  </label>
                  <input
                    id="input-billing-type-name"
                    type="text"
                    className="form-input"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Contoh: SPP Bulanan, Uang Bangunan"
                    required
                  />
                </div>

                {/* Description */}
                <div className="form-group">
                  <label className="form-label">Deskripsi <span className="text-muted">(Opsional)</span></label>
                  <textarea
                    id="input-billing-type-desc"
                    className="form-input"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Keterangan singkat mengenai jenis tagihan ini..."
                    rows={3}
                    style={{ resize: 'vertical' }}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeModal} disabled={submitting}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting
                    ? <><div className="spinner spinner-sm" style={{ marginRight: '6px' }} />Menyimpan...</>
                    : modalMode === 'add' ? 'Tambahkan' : 'Simpan Perubahan'
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="modal-backdrop">
          <div className="modal animate-scale-in" style={{ maxWidth: '400px', width: '92%' }}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ color: 'var(--color-danger)' }}>
                <Icons.AlertTriangle size={17} style={{ display: 'inline', marginRight: '8px' }} />
                Hapus Jenis Tagihan
              </h3>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setDeleteTarget(null)} disabled={submitting}>
                <Icons.X size={16} />
              </button>
            </div>
            <div className="modal-body" style={{ padding: 'var(--space-5)' }}>
              <p style={{ marginBottom: 'var(--space-3)', color: 'var(--color-text-secondary)' }}>
                Anda yakin ingin menghapus jenis tagihan berikut?
              </p>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-3)',
                  background: 'var(--color-danger-muted)',
                  border: '1px solid hsla(0,80%,60%,0.25)',
                  borderRadius: 'var(--radius-md)',
                  padding: 'var(--space-3) var(--space-4)',
                }}
              >

                <div>
                  <div className="font-semibold">{deleteTarget.name}</div>
                  <div style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--color-text-muted)' }}>{deleteTarget.code}</div>
                </div>
              </div>
              <div
                style={{
                  marginTop: 'var(--space-3)',
                  padding: 'var(--space-3)',
                  background: 'var(--color-bg-tertiary)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 'var(--text-sm)',
                  color: 'var(--color-text-muted)',
                }}
              >
                ⚠ Tagihan yang sudah diterbitkan dengan jenis ini tidak akan terpengaruh.
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDeleteTarget(null)} disabled={submitting}>
                Batal
              </button>
              <button className="btn btn-danger" onClick={handleDelete} disabled={submitting}>
                {submitting
                  ? <><div className="spinner spinner-sm" style={{ marginRight: '6px' }} />Menghapus...</>
                  : <><Icons.Trash2 size={14} /> Hapus</>
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
