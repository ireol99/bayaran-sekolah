/**
 * Transaction History & VOID Page
 * Lists transaction history grouped by receipt/invoice with expandable sub-categories and Reprint features
 */
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { billingService, type Transaction } from '../../billing/billingService';
import { formatRupiah } from '../../../lib/utils';
import { toast } from 'sonner';
import * as Icons from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import { utils, write } from 'xlsx';
import { api } from '../../../lib/api-client';

interface GroupedReceipt {
  receiptNumber: string;
  studentName: string;
  studentNis?: string;
  className?: string;
  level?: string;
  academicYear: string;
  cashierName: string;
  paymentMethod: 'CASH' | 'TRANSFER' | 'SAVINGS';
  createdAt: string;
  type: 'PAYMENT' | 'VOID';
  totalAmount: number;
  items: Transaction[];
}

export default function TransactionHistoryPage() {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMethod, setFilterMethod] = useState<string>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Expanded receipt IDs
  const [expandedReceipts, setExpandedReceipts] = useState<Set<string>>(new Set());

  // Void modal states
  const [voidModalOpen, setVoidModalOpen] = useState(false);
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [voiding, setVoiding] = useState(false);

  // Reprint modal states
  const [reprintModalOpen, setReprintModalOpen] = useState(false);
  const [reprintReceipt, setReprintReceipt] = useState<GroupedReceipt | null>(null);
  const printAreaRef = useRef<HTMLDivElement>(null);

  // Madrasah settings
  const [madrasahProfile, setMadrasahProfile] = useState<any>(null);

  useEffect(() => {
    const fetchMadrasahProfile = async () => {
      try {
        const res = await api.get<any>('/settings/profile');
        setMadrasahProfile(res.data?.data || res.data);
      } catch (err) {
        console.error('Gagal memuat profil madrasah:', err);
      }
    };
    fetchMadrasahProfile();
  }, [reprintModalOpen]);

  const handlePrint = useReactToPrint({
    contentRef: printAreaRef,
    documentTitle: `Struk_${reprintReceipt?.receiptNumber || 'Pembayaran'}`,
  });

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const data = await billingService.getTransactions();
      setTransactions(data);
    } catch {
      toast.error('Gagal memuat riwayat transaksi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, []);

  // Group transactions by receipt number
  const groupedReceipts = useMemo(() => {
    const map = new Map<string, GroupedReceipt>();

    for (const tx of transactions) {
      const key = tx.receiptNumber || tx.transactionNumber || tx.id;
      if (!map.has(key)) {
        map.set(key, {
          receiptNumber: key,
          studentName: tx.studentName || 'Siswa',
          studentNis: tx.studentNis,
          className: tx.className,
          level: tx.level,
          academicYear: tx.academicYear || '2026/2027',
          cashierName: tx.cashierName,
          paymentMethod: tx.paymentMethod,
          createdAt: tx.createdAt,
          type: tx.type,
          totalAmount: 0,
          items: [],
        });
      }
      const group = map.get(key)!;
      group.items.push(tx);
      group.totalAmount += Math.abs(tx.amount);
    }

    return Array.from(map.values());
  }, [transactions]);

  // Filter receipts by search term, method, and date range
  const filteredReceipts = useMemo(() => {
    return groupedReceipts.filter((receipt) => {
      const matchSearch =
        !searchTerm ||
        receipt.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        receipt.receiptNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (receipt.studentNis && receipt.studentNis.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchMethod = filterMethod === 'ALL' || receipt.paymentMethod === filterMethod;

      let matchDate = true;
      if (receipt.createdAt) {
        const txDate = receipt.createdAt.split(' ')[0].split('T')[0];
        if (startDate && txDate < startDate) matchDate = false;
        if (endDate && txDate > endDate) matchDate = false;
      }

      return matchSearch && matchMethod && matchDate;
    });
  }, [groupedReceipts, searchTerm, filterMethod, startDate, endDate]);

  // Export Filtered Transactions to Excel (.xlsx)
  const handleExportExcel = () => {
    if (filteredReceipts.length === 0) {
      toast.error('Tidak ada data transaksi yang sesuai dengan filter');
      return;
    }

    try {
      const rows: any[] = [];
      let rowNo = 1;

      for (const receipt of filteredReceipts) {
        for (const item of receipt.items) {
          rows.push({
            'No': rowNo++,
            'No. Struk': receipt.receiptNumber,
            'No. Billing': item.invoiceNumber || '-',
            'NIS': receipt.studentNis || '-',
            'Nama Siswa': receipt.studentName,
            'Tingkatan': receipt.level || '-',
            'Kelas': receipt.className || '-',
            'Jenis Tagihan': item.billingType || 'SPP',
            'Tahun Ajaran': item.academicYear || receipt.academicYear,
            'Periode': item.period || '-',
            'Nominal Bayar (Rp)': item.amount,
            'Metode Pembayaran': receipt.paymentMethod === 'CASH' ? 'Tunai' : receipt.paymentMethod === 'TRANSFER' ? 'Transfer Bank' : 'Tabungan Siswa',
            'Status': item.type === 'PAYMENT' ? 'SUCCESS' : 'VOIDED',
            'Kasir': receipt.cashierName,
            'Tanggal Transaksi': receipt.createdAt,
          });
        }
      }

      const worksheet = utils.json_to_sheet(rows);
      const workbook = utils.book_new();
      utils.book_append_sheet(workbook, worksheet, 'Riwayat Transaksi');

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
      a.download = `Riwayat_Transaksi_${dateRangeStr}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success(`Berhasil mengunduh ${rows.length} detail transaksi (.xlsx)`);
    } catch (err) {
      console.error('Export Excel Error:', err);
      toast.error('Gagal mengunduh file Excel');
    }
  };

  const toggleExpand = (receiptNumber: string) => {
    setExpandedReceipts((prev) => {
      const next = new Set(prev);
      if (next.has(receiptNumber)) {
        next.delete(receiptNumber);
      } else {
        next.add(receiptNumber);
      }
      return next;
    });
  };

  const openReprintModal = (receipt: GroupedReceipt) => {
    setReprintReceipt(receipt);
    setReprintModalOpen(true);
  };

  const openVoidModal = (id: string) => {
    setSelectedTxId(id);
    setVoidReason('');
    setVoidModalOpen(true);
  };

  const handleVoidSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voidReason.trim()) {
      toast.error('Alasan VOID harus diisi');
      return;
    }
    if (!selectedTxId) return;

    setVoiding(true);
    try {
      await billingService.voidTransaction(selectedTxId, voidReason);
      toast.success('Transaksi berhasil di-VOID (dibatalkan)');
      setVoidModalOpen(false);
      loadTransactions();
    } catch {
      toast.error('Gagal melakukan VOID transaksi');
    } finally {
      setVoiding(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }} className="animate-fade-in">
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => navigate('/pos')}>
            <Icons.ArrowLeft size={16} />
          </button>
          <h1 style={{ fontSize: 'var(--text-2xl)' }}>Riwayat Transaksi & Pembatalan</h1>
        </div>
        <p className="text-muted" style={{ marginLeft: '36px' }}>
          Pantau riwayat penerimaan kas kasir, rincian sub-kategori item tagihan, serta fitur Cetak Ulang Struk (Reprint).
        </p>
      </div>

      {/* Search and Filters */}
      <div className="card" style={{ padding: 'var(--space-4)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)', alignItems: 'flex-end', flex: 1 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: '180px', maxWidth: '300px' }}>
              <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                Pencarian
              </label>
              <div className="search-input-wrapper" style={{ width: '100%' }}>
                <Icons.Search className="search-icon" size={16} />
                <input
                  type="text"
                  className="form-input"
                  placeholder="Nama / No. Struk..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ height: '38px' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '135px' }}>
              <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                Dari Tanggal
              </label>
              <input
                type="date"
                className="form-input"
                style={{ height: '38px', padding: '6px 10px', fontSize: 'var(--text-xs)' }}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '135px' }}>
              <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                Sampai Tanggal
              </label>
              <input
                type="date"
                className="form-input"
                style={{ height: '38px', padding: '6px 10px', fontSize: 'var(--text-xs)' }}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '150px' }}>
              <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                Metode
              </label>
              <select
                className="form-input"
                style={{ height: '38px', padding: '6px 10px', fontSize: 'var(--text-xs)' }}
                value={filterMethod}
                onChange={(e) => setFilterMethod(e.target.value)}
              >
                <option value="ALL">Semua Metode</option>
                <option value="CASH">Tunai</option>
                <option value="TRANSFER">Transfer Bank</option>
                <option value="SAVINGS">Tabungan Siswa</option>
              </select>
            </div>

            {(searchTerm || startDate || endDate || filterMethod !== 'ALL') && (
              <button
                className="btn btn-ghost btn-sm"
                style={{ height: '38px', color: 'var(--color-danger)', whiteSpace: 'nowrap', padding: '0 8px' }}
                onClick={() => {
                  setSearchTerm('');
                  setStartDate('');
                  setEndDate('');
                  setFilterMethod('ALL');
                }}
              >
                <Icons.X size={14} />
                Reset
              </button>
            )}
          </div>

          <button
            className="btn btn-secondary"
            onClick={handleExportExcel}
            disabled={filteredReceipts.length === 0}
            style={{ height: '38px', whiteSpace: 'nowrap', flexShrink: 0 }}
          >
            <Icons.Download size={16} />
            <span>Export Excel (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* Transactions Table with Sub-categories */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            Memuat riwayat transaksi...
          </div>
        ) : filteredReceipts.length === 0 ? (
          <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            Tidak ada riwayat transaksi ditemukan.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ width: '40px' }}></th>
                  <th>No. Struk</th>
                  <th>Nama Siswa</th>
                  <th>Tahun Ajaran</th>
                  <th>Metode</th>
                  <th>Total Bayar</th>
                  <th>Status</th>
                  <th>Kasir</th>
                  <th>Tanggal</th>
                  <th style={{ textAlign: 'right' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredReceipts.map((receipt) => {
                  const isExpanded = expandedReceipts.has(receipt.receiptNumber);
                  return (
                    <React.Fragment key={receipt.receiptNumber}>
                      <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td>
                          <button
                            className="btn btn-ghost btn-icon btn-sm"
                            onClick={() => toggleExpand(receipt.receiptNumber)}
                            title={isExpanded ? 'Sembunyikan detail tagihan' : 'Lihat detail tagihan yang dibayar'}
                          >
                            {isExpanded ? <Icons.ChevronDown size={16} /> : <Icons.ChevronRight size={16} />}
                          </button>
                        </td>
                        <td>
                          <span style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: 'var(--text-xs)', color: 'var(--color-primary)' }}>
                            {receipt.receiptNumber}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{receipt.studentName}</div>
                          {receipt.className && (
                            <span className="badge badge-neutral" style={{ fontSize: '10px', marginTop: '2px' }}>
                              {receipt.className} ({receipt.level || '-'})
                            </span>
                          )}
                        </td>
                        <td>
                          <span className="badge badge-neutral">{receipt.academicYear}</span>
                        </td>
                        <td>
                          <span className="badge badge-neutral">
                            {receipt.paymentMethod === 'CASH' ? 'Tunai' : receipt.paymentMethod === 'TRANSFER' ? 'Transfer' : 'Tabungan'}
                          </span>
                        </td>
                        <td>
                          <span className={receipt.type === 'VOID' ? 'text-danger font-semibold' : 'text-success font-semibold'}>
                            {receipt.type === 'VOID' ? '-' : ''}
                            {formatRupiah(receipt.totalAmount)}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${receipt.type === 'PAYMENT' ? 'badge-success' : 'badge-danger'}`}>
                            {receipt.type === 'PAYMENT' ? 'SUCCESS' : 'VOIDED'}
                          </span>
                        </td>
                        <td>{receipt.cashierName}</td>
                        <td style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{receipt.createdAt}</td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
                            <button
                              className="btn btn-outline btn-sm text-primary"
                              onClick={() => openReprintModal(receipt)}
                              title="Cetak Ulang Struk Pembayaran"
                            >
                              <Icons.Printer size={14} />
                              <span>Reprint</span>
                            </button>

                            {receipt.type === 'PAYMENT' && (
                              <button
                                className="btn btn-danger btn-sm"
                                onClick={() => openVoidModal(receipt.items[0]?.id || receipt.receiptNumber)}
                                title="Void Transaksi"
                              >
                                <Icons.AlertOctagon size={14} />
                                <span>VOID</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Expandable Sub-Categories Detail Row */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={10} style={{ background: 'var(--color-background-soft)', padding: 'var(--space-3) var(--space-6)' }}>
                            <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
                              Rincian Sub-Kategori Tagihan yang Dibayar ({receipt.items.length} Billing):
                            </div>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-xs)', background: '#fff', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                              <thead>
                                <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--color-border)', textAlign: 'left' }}>
                                  <th style={{ padding: '8px 12px' }}>#</th>
                                  <th style={{ padding: '8px 12px' }}>No. Billing</th>
                                  <th style={{ padding: '8px 12px' }}>Jenis Tagihan</th>
                                  <th style={{ padding: '8px 12px' }}>Periode</th>
                                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>Nominal Bayar</th>
                                  <th style={{ padding: '8px 12px' }}>Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {receipt.items.map((item, idx) => (
                                  <tr key={item.id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '8px 12px', color: 'var(--color-text-muted)' }}>{idx + 1}</td>
                                    <td style={{ padding: '8px 12px', fontFamily: 'monospace' }}>{item.invoiceNumber || '-'}</td>
                                    <td style={{ padding: '8px 12px', fontWeight: 600 }}>{item.billingType || 'SPP'}</td>
                                    <td style={{ padding: '8px 12px' }}>{item.period || '-'}</td>
                                    <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: 'var(--color-success)' }}>
                                      {formatRupiah(item.amount)}
                                    </td>
                                    <td style={{ padding: '8px 12px' }}>
                                      <span className={`badge ${item.type === 'PAYMENT' ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '10px' }}>
                                        {item.type === 'PAYMENT' ? 'LUNAS/TERBAYAR' : 'VOIDED'}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* VOID Confirmation Modal */}
      {voidModalOpen && (
        <div className="modal-backdrop">
          <div className="modal animate-scale-in">
            <div className="modal-header">
              <h3 className="modal-title">Otorisasi Pembatalan (VOID)</h3>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setVoidModalOpen(false)}>
                <Icons.X size={16} />
              </button>
            </div>
            <form onSubmit={handleVoidSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                <div style={{
                  background: 'var(--color-danger-muted)',
                  border: '1px solid hsla(0, 84%, 60%, 0.3)',
                  padding: 'var(--space-4)',
                  borderRadius: 'var(--radius-lg)',
                  color: 'var(--color-danger)',
                  fontSize: 'var(--text-sm)',
                  display: 'flex',
                  gap: 'var(--space-3)',
                  marginBottom: 'var(--space-2)'
                }}>
                  <Icons.AlertTriangle size={24} style={{ flexShrink: 0 }} />
                  <div>
                    <strong>Konfirmasi Void:</strong> Aksi pembatalan transaksi tidak akan menghapus record melainkan akan mem-VOID nominal transaksi menjadi minus. Nominal tagihan siswa terkait akan dikembalikan ke kondisi semula.
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Alasan Pembatalan / VOID <span className="required">*</span></label>
                  <textarea
                    className="form-input"
                    placeholder="Contoh: Salah menginput nominal bayar atau salah memilih jenis tagihan siswa"
                    value={voidReason}
                    onChange={(e) => setVoidReason(e.target.value)}
                    required
                    rows={3}
                    autoFocus
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setVoidModalOpen(false)} disabled={voiding}>
                  Batal
                </button>
                <button type="submit" className="btn btn-danger" disabled={voiding}>
                  {voiding ? 'Memproses VOID...' : 'Batalkan Transaksi (VOID)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REPRINT THERMAL RECEIPT MODAL */}
      {reprintModalOpen && reprintReceipt && (
        <div className="modal-backdrop">
          <div className="modal animate-scale-in" style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Cetak Ulang Struk (Reprint)</h3>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setReprintModalOpen(false)}>
                <Icons.X size={16} />
              </button>
            </div>

            <div className="modal-body" style={{ background: '#f8fafc', padding: 'var(--space-4)' }}>
              <div ref={printAreaRef} className="pos-receipt-printable" style={{ padding: '16px', background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px', color: '#1e293b' }}>
                <div style={{ textAlign: 'center', marginBottom: '12px' }}>
                  {madrasahProfile?.useLetterhead ? (
                    <div style={{ display: 'flex', alignItems: 'center', borderBottom: '3px double #000', paddingBottom: '8px', marginBottom: '12px', textAlign: 'left' }}>
                      {madrasahProfile?.logo && (
                        <div style={{ marginRight: '16px', flexShrink: 0 }}>
                          <img src={madrasahProfile.logo} alt="Logo" style={{ width: '60px', height: '60px', objectFit: 'contain' }} />
                        </div>
                      )}
                      <div style={{ flexGrow: 1, textAlign: 'center', paddingRight: madrasahProfile?.logo ? '60px' : '0' }}>
                        <h3 style={{ fontSize: '10px', fontWeight: 'normal', margin: 0, letterSpacing: '1px', textTransform: 'uppercase', color: '#475569' }}>
                          {madrasahProfile?.schoolName || 'YAYASAN PENDIDIKAN ISLAM'}
                        </h3>
                        <h2 style={{ fontSize: '14px', fontWeight: 'bold', margin: '4px 0', textTransform: 'uppercase', color: '#0f172a' }}>
                          {reprintReceipt?.level === 'MI' ? madrasahProfile?.miName : reprintReceipt?.level === 'MTS' ? madrasahProfile?.mtsName : reprintReceipt?.level === 'MA' ? madrasahProfile?.maName : (madrasahProfile?.schoolName || 'MADRASAH TERPADU')}
                        </h2>
                        <div style={{ fontSize: '9px', color: '#475569', lineHeight: '1.3' }}>
                          {madrasahProfile?.address || 'Jl. Pendidikan No. 45 Sukamaju Bandung'}
                        </div>
                        {madrasahProfile?.phone && (
                          <div style={{ fontSize: '9px', color: '#475569', marginTop: '2px' }}>
                            Telp: {madrasahProfile.phone} {madrasahProfile.email ? ` | Email: ${madrasahProfile.email}` : ''}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center' }}>
                      <h2 style={{ fontSize: '13px', fontWeight: 'bold', margin: 0 }}>
                        {reprintReceipt?.level === 'MI' ? madrasahProfile?.miName : reprintReceipt?.level === 'MTS' ? madrasahProfile?.mtsName : reprintReceipt?.level === 'MA' ? madrasahProfile?.maName : (madrasahProfile?.schoolName || 'MADRASAH')}
                      </h2>
                      <div style={{ fontSize: '10px', color: '#64748b' }}>
                        {madrasahProfile?.address || 'Jl. Pendidikan No. 45 Sukamaju Bandung'}
                      </div>
                      <div style={{ borderBottom: '1px dashed #cbd5e1', margin: '8px 0' }}></div>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>No. Struk:</span>
                    <span style={{ fontWeight: 'bold' }}>{reprintReceipt.receiptNumber}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Siswa:</span>
                    <span>{reprintReceipt.studentName}</span>
                  </div>
                  {reprintReceipt.className && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>Kelas / Level:</span>
                      <span>{reprintReceipt.className} ({reprintReceipt.level || '-'})</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Kasir:</span>
                    <span>{reprintReceipt.cashierName}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Tanggal:</span>
                    <span>{reprintReceipt.createdAt}</span>
                  </div>
                  <div style={{ borderBottom: '1px dashed #cbd5e1', margin: '8px 0' }}></div>
                </div>

                <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse', marginBottom: '12px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                      <th style={{ padding: '6px 0' }}>Item Tagihan (Jenis, TA, Periode)</th>
                      <th style={{ padding: '6px 0', textAlign: 'right' }}>Jumlah</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reprintReceipt.items.map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px dashed #f1f5f9' }}>
                        <td style={{ padding: '6px 0' }}>
                          <div style={{ fontWeight: 600 }}>
                            {item.billingType || 'SPP'} - TA {item.academicYear || '2026/2027'} ({item.period || '-'})
                          </div>
                          <div style={{ fontSize: '9px', color: '#64748b', fontFamily: 'monospace' }}>
                            No. Billing: {item.invoiceNumber || '-'}
                          </div>
                        </td>
                        <td style={{ padding: '6px 0', textAlign: 'right', fontWeight: 600, verticalAlign: 'top' }}>
                          {formatRupiah(item.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '13px', borderTop: '1px solid #000', paddingTop: '6px', marginBottom: '8px' }}>
                  <span>TOTAL BAYAR</span>
                  <span>{formatRupiah(reprintReceipt.totalAmount)}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#64748b', marginBottom: '8px' }}>
                  <span>Metode Pembayaran:</span>
                  <span style={{ fontWeight: 600, color: '#1e293b' }}>
                    {reprintReceipt.paymentMethod === 'CASH' ? 'Tunai' : reprintReceipt.paymentMethod === 'TRANSFER' ? 'Transfer Bank' : 'Tabungan Siswa'}
                  </span>
                </div>

                <div style={{ borderBottom: '1px dashed #cbd5e1', margin: '8px 0' }}></div>
                <div style={{ textAlign: 'center', fontSize: '10px', color: '#64748b' }}>
                  <p style={{ margin: '2px 0', fontWeight: 'bold' }}>[CETAK ULANG STRUK (REPRINT)]</p>
                  <div style={{ whiteSpace: 'pre-wrap', marginTop: '4px' }}>
                    {madrasahProfile?.receiptFooter || 'Terima kasih atas pembayaran Anda.\nSemoga berkah & bermanfaat.'}
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setReprintModalOpen(false)}>
                Tutup
              </button>
              <button className="btn btn-primary" onClick={handlePrint}>
                <Icons.Printer size={16} />
                <span>Cetak Struk</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
