/**
 * Billing List Page
 * Displays invoices with status badges (UNPAID, PARTIAL, PAID) and filtering controls
 */
import { useEffect, useState, useMemo } from 'react';
import { billingService, type Invoice } from '../billingService';
import { DataTable } from '../../../components/shared/DataTable';
import { formatRupiah, STATUS_CONFIG } from '../../../lib/utils';
import { toast } from 'sonner';
import { type ColumnDef } from '@tanstack/react-table';
import BillingCreateModal from './BillingCreatePage';
import * as Icons from 'lucide-react';
import { utils, write } from 'xlsx';

export default function BillingListPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Load Invoices
  const loadInvoices = async () => {
    setLoading(true);
    try {
      const data = await billingService.getInvoices();
      setInvoices(data);
    } catch {
      toast.error('Gagal memuat daftar tagihan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, []);

  // Filter Invoices by Release Date (createdAt)
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      if (!inv.createdAt) return true;
      const invDate = inv.createdAt.split(' ')[0].split('T')[0];
      if (startDate && invDate < startDate) return false;
      if (endDate && invDate > endDate) return false;
      return true;
    });
  }, [invoices, startDate, endDate]);

  // Export Filtered Invoices to Excel (.xlsx)
  const handleExportExcel = () => {
    if (filteredInvoices.length === 0) {
      toast.error('Tidak ada data tagihan yang sesuai dengan filter');
      return;
    }

    try {
      const exportData = filteredInvoices.map((inv, idx) => ({
        'No': idx + 1,
        'No. Tagihan': inv.invoiceNumber,
        'NIS': inv.nis,
        'Nama Siswa': inv.studentName,
        'Tingkatan': inv.level,
        'Kelas': inv.className,
        'Jenis Tagihan': inv.type,
        'Tahun Ajaran': inv.academicYear,
        'Periode': inv.period,
        'Kategori Diskon': inv.discountCategoryName || '-',
        'Tarif Dasar (Rp)': inv.baseAmount,
        'Potongan Diskon (Rp)': inv.discountAmount,
        'Jumlah Tagihan (Rp)': inv.finalAmount,
        'Terbayar (Rp)': inv.paidAmount,
        'Sisa Tagihan (Rp)': inv.finalAmount - inv.paidAmount,
        'Status': STATUS_CONFIG[inv.status]?.label || inv.status,
        'Tanggal Terbit': inv.createdAt,
      }));

      const worksheet = utils.json_to_sheet(exportData);
      const workbook = utils.book_new();
      utils.book_append_sheet(workbook, worksheet, 'Daftar Tagihan');

      const dateRangeStr = startDate && endDate 
        ? `${startDate}_sd_${endDate}` 
        : startDate ? `dari_${startDate}` 
        : endDate ? `sampai_${endDate}` 
        : 'Semua';

      const excelBuffer = write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Tagihan_Siswa_${dateRangeStr}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success(`Berhasil mengunduh ${filteredInvoices.length} data tagihan (.xlsx)`);
    } catch (err) {
      console.error('Export Excel Error:', err);
      toast.error('Gagal mengunduh file Excel');
    }
  };

  // Define Table Columns
  const columns: ColumnDef<Invoice>[] = [
    {
      accessorKey: 'invoiceNumber',
      header: 'No. Tagihan',
      cell: ({ row }) => <span style={{ fontFamily: 'monospace', color: 'var(--color-text-muted)' }}>{row.original.invoiceNumber}</span>,
    },
    {
      accessorKey: 'nis',
      header: 'NIS',
    },
    {
      accessorKey: 'studentName',
      header: 'Nama Siswa',
      cell: ({ row }) => <span className="font-semibold">{row.original.studentName}</span>,
    },
    {
      accessorKey: 'level',
      header: 'Tingkatan',
      cell: ({ row }) => <span className="badge badge-info">{row.original.level}</span>,
    },
    {
      accessorKey: 'className',
      header: 'Kelas',
      cell: ({ row }) => <span className="badge badge-neutral">{row.original.className}</span>,
    },
    {
      accessorKey: 'type',
      header: 'Jenis',
    },
    {
      accessorKey: 'academicYear',
      header: 'Tahun Ajaran',
      cell: ({ row }) => <span className="font-medium text-muted">{row.original.academicYear}</span>,
    },
    {
      accessorKey: 'period',
      header: 'Periode',
    },
    {
      accessorKey: 'discountCategoryName',
      header: 'Kategori Diskon',
      cell: ({ row }) => (
        <span className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>
          {row.original.discountCategoryName || '-'}
        </span>
      ),
    },
    {
      accessorKey: 'finalAmount',
      header: 'Jumlah Tagihan',
      cell: ({ row }) => <span className="font-medium">{formatRupiah(row.original.finalAmount)}</span>,
    },
    {
      accessorKey: 'paidAmount',
      header: 'Terbayar',
      cell: ({ row }) => (
        <span className="text-success font-medium">{formatRupiah(row.original.paidAmount)}</span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.original.status;
        const config = STATUS_CONFIG[status];
        return (
          <span style={{ color: `var(--color-${config.variant})`, fontWeight: 600 }}>
            {config.label}
          </span>
        );
      },
    },
    {
      accessorKey: 'createdAt',
      header: 'Tgl Terbit',
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }} className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)' }}>Daftar Tagihan Siswa</h1>
          <p className="text-muted">Pantau data tagihan aktif, tunggakan, dan riwayat pelunasan siswa.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsCreateModalOpen(true)}>
          <Icons.FilePlus size={16} />
          <span>Buat Tagihan Massal</span>
        </button>
      </div>

      <div className="card" style={{ padding: 'var(--space-4)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-4)', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-4)', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                Tgl Terbit (Dari)
              </label>
              <input
                type="date"
                className="form-input"
                style={{ height: '38px', padding: '6px 12px' }}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                Tgl Terbit (Sampai)
              </label>
              <input
                type="date"
                className="form-input"
                style={{ height: '38px', padding: '6px 12px' }}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            {(startDate || endDate) && (
              <button
                className="btn btn-ghost btn-sm"
                style={{ marginTop: 'auto', marginBottom: '2px', color: 'var(--color-danger)' }}
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                }}
              >
                <Icons.X size={14} />
                Reset Filter
              </button>
            )}
          </div>

          <button
            className="btn btn-secondary"
            onClick={handleExportExcel}
            disabled={filteredInvoices.length === 0}
          >
            <Icons.Download size={16} />
            <span>Export Excel (.xlsx)</span>
          </button>
        </div>
      </div>

      <div className="card">
        <DataTable
          columns={columns}
          data={filteredInvoices}
          searchKey="studentName"
          searchPlaceholder="Cari berdasarkan nama siswa..."
          isLoading={loading}
        />
      </div>

      <BillingCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          setIsCreateModalOpen(false);
          loadInvoices();
        }}
      />
    </div>
  );
}
