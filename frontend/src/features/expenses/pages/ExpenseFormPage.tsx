/**
 * Expense Form Page
 * Form to record a new operational expense
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { savingsService, type ExpenseCategory } from '../../savings/savingsService';
import { toast } from 'sonner';
import * as Icons from 'lucide-react';

export default function ExpenseFormPage() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [categoryId, setCategoryId] = useState('');
  const [academicYear, setAcademicYear] = useState('2025/2026');
  const [description, setDescription] = useState('');
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const cats = await savingsService.getCategories();
        setCategories(cats);
        if (cats.length > 0) setCategoryId(cats[0].id);
      } catch {
        toast.error('Gagal memuat kategori pengeluaran');
      } finally {
        setLoading(false);
      }
    };
    loadCategories();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryId || !description.trim() || totalAmount <= 0) {
      toast.error('Lengkapi seluruh data formulir secara valid');
      return;
    }

    setSubmitting(true);
    try {
      const selectedCat = categories.find((c) => c.id === categoryId);
      
      await savingsService.createExpense({
        date,
        categoryId,
        categoryName: selectedCat ? selectedCat.category : 'Umum',
        academicYear,
        description,
        totalAmount,
        createdBy: 'Super Admin',
      });

      toast.success('Pengeluaran operasional berhasil dicatat');
      navigate('/expenses');
    } catch {
      toast.error('Gagal mencatat transaksi pengeluaran');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
        <div className="spinner spinner-lg"></div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', maxWidth: '640px' }} className="animate-fade-in">
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => navigate('/expenses')}>
            <Icons.ArrowLeft size={16} />
          </button>
          <h1 style={{ fontSize: 'var(--text-2xl)' }}>Catat Pengeluaran Baru</h1>
        </div>
        <p className="text-muted" style={{ marginLeft: '36px' }}>
          Masukkan nota rincian pos pengeluaran keuangan kas operasional sekolah.
        </p>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            {/* Date */}
            <div className="form-group">
              <label className="form-label">Tanggal Transaksi <span className="required">*</span></label>
              <input
                type="date"
                className="form-input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            {/* Academic Year */}
            <div className="form-group">
              <label className="form-label">Tahun Ajaran <span className="required">*</span></label>
              <select
                className="form-input form-select"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
              >
                <option value="2025/2026">2025/2026</option>
                <option value="2026/2027">2026/2027</option>
              </select>
            </div>
          </div>

          {/* Category */}
          <div className="form-group">
            <label className="form-label">Kategori Pengeluaran <span className="required">*</span></label>
            <select
              className="form-input form-select"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              required
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.category}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div className="form-group">
            <label className="form-label">Keterangan / Rincian Belanja <span className="required">*</span></label>
            <textarea
              className="form-input"
              placeholder="Contoh: Beli spidol whiteboard 2 box dan tinta isi ulang"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={3}
            />
          </div>

          {/* Amount */}
          <div className="form-group">
            <label className="form-label">Total Pengeluaran (Nominal Rp) <span className="required">*</span></label>
            <input
              type="number"
              className="form-input"
              placeholder="Contoh: 120000"
              value={totalAmount || ''}
              onChange={(e) => setTotalAmount(Number(e.target.value))}
              min="1000"
              required
            />
          </div>

          <div className="divider"></div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/expenses')} disabled={submitting}>
              Batal
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Menyimpan...' : 'Simpan Pengeluaran'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
