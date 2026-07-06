import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { studentService, type ClassItem, type LevelItem } from '../studentService';
import { toast } from 'sonner';
import * as Icons from 'lucide-react';

export default function LevelClassPage() {
  const navigate = useNavigate();
  const [levels, setLevels] = useState<LevelItem[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedLevels, setExpandedLevels] = useState<Set<string>>(new Set());

  // Modal states
  const [classModalOpen, setClassModalOpen] = useState(false);
  const [levelModalOpen, setLevelModalOpen] = useState(false);

  // Form states - Class
  const [editingClass, setEditingClass] = useState<ClassItem | null>(null);
  const [className, setClassName] = useState('');
  const [selectedLevelId, setSelectedLevelId] = useState<string>('');

  // Form states - Level
  const [levelName, setLevelName] = useState('');
  const [levelCode, setLevelCode] = useState('');

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [lvls, clss] = await Promise.all([studentService.getLevels(), studentService.getClasses()]);
      setLevels(lvls);
      setClasses(clss);
      setExpandedLevels(new Set(lvls.map((l) => l.id)));
      if (lvls.length > 0 && !selectedLevelId) {
        setSelectedLevelId(lvls[0].id);
      }
    } catch (err: any) {
      toast.error(err.message || 'Gagal memuat data tingkat & kelas');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const toggleLevel = (id: string) => {
    setExpandedLevels((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Open Add/Edit Class Modal
  const openAddClassModal = (levelId?: string) => {
    setEditingClass(null);
    if (levelId) {
      setSelectedLevelId(levelId);
    } else if (levels.length > 0) {
      setSelectedLevelId(levels[0].id);
    }
    setClassName('');
    setClassModalOpen(true);
  };

  const openEditClassModal = (cls: ClassItem) => {
    setEditingClass(cls);
    setSelectedLevelId(cls.levelId);
    setClassName(cls.name);
    setClassModalOpen(true);
  };

  // Open Add Level Modal
  const openAddLevelModal = () => {
    setLevelName('');
    setLevelCode('');
    setLevelModalOpen(true);
  };

  // Handle Delete Class
  const handleDeleteClass = async (id: string, name: string) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus kelas "${name}"?`)) {
      try {
        await studentService.deleteClass(id);
        setClasses((prev) => prev.filter((c) => c.id !== id));
        toast.success(`Kelas "${name}" berhasil dihapus`);
      } catch (err: any) {
        toast.error(err.message || 'Gagal menghapus kelas');
      }
    }
  };

  // Handle Delete Level
  const handleDeleteLevel = async (id: string, name: string) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus tingkat "${name}" beserta seluruh kelas di dalamnya?`)) {
      try {
        await studentService.deleteLevel(id);
        setLevels((prev) => prev.filter((l) => l.id !== id));
        setClasses((prev) => prev.filter((c) => c.levelId !== id));
        toast.success(`Tingkat "${name}" berhasil dihapus`);
      } catch (err: any) {
        toast.error(err.message || 'Gagal menghapus tingkat');
      }
    }
  };

  // Submit Add/Edit Class
  const handleClassSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!className.trim()) {
      toast.error('Nama kelas harus diisi');
      return;
    }

    try {
      if (editingClass) {
        setClasses((prev) =>
          prev.map((c) => (c.id === editingClass.id ? { ...c, name: className, levelId: selectedLevelId } : c))
        );
        toast.success(`Kelas "${className}" berhasil diperbarui`);
      } else {
        const created = await studentService.createClass({ name: className, levelId: selectedLevelId });
        setClasses((prev) => [...prev, created]);
        toast.success(`Kelas "${className}" berhasil ditambahkan`);
      }
      setClassModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyimpan kelas');
    }
  };

  // Submit Add Level
  const handleLevelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!levelName.trim()) {
      toast.error('Nama tingkat harus diisi');
      return;
    }

    try {
      const created = await studentService.createLevel({
        name: levelName,
        code: levelCode || levelName.substring(0, 3).toUpperCase(),
      });
      setLevels((prev) => [...prev, created]);
      setExpandedLevels((prev) => new Set([...prev, created.id]));
      setSelectedLevelId(created.id);
      toast.success(`Tingkat "${levelName}" berhasil ditambahkan`);
      setLevelModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyimpan tingkat');
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
        <div className="spinner spinner-lg"></div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }} className="animate-fade-in">
      {/* Top Header & Navigation Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => navigate('/students')}>
              <Icons.ArrowLeft size={16} />
            </button>
            <h1 style={{ fontSize: 'var(--text-2xl)', margin: 0 }}>Tingkat & Kelas</h1>
          </div>
          <p className="text-muted" style={{ marginLeft: '36px', marginTop: '4px' }}>
            Kelola unit tingkatan madrasah beserta data pembagian rombel (rombongan belajar) kelas dari database.
          </p>
        </div>

        {/* Action Buttons Header */}
        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <button className="btn btn-secondary" onClick={openAddLevelModal}>
            <Icons.Layers size={16} />
            <span>+ Tambah Tingkat</span>
          </button>
          <button className="btn btn-primary" onClick={() => openAddClassModal()}>
            <Icons.Plus size={16} />
            <span>+ Tambah Kelas</span>
          </button>
        </div>
      </div>

      {/* Levels & Classes List Container */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', maxWidth: '900px' }}>
        {levels.length === 0 ? (
          <div className="card text-center" style={{ padding: 'var(--space-8)' }}>
            <Icons.FolderOpen size={48} className="text-muted" style={{ margin: '0 auto var(--space-4)' }} />
            <h3 style={{ marginBottom: 'var(--space-2)' }}>Belum Ada Data Tingkat Sekolah</h3>
            <p className="text-muted" style={{ maxWidth: '480px', margin: '0 auto var(--space-6)' }}>
              Silakan tambahkan unit tingkat madrasah (misal: MI, MTs, MA, PAUD, Diniyah) untuk mulai menyusun kelas.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-3)' }}>
              <button className="btn btn-primary" onClick={openAddLevelModal}>
                <Icons.Plus size={16} />
                <span>Tambah Tingkat Sekarang</span>
              </button>
            </div>
          </div>
        ) : (
          levels.map((lvl) => {
            const levelClasses = classes.filter((c) => c.levelId === lvl.id);
            const isExpanded = expandedLevels.has(lvl.id);

            return (
              <div key={lvl.id} className="card card-glass" style={{ padding: '0', overflow: 'hidden' }}>
                {/* Accordion Header */}
                <div
                  onClick={() => toggleLevel(lvl.id)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: 'var(--space-4) var(--space-6)',
                    cursor: 'pointer',
                    backgroundColor: 'var(--color-bg-secondary)',
                    borderBottom: isExpanded ? '1px solid var(--color-border)' : 'none',
                    userSelect: 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                    <div
                      style={{
                        transform: isExpanded ? 'rotate(180deg)' : 'none',
                        transition: 'transform var(--transition-fast)',
                        display: 'flex',
                      }}
                    >
                      <Icons.ChevronDown size={18} className="text-muted" />
                    </div>
                    <div>
                      <span style={{ fontWeight: 'var(--font-semibold)', fontSize: 'var(--text-base)' }}>
                        {lvl.name} ({lvl.code})
                      </span>
                      <span className="badge badge-neutral" style={{ marginLeft: 'var(--space-3)' }}>
                        {levelClasses.length} Kelas
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 'var(--space-2)' }} onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => openAddClassModal(lvl.id)}
                    >
                      <Icons.Plus size={14} />
                      <span>Tambah Kelas</span>
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-icon btn-sm text-danger"
                      onClick={() => handleDeleteLevel(lvl.id, lvl.name)}
                      title="Hapus Tingkat"
                    >
                      <Icons.Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Accordion Body */}
                {isExpanded && (
                  <div style={{ padding: 'var(--space-4) var(--space-6)' }}>
                    {levelClasses.length === 0 ? (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-2) 0' }}>
                        <span className="text-muted font-medium" style={{ fontStyle: 'italic' }}>
                          Belum ada kelas terdaftar di tingkat ini.
                        </span>
                        <button className="btn btn-ghost btn-sm text-primary" onClick={() => openAddClassModal(lvl.id)}>
                          + Tambah Kelas
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 'var(--space-3)' }}>
                        {levelClasses.map((cls) => (
                          <div
                            key={cls.id}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: 'var(--space-3) var(--space-4)',
                              backgroundColor: 'var(--color-bg-tertiary)',
                              borderRadius: 'var(--radius-md)',
                              border: '1px solid var(--color-border)',
                            }}
                          >
                            <span style={{ fontWeight: 'var(--font-medium)' }}>{cls.name}</span>
                            <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
                              <button
                                type="button"
                                className="btn btn-ghost btn-icon btn-sm"
                                onClick={() => openEditClassModal(cls)}
                                title="Edit Kelas"
                              >
                                <Icons.Edit2 size={14} />
                              </button>
                              <button
                                type="button"
                                className="btn btn-ghost btn-icon btn-sm text-danger"
                                onClick={() => handleDeleteClass(cls.id, cls.name)}
                                title="Hapus Kelas"
                              >
                                <Icons.Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* MODAL 1: TAMBAH / EDIT KELAS */}
      {classModalOpen && (
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
          onClick={() => setClassModalOpen(false)}
        >
          <div
            className="card animate-scale-in"
            style={{ width: '100%', maxWidth: '450px', margin: 'var(--space-4)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
              <h3>{editingClass ? 'Edit Kelas' : 'Tambah Kelas Baru'}</h3>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setClassModalOpen(false)}>
                <Icons.X size={18} />
              </button>
            </div>

            <form onSubmit={handleClassSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div className="form-group">
                <label className="form-label">Tingkat Sekolah</label>
                <select
                  className="form-select"
                  value={selectedLevelId}
                  onChange={(e) => setSelectedLevelId(e.target.value)}
                  required
                >
                  {levels.map((lvl) => (
                    <option key={lvl.id} value={lvl.id}>
                      {lvl.name} ({lvl.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Nama Kelas / Rombel</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Contoh: 7-A, 10-IPA-1"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setClassModalOpen(false)}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingClass ? 'Simpan Perubahan' : 'Tambah Kelas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: TAMBAH TINGKAT SEKOLAH */}
      {levelModalOpen && (
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
          onClick={() => setLevelModalOpen(false)}
        >
          <div
            className="card animate-scale-in"
            style={{ width: '100%', maxWidth: '450px', margin: 'var(--space-4)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
              <h3>Tambah Tingkat Sekolah Baru</h3>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setLevelModalOpen(false)}>
                <Icons.X size={18} />
              </button>
            </div>

            <form onSubmit={handleLevelSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div className="form-group">
                <label className="form-label">Nama Tingkat Sekolah</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Contoh: Madrasah Ibtidaiyah, Diniyah"
                  value={levelName}
                  onChange={(e) => setLevelName(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Kode Singkatan</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Contoh: MI, MTS, MA, DINIYAH"
                  value={levelCode}
                  onChange={(e) => setLevelCode(e.target.value.toUpperCase())}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setLevelModalOpen(false)}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary">
                  Tambah Tingkat
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
