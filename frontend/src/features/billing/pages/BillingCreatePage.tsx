/**
 * Billing Create Modal
 * Multi-step wizard popup to mass generate billing statement with custom discount category overrides
 * Dynamically loads: Academic Years from academic_years table,
 *                    Levels from levels table, Classes from classes table
 */
import { useState, useEffect } from 'react';
import { billingService, type BillingType } from '../billingService';
import { studentService, type LevelItem, type ClassItem, type AcademicYearItem } from '../../students/studentService';
import { whatsappService } from '../../notifications/whatsappService';
import { formatRupiah, MONTH_NAMES } from '../../../lib/utils';
import { toast } from 'sonner';
import * as Icons from 'lucide-react';

interface BillingCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface DiscountOverride {
  id: string;
  name: string;
  type: 'NOMINAL' | 'PERCENTAGE';
  amount: number;
}

export default function BillingCreateModal({ isOpen, onClose, onSuccess }: BillingCreateModalProps) {
  if (!isOpen) return null;

  const [step, setStep] = useState(1);

  // Form states
  const [academicYear, setAcademicYear] = useState('');
  const [selectedLevelIds, setSelectedLevelIds] = useState<Set<string>>(new Set());
  const [selectedClasses, setSelectedClasses] = useState<Set<string>>(new Set());
  const [billingType, setBillingType] = useState('SPP');
  const [baseAmount, setBaseAmount] = useState<number>(200000);
  const [selectedPeriods, setSelectedPeriods] = useState<Set<string>>(new Set(['Juli']));
  const [submitting, setSubmitting] = useState(false);

  // Reference data from DB
  const [dbYears, setDbYears] = useState<AcademicYearItem[]>([]);
  const [dbLevels, setDbLevels] = useState<LevelItem[]>([]);
  const [dbClasses, setDbClasses] = useState<ClassItem[]>([]);
  const [dbBillingTypes, setDbBillingTypes] = useState<BillingType[]>([]);
  const [loadingRef, setLoadingRef] = useState(true);

  // Discount settings custom overrides for this batch
  const [discounts, setDiscounts] = useState<DiscountOverride[]>([
    { id: '1', name: 'Umum', type: 'NOMINAL', amount: 0 },
    { id: '2', name: 'Anak Yatim', type: 'PERCENTAGE', amount: 100 },
    { id: '3', name: 'Anak Guru', type: 'PERCENTAGE', amount: 50 },
    { id: '4', name: 'Beasiswa Yayasan', type: 'PERCENTAGE', amount: 70 },
    { id: '5', name: 'Keluarga Kurang Mampu', type: 'PERCENTAGE', amount: 30 },
  ]);

  // Fetch reference data on mount
  useEffect(() => {
    const fetchRefData = async () => {
      setLoadingRef(true);
      try {
        const [years, levels, classes, billingTypes] = await Promise.all([
          studentService.getAcademicYears(),
          studentService.getLevels(),
          studentService.getClasses(),
          billingService.getBillingTypes(),
        ]);
        setDbYears(years);
        setDbLevels(levels);
        setDbClasses(classes);
        setDbBillingTypes(billingTypes);

        // Auto-select current active academic year
        const currentYear = years.find((y) => y.isCurrent) || years[0];
        if (currentYear) setAcademicYear(currentYear.name);

        // Auto-select all levels
        setSelectedLevelIds(new Set(levels.map((l) => l.id)));

        // Auto-select first active billing type
        const firstType = billingTypes[0];
        if (firstType) setBillingType(firstType.code);
      } catch (err) {
        console.error('Gagal memuat data referensi:', err);
        toast.error('Gagal memuat data referensi tingkat dan kelas');
      } finally {
        setLoadingRef(false);
      }
    };
    fetchRefData();
  }, []);

  // Helpers
  const getLevelById = (id: string) => dbLevels.find((l) => l.id === id);
  const getClassesForLevel = (levelId: string) => dbClasses.filter((c) => c.levelId === levelId);
  const getSelectedLevelCodes = () => Array.from(selectedLevelIds).map((id) => getLevelById(id)?.code || '').filter(Boolean);

  const toggleLevel = (levelId: string) => {
    setSelectedLevelIds((prev) => {
      const next = new Set(prev);
      if (next.has(levelId)) {
        next.delete(levelId);
        // Also remove classes belonging to this level
        const levelClasses = getClassesForLevel(levelId).map((c) => c.name);
        setSelectedClasses((prevCls) => {
          const nextCls = new Set(prevCls);
          levelClasses.forEach((cls) => nextCls.delete(cls));
          return nextCls;
        });
      } else {
        next.add(levelId);
      }
      return next;
    });
  };

  const toggleClass = (cls: string) => {
    setSelectedClasses((prev) => {
      const next = new Set(prev);
      if (next.has(cls)) next.delete(cls);
      else next.add(cls);
      return next;
    });
  };

  const toggleAllClassesForLevel = (levelId: string) => {
    const levelClasses = getClassesForLevel(levelId).map((c) => c.name);
    const allSelected = levelClasses.every((cls) => selectedClasses.has(cls));
    setSelectedClasses((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        levelClasses.forEach((cls) => next.delete(cls));
      } else {
        levelClasses.forEach((cls) => next.add(cls));
      }
      return next;
    });
  };

  const togglePeriod = (month: string) => {
    setSelectedPeriods((prev) => {
      const next = new Set(prev);
      if (next.has(month)) next.delete(month);
      else next.add(month);
      return next;
    });
  };

  const updateDiscountAmount = (id: string, amount: number) => {
    setDiscounts((prev) =>
      prev.map((d) => (d.id === id ? { ...d, amount: Math.max(0, amount) } : d))
    );
  };

  const updateDiscountType = (id: string, type: 'NOMINAL' | 'PERCENTAGE') => {
    setDiscounts((prev) =>
      prev.map((d) => (d.id === id ? { ...d, type, amount: type === 'PERCENTAGE' ? Math.min(d.amount, 100) : d.amount } : d))
    );
  };


  const handleNext = () => {
    if (step === 1 && selectedLevelIds.size === 0) {
      toast.error('Pilih minimal satu tingkat sekolah');
      return;
    }
    if (step === 2 && (!billingType || baseAmount <= 0)) {
      toast.error('Masukkan jenis tagihan dan nominal dasar yang valid');
      return;
    }
    if (step === 3 && selectedPeriods.size === 0) {
      toast.error('Pilih minimal satu periode bulan tagihan');
      return;
    }
    setStep(step + 1);
  };

  const handleBack = () => { setStep(step - 1); };

  const handleGenerate = async () => {
    if (!academicYear) {
      toast.error('Pilih tahun ajaran terlebih dahulu');
      return;
    }
    setSubmitting(true);
    try {
      const levelCodes = getSelectedLevelCodes();
      // Collect selected class names; if none selected, send all classes of selected levels
      const allClassNamesForSelected = Array.from(selectedLevelIds)
        .flatMap((lvlId) => getClassesForLevel(lvlId).map((c) => c.name));
      const classesToSend = selectedClasses.size > 0
        ? Array.from(selectedClasses)
        : allClassNamesForSelected;

      await billingService.generateMassBilling({
        academicYear,
        levels: levelCodes,
        classes: classesToSend,
        billingType,
        baseAmount,
        periods: Array.from(selectedPeriods),
      });

      toast.success(`Berhasil menerbitkan tagihan massal untuk Tahun Ajaran ${academicYear}`);

      // Automatically trigger WhatsApp billing notification
      whatsappService.sendBillingIssue({
        studentName: `Siswa Kelas ${classesToSend.join(', ') || 'Target'}`,
        invoiceNumber: `INV-${Date.now()}`,
        billingType,
        period: Array.from(selectedPeriods).join(', '),
        amount: baseAmount,
      });

      onSuccess();
    } catch (err: any) {
      toast.error(err.message || 'Gagal menerbitkan tagihan massal');
    } finally {
      setSubmitting(false);
    }
  };

  const renderClassesGrid = () => {
    if (selectedLevelIds.size === 0) {
      return <p className="text-muted">Pilih tingkat sekolah terlebih dahulu</p>;
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {Array.from(selectedLevelIds).map((levelId) => {
          const level = getLevelById(levelId);
          if (!level) return null;
          const levelClasses = getClassesForLevel(levelId);
          if (levelClasses.length === 0) {
            return (
              <div key={levelId}>
                <span className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>
                  Kelas Tingkat {level.code}: <em>Belum ada kelas terdaftar</em>
                </span>
              </div>
            );
          }
          const isAllSelected = levelClasses.every((c) => selectedClasses.has(c.name));
          return (
            <div key={levelId}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span className="font-semibold" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
                  Kelas Tingkat {level.code}:
                </span>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm text-primary"
                  onClick={() => toggleAllClassesForLevel(levelId)}
                  style={{ padding: '2px 8px', fontSize: '11px', height: 'auto', textTransform: 'none', fontWeight: 'bold' }}
                >
                  {isAllSelected ? 'Kosongkan Semua' : 'Pilih Semua'}
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 'var(--space-2)' }}>
                {levelClasses.map((cls) => (
                  <button
                    key={cls.id}
                    type="button"
                    className={`btn btn-sm ${selectedClasses.has(cls.name) ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => toggleClass(cls.name)}
                  >
                    {cls.name}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const stepsInfo = [
    { num: 1, label: 'Sasaran' },
    { num: 2, label: 'Nominal & Diskon' },
    { num: 3, label: 'Periode Bulanan' },
    { num: 4, label: 'Pratinjau' },
  ];

  return (
    <div className="modal-backdrop">
      <div className="modal animate-scale-in" style={{ maxWidth: '640px', width: '90%' }}>
        
        {/* Modal Header */}
        <div className="modal-header">
          <h3 className="modal-title">Penerbitan Tagihan Massal</h3>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose} disabled={submitting}>
            <Icons.X size={16} />
          </button>
        </div>

        {/* Wizard Progress Indicator */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-4)', borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-secondary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            {stepsInfo.map((s) => (
              <div key={s.num} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <div
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: step === s.num ? 'var(--color-accent-primary)' : step > s.num ? 'var(--color-success-muted)' : 'var(--color-bg-tertiary)',
                    color: step === s.num ? 'var(--color-text-inverse)' : step > s.num ? 'var(--color-success)' : 'var(--color-text-secondary)',
                    fontWeight: 'bold',
                    fontSize: '11px',
                    border: step === s.num ? 'none' : '1px solid var(--color-border)',
                  }}
                >
                  {step > s.num ? '✓' : s.num}
                </div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: step === s.num ? 'bold' : 'normal',
                    color: step === s.num ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                  }}
                >
                  {s.label}
                </span>
                {s.num < 4 && <div style={{ width: '20px', height: '1px', backgroundColor: 'var(--color-border)' }}></div>}
              </div>
            ))}
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="modal-body" style={{ maxHeight: '420px', overflowY: 'auto', padding: 'var(--space-5)' }}>

          {loadingRef && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-8)' }}>
              <div className="spinner"></div>
              <span className="text-muted" style={{ marginLeft: '8px' }}>Memuat data tahun ajaran, tingkat, dan kelas...</span>
            </div>
          )}

          {/* STEP 1: TARGET */}
          {!loadingRef && step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {/* Tahun Ajaran — from academic_years table */}
              <div className="form-group">
                <label className="form-label">
                  Tahun Ajaran Aktif
                  {dbYears.find((y) => y.isCurrent && y.name === academicYear) && (
                    <span className="badge badge-success" style={{ marginLeft: '8px', fontSize: '10px' }}>Aktif Saat Ini</span>
                  )}
                </label>
                <select
                  className="form-input form-select"
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                >
                  {dbYears.length === 0 && (
                    <option value="">Tidak ada tahun ajaran. Tambahkan di menu Tagihan → Tahun Ajaran.</option>
                  )}
                  {dbYears.map((y) => (
                    <option key={y.id} value={y.name}>
                      Tahun Ajaran {y.name}{y.isCurrent ? ' (Aktif)' : ''}
                    </option>
                  ))}
                </select>
                {dbYears.length === 0 && (
                  <span className="form-hint" style={{ color: 'var(--color-warning)' }}>
                    ⚠ Belum ada tahun ajaran terdaftar. Tambahkan melalui menu Tagihan → Tahun Ajaran.
                  </span>
                )}
              </div>

              {/* Tingkat Sekolah Sasaran — from levels table */}
              <div className="form-group">
                <label className="form-label">Tingkat Sekolah Sasaran</label>
                {dbLevels.length === 0 ? (
                  <p className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>
                    Belum ada tingkat sekolah. Tambahkan melalui menu Data Siswa → Tingkat & Kelas.
                  </p>
                ) : (
                  <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
                    {dbLevels.map((level) => (
                      <button
                        key={level.id}
                        type="button"
                        className={`btn ${selectedLevelIds.has(level.id) ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => toggleLevel(level.id)}
                      >
                        Unit {level.code}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Batasi Kelas Tertentu — from classes table */}
              <div className="form-group">
                <label className="form-label">Batasi Kelas Tertentu (Opsional)</label>
                {renderClassesGrid()}
              </div>
            </div>
          )}

          {/* STEP 2: TYPE, PRICE & CUSTOM DISCOUNTS */}
          {!loadingRef && step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div className="form-group">
                <label className="form-label">Jenis Tagihan Keuangan</label>
                {dbBillingTypes.length === 0 ? (
                  <div style={{ padding: 'var(--space-3)', background: 'var(--color-warning-muted)', borderRadius: 'var(--radius-md)', color: 'var(--color-warning)', fontSize: 'var(--text-sm)' }}>
                    ⚠ Belum ada jenis tagihan aktif. Tambahkan di menu Tagihan → Jenis Tagihan.
                  </div>
                ) : (
                  <select className="form-input form-select" value={billingType} onChange={(e) => setBillingType(e.target.value)}>
                    {dbBillingTypes.map((bt) => (
                      <option key={bt.id} value={bt.code}>{bt.name}</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Nominal Dasar Tagihan (Sebelum Diskon)</label>
                <input
                  type="number"
                  className="form-input"
                  value={baseAmount || ''}
                  onChange={(e) => setBaseAmount(Number(e.target.value))}
                  placeholder="Masukkan nominal dasar, contoh: 200000"
                  min="1000"
                  required
                />
              </div>

              {/* ADJUST DISCOUNTS SECTION */}
              <div className="divider"></div>
              <h4 className="font-semibold" style={{ fontSize: 'var(--text-sm)' }}>
                Sesuaikan Potongan Diskon per Kategori (Khusus Batch Ini)
              </h4>
              <p className="text-muted" style={{ fontSize: '11px', marginTop: '-8px' }}>
                Ubah tipe atau besaran nominal diskon secara dinamis khusus untuk tagihan yang akan diterbitkan sekarang.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {discounts.map((d) => {
                  const discountValue = d.type === 'PERCENTAGE' ? (baseAmount * d.amount) / 100 : d.amount;
                  const finalTotalForCategory = Math.max(0, baseAmount - discountValue);

                  return (
                    <div
                      key={d.id}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1.8fr 1.2fr 1fr 1.3fr',
                        gap: '8px',
                        alignItems: 'center',
                        background: 'var(--color-bg-tertiary)',
                        padding: '8px 12px',
                        borderRadius: 'var(--radius-md)',
                        border: 'var(--glass-border)',
                      }}
                    >
                      <span className="font-semibold" style={{ fontSize: 'var(--text-xs)' }}>
                        {d.name}
                      </span>
                      <select
                        className="form-input btn-sm form-select"
                        value={d.type}
                        onChange={(e) => updateDiscountType(d.id, e.target.value as 'NOMINAL' | 'PERCENTAGE')}
                        style={{ padding: '2px 8px', fontSize: '11px', backgroundColor: '#ffffff', color: '#1e293b', border: '1px solid var(--color-border)' }}
                        disabled={d.name === 'Umum'}
                      >
                        <option value="NOMINAL">Nominal (Rp)</option>
                        <option value="PERCENTAGE">Persentase (%)</option>
                      </select>
                      <input
                        type="number"
                        className="form-input btn-sm"
                        value={d.amount}
                        onChange={(e) => updateDiscountAmount(d.id, Number(e.target.value))}
                        style={{ padding: '2px 8px', fontSize: '11px', backgroundColor: '#ffffff', color: '#1e293b', border: '1px solid var(--color-border)' }}
                        disabled={d.name === 'Umum'}
                        max={d.type === 'PERCENTAGE' ? 100 : undefined}
                        min={0}
                      />
                      <div style={{ textAlign: 'right', fontSize: 'var(--text-xs)' }}>
                        <span className="text-muted" style={{ display: 'block', fontSize: '9px' }}>Hasil Akhir:</span>
                        <strong className="text-success" style={{ fontSize: '11px' }}>{formatRupiah(finalTotalForCategory)}</strong>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3: PERIODS */}
          {!loadingRef && step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div className="form-group">
                <label className="form-label">Pilih Periode Bulan Tagihan (Bisa pilih lebih dari satu)</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(105px, 1fr))', gap: 'var(--space-2)' }}>
                  {MONTH_NAMES.map((month) => (
                    <button
                      key={month}
                      type="button"
                      className={`btn btn-sm ${selectedPeriods.has(month) ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => togglePeriod(month)}
                    >
                      {month}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: PREVIEW */}
          {!loadingRef && step === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {/* Summary */}
              <div style={{
                background: 'var(--color-bg-tertiary)',
                border: '1px solid var(--color-border)',
                padding: 'var(--space-4)',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--text-sm)',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px',
              }}>
                <div><span className="text-muted">Tahun Ajaran:</span> <strong>{academicYear}</strong></div>
                <div><span className="text-muted">Jenis Tagihan:</span> <strong>{billingType}</strong></div>
                <div><span className="text-muted">Tingkat Sasaran:</span> <strong>{getSelectedLevelCodes().join(', ') || '-'}</strong></div>
                <div><span className="text-muted">Nominal Dasar:</span> <strong>{formatRupiah(baseAmount)}</strong></div>
                <div><span className="text-muted">Periode:</span> <strong>{Array.from(selectedPeriods).join(', ')}</strong></div>
                <div><span className="text-muted">Kelas Filter:</span> <strong>{selectedClasses.size > 0 ? Array.from(selectedClasses).join(', ') : 'Semua Kelas'}</strong></div>
              </div>

              <div style={{
                background: 'var(--color-warning-muted)',
                border: '1px solid hsla(38, 92%, 50%, 0.3)',
                padding: 'var(--space-4)',
                borderRadius: 'var(--radius-lg)',
                color: 'var(--color-warning)',
                fontSize: 'var(--text-sm)',
                display: 'flex',
                gap: 'var(--space-3)'
              }}>
                <Icons.AlertTriangle size={24} style={{ flexShrink: 0 }} />
                <div>
                  <strong>Frozen Pricing Rule:</strong> Tagihan yang diterbitkan akan mengunci nominal potongan diskon yang disesuaikan saat ini. Perubahan harga master atau kategori diskon di masa depan tidak akan mempengaruhi data ini.
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="modal-footer" style={{ borderTop: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-secondary)' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
            Tutup
          </button>
          
          <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
            {step > 1 && (
              <button type="button" className="btn btn-outline" onClick={handleBack} disabled={submitting}>
                Kembali
              </button>
            )}
            
            {step < 4 ? (
              <button type="button" className="btn btn-primary" onClick={handleNext} disabled={loadingRef}>
                Lanjut
              </button>
            ) : (
              <button type="button" className="btn btn-success" onClick={handleGenerate} disabled={submitting || !academicYear}>
                {submitting ? 'Memproses...' : 'Terbitkan Tagihan'}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
