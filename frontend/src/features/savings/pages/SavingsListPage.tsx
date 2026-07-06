/**
 * Savings List Page
 * Displays saving accounts list for students with sorting and detail actions
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { savingsService, type SavingAccount } from '../savingsService';
import { DataTable } from '../../../components/shared/DataTable';
import { formatRupiah } from '../../../lib/utils';
import { toast } from 'sonner';
import { type ColumnDef } from '@tanstack/react-table';
import * as Icons from 'lucide-react';

export default function SavingsListPage() {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<SavingAccount[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const data = await savingsService.getAccounts();
      setAccounts(data);
    } catch {
      toast.error('Gagal memuat akun tabungan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const columns: ColumnDef<SavingAccount>[] = [
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
      accessorKey: 'className',
      header: 'Kelas',
      cell: ({ row }) => <span className="badge badge-neutral">{row.original.className}</span>,
    },
    {
      accessorKey: 'balance',
      header: 'Saldo Tabungan',
      cell: ({ row }) => (
        <span className="text-success font-extrabold">{formatRupiah(row.original.balance)}</span>
      ),
    },
    {
      accessorKey: 'updatedAt',
      header: 'Transaksi Terakhir',
    },
    {
      id: 'actions',
      header: 'Aksi',
      cell: ({ row }) => (
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => navigate(`/savings/${row.original.id}`)}
        >
          <Icons.FolderOpen size={14} />
          <span>Detail Mutasi</span>
        </button>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }} className="animate-fade-in">
      <div>
        <h1 style={{ fontSize: 'var(--text-2xl)' }}>Tabungan Titipan Siswa</h1>
        <p className="text-muted">Kelola dana titipan tabungan siswa untuk membiayai pengeluaran sekolah secara debit.</p>
      </div>

      <div className="card">
        <DataTable
          columns={columns}
          data={accounts}
          searchKey="studentName"
          searchPlaceholder="Cari berdasarkan nama siswa..."
          isLoading={loading}
        />
      </div>
    </div>
  );
}
