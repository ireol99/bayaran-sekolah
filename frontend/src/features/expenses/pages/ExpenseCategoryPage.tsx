/**
 * Expense Category Page
 * CRUD controls for sorting operational expenditures
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { savingsService, type ExpenseCategory } from '../../savings/savingsService';
import { DataTable } from '../../../components/shared/DataTable';
import { toast } from 'sonner';
import { type ColumnDef } from '@tanstack/react-table';
import * as Icons from 'lucide-react';

export default function ExpenseCategoryPage() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);

  // Form modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const data = await savingsService.getCategories();
      setCategories(data);
    } catch {
      toast.error('Gagal memuat kategori pengeluaran');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const openAddModal = () => {
    setCategoryName('');
    setDescription('');
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName.trim()) {
      toast.error('Nama kategori harus diisi');
      return;
    }

    setSubmitting(true);
    try {
      await savingsService.addCategory(categoryName, description);
      toast.success(`Kategori "${categoryName}" berhasil ditambahkan`);
      setModalOpen(false);
      loadCategories();
    } catch {
      toast.error('Gagal menyimpan kategori');
    } finally {
      setSubmitting(false);
    }
  };

  const columns: ColumnDef<ExpenseCategory>[] = [
    {
      accessorKey: 'category',
      header: 'Nama Kategori Pengeluaran',
      cell: ({ row }) => <span className="font-semibold">{row.original.category}</span>,
    },
    {
      accessorKey: 'description',
      header: 'Deskripsi Keterangan',
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }} className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => navigate('/expenses')}>
              <Icons.ArrowLeft size={16} />
            </button>
            <h1 style={{ fontSize: 'var(--text-2xl)' }}>Kategori Pengeluaran Kas</h1>
          </div>
          <p className="text-muted" style={{ marginLeft: '36px' }}>
            Klasifikasikan pos anggaran pengeluaran kas operasional madrasah.
          </p>
        </div>
        <button className="btn btn-primary" onClick={openAddModal}>
          <Icons.Plus size={16} />
          <span>Tambah Kategori</span>
        </button>
      </div>

      <div className="card">
        <DataTable
          columns={columns}
          data={categories}
          searchKey="category"
          searchPlaceholder="Cari kategori..."
          isLoading={loading}
        />
      </div>

      {/* Add Modal */}
      {modalOpen && (
        <div className="modal-backdrop">
          <div className="modal animate-scale-in">
            <div className="modal-header">
              <h3 className="modal-title">Tambah Kategori Pengeluaran</h3>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setModalOpen(false)}>
                <Icons.X size={16} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                
                {/* Category Name */}
                <div className="form-group">
                  <label className="form-label">Nama Kategori <span className="required">*</span></label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Contoh: Belanja Konsumsi atau Listrik"
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                    required
                    autoFocus
                  />
                </div>

                {/* Description */}
                <div className="form-group">
                  <label className="form-label">Deskripsi / Keterangan</label>
                  <textarea
                    className="form-input"
                    placeholder="Masukkan rincian singkat peruntukkan pos pengeluaran ini..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>

              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)} disabled={submitting}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Menyimpan...' : 'Simpan Kategori'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
