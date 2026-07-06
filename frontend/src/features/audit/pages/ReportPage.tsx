import { useState, useEffect, useMemo } from 'react';
import { billingService, type Transaction } from '../../billing/billingService';
import { savingsService, type Expense } from '../../savings/savingsService';
import { formatRupiah, MONTH_NAMES } from '../../../lib/utils';
import { toast } from 'sonner';
import { utils, write } from 'xlsx';
import * as Icons from 'lucide-react';

interface ReportRow {
  period: string;
  targetAmount: number;
  collectedAmount: number;
  delinquentAmount: number;
  collectionRatio: number;
}

interface ExpenseCategorySummary {
  categoryName: string;
  count: number;
  totalAmount: number;
  percentage: number;
}

interface CashFlowSummary {
  period: string;
  income: number;
  expense: number;
  net: number;
  status: 'SURPLUS' | 'DEFISIT';
}

const MOCK_REPORT_DATA: ReportRow[] = [
  { period: 'Juli 2025', targetAmount: 120000000, collectedAmount: 96000000, delinquentAmount: 24000000, collectionRatio: 80 },
  { period: 'Agustus 2025', targetAmount: 120000000, collectedAmount: 78000000, delinquentAmount: 42000000, collectionRatio: 65 },
  { period: 'September 2025', targetAmount: 120000000, collectedAmount: 62400000, delinquentAmount: 57600000, collectionRatio: 52 },
];

const DEFAULT_EXPENSE_CATEGORIES = [
  { name: 'Gaji Guru & Staf Pengajar', amount: 45000000, count: 12 },
  { name: 'Operasional ATK & Perlengkapan Cetak', amount: 8500000, count: 8 },
  { name: 'Pemeliharaan & Perbaikan Sarpras', amount: 14200000, count: 5 },
  { name: 'Tagihan Listrik, Air & Internet', amount: 6800000, count: 3 },
  { name: 'Kegiatan & Acara Siswa', amount: 12500000, count: 4 },
  { name: 'Konsumsi & Jamuan Rapat', amount: 3400000, count: 6 },
  { name: 'Pengeluaran Tak Terduga / Lainnya', amount: 2100000, count: 2 },
];

export default function ReportPage() {
  const [levelFilter, setLevelFilter] = useState('ALL');
  const [reports] = useState<ReportRow[]>(MOCK_REPORT_DATA);
  const [isExporting, setIsExporting] = useState(false);
  const [fromMonth, setFromMonth] = useState('Juli');
  const [toMonth, setToMonth] = useState('Desember');

  // DB Data
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [expData, txData] = await Promise.all([
          savingsService.getExpenses(),
          billingService.getTransactions(),
        ]);
        setExpenses(expData.filter((e: Expense) => e.status !== 'VOIDED'));
        setTransactions(txData.filter((t: Transaction) => t.type === 'PAYMENT'));
      } catch (err) {
        console.error('Gagal memuat data laporan:', err);
      }
    };
    loadData();
  }, []);

  // Compute Expense Summaries by Category
  const expenseSummaries = useMemo<ExpenseCategorySummary[]>(() => {
    if (expenses.length === 0) {
      // Use structured reference categories if database has 0 expenses yet
      const totalMock = DEFAULT_EXPENSE_CATEGORIES.reduce((acc, c) => acc + c.amount, 0);
      return DEFAULT_EXPENSE_CATEGORIES.map((c) => ({
        categoryName: c.name,
        count: c.count,
        totalAmount: c.amount,
        percentage: Number(((c.amount / totalMock) * 100).toFixed(1)),
      }));
    }

    const catMap = new Map<string, { count: number; total: number }>();
    let grandTotal = 0;

    for (const exp of expenses) {
      const name = exp.categoryName || 'Pengeluaran Lainnya';
      const prev = catMap.get(name) || { count: 0, total: 0 };
      catMap.set(name, {
        count: prev.count + 1,
        total: prev.total + Number(exp.totalAmount),
      });
      grandTotal += Number(exp.totalAmount);
    }

    return Array.from(catMap.entries()).map(([name, stat]) => ({
      categoryName: name,
      count: stat.count,
      totalAmount: stat.total,
      percentage: grandTotal > 0 ? Number(((stat.total / grandTotal) * 100).toFixed(1)) : 0,
    }));
  }, [expenses]);

  // Compute Totals
  const totalIncome = useMemo(() => {
    if (transactions.length > 0) {
      return transactions.reduce((acc, t) => acc + Number(t.amount), 0);
    }
    return 236400000; // Mock default
  }, [transactions]);

  const totalExpense = useMemo(() => {
    if (expenses.length > 0) {
      return expenses.reduce((acc, e) => acc + Number(e.totalAmount), 0);
    }
    return DEFAULT_EXPENSE_CATEGORIES.reduce((acc, c) => acc + c.amount, 0); // 92,500,000
  }, [expenses]);

  const targetAmountTotal = 360000000;
  const netSurplus = totalIncome - totalExpense;
  const expenseRatio = totalIncome > 0 ? Number(((totalExpense / totalIncome) * 100).toFixed(1)) : 0;

  // Monthly Cash Flow Breakdown
  const cashFlowBreakdown = useMemo<CashFlowSummary[]>(() => {
    return [
      { period: 'Juli 2025', income: 96000000, expense: 32000000, net: 64000000, status: 'SURPLUS' },
      { period: 'Agustus 2025', income: 78000000, expense: 30500000, net: 47500000, status: 'SURPLUS' },
      { period: 'September 2025', income: 62400000, expense: 30000000, net: 32400000, status: 'SURPLUS' },
    ];
  }, []);

  const handleExportExcel = () => {
    setIsExporting(true);
    try {
      const workbook = utils.book_new();

      // Sheet 1: Rekap Penerimaan
      const incomeRows = reports.map((r, idx) => ({
        'No': idx + 1,
        'Periode Bulan': r.period,
        'Target Penagihan (Rp)': r.targetAmount,
        'Realisasi Penerimaan (Rp)': r.collectedAmount,
        'Sisa Tunggakan (Rp)': r.delinquentAmount,
        'Efisiensi Penagihan (%)': `${r.collectionRatio}%`,
      }));
      const wsIncome = utils.json_to_sheet(incomeRows);
      utils.book_append_sheet(workbook, wsIncome, 'Rekap Penerimaan');

      // Sheet 2: Rekap Pengeluaran (Expense)
      const expenseRows = expenseSummaries.map((e, idx) => ({
        'No': idx + 1,
        'Kategori Pengeluaran': e.categoryName,
        'Banyak Transaksi': e.count,
        'Total Nominal (Rp)': e.totalAmount,
        'Porsi dari Total Expense (%)': `${e.percentage}%`,
      }));
      const wsExpense = utils.json_to_sheet(expenseRows);
      utils.book_append_sheet(workbook, wsExpense, 'Rekap Pengeluaran (Expense)');

      // Sheet 3: Ringkasan Arus Kas (Cash Flow)
      const cashFlowRows = cashFlowBreakdown.map((cf, idx) => ({
        'No': idx + 1,
        'Periode Bulan': cf.period,
        'Total Pemasukan (Rp)': cf.income,
        'Total Pengeluaran (Rp)': cf.expense,
        'Saldo Bersih (Rp)': cf.net,
        'Status Arus Kas': cf.status,
      }));
      const wsCashFlow = utils.json_to_sheet(cashFlowRows);
      utils.book_append_sheet(workbook, wsCashFlow, 'Ringkasan Arus Kas');

      const excelBuffer = write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Laporan_Keuangan_dan_Rekap_Expense_${fromMonth}_sd_${toMonth}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success('Laporan Keuangan & Rekap Pengeluaran (.xlsx) berhasil diunduh!');
    } catch (err) {
      console.error('Export Excel Error:', err);
      toast.error('Gagal mengunduh berkas laporan Excel');
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrintPDF = () => {
    window.print();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }} className="animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)' }}>Laporan & Analitik Keuangan Eksekutif</h1>
          <p className="text-muted">
            Laporan rekapitulasi penerimaan uang masuk, rekapitulasi pengeluaran kas (expense), dan analisis arus kas bersih.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)' }} className="no-print">
          <button className="btn btn-secondary" onClick={handleExportExcel} disabled={isExporting}>
            <Icons.Download size={16} />
            <span>Unduh Excel (.xlsx)</span>
          </button>
          <button className="btn btn-primary" onClick={handlePrintPDF}>
            <Icons.Printer size={16} />
            <span>Cetak PDF Laporan</span>
          </button>
        </div>
      </div>

      {/* Filter Parameters */}
      <div className="card card-glass no-print">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)' }}>
          <div className="form-group">
            <label className="form-label">Batasi Unit Madrasah</label>
            <select className="form-input form-select" value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)}>
              <option value="ALL">Semua Unit (MI, MTs, MA)</option>
              <option value="MI">MI (Madrasah Ibtidaiyah)</option>
              <option value="MTS">MTs (Madrasah Tsanawiyah)</option>
              <option value="MA">MA (Madrasah Aliyah)</option>
            </select>
          </div>
          
          <div className="form-group">
            <label className="form-label">Tahun Ajaran</label>
            <select className="form-input form-select">
              <option value="2025/2026">2025/2026</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Dari Bulan</label>
            <select className="form-input form-select" value={fromMonth} onChange={(e) => setFromMonth(e.target.value)}>
              {MONTH_NAMES.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Sampai Bulan</label>
            <select className="form-input form-select" value={toMonth} onChange={(e) => setToMonth(e.target.value)}>
              {MONTH_NAMES.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* KPI Stats overview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)' }}>
        <div className="card">
          <span className="text-muted font-medium" style={{ fontSize: 'var(--text-xs)' }}>Target Bruto Penagihan</span>
          <h2 style={{ fontSize: 'var(--text-lg)', marginTop: 'var(--space-2)' }}>{formatRupiah(targetAmountTotal)}</h2>
        </div>

        <div className="card" style={{ borderLeft: '3px solid var(--color-success)' }}>
          <span className="text-muted font-medium" style={{ fontSize: 'var(--text-xs)' }}>Pemasukan (Penerimaan Tagihan)</span>
          <h2 className="text-success font-bold" style={{ fontSize: 'var(--text-lg)', marginTop: 'var(--space-2)' }}>
            {formatRupiah(totalIncome)}
          </h2>
        </div>

        <div className="card" style={{ borderLeft: '3px solid var(--color-danger)' }}>
          <span className="text-muted font-medium" style={{ fontSize: 'var(--text-xs)' }}>Pengeluaran (Total Expense)</span>
          <h2 className="text-danger font-bold" style={{ fontSize: 'var(--text-lg)', marginTop: 'var(--space-2)' }}>
            {formatRupiah(totalExpense)}
          </h2>
        </div>

        <div className="card" style={{ borderLeft: '3px solid var(--color-accent-primary)' }}>
          <span className="text-muted font-medium" style={{ fontSize: 'var(--text-xs)' }}>Surplus / Saldo Bersih Kas</span>
          <h2 style={{ fontSize: 'var(--text-lg)', marginTop: 'var(--space-2)', color: netSurplus >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }} className="font-extrabold">
            {formatRupiah(netSurplus)}
          </h2>
        </div>

        <div className="card" style={{ borderLeft: '3px solid var(--color-warning)' }}>
          <span className="text-muted font-medium" style={{ fontSize: 'var(--text-xs)' }}>Rasio Pengeluaran vs Masuk</span>
          <h2 className="text-warning font-extrabold" style={{ fontSize: 'var(--text-lg)', marginTop: 'var(--space-2)' }}>
            {expenseRatio}%
          </h2>
        </div>
      </div>

      {/* Tabel 1: Rekapitulasi Penagihan Bulanan */}
      <div className="card print-area">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
          <div>
            <h3 className="card-title">1. Rekapitulasi Penerimaan Tagihan Siswa</h3>
            <p className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>Rincian uang sekolah masuk dan tingkat efisiensi penagihan bulanan.</p>
          </div>
          <span className="badge badge-success">Pemasukan Kas</span>
        </div>

        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Periode Bulan</th>
                <th>Target Penagihan</th>
                <th>Realisasi Penerimaan</th>
                <th>Tunggakan</th>
                <th style={{ width: '220px' }}>Rasio Efisiensi Penagihan (%)</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((row, idx) => (
                <tr key={idx}>
                  <td className="font-semibold">{row.period}</td>
                  <td>{formatRupiah(row.targetAmount)}</td>
                  <td className="text-success font-semibold">{formatRupiah(row.collectedAmount)}</td>
                  <td className="text-danger font-semibold">{formatRupiah(row.delinquentAmount)}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span className="font-bold" style={{ fontSize: 'var(--text-xs)', width: '32px', textAlign: 'right' }}>
                        {row.collectionRatio}%
                      </span>
                      <div className="progress-bar" style={{ flex: 1 }}>
                        <div
                          className={`progress-bar-fill ${row.collectionRatio < 60 ? 'danger' : row.collectionRatio < 80 ? 'warning' : ''}`}
                          style={{ width: `${row.collectionRatio}%` }}
                        ></div>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tabel 2: Rekapitulasi Pengeluaran (Expense) Per Kategori */}
      <div className="card print-area">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
          <div>
            <h3 className="card-title">2. Rekapitulasi Pengeluaran Kas (Expense Summary)</h3>
            <p className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>Rincian alokasi belanja operasional madrasah berdasarkan kategori pengeluaran.</p>
          </div>
          <span className="badge badge-danger">Pengeluaran Kas</span>
        </div>

        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Kategori Pengeluaran</th>
                <th style={{ textAlign: 'center' }}>Banyak Transaksi</th>
                <th>Total Nominal Pengeluaran</th>
                <th style={{ width: '240px' }}>Porsi Alokasi Expense (%)</th>
              </tr>
            </thead>
            <tbody>
              {expenseSummaries.map((item, idx) => (
                <tr key={idx}>
                  <td className="font-semibold">{item.categoryName}</td>
                  <td style={{ textAlign: 'center' }}>
                    <span className="badge badge-neutral">{item.count} Transaksi</span>
                  </td>
                  <td className="text-danger font-semibold">{formatRupiah(item.totalAmount)}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span className="font-bold" style={{ fontSize: 'var(--text-xs)', width: '38px', textAlign: 'right' }}>
                        {item.percentage}%
                      </span>
                      <div className="progress-bar" style={{ flex: 1 }}>
                        <div
                          className="progress-bar-fill danger"
                          style={{ width: `${Math.min(100, item.percentage)}%` }}
                        ></div>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: 'var(--color-bg-tertiary)', fontWeight: 'bold' }}>
                <td>TOTAL PENGELUARAN (EXPENSE)</td>
                <td style={{ textAlign: 'center' }}>
                  {expenseSummaries.reduce((acc, curr) => acc + curr.count, 0)} Transaksi
                </td>
                <td className="text-danger">{formatRupiah(totalExpense)}</td>
                <td>100.0%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Tabel 3: Ringkasan Arus Kas (Net Cash Flow) */}
      <div className="card print-area">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
          <div>
            <h3 className="card-title">3. Ringkasan Arus Kas Bersih (Cash Flow Statement)</h3>
            <p className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>Perbandingan pemasukan tagihan vs pengeluaran kas per periode bulan.</p>
          </div>
          <span className="badge badge-info">Kas Net</span>
        </div>

        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Periode Bulan</th>
                <th>Pemasukan Tagihan (Rp)</th>
                <th>Pengeluaran Kas (Rp)</th>
                <th>Saldo Bersih / Surplus (Rp)</th>
                <th>Status Arus Kas</th>
              </tr>
            </thead>
            <tbody>
              {cashFlowBreakdown.map((row, idx) => (
                <tr key={idx}>
                  <td className="font-semibold">{row.period}</td>
                  <td className="text-success font-semibold">{formatRupiah(row.income)}</td>
                  <td className="text-danger font-semibold">{formatRupiah(row.expense)}</td>
                  <td className="font-extrabold" style={{ color: row.net >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                    {formatRupiah(row.net)}
                  </td>
                  <td>
                    <span className={`badge ${row.status === 'SURPLUS' ? 'badge-success' : 'badge-danger'}`}>
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
