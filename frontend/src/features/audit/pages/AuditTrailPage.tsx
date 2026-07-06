/**
 * Audit Trail Page
 * Displays chronological log trail of sensitive user actions for audit tracking
 */
import { useEffect, useState } from 'react';
import { DataTable } from '../../../components/shared/DataTable';
import { type ColumnDef } from '@tanstack/react-table';

interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  module: string;
  ipAddress: string;
  details: string;
}

const MOCK_AUDIT_LOGS: AuditLog[] = [
  { id: 'a1', timestamp: '2026-07-04 10:35', user: 'superadmin@madrasah.sch.id', action: 'CREATE_USER', module: 'IAM', ipAddress: '192.168.1.100', details: 'Membuat user baru: ahmad@madrasah.sch.id dengan role ADMIN_TU' },
  { id: 'a2', timestamp: '2026-07-04 09:20', user: 'ahmad@madrasah.sch.id', action: 'VOID_TRANSACTION', module: 'PAYMENT', ipAddress: '192.168.1.105', details: 'Void transaksi t1 (Ahmad Fauzi) sebesar Rp 100.000 dengan alasan: Salah input nominal' },
  { id: 'a3', timestamp: '2026-07-03 16:45', user: 'ahmad@madrasah.sch.id', action: 'WITHDRAW_SAVINGS', module: 'SAVINGS', ipAddress: '192.168.1.105', details: 'Penarikan tabungan siswa Siti Aminah (sa2) sebesar Rp 50.000' },
  { id: 'a4', timestamp: '2026-07-03 14:15', user: 'ahmad@madrasah.sch.id', action: 'PROCESS_PAYMENT', module: 'PAYMENT', ipAddress: '192.168.1.105', details: 'Penerimaan bayar SPP siswa Muhammad Rizky (i4) sebesar Rp 40.000' },
  { id: 'a5', timestamp: '2026-07-01 08:30', user: 'superadmin@madrasah.sch.id', action: 'GENERATE_MASS_BILLING', module: 'BILLING', ipAddress: '192.168.1.100', details: 'Menerbitkan tagihan SPP Juli 2025 secara massal untuk kelas tingkat MTS dan MI' },
];

export default function AuditTrailPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate API fetch delay
    const timer = setTimeout(() => {
      setLogs(MOCK_AUDIT_LOGS);
      setLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const columns: ColumnDef<AuditLog>[] = [
    {
      accessorKey: 'timestamp',
      header: 'Waktu (WIB)',
      cell: ({ row }) => <span style={{ fontSize: 'var(--text-xs)', whiteSpace: 'nowrap' }}>{row.original.timestamp}</span>,
    },
    {
      accessorKey: 'user',
      header: 'Pengguna',
      cell: ({ row }) => <span className="font-semibold">{row.original.user}</span>,
    },
    {
      accessorKey: 'action',
      header: 'Jenis Aksi',
      cell: ({ row }) => (
        <span className={`badge ${row.original.action.startsWith('VOID') ? 'badge-danger' : row.original.action.startsWith('CREATE') || row.original.action.startsWith('GENERATE') ? 'badge-info' : 'badge-neutral'}`}>
          {row.original.action}
        </span>
      ),
    },
    {
      accessorKey: 'module',
      header: 'Modul',
      cell: ({ row }) => <span className="badge badge-neutral">{row.original.module}</span>,
    },
    {
      accessorKey: 'details',
      header: 'Keterangan Rinci',
    },
    {
      accessorKey: 'ipAddress',
      header: 'Alamat IP',
      cell: ({ row }) => <span style={{ fontFamily: 'monospace', fontSize: 'var(--text-xs)' }}>{row.original.ipAddress}</span>,
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }} className="animate-fade-in">
      <div>
        <h1 style={{ fontSize: 'var(--text-2xl)' }}>Audit Trail Aktivitas</h1>
        <p className="text-muted">Rekam jejak aktivitas administrasi sensitif yang dilakukan oleh pengelola keuangan yayasan secara real-time.</p>
      </div>

      <div className="card">
        <DataTable
          columns={columns}
          data={logs}
          searchKey="user"
          searchPlaceholder="Cari berdasarkan email pengguna..."
          isLoading={loading}
        />
      </div>
    </div>
  );
}
