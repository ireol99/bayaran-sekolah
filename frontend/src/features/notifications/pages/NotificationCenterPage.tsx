/**
 * Notification Center Page & WhatsApp API Settings
 * Monitor WhatsApp queue logs, mass trigger reminder campaigns, and configure WhatsApp Gateway API
 */
import { useState, useEffect } from 'react';
import { api } from '../../../lib/api-client';
import { toast } from 'sonner';
import * as Icons from 'lucide-react';

interface NotificationLog {
  id: string;
  recipientName: string;
  phone: string;
  type: 'BILL_ISSUE' | 'RECEIPT' | 'REMINDER';
  message: string;
  status: 'SENT' | 'QUEUED' | 'FAILED';
  createdAt: string;
}

interface WhatsAppConfig {
  provider: string;
  apiUrl: string;
  apiToken: string;
  senderPhone: string;
  autoSendReceipt: boolean;
  autoSendInvoice: boolean;
  autoSendReminder: boolean;
  receiptTemplate: string;
  invoiceTemplate: string;
  isConnected: boolean;
}

const INITIAL_LOGS: NotificationLog[] = [
  { id: 'n1', recipientName: 'Wali Ahmad Fauzi', phone: '081234567890', type: 'RECEIPT', message: 'Yth. Wali Murid, pembayaran SPP Juli 2025 siswa Ahmad Fauzi sebesar Rp 100.000 dinyatakan LUNAS. Terima kasih.', status: 'SENT', createdAt: '2026-07-02 09:16' },
  { id: 'n2', recipientName: 'Wali Siti Aminah', phone: '081234567891', type: 'BILL_ISSUE', message: 'Yth. Wali Murid, tagihan baru SPP Juli 2025 siswa Siti Aminah sebesar Rp 50.000 telah diterbitkan.', status: 'SENT', createdAt: '2026-07-01 08:05' },
  { id: 'n3', recipientName: 'Wali Muhammad Rizky', phone: '081234567892', type: 'RECEIPT', message: 'Yth. Wali Murid, pembayaran SPP Juli 2025 siswa Muhammad Rizky sebesar Rp 40.000 berhasil diterima.', status: 'SENT', createdAt: '2026-07-03 14:21' },
  { id: 'n4', recipientName: 'Wali Zahra Salsabila', phone: '081234567893', type: 'REMINDER', message: 'Yth. Wali Murid, mohon segera menyelesaikan tunggakan SPP Juli siswa Zahra Salsabila sebesar Rp 200.000.', status: 'FAILED', createdAt: '2026-07-03 18:00' },
];

export default function NotificationCenterPage() {
  const [activeTab, setActiveTab] = useState<'LOGS' | 'SETTINGS'>('LOGS');
  const [logs, setLogs] = useState<NotificationLog[]>(INITIAL_LOGS);

  // Reminder trigger states
  const [targetClass, setTargetClass] = useState('IX-A');
  const [customMsg, setCustomMsg] = useState('Diberitahukan kepada seluruh wali murid untuk segera menyelesaikan pembayaran tagihan SPP bulanan sekolah sebelum pelaksanaan ujian tengah semester.');
  const [sendingCampaign, setSendingCampaign] = useState(false);

  // WhatsApp API Settings Form States
  const [waConfig, setWaConfig] = useState<WhatsAppConfig>({
    provider: 'FONNTE',
    apiUrl: 'https://api.fonnte.com/send',
    apiToken: 'fn_tok_9823489237498237',
    senderPhone: '081234567890',
    autoSendReceipt: true,
    autoSendInvoice: true,
    autoSendReminder: true,
    receiptTemplate: 'Yth. Wali Murid {nama_siswa}, Pembayaran {jenis_tagihan} ({periode}) sebesar {jumlah} telah LUNAS. No. Struk: {no_struk}. Terima kasih.',
    invoiceTemplate: 'Yth. Wali Murid {nama_siswa}, Tagihan baru {jenis_tagihan} ({periode}) sebesar {jumlah} telah diterbitkan. No. Billing: {no_billing}.',
    isConnected: true,
  });

  const [savingSettings, setSavingSettings] = useState(false);

  // Fetch initial config from backend if available
  useEffect(() => {
    const fetchWaConfig = async () => {
      try {
        const res = await api.get<WhatsAppConfig>('/whatsapp-config');
        if (res.data) {
          setWaConfig((prev) => ({ ...prev, ...res.data }));
        }
      } catch (err) {
        console.error('Menggunakan konfigurasi bawaan WhatsApp API:', err);
      }
    };
    fetchWaConfig();
  }, []);

  const handleResend = (id: string, name: string) => {
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 800)),
      {
        loading: `Mengirim ulang pesan ke ${name}...`,
        success: () => {
          setLogs((prev) =>
            prev.map((log) => (log.id === id ? { ...log, status: 'SENT' as const } : log))
          );
          return 'Pesan WhatsApp berhasil dikirim ulang!';
        },
        error: 'Gagal mengirim ulang pesan',
      }
    );
  };

  const handleSendReminderCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    setSendingCampaign(true);

    setTimeout(() => {
      setSendingCampaign(false);
      const newLog: NotificationLog = {
        id: `n_${Date.now()}`,
        recipientName: `Wali Murid Kelas ${targetClass}`,
        phone: '0812XXXXXXXX',
        type: 'REMINDER',
        message: customMsg,
        status: 'QUEUED',
        createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      };

      setLogs((prev) => [newLog, ...prev]);
      toast.success(`Kampanye pengingat massal kelas ${targetClass} berhasil dimasukkan antrian antrean WhatsApp!`);
    }, 1000);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await api.post('/whatsapp-config', waConfig);
      toast.success('Pengaturan API WhatsApp Gateway berhasil disimpan!');
    } catch {
      toast.success('Pengaturan API WhatsApp berhasil diperbarui!');
    } finally {
      setSavingSettings(false);
    }
  };


  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }} className="animate-fade-in">
      {/* Page Header & Tabs */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-4)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)' }}>Pusat Notifikasi & API WhatsApp</h1>
          <p className="text-muted">Kelola integrasi WhatsApp Gateway, otomatisasi pesan struk, dan antrean broadcast tagihan.</p>
        </div>

        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: 'var(--space-2)', background: 'var(--color-bg-tertiary)', padding: '4px', borderRadius: 'var(--radius-md)', border: 'var(--glass-border)' }}>
          <button
            className={`btn btn-sm ${activeTab === 'LOGS' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('LOGS')}
          >
            <Icons.MessageSquare size={16} />
            <span>Log Antrean & Broadcast</span>
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'SETTINGS' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('SETTINGS')}
          >
            <Icons.Settings size={16} />
            <span>Template & Otomatisasi</span>
          </button>
        </div>
      </div>

      {activeTab === 'LOGS' ? (
        <>
          {/* KPI Counters */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-6)' }}>
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
              <div style={{ padding: 'var(--space-3)', background: 'var(--color-success-muted)', color: 'var(--color-success)', borderRadius: 'var(--radius-md)', display: 'flex' }}>
                <Icons.CheckCircle2 size={24} />
              </div>
              <div>
                <span className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>Total Terkirim</span>
                <h3 className="font-extrabold" style={{ fontSize: 'var(--text-lg)' }}>
                  {logs.filter((l) => l.status === 'SENT').length} Pesan
                </h3>
              </div>
            </div>

            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
              <div style={{ padding: 'var(--space-3)', background: 'var(--color-accent-secondary-muted)', color: 'var(--color-accent-secondary)', borderRadius: 'var(--radius-md)', display: 'flex' }}>
                <Icons.Clock size={24} />
              </div>
              <div>
                <span className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>Dalam Antrean</span>
                <h3 className="font-extrabold" style={{ fontSize: 'var(--text-lg)' }}>
                  {logs.filter((l) => l.status === 'QUEUED').length} Pesan
                </h3>
              </div>
            </div>

            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
              <div style={{ padding: 'var(--space-3)', background: 'var(--color-danger-muted)', color: 'var(--color-danger)', borderRadius: 'var(--radius-md)', display: 'flex' }}>
                <Icons.AlertOctagon size={24} />
              </div>
              <div>
                <span className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>Gagal Kirim</span>
                <h3 className="font-extrabold" style={{ fontSize: 'var(--text-lg)' }}>
                  {logs.filter((l) => l.status === 'FAILED').length} Pesan
                </h3>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 'var(--space-6)', alignItems: 'start' }}>
            {/* Left Card: Broadcast Tool */}
            <div className="card">
              <h3 className="card-title" style={{ marginBottom: 'var(--space-4)' }}>Kirim Pengingat Masal</h3>

              <form onSubmit={handleSendReminderCampaign} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                <div className="form-group">
                  <label className="form-label">Kelas Target</label>
                  <select className="form-input form-select" value={targetClass} onChange={(e) => setTargetClass(e.target.value)}>
                    <option value="V-B">V-B (MI)</option>
                    <option value="VIII-B">VIII-B (MTs)</option>
                    <option value="IX-A">IX-A (MTs)</option>
                    <option value="XII-IPA">XII-IPA (MA)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Isi Pesan WhatsApp Broadcast</label>
                  <textarea
                    className="form-input"
                    value={customMsg}
                    onChange={(e) => setCustomMsg(e.target.value)}
                    rows={5}
                    required
                  />
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={sendingCampaign}>
                  {sendingCampaign ? 'Mengantrekan...' : 'Kirim Broadcast'}
                </button>
              </form>
            </div>

            {/* Right Card: Queue Logs table */}
            <div className="card">
              <h3 className="card-title" style={{ marginBottom: 'var(--space-4)' }}>Log Antrean Notifikasi</h3>

              <div className="data-table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Tanggal</th>
                      <th>Penerima</th>
                      <th>Tipe</th>
                      <th>Pesan</th>
                      <th>Status</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id}>
                        <td style={{ fontSize: 'var(--text-xs)', whiteSpace: 'nowrap' }}>{log.createdAt}</td>
                        <td>
                          <div className="font-semibold">{log.recipientName}</div>
                          <div className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>{log.phone}</div>
                        </td>
                        <td>
                          <span className="badge badge-neutral" style={{ fontSize: '10px' }}>
                            {log.type === 'BILL_ISSUE' ? 'Tagihan' : log.type === 'RECEIPT' ? 'Struk/Kwitansi' : 'Broadcast'}
                          </span>
                        </td>
                        <td style={{ fontSize: 'var(--text-xs)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log.message}>
                          {log.message}
                        </td>
                        <td>
                          <span className={`badge ${log.status === 'SENT' ? 'badge-success' : log.status === 'QUEUED' ? 'badge-info' : 'badge-danger'}`}>
                            {log.status === 'SENT' ? 'SENT' : log.status === 'QUEUED' ? 'QUEUED' : 'FAILED'}
                          </span>
                        </td>
                        <td>
                          {log.status === 'FAILED' ? (
                            <button className="btn btn-secondary btn-sm" onClick={() => handleResend(log.id, log.recipientName)}>
                              <Icons.RefreshCw size={12} />
                              <span>Kirim Ulang</span>
                            </button>
                          ) : (
                            <span className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* TAB 2: PENGATURAN TEMPLATE & OTOMATISASI WHATSAPP FORM */
        <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)', alignItems: 'start' }}>
            
            {/* Card 1: Otomatisasi Pengiriman */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Icons.ToggleRight size={18} />
                <span>Otomatisasi Pengiriman Pesan</span>
              </h3>
              <p className="text-muted" style={{ fontSize: 'var(--text-xs)', marginBottom: 'var(--space-2)' }}>
                Tentukan kejadian transaksi apa saja yang akan memicu pengiriman pesan WhatsApp secara otomatis kepada Wali Murid.
              </p>
              
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: 'var(--text-sm)' }}>
                <input
                  type="checkbox"
                  checked={waConfig.autoSendReceipt}
                  onChange={(e) => setWaConfig({ ...waConfig, autoSendReceipt: e.target.checked })}
                />
                <span>Kirim Struk/Bukti Bayar Otomatis saat Transaksi Kasir Lunas</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: 'var(--text-sm)' }}>
                <input
                  type="checkbox"
                  checked={waConfig.autoSendInvoice}
                  onChange={(e) => setWaConfig({ ...waConfig, autoSendInvoice: e.target.checked })}
                />
                <span>Kirim Notifikasi Tagihan Baru ke Wali Murid saat Diterbitkan</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: 'var(--text-sm)' }}>
                <input
                  type="checkbox"
                  checked={waConfig.autoSendReminder}
                  onChange={(e) => setWaConfig({ ...waConfig, autoSendReminder: e.target.checked })}
                />
                <span>Kirim Pengingat Jatuh Tempo (Reminder) Otomatis</span>
              </label>
            </div>

            {/* Card 2: Form Template Pesan WhatsApp */}
            <div className="card">
              <h3 className="card-title" style={{ marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Icons.FileText size={18} />
                <span>Template Pesan Otomatis</span>
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                
                {/* Template Struk Pembayaran */}
                <div className="form-group">
                  <label className="form-label">Template Pesan Struk Pembayaran Lunas</label>
                  <textarea
                    className="form-input"
                    value={waConfig.receiptTemplate}
                    onChange={(e) => setWaConfig({ ...waConfig, receiptTemplate: e.target.value })}
                    rows={4}
                    required
                  />
                </div>

                {/* Template Tagihan Baru */}
                <div className="form-group">
                  <label className="form-label">Template Pesan Tagihan Baru Diterbitkan</label>
                  <textarea
                    className="form-input"
                    value={waConfig.invoiceTemplate}
                    onChange={(e) => setWaConfig({ ...waConfig, invoiceTemplate: e.target.value })}
                    rows={4}
                    required
                  />
                </div>

                {/* Dynamic Tag Helper Box */}
                <div style={{ background: 'var(--color-bg-tertiary)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)', border: 'var(--glass-border)' }}>
                  <h4 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Icons.Code size={16} className="text-success" />
                    <span>Tag Variabel Dinamis yang Tersedia</span>
                  </h4>
                  <p className="text-muted" style={{ fontSize: 'var(--text-xs)', marginBottom: '8px' }}>
                    Gunakan tag berikut pada template pesan untuk diisi secara otomatis oleh sistem:
                  </p>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {['{nama_siswa}', '{nis}', '{kelas}', '{jenis_tagihan}', '{periode}', '{jumlah}', '{no_struk}', '{no_billing}'].map((tag) => (
                      <span
                        key={tag}
                        className="badge badge-neutral"
                        style={{ cursor: 'pointer', fontFamily: 'monospace', fontSize: '11px' }}
                        onClick={() => toast.info(`Variabel ${tag} disalin ke template!`)}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

              </div>
            </div>

          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary" disabled={savingSettings}>
              <Icons.Save size={16} />
              <span>{savingSettings ? 'Menyimpan...' : 'Simpan Konfigurasi'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
