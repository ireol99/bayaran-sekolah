import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable } from '../../../components/shared/DataTable';
import { studentService, type DiscountCategoryItem } from '../studentService';
import { formatRupiah } from '../../../lib/utils';
import { toast } from 'sonner';
import { type ColumnDef } from '@tanstack/react-table';
import * as Icons from 'lucide-react';

export default function DiscountCategoryPage() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<DiscountCategoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<DiscountCategoryItem | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [isActive, setIsActive] = useState(true);

  const loadDiscounts = async () => {
    try {
      setIsLoading(true);
      const data = await studentService.getDiscounts();
      setCategories(data);
    } catch (err: any) {
      toast.error(err.message || 'Gagal memuat kategori diskon');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDiscounts();
  }, []);

  const openAddModal = () => {
    setEditingCategory(null);
    setName('');
    setAmount(0);
    setIsActive(true);
    setModalOpen(true);
  };

  const openEditModal = (category: DiscountCategoryItem) => {
    setEditingCategory(category);
    setName(category.name);
    setAmount(category.amount);
    setIsActive(category.isActive);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Nama kategori diskon harus diisi');
      return;
    }

    try {
      if (editingCategory) {
        const updated = await studentService.updateDiscount(editingCategory.id, { name, amount, isActive });
        setCategories((prev) =>
          prev.map((c) => (c.id === editingCategory.id ? updated : c))
        );
        toast.success(`Kategori diskon "${name}" berhasil diperbarui di database`);
      } else {
        const created = await studentService.createDiscount({ name, amount, isActive });
        setCategories((prev) => [...prev, created]);
        toast.success(`Kategori diskon "${name}" berhasil disimpan ke database`);
      }
      setModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyimpan kategori diskon');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus kategori diskon "${name}"?`)) {
      try {
        await studentService.deleteDiscount(id);
        setCategories((prev) => prev.filter((c) => c.id !== id));
        toast.success(`Kategori diskon "${name}" berhasil dihapus dari database`);
      } catch (err: any) {
        toast.error(err.message || 'Gagal menghapus kategori diskon');
      }
    }
  };

  const columns: ColumnDef<DiscountCategoryItem>[] = [
    {
      accessorKey: 'name',
      header: 'Nama Kategori',
      cell: ({ row }) => (
        <span style={{ fontWeight: 'var(--font-medium)', color: 'var(--color-text-primary)' }}>
          {row.original.name}
        </span>
      ),
    },
    {
      accessorKey: 'amount',
      header: 'Persentase Potongan (%)',
      cell: ({ row }) => {
        const val = Number(row.original.amount);
        return (
          <span style={{ fontWeight: 'var(--font-semibold)', color: 'var(--color-accent-secondary)' }}>
            {val <= 100 ? `${val}%` : formatRupiah(val)}
          </span>
        );
      },
    },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ row }) => (
        <span className={`badge ${row.original.isActive ? 'badge-success' : 'badge-neutral'}`}>
          {row.original.isActive ? 'Aktif' : 'Non-Aktif'}
        </span>
      ),
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
            title="Edit"
          >
            <Icons.Edit2 size={16} />
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-icon btn-sm text-danger"
            onClick={() => handleDelete(row.original.id, row.original.name)}
            title="Hapus"
          >
            <Icons.Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  if (isLoading) {
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => navigate('/students')}>
              <Icons.ArrowLeft size={16} />
            </button>
            <h1 style={{ fontSize: 'var(--text-2xl)' }}>Kategori Diskon Siswa</h1>
          </div>
          <p className="text-muted" style={{ marginLeft: '36px' }}>
            Kelola persentase potongan biaya tagihan tetap (Anak Yatim, Anak Guru, Beasiswa Yayasan) di database.
          </p>
        </div>

        <button className="btn btn-primary" onClick={openAddModal}>
          <Icons.Plus size={16} />
          <span>Tambah Kategori Diskon</span>
        </button>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <DataTable data={categories} columns={columns} />
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
              <h3>{editingCategory ? 'Edit Kategori Diskon' : 'Tambah Kategori Diskon Baru'}</h3>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setModalOpen(false)}>
                <Icons.X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div className="form-group">
                <label className="form-label">Nama Kategori Diskon</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Contoh: Anak Yatim, Anak Guru, Beasiswa"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Persentase Potongan (%)</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="Contoh: 100 untuk 100% (gratis), 50 untuk 50%"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    min={0}
                    max={100}
                    required
                    style={{ paddingRight: '36px' }}
                  />
                  <span style={{ position: 'absolute', right: '14px', fontWeight: 'var(--font-bold)', color: 'var(--color-text-muted)' }}>
                    %
                  </span>
                </div>
                <span className="form-hint" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: '4px', display: 'block' }}>
                  Masukkan nilai persentase potongan 0 - 100 (contoh: 100 = potongan 100%/gratis, 50 = potongan 50%).
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <input
                  type="checkbox"
                  id="isActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
                <label htmlFor="isActive" style={{ cursor: 'pointer', fontSize: 'var(--text-sm)' }}>
                  Status Aktif (Berlaku untuk pembuatan tagihan baru)
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingCategory ? 'Simpan Perubahan' : 'Tambah Kategori'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
