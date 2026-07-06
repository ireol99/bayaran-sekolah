/**
 * Expense List Page
 * Displays school operational expenditures, status indicators, void triggers (No-Delete policy compliance)
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { savingsService, type Expense } from '../../savings/savingsService';
import { DataTable } from '../../../components/shared/DataTable';
import { formatRupiah } from '../../../lib/utils';
import { toast } from 'sonner';
import { type ColumnDef } from '@tanstack/react-table';
import * as Icons from 'lucide-react';

export default function ExpenseListPage() {
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Date filter states
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Void modal states
  const [voidModalOpen, setVoidModalOpen] = useState(false);
  const [selectedExpId, setSelectedExpId] = useState<string | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [voiding, setVoiding] = useState(false);

  const loadExpenses = async () => {
    setLoading(true);
    try {
      const data = await savingsService.getExpenses();
      setExpenses(data);
    } catch {
      toast.error('Gagal memuat daftar pengeluaran kas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExpenses();
  }, []);

  const openVoidModal = (id: string) => {
    setSelectedExpId(id);
    setVoidReason('');
    setVoidModalOpen(true);
  };

  const handleVoidSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voidReason.trim()) {
      toast.error('Alasan VOID harus diisi');
      return;
    }
    if (!selectedExpId) return;

    setVoiding(true);
    try {
      await savingsService.voidExpense(selectedExpId, voidReason);
      toast.success('Pengeluaran berhasil di-VOID (dibatalkan)');
      setVoidModalOpen(false);
      loadExpenses();
    } catch {
      toast.error('Gagal memproses pembatalan pengeluaran');
    } finally {
      setVoiding(false);
    }
  };

  // Apply date filters
  const filteredExpenses = expenses.filter(e => {
    if (!startDate && !endDate) return true;
    
    // Convert 'DD/MM/YYYY HH:mm' or 'DD/MM/YYYY' to comparable date object
    let expDate = new Date();
    if (e.date.includes('/')) {
      const parts = e.date.split(' ')[0].split('/');
      if (parts.length === 3) {
        expDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
      }
    } else {
      expDate = new Date(e.date);
    }
    
    if (isNaN(expDate.getTime())) return true;
    
    if (startDate) {
      const s = new Date(startDate);
      s.setHours(0, 0, 0, 0);
      if (expDate < s) return false;
    }
    
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      if (expDate > end) return false;
    }
    
    return true;
  });

  // Calculate total success expenditures based on FILTERED data
  const getTotalExpenditures = () => {
    return filteredExpenses
      .filter((e) => e.status === 'SUCCESS')
      .reduce((sum, e) => sum + e.totalAmount, 0);
  };

  const columns: ColumnDef<Expense>[] = [
    {
      accessorKey: 'refNo',
      header: 'No. Referensi',
      cell: ({ row }) => <span style={{ fontFamily: 'monospace', fontSize: 'var(--text-xs)' }}>{row.original.refNo}</span>,
    },
    {
      accessorKey: 'date',
      header: 'Tanggal Pos',
    },
    {
      accessorKey: 'categoryName',
      header: 'Kategori',
      cell: ({ row }) => <span className="badge badge-neutral">{row.original.categoryName}</span>,
    },
    {
      accessorKey: 'description',
      header: 'Keterangan Deskripsi',
    },
    {
      accessorKey: 'totalAmount',
      header: 'Jumlah Pengeluaran',
      cell: ({ row }) => (
        <span className={row.original.status === 'VOIDED' ? 'text-danger font-semibold' : 'font-semibold'}>
          {row.original.status === 'VOIDED' ? '-' : ''}
          {formatRupiah(row.original.totalAmount)}
        </span>
      ),
    },
    {
      accessorKey: 'createdBy',
      header: 'Dibuat Oleh',
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <span className={`badge ${row.original.status === 'SUCCESS' ? 'badge-success' : 'badge-danger'}`}>
          {row.original.status === 'SUCCESS' ? 'SUCCESS' : 'VOIDED'}
        </span>
      ),
    },
    {
      id: 'void_reason_col',
      header: 'Keterangan Void',
      cell: ({ row }) => (
        <span style={{ fontStyle: 'italic', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
          {row.original.status === 'VOIDED' ? row.original.voidReason || 'Batal Pengeluaran' : '-'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: 'Aksi',
      cell: ({ row }) => (
        <div>
          {row.original.status === 'SUCCESS' ? (
            <button
              className="btn btn-danger btn-sm"
              onClick={() => openVoidModal(row.original.id)}
              title="Void Pengeluaran"
            >
              <Icons.AlertOctagon size={14} />
              <span>VOID</span>
            </button>
          ) : (
            <span className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>
              {row.original.voidedAt}
            </span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }} className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)' }}>Pengeluaran Kas Operasional</h1>
          <p className="text-muted">Kelola data pembukuan pengeluaran uang keluar (operasional, ATK, honor) madrasah.</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <button className="btn btn-secondary" onClick={() => navigate('/expenses/categories')}>
            <Icons.Tag size={16} />
            <span>Kelola Kategori</span>
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/expenses/new')}>
            <Icons.FilePlus size={16} />
            <span>Catat Pengeluaran</span>
          </button>
        </div>
      </div>

      {/* KPI Card */}
      <div className="card card-glass animate-scale-in" style={{ maxWidth: '320px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="text-muted font-medium" style={{ fontSize: 'var(--text-sm)' }}>Total Pengeluaran Kas</span>
          <div style={{ padding: '8px', background: 'var(--color-danger-muted)', color: 'var(--color-danger)', borderRadius: 'var(--radius-md)', display: 'flex' }}>
            <Icons.TrendingDown size={20} />
          </div>
        </div>
        <h2 className="text-danger font-extrabold" style={{ marginTop: 'var(--space-2)', fontSize: 'var(--text-xl)' }}>
          {formatRupiah(getTotalExpenditures())}
        </h2>
      </div>

      <div className="card">
        <DataTable
          columns={columns}
          data={filteredExpenses}
          searchKey="description"
          searchPlaceholder="Cari berdasarkan keterangan..."
          isLoading={loading}
          filterSlot={
            <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <span className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>Dari:</span>
                <input
                  type="date"
                  className="form-input form-input-sm"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <span className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>Sampai:</span>
                <input
                  type="date"
                  className="form-input form-input-sm"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              {(startDate || endDate) && (
                <button
                  className="btn btn-ghost btn-sm btn-icon"
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                  }}
                  title="Reset Filter"
                >
                  <Icons.X size={16} />
                </button>
              )}
            </div>
          }
        />
      </div>

      {/* VOID Confirmation Modal */}
      {voidModalOpen && (
        <div className="modal-backdrop">
          <div className="modal animate-scale-in">
            <div className="modal-header">
              <h3 className="modal-title">Otorisasi Batal Pengeluaran (VOID)</h3>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setVoidModalOpen(false)}>
                <Icons.X size={16} />
              </button>
            </div>
            <form onSubmit={handleVoidSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                
                <div style={{
                  background: 'var(--color-danger-muted)',
                  border: '1px solid hsla(0, 84%, 60%, 0.3)',
                  padding: 'var(--space-4)',
                  borderRadius: 'var(--radius-lg)',
                  color: 'var(--color-danger)',
                  fontSize: 'var(--text-sm)',
                  display: 'flex',
                  gap: 'var(--space-3)',
                  marginBottom: 'var(--space-2)'
                }}>
                  <Icons.AlertTriangle size={24} style={{ flexShrink: 0 }} />
                  <div>
                    <strong>Konfirmasi Void:</strong> Pembatalan pengeluaran akan me-VOID nominal dana keluar menjadi minus, saldo kas keluar terhitung akan disesuaikan secara otomatis.
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Alasan Pembatalan / VOID <span className="required">*</span></label>
                  <textarea
                    className="form-input"
                    placeholder="Contoh: Salah menginput nominal nota belanja atau double data entry"
                    value={voidReason}
                    onChange={(e) => setVoidReason(e.target.value)}
                    required
                    rows={3}
                    autoFocus
                  />
                </div>

              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setVoidModalOpen(false)} disabled={voiding}>
                  Batal
                </button>
                <button type="submit" className="btn btn-danger" disabled={voiding}>
                  {voiding ? 'Memproses VOID...' : 'Batalkan Pengeluaran (VOID)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
