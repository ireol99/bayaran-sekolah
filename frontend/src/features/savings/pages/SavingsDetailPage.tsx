/**
 * Savings Detail Page
 * Shows mutasi logs, balance counters, deposit, and withdraw modals (prevents negative balances)
 */
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { savingsService, type SavingAccount, type SavingTransaction } from '../savingsService';
import { formatRupiah, formatDateTime } from '../../../lib/utils';
import { toast } from 'sonner';
import * as Icons from 'lucide-react';

export default function SavingsDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [account, setAccount] = useState<SavingAccount | null>(null);
  const [transactions, setTransactions] = useState<SavingTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'DEPOSIT' | 'WITHDRAW'>('DEPOSIT');
  const [amount, setAmount] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const acc = await savingsService.getAccountById(id);
      const txs = await savingsService.getTransactions(id);
      setAccount(acc);
      setTransactions(txs.reverse()); // latest first
    } catch {
      toast.error('Gagal mengambil detail akun tabungan');
      navigate('/savings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleActionClick = (type: 'DEPOSIT' | 'WITHDRAW') => {
    setModalType(type);
    setAmount(0);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || amount <= 0) {
      toast.error('Masukkan nominal transaksi yang valid');
      return;
    }

    if (modalType === 'WITHDRAW' && account && amount > account.balance) {
      toast.error('Gagal! Nominal penarikan melebihi saldo tabungan saat ini.');
      return;
    }

    setSubmitting(true);
    try {
      if (modalType === 'DEPOSIT') {
        await savingsService.deposit(id, amount);
        toast.success(`Berhasil menyetor ${formatRupiah(amount)} ke tabungan`);
      } else {
        await savingsService.withdraw(id, amount);
        toast.success(`Berhasil menarik ${formatRupiah(amount)} dari tabungan`);
      }
      setModalOpen(false);
      loadData();
    } catch {
      toast.error('Gagal memproses transaksi tabungan');
    } finally {
      setSubmitting(false);
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }} className="animate-fade-in">
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => navigate('/savings')}>
            <Icons.ArrowLeft size={16} />
          </button>
          <h1 style={{ fontSize: 'var(--text-2xl)' }}>Detail Tabungan Siswa</h1>
        </div>
        <p className="text-muted" style={{ marginLeft: '36px' }}>
          Mutasi setor, tarik tunai, dan pembukuan saldo titipan siswa.
        </p>
      </div>

      {account && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 'var(--space-6)', alignItems: 'start' }}>
          
          {/* Left Card: Account details & Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
            
            {/* Balance counter card */}
            <div className="card card-glass" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-2)' }}>
              <div style={{ padding: 'var(--space-3)', background: 'var(--color-accent-primary-muted)', color: 'var(--color-accent-primary)', borderRadius: '50%', display: 'inline-flex' }}>
                <Icons.Coins size={36} />
              </div>
              <span className="text-muted" style={{ fontSize: 'var(--text-xs)', marginTop: '8px' }}>Saldo Saat Ini</span>
              <h2 className="text-success font-extrabold" style={{ fontSize: 'var(--text-2xl)' }}>
                {formatRupiah(account.balance)}
              </h2>
              <span className="text-muted" style={{ fontSize: '10px' }}>Terakhir diperbarui: {account.updatedAt}</span>
              
              <div className="divider" style={{ width: '100%' }}></div>
              
              <div style={{ textAlign: 'left', width: '100%', fontSize: 'var(--text-sm)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span className="text-muted">Nama Siswa:</span>
                  <span className="font-semibold">{account.studentName}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span className="text-muted">NIS:</span>
                  <span className="font-semibold">{account.nis}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="text-muted">Kelas:</span>
                  <span className="badge badge-neutral">{account.className}</span>
                </div>
              </div>
            </div>

            {/* Quick Actions Card */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <h3 className="card-title">Aksi Cepat</h3>
              <button className="btn btn-primary" onClick={() => handleActionClick('DEPOSIT')} style={{ justifyContent: 'center' }}>
                <Icons.PlusCircle size={16} />
                <span>Setor Tabungan</span>
              </button>
              <button className="btn btn-secondary" onClick={() => handleActionClick('WITHDRAW')} style={{ justifyContent: 'center' }}>
                <Icons.MinusCircle size={16} />
                <span>Tarik Tabungan</span>
              </button>
              <button className="btn btn-outline" onClick={() => navigate('/pos')} style={{ justifyContent: 'center' }}>
                <Icons.ShoppingCart size={16} />
                <span>Bayar Tagihan Sekolah</span>
              </button>
            </div>

          </div>

          {/* Right Card: Transaction Logs */}
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: 'var(--space-4)' }}>Mutasi Transaksi Tabungan</h3>

            {transactions.length === 0 ? (
              <div className="empty-state">
                <Icons.History className="empty-state-icon" />
                <div className="empty-state-title">Belum Ada Mutasi</div>
                <div className="empty-state-description">Siswa ini belum pernah melakukan transaksi tabungan.</div>
              </div>
            ) : (
              <div className="data-table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>ID Transaksi</th>
                      <th>Tanggal & Waktu</th>
                      <th>Tipe Mutasi</th>
                      <th>Jumlah Mutasi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx) => (
                      <tr key={tx.id}>
                        <td style={{ fontFamily: 'monospace', fontSize: 'var(--text-xs)' }}>{tx.id}</td>
                        <td>{formatDateTime(tx.createdAt)}</td>
                        <td>
                          <span className={`badge ${tx.type === 'DEPOSIT' ? 'badge-success' : tx.type === 'WITHDRAW' ? 'badge-danger' : 'badge-info'}`}>
                            {tx.type === 'DEPOSIT' ? 'SETOR' : tx.type === 'WITHDRAW' ? 'TARIK' : 'DEBET BAYAR'}
                          </span>
                        </td>
                        <td className={`font-semibold ${tx.type === 'DEPOSIT' ? 'text-success' : 'text-danger'}`}>
                          {tx.type === 'DEPOSIT' ? '+' : '-'} {formatRupiah(tx.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}

      {/* Transaction Modal (Deposit/Withdrawal) */}
      {modalOpen && (
        <div className="modal-backdrop">
          <div className="modal animate-scale-in" style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <h3 className="modal-title">
                {modalType === 'DEPOSIT' ? 'Penerimaan Setoran Tabungan' : 'Penarikan Saldo Tabungan'}
              </h3>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setModalOpen(false)}>
                <Icons.X size={16} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                {modalType === 'WITHDRAW' && account && (
                  <div style={{
                    padding: 'var(--space-3) var(--space-4)',
                    background: 'var(--color-accent-secondary-muted)',
                    color: 'var(--color-accent-secondary)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: 'var(--text-sm)',
                    display: 'flex',
                    justifyContent: 'space-between'
                  }}>
                    <span>Saldo Maksimum Penarikan:</span>
                    <strong>{formatRupiah(account.balance)}</strong>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Nominal Transaksi (Rupiah) <span className="required">*</span></label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    max={modalType === 'WITHDRAW' && account ? account.balance : undefined}
                    className="form-input"
                    placeholder="Masukkan nominal uang, contoh: 50000"
                    value={amount || ''}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    required
                    autoFocus
                  />
                  <span className="form-hint">Penarikan diperbolehkan jika nominal ≤ sisa saldo tabungan saat ini.</span>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)} disabled={submitting}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Memproses...' : 'Proses Transaksi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
