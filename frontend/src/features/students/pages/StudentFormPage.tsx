/**
 * Student Form Page
 * Form handles both adding a new student and editing an existing student
 * Reference data (Levels, Classes, Discount Categories) dynamically loaded from Database
 */
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  studentService,
  type LevelItem,
  type ClassItem,
  type DiscountCategoryItem,
} from '../studentService';
import { formatRupiah } from '../../../lib/utils';
import { toast } from 'sonner';
import * as Icons from 'lucide-react';

// Form validation schema
const studentSchema = z.object({
  nis: z.string().min(3, 'NIS minimal 3 karakter').max(12, 'NIS maksimal 12 karakter'),
  nisn: z.string().optional(),
  name: z.string().min(3, 'Nama minimal 3 karakter'),
  level: z.enum(['MI', 'MTS', 'MA']),
  className: z.string().min(1, 'Kelas harus dipilih'),
  discountCategory: z.string().min(1, 'Kategori diskon harus dipilih'),
  parentPhone: z.string().min(10, 'Nomor HP minimal 10 digit').regex(/^[0-9]+$/, 'Nomor HP hanya berupa angka'),
  status: z.enum(['ACTIVE', 'INACTIVE']),
});

type StudentFormValues = z.infer<typeof studentSchema>;

// Default fallback class list per level
const MOCK_CLASSES: Record<'MI' | 'MTS' | 'MA', string[]> = {
  MI: ['I-A', 'I-B', 'II-A', 'II-B', 'III-A', 'III-B', 'IV-A', 'IV-B', 'V-A', 'V-B', 'VI-A', 'VI-B'],
  MTS: ['VII-A', 'VII-B', 'VII-C', 'VIII-A', 'VIII-B', 'VIII-C', 'IX-A', 'IX-B', 'IX-C'],
  MA: ['X-IPA', 'X-IPS', 'XI-IPA', 'XI-IPS', 'XII-IPA', 'XII-IPS'],
};

export default function StudentFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditMode = !!id;

  const [loading, setLoading] = useState(isEditMode);
  
  // Real Database reference states
  const [dbLevels, setDbLevels] = useState<LevelItem[]>([]);
  const [dbClasses, setDbClasses] = useState<ClassItem[]>([]);
  const [discountCategories, setDiscountCategories] = useState<DiscountCategoryItem[]>([]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<StudentFormValues>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      nis: '',
      nisn: '',
      name: '',
      level: 'MI',
      className: '',
      discountCategory: 'Umum',
      parentPhone: '',
      status: 'ACTIVE',
    },
  });

  const selectedLevel = watch('level');

  // Load real reference data (Levels, Classes, Discount Categories) from Database
  useEffect(() => {
    const fetchReferenceData = async () => {
      try {
        const [levelsData, classesData, discountsData] = await Promise.all([
          studentService.getLevels(),
          studentService.getClasses(),
          studentService.getDiscounts(),
        ]);
        setDbLevels(levelsData);
        setDbClasses(classesData);
        setDiscountCategories(discountsData);
      } catch (err) {
        console.error('Gagal mengambil data referensi dari database:', err);
      }
    };
    fetchReferenceData();
  }, []);

  // Filter classes according to selected level from DB, with fallback to defaults
  const matchedLevelObj = dbLevels.find((l) => l.code === selectedLevel);
  const filteredDbClasses = matchedLevelObj
    ? dbClasses.filter((c) => c.levelId === matchedLevelObj.id).map((c) => c.name)
    : [];

  const availableClassNames =
    filteredDbClasses.length > 0 ? filteredDbClasses : MOCK_CLASSES[selectedLevel] || [];

  // Load student details for edit mode
  useEffect(() => {
    if (isEditMode && id) {
      const fetchStudent = async () => {
        try {
          const student = await studentService.getById(id);
          setValue('nis', student.nis);
          setValue('nisn', student.nisn || '');
          setValue('name', student.name);
          setValue('level', student.level);
          setValue('parentPhone', student.parentPhone);
          setValue('discountCategory', student.discountCategory || 'Umum');
          setValue('status', student.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE');
          // Set timeout so selectedLevel updates first
          setTimeout(() => {
            setValue('className', student.className);
          }, 0);
        } catch {
          toast.error('Gagal mengambil data siswa');
          navigate('/students');
        } finally {
          setLoading(false);
        }
      };
      fetchStudent();
    }
  }, [id, isEditMode, setValue, navigate]);

  const onSubmit = async (values: StudentFormValues) => {
    try {
      // Find discount amount from database categories selection
      const matchedDisc = discountCategories.find((d) => d.name === values.discountCategory);
      const discountAmount = matchedDisc ? Number(matchedDisc.amount) : 0;

      const payload = {
        ...values,
        discountAmount,
      };

      if (isEditMode && id) {
        await studentService.update(id, payload);
        toast.success('Data siswa berhasil diperbarui');
      } else {
        await studentService.create(payload);
        toast.success('Siswa baru berhasil ditambahkan');
      }
      navigate('/students');
    } catch (err: any) {
      toast.error(err.message || 'Terjadi kesalahan saat menyimpan data');
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
          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => navigate('/students')}>
            <Icons.ArrowLeft size={16} />
          </button>
          <h1 style={{ fontSize: 'var(--text-2xl)', margin: 0 }}>{isEditMode ? 'Edit Siswa' : 'Tambah Siswa'}</h1>
        </div>
        <p className="text-muted" style={{ marginLeft: '36px', marginTop: '4px' }}>
          {isEditMode ? 'Perbarui data profil siswa madrasah.' : 'Masukkan informasi data siswa baru.'}
        </p>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            {/* NIS */}
            <div className="form-group">
              <label className="form-label" htmlFor="student-nis">
                NIS <span className="required">*</span>
              </label>
              <input
                id="student-nis"
                type="text"
                className={`form-input ${errors.nis ? 'error' : ''}`}
                placeholder="Contoh: 10203001"
                disabled={isEditMode}
                {...register('nis')}
              />
              {errors.nis && <span className="form-error">{errors.nis.message}</span>}
            </div>

            {/* NISN */}
            <div className="form-group">
              <label className="form-label" htmlFor="student-nisn">
                NISN (Nasional)
              </label>
              <input
                id="student-nisn"
                type="text"
                className="form-input"
                placeholder="Contoh: 0012345678"
                {...register('nisn')}
              />
            </div>
          </div>

          {/* Nama Lengkap */}
          <div className="form-group">
            <label className="form-label" htmlFor="student-name">
              Nama Lengkap <span className="required">*</span>
            </label>
            <input
              id="student-name"
              type="text"
              className={`form-input ${errors.name ? 'error' : ''}`}
              placeholder="Masukkan nama lengkap siswa"
              {...register('name')}
            />
            {errors.name && <span className="form-error">{errors.name.message}</span>}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            {/* Tingkat Sekolah (Database levels) */}
            <div className="form-group">
              <label className="form-label" htmlFor="student-level">
                Tingkat Sekolah <span className="required">*</span>
              </label>
              <select
                id="student-level"
                className="form-input form-select"
                {...register('level')}
              >
                {dbLevels.length > 0 ? (
                  dbLevels.map((lvl) => (
                    <option key={lvl.id} value={lvl.code}>
                      {lvl.code} ({lvl.name})
                    </option>
                  ))
                ) : (
                  <>
                    <option value="MI">MI (Madrasah Ibtidaiyah)</option>
                    <option value="MTS">MTs (Madrasah Tsanawiyah)</option>
                    <option value="MA">MA (Madrasah Aliyah)</option>
                  </>
                )}
              </select>
            </div>

            {/* Kelas (Database classes) */}
            <div className="form-group">
              <label className="form-label" htmlFor="student-class">
                Kelas <span className="required">*</span>
              </label>
              <select
                id="student-class"
                className={`form-input form-select ${errors.className ? 'error' : ''}`}
                {...register('className')}
              >
                <option value="">Pilih Kelas</option>
                {availableClassNames.map((clsName) => (
                  <option key={clsName} value={clsName}>
                    {clsName}
                  </option>
                ))}
              </select>
              {errors.className && <span className="form-error">{errors.className.message}</span>}
            </div>
          </div>

          {/* Kategori Diskon Tetap (Real DB Data) */}
          <div className="form-group">
            <label className="form-label" htmlFor="student-discount">
              Kategori Diskon Tetap <span className="required">*</span>
            </label>
            <select
              id="student-discount"
              className="form-input form-select"
              {...register('discountCategory')}
            >
              <option value="Umum">Umum (Tidak Ada Diskon)</option>
              {discountCategories
                .filter((disc) => disc.isActive ?? true)
                .map((disc) => {
                  const val = Number(disc.amount);
                  const discountLabel = val <= 100 ? `Diskon ${val}%` : `Potongan ${formatRupiah(val)}`;
                  return (
                    <option key={disc.id} value={disc.name}>
                      {disc.name} ({discountLabel})
                    </option>
                  );
                })}
            </select>
          </div>

          {/* Nomor HP Wali */}
          <div className="form-group">
            <label className="form-label" htmlFor="student-phone">
              Nomor WhatsApp Wali Murid <span className="required">*</span>
            </label>
            <input
              id="student-phone"
              type="text"
              className={`form-input ${errors.parentPhone ? 'error' : ''}`}
              placeholder="Masukkan No. HP (contoh: 081234567890)"
              {...register('parentPhone')}
            />
            {errors.parentPhone && <span className="form-error">{errors.parentPhone.message}</span>}
            <span className="form-hint">Nomor ini akan digunakan sebagai jalur pengiriman notifikasi tagihan/struk.</span>
          </div>

          {/* Status Siswa */}
          <div className="form-group">
            <label className="form-label" htmlFor="student-status">
              Status Keaktifan Siswa <span className="required">*</span>
            </label>
            <select
              id="student-status"
              className="form-input form-select"
              {...register('status')}
            >
              <option value="ACTIVE">Aktif (Siswa Aktif Belajar & Penagihan)</option>
              <option value="INACTIVE">Non-Aktif (Diarsipkan / Cuti / Pindah)</option>
            </select>
          </div>

          <div className="divider"></div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate('/students')}
            >
              Batal
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
