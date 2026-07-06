import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { studentService, type Student } from '../studentService';
import { DataTable } from '../../../components/shared/DataTable';
import { formatRupiah } from '../../../lib/utils';
import { toast } from 'sonner';
import { type ColumnDef } from '@tanstack/react-table';
import * as Icons from 'lucide-react';

export default function StudentListPage() {
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Load students
  const loadStudents = async () => {
    setLoading(true);
    try {
      const data = await studentService.getAll();
      setStudents(data);
    } catch {
      toast.error('Gagal memuat data siswa');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, []);

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus data siswa ${name}?`)) {
      try {
        await studentService.delete(id);
        toast.success(`Siswa ${name} berhasil dihapus`);
        loadStudents();
      } catch (err: any) {
        toast.error(err.message || 'Gagal menghapus siswa');
      }
    }
  };

  const handleToggleStatus = async (student: Student) => {
    const nextStatus = student.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const actionLabel = nextStatus === 'ACTIVE' ? 'mengaktifkan' : 'menonaktifkan';

    if (window.confirm(`Apakah Anda yakin ingin ${actionLabel} siswa "${student.name}"?`)) {
      try {
        await studentService.toggleStatus(student.id, nextStatus);
        toast.success(`Siswa ${student.name} berhasil diubah ke status ${nextStatus === 'ACTIVE' ? 'Aktif' : 'Non-Aktif'}`);
        loadStudents();
      } catch (err: any) {
        toast.error(err.message || 'Gagal mengubah status siswa');
      }
    }
  };

  // Filter students by status tab
  const filteredStudents = students.filter((s) => {
    if (statusFilter === 'ACTIVE') return s.status === 'ACTIVE';
    if (statusFilter === 'INACTIVE') return s.status === 'INACTIVE';
    return true;
  });

  // Define table columns
  const columns: ColumnDef<Student>[] = [
    {
      accessorKey: 'nis',
      header: 'NIS',
    },
    {
      accessorKey: 'nisn',
      header: 'NISN',
      cell: ({ row }) => (
        <span className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>
          {row.original.nisn || '-'}
        </span>
      ),
    },
    {
      accessorKey: 'name',
      header: 'Nama Lengkap',
    },
    {
      accessorKey: 'level',
      header: 'Tingkat',
      cell: ({ row }) => (
        <span className="badge badge-info">{row.original.level}</span>
      ),
    },
    {
      accessorKey: 'className',
      header: 'Kelas',
    },
    {
      accessorKey: 'discountCategory',
      header: 'Kategori Diskon',
      cell: ({ row }) => (
        <span>
          {row.original.discountCategory}{' '}
          {row.original.discountAmount > 0 && (
            <span className="text-success" style={{ fontSize: 'var(--text-xs)' }}>
              ({formatRupiah(row.original.discountAmount)})
            </span>
          )}
        </span>
      ),
    },
    {
      accessorKey: 'parentPhone',
      header: 'No. HP Wali',
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const isActive = row.original.status === 'ACTIVE';
        return (
          <span className={`badge ${isActive ? 'badge-success' : 'badge-neutral'}`}>
            {isActive ? 'Aktif' : 'Non-Aktif'}
          </span>
        );
      },
    },
    {
      id: 'actions',
      header: 'Aksi',
      cell: ({ row }) => {
        const isActive = row.original.status === 'ACTIVE';
        return (
          <div className="table-actions">
            <button
              className={`btn btn-icon btn-sm ${isActive ? 'btn-ghost text-warning' : 'btn-ghost text-success'}`}
              onClick={(e) => {
                e.stopPropagation();
                handleToggleStatus(row.original);
              }}
              title={isActive ? 'Nonaktifkan Siswa' : 'Aktifkan Siswa'}
            >
              {isActive ? <Icons.Power size={14} /> : <Icons.CheckCircle size={14} />}
            </button>
            <button
              className="btn btn-secondary btn-icon btn-sm"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/students/edit/${row.original.id}`);
              }}
              title="Edit Siswa"
            >
              <Icons.Edit3 size={14} />
            </button>
            <button
              className="btn btn-danger btn-icon btn-sm"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(row.original.id, row.original.name);
              }}
              title="Hapus Siswa"
            >
              <Icons.Trash2 size={14} />
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }} className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)' }}>Daftar Siswa</h1>
          <p className="text-muted">Kelola seluruh data master siswa MI, MTs, dan MA beserta status aktif/non-aktif.</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <button className="btn btn-secondary" onClick={() => navigate('/students/import')}>
            <Icons.Upload size={16} />
            <span>Import Excel</span>
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/students/new')}>
            <Icons.Plus size={16} />
            <span>Tambah Siswa</span>
          </button>
        </div>
      </div>

      {/* Sub menu controls */}
      <div className="card card-glass" style={{ padding: 'var(--space-4)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
            <button className="btn btn-ghost" onClick={() => navigate('/students/promotion')}>
              <Icons.ArrowUpCircle size={16} />
              <span>Kenaikan Kelas Massal</span>
            </button>
            <button className="btn btn-ghost" onClick={() => navigate('/students/levels')}>
              <Icons.Layers size={16} />
              <span>Kelola Tingkat & Kelas</span>
            </button>
            <button className="btn btn-ghost" onClick={() => navigate('/students/discounts')}>
              <Icons.BadgePercent size={16} />
              <span>Kategori Diskon</span>
            </button>
          </div>

          {/* Status Filter Buttons */}
          <div style={{ display: 'flex', gap: 'var(--space-2)', backgroundColor: 'var(--color-bg-secondary)', padding: '4px', borderRadius: 'var(--radius-md)' }}>
            <button
              className={`btn btn-sm ${statusFilter === 'ALL' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setStatusFilter('ALL')}
            >
              Semua ({students.length})
            </button>
            <button
              className={`btn btn-sm ${statusFilter === 'ACTIVE' ? 'btn-success' : 'btn-ghost'}`}
              onClick={() => setStatusFilter('ACTIVE')}
            >
              Aktif ({students.filter((s) => s.status === 'ACTIVE').length})
            </button>
            <button
              className={`btn btn-sm ${statusFilter === 'INACTIVE' ? 'btn-secondary' : 'btn-ghost'}`}
              onClick={() => setStatusFilter('INACTIVE')}
            >
              Non-Aktif ({students.filter((s) => s.status === 'INACTIVE').length})
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <DataTable
          columns={columns}
          data={filteredStudents}
          searchKey="name"
          searchPlaceholder="Cari siswa berdasarkan nama..."
          isLoading={loading}
        />
      </div>
    </div>
  );
}
