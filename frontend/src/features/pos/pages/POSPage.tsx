/**
 * POS Cashier Page
 * Custom full-width layout with search, selection cart, flexible payments, and print integrations
 */
import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { studentService, type Student } from '../../students/studentService';
import { billingService, type Invoice, type Transaction } from '../../billing/billingService';
import { formatRupiah, formatTimestamp } from '../../../lib/utils';
import { useAuth } from '../../auth/AuthContext';
import { toast } from 'sonner';
import { useReactToPrint } from 'react-to-print';
import { whatsappService } from '../../notifications/whatsappService';
import { api } from '../../../lib/api-client';
import * as Icons from 'lucide-react';
import './POSPage.css';

interface CartItem {
  invoice: Invoice;
  payAmount: number;
}

export default function POSPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  
  // Invoices & Cart
  const [studentInvoices, setStudentInvoices] = useState<Invoice[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'TRANSFER' | 'SAVINGS'>('CASH');
  
  // Transaction printing modal
  const [completedTransactions, setCompletedTransactions] = useState<Transaction[]>([]);
  const [printModalOpen, setPrintModalOpen] = useState(false);
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
  }, [printModalOpen]);

  // Search autocomplete
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const search = async () => {
      const all = await studentService.getAll();
      const matched = all.filter(
        (s) =>
          s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.nis.includes(searchQuery)
      );
      setSearchResults(matched);
    };
    search();
  }, [searchQuery]);

  const selectStudent = async (student: Student) => {
    setSelectedStudent(student);
    setSearchQuery('');
    setSearchResults([]);
    setCart([]);
    
    // Load student invoices
    try {
      const invoices = await billingService.getInvoicesByStudent(student.id);
      const unpaid = invoices.filter((inv) => inv.status !== 'PAID');
      setStudentInvoices(unpaid);
    } catch {
      toast.error('Gagal mengambil data tagihan siswa');
    }
  };

  const addToCart = (invoice: Invoice) => {
    // Check if already in cart
    if (cart.some((item) => item.invoice.id === invoice.id)) {
      toast.warning('Tagihan sudah berada di keranjang');
      return;
    }
    
    const remaining = invoice.finalAmount - invoice.paidAmount;
    setCart((prev) => [...prev, { invoice, payAmount: remaining }]);
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((item) => item.invoice.id !== id));
  };

  const updatePayAmount = (id: string, amount: number) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.invoice.id === id) {
          const remaining = item.invoice.finalAmount - item.invoice.paidAmount;
          // Clamp amount between 1 and remaining amount
          const clamped = Math.max(1, Math.min(amount, remaining));
          return { ...item, payAmount: clamped };
        }
        return item;
      })
    );
  };

  const getCartTotal = () => {
    return cart.reduce((sum, item) => sum + item.payAmount, 0);
  };

  const handleProcessPayment = async () => {
    if (cart.length === 0) {
      toast.error('Keranjang belanja masih kosong');
      return;
    }

    if (paymentMethod === 'SAVINGS' && selectedStudent) {
      // Validate savings balance against actual database balance
      const currentSavingsBalance = selectedStudent.savingsBalance || 0;
      if (getCartTotal() > currentSavingsBalance) {
        toast.error(`Saldo tabungan tidak cukup. Saldo saat ini: ${formatRupiah(currentSavingsBalance)}`);
        return;
      }
    }

    try {
      const payload = cart.map((item) => ({
        invoiceId: item.invoice.id,
        amount: item.payAmount,
        paymentMethod,
        cashierName: user?.name || 'Kasir',
      }));

      const txs = await billingService.processPayment(payload);
      setCompletedTransactions(txs);
      setPrintModalOpen(true);
      toast.success('Pembayaran berhasil diproses!');

      // Automatically trigger WhatsApp receipt notification
      if (selectedStudent && txs && txs.length > 0) {
        txs.forEach((tx) => {
          whatsappService.sendPaymentReceipt({
            studentName: selectedStudent.name,
            phone: selectedStudent.parentPhone || '081234567890',
            receiptNumber: tx.receiptNumber || `STR-${Date.now()}`,
            billingType: tx.billingType || 'Tagihan Madrasah',
            period: tx.period || '2025/2026',
            amount: Number(tx.amount) || 0,
          });
        });
      }
      
      // Refresh current student invoices & updated savings balance
      if (selectedStudent) {
        const [updatedInvoices, updatedStudent] = await Promise.all([
          billingService.getInvoicesByStudent(selectedStudent.id),
          studentService.getById(selectedStudent.id),
        ]);
        setStudentInvoices(updatedInvoices.filter((inv) => inv.status !== 'PAID'));
        if (updatedStudent) {
          setSelectedStudent(updatedStudent);
        }
      }
    } catch {
      toast.error('Gagal memproses transaksi pembayaran');
    }
  };

  // Compute items to display on the receipt
  const receiptItems = useMemo(() => {
    if (completedTransactions && completedTransactions.length > 0) {
      return completedTransactions.map((tx) => ({
        billingType: tx.billingType || 'SPP',
        academicYear: tx.academicYear || '2026/2027',
        period: tx.period || '-',
        invoiceNumber: tx.invoiceNumber || '-',
        amount: Number(tx.amount) || 0,
      }));
    }
    return cart.map((item) => ({
      billingType: item.invoice.type || 'SPP',
      academicYear: item.invoice.academicYear || '2026/2027',
      period: item.invoice.period || '-',
      invoiceNumber: item.invoice.invoiceNumber || '-',
      amount: Number(item.payAmount) || 0,
    }));
  }, [completedTransactions, cart]);

  const receiptTotalAmount = useMemo(() => {
    return receiptItems.reduce((sum, item) => sum + item.amount, 0);
  }, [receiptItems]);

  // React to print triggers standard window printing
  const handlePrint = useReactToPrint({
    contentRef: printAreaRef,
    documentTitle: `Struk_${selectedStudent?.name || 'Kasir'}`,
  });

  const closePrintModal = () => {
    setPrintModalOpen(false);
    setCart([]);
  };

  return (
    <div className="pos-page animate-fade-in">
      
      {/* Search Header */}
      <div className="pos-search-header card">
        <div style={{ display: 'flex', gap: 'var(--space-4)', position: 'relative', width: '100%' }}>
          <div className="search-input-wrapper" style={{ flex: 1 }}>
            <Icons.Search className="search-icon" />
            <input
              type="text"
              className="form-input"
              placeholder="Cari siswa berdasarkan NIS atau Nama untuk memulai pembayaran..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button className="btn btn-secondary" onClick={() => navigate('/pos/history')}>
            <Icons.History size={16} />
            <span>Riwayat VOID</span>
          </button>

          {/* Autocomplete suggestion popover */}
          {searchResults.length > 0 && (
            <div className="pos-search-popover dropdown-menu">
              {searchResults.map((s) => (
                <div
                  key={s.id}
                  className="pos-search-item"
                  onClick={() => selectStudent(s)}
                >
                  <div className="avatar avatar-sm">{s.name.charAt(0)}</div>
                  <div style={{ textAlign: 'left' }}>
                    <div className="font-semibold">{s.name}</div>
                    <div className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>
                      NIS: {s.nis} | Kelas {s.className} ({s.level})
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedStudent ? (
        <div className="pos-grid">
          {/* LEFT PANEL: Student details & Invoices */}
          <div className="pos-left-panel">
            {/* Student Profile Card */}
            <div className="card card-glass pos-student-card">
              <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center' }}>
                <div className="avatar avatar-lg">{selectedStudent.name.charAt(0)}</div>
                <div style={{ flex: 1 }}>
                  <h2>{selectedStudent.name}</h2>
                  <p className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>
                    NIS: {selectedStudent.nis} | Kelas {selectedStudent.className} ({selectedStudent.level})
                  </p>
                </div>
                <div className="pos-savings-badge">
                  <span className="text-muted">Saldo Tabungan:</span>
                  <strong className="text-success">{formatRupiah(selectedStudent.savingsBalance || 0)}</strong>
                </div>
              </div>
            </div>

            {/* Invoices List */}
            <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <h3 className="card-title" style={{ marginBottom: 'var(--space-4)' }}>Daftar Tagihan Belum Lunas</h3>
              
              {studentInvoices.length === 0 ? (
                <div className="empty-state" style={{ flex: 1 }}>
                  <Icons.CheckCircle2 className="empty-state-icon" style={{ color: 'var(--color-accent-primary)' }} />
                  <div className="empty-state-title">Semua Tagihan Lunas</div>
                  <div className="empty-state-description">Siswa ini tidak memiliki tagihan aktif yang belum dibayar.</div>
                </div>
              ) : (
                <div className="data-table-wrapper" style={{ flex: 1, overflowY: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Jenis Tagihan</th>
                        <th>Periode</th>
                        <th>Jumlah Tagihan</th>
                        <th>Sisa Bayar</th>
                        <th>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentInvoices.map((inv) => {
                        const remaining = inv.finalAmount - inv.paidAmount;
                        return (
                          <tr key={inv.id}>
                            <td className="font-semibold">{inv.type}</td>
                            <td>{inv.period}</td>
                            <td>{formatRupiah(inv.finalAmount)}</td>
                            <td className="text-danger font-semibold">{formatRupiah(remaining)}</td>
                            <td>
                              <button className="btn btn-secondary btn-sm" onClick={() => addToCart(inv)}>
                                <Icons.Plus size={14} />
                                <span>Pilih</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT PANEL: Shopping Cart */}
          <div className="pos-right-panel">
            <div className="card pos-cart-card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <h3 className="card-title" style={{ marginBottom: 'var(--space-4)' }}>Keranjang Pembayaran</h3>

              {cart.length === 0 ? (
                <div className="empty-state" style={{ flex: 1 }}>
                  <Icons.ShoppingCart className="empty-state-icon" />
                  <div className="empty-state-title">Keranjang Kosong</div>
                  <div className="empty-state-description">Pilih tagihan di sebelah kiri untuk diproses pembayarannya.</div>
                </div>
              ) : (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 'var(--space-4)' }}>
                  
                  {/* Cart Items list */}
                  <div className="pos-cart-items">
                    {cart.map((item) => {
                      const remaining = item.invoice.finalAmount - item.invoice.paidAmount;
                      return (
                        <div key={item.invoice.id} className="pos-cart-item card card-glass">
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                              <div className="font-semibold">{item.invoice.type}</div>
                              <span className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>
                                Periode {item.invoice.period} | Tagihan: {formatRupiah(item.invoice.finalAmount)}
                              </span>
                            </div>
                            <button className="btn btn-ghost btn-icon btn-sm text-danger" onClick={() => removeFromCart(item.invoice.id)}>
                              <Icons.X size={14} />
                            </button>
                          </div>
                          
                          {/* Flexible Amount Input */}
                          <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>Bayar (Cicil):</span>
                            <input
                              type="number"
                              className="form-input btn-sm"
                              value={item.payAmount}
                              onChange={(e) => updatePayAmount(item.invoice.id, Number(e.target.value))}
                              max={remaining}
                              min={1}
                              style={{ width: '120px', padding: '4px var(--space-2)' }}
                            />
                            {item.payAmount < remaining && (
                              <span className="badge badge-warning" style={{ textTransform: 'none', fontSize: '10px' }}>
                                Bayar Sebagian
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Payment Configuration */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-4)' }}>
                    <div className="form-group">
                      <label className="form-label">Metode Pembayaran</label>
                      <select
                        className="form-input form-select"
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value as 'CASH' | 'TRANSFER' | 'SAVINGS')}
                      >
                        <option value="CASH">Tunai (Cash)</option>
                        <option value="TRANSFER">Transfer Bank</option>
                        <option value="SAVINGS">Tabungan Siswa</option>
                      </select>
                      {paymentMethod === 'SAVINGS' && selectedStudent && (
                        <div style={{ fontSize: 'var(--text-xs)', marginTop: '4px', fontWeight: 600, color: (selectedStudent.savingsBalance || 0) >= getCartTotal() ? 'var(--color-success)' : 'var(--color-danger)' }}>
                          Saldo Tabungan Tersedia: {formatRupiah(selectedStudent.savingsBalance || 0)}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-2) 0' }}>
                      <span className="font-bold">TOTAL BAYAR</span>
                      <span className="text-success font-extrabold" style={{ fontSize: 'var(--text-lg)' }}>
                        {formatRupiah(getCartTotal())}
                      </span>
                    </div>

                    <button className="btn btn-primary" onClick={handleProcessPayment} style={{ width: '100%', padding: 'var(--space-3)' }}>
                      Proses Pembayaran
                    </button>
                  </div>

                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-16)', minHeight: '400px' }}>
          <Icons.Search size={64} style={{ color: 'var(--color-text-muted)', opacity: 0.3, marginBottom: 'var(--space-4)' }} />
          <h2>Pencarian Siswa</h2>
          <p className="text-muted" style={{ maxWidth: '400px', textAlign: 'center', marginTop: 'var(--space-2)' }}>
            Masukkan NIS atau nama lengkap siswa pada kolom pencarian di bagian atas untuk melayani transaksi pembayaran kasir.
          </p>
        </div>
      )}

      {/* Cetak Struk Modal */}
      {printModalOpen && (
        <div className="modal-backdrop">
          <div className="modal animate-scale-in" style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Cetak Struk Transaksi</h3>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={closePrintModal}>
                <Icons.X size={16} />
              </button>
            </div>
            
            {/* Scrollable Receipt Area */}
            <div className="modal-body" style={{ background: '#f8fafc', padding: 'var(--space-4)', maxHeight: '420px', overflowY: 'auto' }}>
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
                          {selectedStudent?.level === 'MI' ? madrasahProfile?.miName : selectedStudent?.level === 'MTS' ? madrasahProfile?.mtsName : selectedStudent?.level === 'MA' ? madrasahProfile?.maName : (madrasahProfile?.schoolName || 'MADRASAH TERPADU')}
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
                        {selectedStudent?.level === 'MI' ? madrasahProfile?.miName : selectedStudent?.level === 'MTS' ? madrasahProfile?.mtsName : selectedStudent?.level === 'MA' ? madrasahProfile?.maName : (madrasahProfile?.schoolName || 'MADRASAH')}
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
                    <span style={{ fontWeight: 'bold' }}>
                      {completedTransactions[0]?.receiptNumber || completedTransactions[0]?.transactionNumber || 'RCP/2026/001'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Siswa:</span>
                    <span>{selectedStudent?.name}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Kelas / Level:</span>
                    <span>{selectedStudent?.className} ({selectedStudent?.level})</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Kasir:</span>
                    <span>{user?.name || 'Kasir'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Tanggal:</span>
                    <span>{completedTransactions[0]?.createdAt || formatTimestamp(new Date())}</span>
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
                    {receiptItems.map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px dashed #f1f5f9' }}>
                        <td style={{ padding: '6px 0' }}>
                          <div style={{ fontWeight: 600 }}>
                            {item.billingType} - TA {item.academicYear} ({item.period})
                          </div>
                          <div style={{ fontSize: '9px', color: '#64748b', fontFamily: 'monospace' }}>
                            No. Billing: {item.invoiceNumber}
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
                  <span>{formatRupiah(receiptTotalAmount)}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#64748b', marginBottom: '8px' }}>
                  <span>Metode Pembayaran:</span>
                  <span style={{ fontWeight: 600, color: '#1e293b' }}>
                    {paymentMethod === 'CASH' ? 'Tunai' : paymentMethod === 'TRANSFER' ? 'Transfer Bank' : 'Tabungan Siswa'}
                  </span>
                </div>

                <div style={{ borderBottom: '1px dashed #cbd5e1', margin: '8px 0' }}></div>
                <div style={{ textAlign: 'center', fontSize: '10px', color: '#64748b', whiteSpace: 'pre-wrap' }}>
                  {madrasahProfile?.receiptFooter || 'Terima kasih atas pembayaran Anda.\nSemoga berkah & bermanfaat.'}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={closePrintModal}>
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
