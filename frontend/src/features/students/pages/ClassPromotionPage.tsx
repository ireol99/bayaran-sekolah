/**
 * Class Promotion Page
 * Facilitates mass class promotion workflows for student groups
 * Levels and Classes dynamically retrieved from Database (levels & classes tables)
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  studentService,
  type Student,
  type LevelItem,
  type ClassItem,
} from '../studentService';
import { toast } from 'sonner';
import * as Icons from 'lucide-react';

const MOCK_CLASSES: Record<'MI' | 'MTS' | 'MA', string[]> = {
  MI: ['I-A', 'I-B', 'II-A', 'II-B', 'III-A', 'III-B', 'IV-A', 'IV-B', 'V-A', 'V-B', 'VI-A', 'VI-B'],
  MTS: ['VII-A', 'VII-B', 'VII-C', 'VIII-A', 'VIII-B', 'VIII-C', 'IX-A', 'IX-B', 'IX-C'],
  MA: ['X-IPA', 'X-IPS', 'XI-IPA', 'XI-IPS', 'XII-IPA', 'XII-IPS'],
};

export default function ClassPromotionPage() {
  const navigate = useNavigate();
  const [level, setLevel] = useState<string>('MI');
  const [sourceClass, setSourceClass] = useState('');
  const [targetClass, setTargetClass] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Database Reference States
  const [dbLevels, setDbLevels] = useState<LevelItem[]>([]);
  const [dbClasses, setDbClasses] = useState<ClassItem[]>([]);

  // Fetch Levels & Classes from Database API
  useEffect(() => {
    const fetchReferenceData = async () => {
      try {
        const [levelsData, classesData] = await Promise.all([
          studentService.getLevels(),
          studentService.getClasses(),
        ]);
        setDbLevels(levelsData);
        setDbClasses(classesData);
        if (levelsData.length > 0) {
          setLevel(levelsData[0].code);
        }
      } catch (err) {
        console.error('Gagal mengambil data referensi tingkat & kelas:', err);
      }
    };
    fetchReferenceData();
  }, []);

  // Filter classes according to selected level from DB, with fallback
  const matchedLevelObj = dbLevels.find((l) => l.code === level);
  const filteredDbClasses = matchedLevelObj
    ? dbClasses.filter((c) => c.levelId === matchedLevelObj.id).map((c) => c.name)
    : [];

  const availableClasses =
    filteredDbClasses.length > 0
      ? filteredDbClasses
      : MOCK_CLASSES[level as 'MI' | 'MTS' | 'MA'] || [];

  // Filter students based on level and source class
  const loadStudents = async () => {
    if (!sourceClass) return;
    setLoading(true);
    try {
      const allStudents = await studentService.getAll();
      const filtered = allStudents.filter(
        (s) => s.level === level && s.className === sourceClass && s.status === 'ACTIVE'
      );
      setStudents(filtered);
      setSelectedStudentIds(new Set(filtered.map((s) => s.id))); // select all by default
    } catch {
      toast.error('Gagal memuat data siswa');
    } finally {
      setLoading(false);
    }
  };

  // Trigger loading when source changes
  useEffect(() => {
    setSelectedStudentIds(new Set());
    setStudents([]);
    loadStudents();
  }, [level, sourceClass]);

  // Handle select/deselect student
  const toggleStudent = (id: string) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedStudentIds.size === students.length) {
      setSelectedStudentIds(new Set());
    } else {
      setSelectedStudentIds(new Set(students.map((s) => s.id)));
    }
  };

  const handlePromote = async () => {
    if (selectedStudentIds.size === 0) {
      toast.error('Pilih minimal satu siswa untuk dinaikkan kelas');
      return;
    }
    if (!targetClass) {
      toast.error('Pilih kelas tujuan kenaikan kelas');
      return;
    }
    if (sourceClass === targetClass) {
      toast.error('Kelas asal dan kelas tujuan tidak boleh sama');
      return;
    }

    setSubmitting(true);
    try {
      const ids = Array.from(selectedStudentIds);
      await studentService.promoteBatch(ids, targetClass, level);
      toast.success(`Berhasil menaikkan kelas ${ids.length} siswa ke ${targetClass}`);
      navigate('/students');
    } catch (err: any) {
      toast.error(err.message || 'Gagal menaikkan kelas siswa');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }} className="animate-fade-in">
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => navigate('/students')}>
            <Icons.ArrowLeft size={16} />
          </button>
          <h1 style={{ fontSize: 'var(--text-2xl)', margin: 0 }}>Kenaikan Kelas Massal</h1>
        </div>
        <p className="text-muted" style={{ marginLeft: '36px', marginTop: '4px' }}>
          Pindahkan kelompok siswa dari kelas lama ke kelas baru secara masif berdasarkan tingkatan akademik.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 'var(--space-6)', alignItems: 'start' }}>
        
        {/* Left Card: Select Parameters */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <h3 className="card-title" style={{ margin: 0 }}>Parameter Kenaikan Kelas</h3>
          
          {/* Tingkat Sekolah (Database levels) */}
          <div className="form-group">
            <label className="form-label">Tingkat Sekolah</label>
            <select
              className="form-input form-select"
              value={level}
              onChange={(e) => {
                setLevel(e.target.value);
                setSourceClass('');
                setTargetClass('');
              }}
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

          {/* Kelas Asal (Database classes) */}
          <div className="form-group">
            <label className="form-label">Kelas Asal</label>
            <select
              className="form-input form-select"
              value={sourceClass}
              onChange={(e) => setSourceClass(e.target.value)}
            >
              <option value="">Pilih Kelas Asal</option>
              {availableClasses.map((cls) => (
                <option key={cls} value={cls}>
                  {cls}
                </option>
              ))}
            </select>
          </div>

          {/* Kelas Tujuan (Database classes) */}
          <div className="form-group">
            <label className="form-label">Kelas Tujuan (Kenaikan)</label>
            <select
              className="form-input form-select"
              value={targetClass}
              onChange={(e) => setTargetClass(e.target.value)}
              disabled={!sourceClass}
            >
              <option value="">Pilih Kelas Tujuan</option>
              {availableClasses.map((cls) => (
                <option key={cls} value={cls}>
                  {cls}
                </option>
              ))}
            </select>
          </div>

          <div className="divider"></div>

          {sourceClass && targetClass && (
            <div style={{
              padding: 'var(--space-3) var(--space-4)',
              background: 'var(--color-accent-primary-muted)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid hsla(160, 84%, 39%, 0.2)',
              fontSize: 'var(--text-sm)',
              color: 'var(--color-text-primary)'
            }}>
              <span className="font-semibold" style={{ display: 'block', marginBottom: '4px' }}>Ringkasan Aksi:</span>
              Menaikkan kelas sebanyak <strong className="text-success">{selectedStudentIds.size} siswa</strong> dari kelas <strong>{sourceClass}</strong> ke kelas <strong>{targetClass}</strong>.
            </div>
          )}

          <button
            className="btn btn-primary"
            disabled={submitting || !sourceClass || !targetClass || selectedStudentIds.size === 0}
            onClick={handlePromote}
            style={{ width: '100%' }}
          >
            {submitting ? 'Memproses...' : 'Proses Kenaikan Kelas'}
          </button>
        </div>

        {/* Right Card: Students List & Checkbox */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
            <h3 className="card-title" style={{ margin: 0 }}>Daftar Siswa</h3>
            {students.length > 0 && (
              <button className="btn btn-secondary btn-sm" onClick={toggleAll}>
                {selectedStudentIds.size === students.length ? 'Deselect All' : 'Select All'}
              </button>
            )}
          </div>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-12)' }}>
              <div className="spinner"></div>
              <span className="text-muted" style={{ marginTop: 'var(--space-2)' }}>Memuat data siswa...</span>
            </div>
          ) : !sourceClass ? (
            <div className="empty-state">
              <Icons.Inbox className="empty-state-icon" />
              <div className="empty-state-title">Kelas Asal Belum Dipilih</div>
              <div className="empty-state-description">Silakan pilih Tingkat dan Kelas Asal terlebih dahulu untuk melihat daftar siswa.</div>
            </div>
          ) : students.length === 0 ? (
            <div className="empty-state">
              <Icons.Inbox className="empty-state-icon" />
              <div className="empty-state-title">Siswa Tidak Ditemukan</div>
              <div className="empty-state-description">Tidak ada data siswa aktif pada kelas {sourceClass}.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
                Dipilih: <strong>{selectedStudentIds.size}</strong> dari <strong>{students.length}</strong> siswa
              </span>

              <div className="data-table-wrapper" style={{ maxHeight: '420px' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '40px' }}>Pilih</th>
                      <th>NIS</th>
                      <th>Nama Lengkap</th>
                      <th>Kelas Saat Ini</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student) => (
                      <tr
                        key={student.id}
                        onClick={() => toggleStudent(student.id)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedStudentIds.has(student.id)}
                            onChange={() => {}} // handled by tr click
                          />
                        </td>
                        <td>{student.nis}</td>
                        <td className="font-semibold">{student.name}</td>
                        <td><span className="badge badge-neutral">{student.className}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
