/**
 * Dashboard Page
 * Real-time executive financial dashboard referencing live invoice database with date range filtering
 */
import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { billingService, type Invoice } from '../../billing/billingService';
import { formatRupiah } from '../../../lib/utils';
import * as Icons from 'lucide-react';
import './DashboardPage.css';

interface DelinquentStudent {
  name: string;
  className: string;
  nis: string;
  amount: number;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  // Date range filter
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    const fetchInvoices = async () => {
      setLoading(true);
      try {
        const data = await billingService.getInvoices();
        setInvoices(data);
      } catch (err) {
        console.error('Gagal memuat data tagihan dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchInvoices();
  }, []);

  // Filter invoices by release date range (createdAt)
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      if (!inv.createdAt) return true;
      const invDate = inv.createdAt.split(' ')[0].split('T')[0];
      if (startDate && invDate < startDate) return false;
      if (endDate && invDate > endDate) return false;
      return true;
    });
  }, [invoices, startDate, endDate]);

  // Compute stats per level (MI, MTs, MA) directly from filteredInvoices
  const levelStats = useMemo(() => {
    let miBilling = 0, mtsBilling = 0, maBilling = 0;
    let miPaid = 0, mtsPaid = 0, maPaid = 0;
    let miRemaining = 0, mtsRemaining = 0, maRemaining = 0;

    for (const inv of filteredInvoices) {
      const lvl = (inv.level || 'MI').toUpperCase();
      const finalAmt = Number(inv.finalAmount);
      const paidAmt = Number(inv.paidAmount);
      const remAmt = Math.max(0, finalAmt - paidAmt);

      if (lvl.includes('MI')) {
        miBilling += finalAmt;
        miPaid += paidAmt;
        miRemaining += remAmt;
      } else if (lvl.includes('MTS')) {
        mtsBilling += finalAmt;
        mtsPaid += paidAmt;
        mtsRemaining += remAmt;
      } else {
        maBilling += finalAmt;
        maPaid += paidAmt;
        maRemaining += remAmt;
      }
    }

    const totalB = miBilling + mtsBilling + maBilling;
    const totalP = miPaid + mtsPaid + maPaid;
    const totalR = miRemaining + mtsRemaining + maRemaining;

    const miRatio = miBilling > 0 ? ((miPaid / miBilling) * 100).toFixed(1) + '%' : '0.0%';
    const mtsRatio = mtsBilling > 0 ? ((mtsPaid / mtsBilling) * 100).toFixed(1) + '%' : '0.0%';
    const maRatio = maBilling > 0 ? ((maPaid / maBilling) * 100).toFixed(1) + '%' : '0.0%';
    const overallRatio = totalB > 0 ? ((totalP / totalB) * 100).toFixed(1) + '%' : '0.0%';

    return {
      totalBilling: totalB,
      totalPaid: totalP,
      totalRemaining: totalR,
      overallRatio,
      billingBreakdown: { MI: formatRupiah(miBilling), MTS: formatRupiah(mtsBilling), MA: formatRupiah(maBilling) },
      paidBreakdown: { MI: formatRupiah(miPaid), MTS: formatRupiah(mtsPaid), MA: formatRupiah(maPaid) },
      remainingBreakdown: { MI: formatRupiah(miRemaining), MTS: formatRupiah(mtsRemaining), MA: formatRupiah(maRemaining) },
      ratioBreakdown: { MI: miRatio, MTS: mtsRatio, MA: maRatio },
    };
  }, [filteredInvoices]);

  // Compute Top 10 Delinquents per Level directly from filteredInvoices
  const { miTop10, mtsTop10, maTop10 } = useMemo(() => {
    const studentMap = new Map<string, { name: string; className: string; level: string; nis: string; debt: number }>();

    for (const inv of filteredInvoices) {
      if (inv.status === 'PAID') continue;
      const rem = Number(inv.finalAmount) - Number(inv.paidAmount);
      if (rem <= 0) continue;

      const key = inv.studentId;
      const prev = studentMap.get(key) || {
        name: inv.studentName || 'Siswa',
        className: inv.className || '',
        level: (inv.level || 'MI').toUpperCase(),
        nis: inv.nis || '',
        debt: 0,
      };

      studentMap.set(key, { ...prev, debt: prev.debt + rem });
    }

    const all = Array.from(studentMap.values());
    const getTop10 = (lvlCode: string): DelinquentStudent[] => {
      return all
        .filter((s) => s.level.includes(lvlCode))
        .sort((a, b) => b.debt - a.debt)
        .slice(0, 10)
        .map((s) => ({
          name: s.name,
          className: s.className,
          nis: s.nis,
          amount: s.debt,
        }));
    };

    return {
      miTop10: getTop10('MI'),
      mtsTop10: getTop10('MTS'),
      maTop10: getTop10('MA'),
    };
  }, [filteredInvoices]);

  const stats = [
    {
      label: 'Total Penagihan',
      value: levelStats.totalBilling,
      icon: <Icons.FileText />,
      color: 'var(--color-accent-secondary)',
      breakdown: levelStats.billingBreakdown,
    },
    {
      label: 'Total Terbayar',
      value: levelStats.totalPaid,
      icon: <Icons.CheckCircle2 />,
      color: 'var(--color-accent-primary)',
      breakdown: levelStats.paidBreakdown,
    },
    {
      label: 'Total Tunggakan',
      value: levelStats.totalRemaining,
      icon: <Icons.AlertCircle />,
      color: 'var(--color-danger)',
      breakdown: levelStats.remainingBreakdown,
    },
    {
      label: 'Collection Ratio',
      value: levelStats.overallRatio,
      icon: <Icons.TrendingUp />,
      color: 'var(--color-warning)',
      breakdown: levelStats.ratioBreakdown,
    },
  ];

  return (
    <div className="dashboard-page animate-fade-in">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1>Assalamu'alaikum, {user?.name}</h1>
          <p className="text-muted">Selamat datang di panel kontrol keuangan sekolah Yayasan Madrasah Terpadu.</p>
        </div>
        <div className="dashboard-period">
          <Icons.Calendar size={18} />
          <span>Tahun Ajaran: 2025/2026</span>
        </div>
      </div>

      {/* Date Range Filter Bar */}
      <div className="card" style={{ padding: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-4)', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-4)', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '160px' }}>
              <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                Dari Tanggal
              </label>
              <input
                type="date"
                className="form-input"
                style={{ height: '38px', padding: '6px 12px', fontSize: 'var(--text-xs)' }}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '160px' }}>
              <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                Sampai Tanggal
              </label>
              <input
                type="date"
                className="form-input"
                style={{ height: '38px', padding: '6px 12px', fontSize: 'var(--text-xs)' }}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            {(startDate || endDate) && (
              <button
                className="btn btn-ghost btn-sm"
                style={{ height: '38px', color: 'var(--color-danger)', whiteSpace: 'nowrap' }}
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

          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
            Menampilkan data dari <strong>{filteredInvoices.length}</strong> tagihan
          </div>
        </div>
      </div>

      {/* KPI Stats Grid with Level Breakdown */}
      <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-6)', marginBottom: 'var(--space-6)' }}>
        {stats.map((stat, i) => (
          <div key={i} className="card card-interactive animate-scale-in" style={{ animationDelay: `${i * 50}ms` }}>
            <div className="dashboard-stat-header">
              <span className="text-muted font-medium">{stat.label}</span>
              <div className="dashboard-stat-icon" style={{ backgroundColor: `${stat.color}15`, color: stat.color }}>
                {stat.icon}
              </div>
            </div>

            <h2 className="dashboard-stat-value" style={{ marginTop: 'var(--space-2)' }}>
              {loading ? '...' : typeof stat.value === 'number' ? formatRupiah(stat.value) : stat.value}
            </h2>

            {/* Per Level Breakdown */}
            <div style={{ marginTop: 'var(--space-4)', paddingTop: 'var(--space-3)', borderTop: '1px dashed var(--color-border)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 'var(--text-xs)' }}>
                <span className="badge badge-info" style={{ padding: '2px 6px', fontSize: '10px' }}>MI</span>
                <span className="font-semibold">{loading ? '...' : stat.breakdown.MI}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 'var(--text-xs)' }}>
                <span className="badge badge-success" style={{ padding: '2px 6px', fontSize: '10px' }}>MTs</span>
                <span className="font-semibold">{loading ? '...' : stat.breakdown.MTS}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 'var(--text-xs)' }}>
                <span className="badge badge-warning" style={{ padding: '2px 6px', fontSize: '10px' }}>MA</span>
                <span className="font-semibold">{loading ? '...' : stat.breakdown.MA}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Top 10 Tunggakan per Level Cards (MI, MTs, MA) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--space-6)' }}>
        
        {/* Card 1: Top 10 Tunggakan MI */}
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
            <div>
              <h3 className="card-title">Top 10 Tunggakan MI</h3>
              <span className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>Unit Madrasah Ibtidaiyah</span>
            </div>
            <span className="badge badge-info">MI</span>
          </div>

          {miTop10.length === 0 ? (
            <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)' }}>
              <Icons.CheckCircle2 size={32} style={{ margin: '0 auto var(--space-2)', color: 'var(--color-success)', opacity: 0.8 }} />
              <div>Tidak ada tunggakan tagihan unit MI</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {miTop10.map((student, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 12px',
                    backgroundColor: 'var(--color-bg-tertiary)',
                    border: 'var(--glass-border)',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span
                      style={{
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        background: 'var(--color-bg-glass)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '11px',
                        fontWeight: 700,
                        color: 'var(--color-text-secondary)',
                      }}
                    >
                      {idx + 1}
                    </span>
                    <div>
                      <div className="font-semibold" style={{ fontSize: 'var(--text-sm)' }}>{student.name}</div>
                      <div className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>Kelas {student.className} | NIS: {student.nis}</div>
                    </div>
                  </div>
                  <div className="text-danger font-bold" style={{ fontSize: 'var(--text-xs)' }}>
                    {formatRupiah(student.amount)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Card 2: Top 10 Tunggakan MTs */}
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
            <div>
              <h3 className="card-title">Top 10 Tunggakan MTs</h3>
              <span className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>Unit Madrasah Tsanawiyah</span>
            </div>
            <span className="badge badge-success">MTs</span>
          </div>

          {mtsTop10.length === 0 ? (
            <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)' }}>
              <Icons.CheckCircle2 size={32} style={{ margin: '0 auto var(--space-2)', color: 'var(--color-success)', opacity: 0.8 }} />
              <div>Tidak ada tunggakan tagihan unit MTs</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {mtsTop10.map((student, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 12px',
                    backgroundColor: 'var(--color-bg-tertiary)',
                    border: 'var(--glass-border)',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span
                      style={{
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        background: 'var(--color-bg-glass)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '11px',
                        fontWeight: 700,
                        color: 'var(--color-text-secondary)',
                      }}
                    >
                      {idx + 1}
                    </span>
                    <div>
                      <div className="font-semibold" style={{ fontSize: 'var(--text-sm)' }}>{student.name}</div>
                      <div className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>Kelas {student.className} | NIS: {student.nis}</div>
                    </div>
                  </div>
                  <div className="text-danger font-bold" style={{ fontSize: 'var(--text-xs)' }}>
                    {formatRupiah(student.amount)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Card 3: Top 10 Tunggakan MA */}
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
            <div>
              <h3 className="card-title">Top 10 Tunggakan MA</h3>
              <span className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>Unit Madrasah Aliyah</span>
            </div>
            <span className="badge badge-warning">MA</span>
          </div>

          {maTop10.length === 0 ? (
            <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)' }}>
              <Icons.CheckCircle2 size={32} style={{ margin: '0 auto var(--space-2)', color: 'var(--color-success)', opacity: 0.8 }} />
              <div>Tidak ada tunggakan tagihan unit MA</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {maTop10.map((student, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 12px',
                    backgroundColor: 'var(--color-bg-tertiary)',
                    border: 'var(--glass-border)',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span
                      style={{
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        background: 'var(--color-bg-glass)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '11px',
                        fontWeight: 700,
                        color: 'var(--color-text-secondary)',
                      }}
                    >
                      {idx + 1}
                    </span>
                    <div>
                      <div className="font-semibold" style={{ fontSize: 'var(--text-sm)' }}>{student.name}</div>
                      <div className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>Kelas {student.className} | NIS: {student.nis}</div>
                    </div>
                  </div>
                  <div className="text-danger font-bold" style={{ fontSize: 'var(--text-xs)' }}>
                    {formatRupiah(student.amount)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
