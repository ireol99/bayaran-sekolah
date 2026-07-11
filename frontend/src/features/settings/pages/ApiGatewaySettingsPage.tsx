/**
 * ApiGatewaySettingsPage Component
 * Configures WhatsApp API Gateway settings (Superadmin only)
 */
import { useState, useEffect } from 'react';
import { api } from '../../../lib/api-client';
import { toast } from 'sonner';
import * as Icons from 'lucide-react';

interface WhatsAppConfig {
  provider: string;
  apiUrl: string;
  apiToken: string;
  senderPhone: string;
  isConnected: boolean;
}

export default function ApiGatewaySettingsPage() {
  const [waConfig, setWaConfig] = useState<WhatsAppConfig>({
    provider: 'FONNTE',
    apiUrl: 'https://api.fonnte.com/send',
    apiToken: '',
    senderPhone: '',
    isConnected: false,
  });

  const [showToken, setShowToken] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [testingConnection, setTestingConnection] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch initial config from backend
  useEffect(() => {
    const fetchWaConfig = async () => {
      try {
        const res = await api.get<WhatsAppConfig>('/whatsapp-config');
        if (res.data) {
          setWaConfig((prev) => ({ ...prev, ...res.data }));
        }
      } catch (err) {
        toast.error('Gagal memuat konfigurasi WhatsApp Gateway');
      } finally {
        setIsLoading(false);
      }
    };
    fetchWaConfig();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await api.post('/whatsapp-config', waConfig);
      toast.success('Pengaturan API WhatsApp Gateway berhasil disimpan!');
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyimpan pengaturan');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleTestConnection = async () => {
    if (!testPhone.trim()) {
      toast.error('Masukkan nomor WhatsApp tujuan uji coba');
      return;
    }

    setTestingConnection(true);
    try {
      await api.post('/whatsapp-config/test', { phone: testPhone });
      toast.success(`Pesan uji coba WhatsApp berhasil dikirim ke ${testPhone}! API Gateway Aktif.`);
    } catch (err: any) {
      toast.error(err.message || 'Gagal melakukan koneksi uji coba');
    } finally {
      setTestingConnection(false);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-muted animate-pulse">Memuat konfigurasi API Gateway...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }} className="animate-fade-in">
      <div>
        <h1 style={{ fontSize: 'var(--text-2xl)' }}>Pengaturan Gateway WhatsApp</h1>
        <p className="text-muted">Konfigurasi token, provider server, nomor pengirim, dan uji koneksi kirim pesan.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-6)', alignItems: 'start' }}>
        
        {/* Main Settings Card */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Icons.Cpu size={18} />
              <span>Otorisasi Gateway API</span>
            </h3>
            <span className={`badge ${waConfig.apiToken ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '10px' }}>
              {waConfig.apiToken ? '● TERKONEKSI' : '● BELUM DIKONFIGURASI'}
            </span>
          </div>

          <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            
            {/* Provider selection */}
            <div className="form-group">
              <label className="form-label">Pilih Provider WhatsApp API</label>
              <select
                className="form-input form-select"
                value={waConfig.provider}
                onChange={(e) => {
                  const prov = e.target.value;
                  let defaultUrl = waConfig.apiUrl;
                  if (prov === 'FONNTE') defaultUrl = 'https://api.fonnte.com/send';
                  if (prov === 'WABLAS') defaultUrl = 'https://api.wablas.com/api/send-message';
                  if (prov === 'RUANGWA') defaultUrl = 'https://ruangwa.com/api/send-message.php';
                  setWaConfig({ ...waConfig, provider: prov, apiUrl: defaultUrl });
                }}
              >
                <option value="FONNTE">Fonnte (Rekomendasi - Fast Speed)</option>
                <option value="WABLAS">Wablas Gateway</option>
                <option value="RUANGWA">RuangWA / WooWA</option>
                <option value="GENERIC_HTTP">Generic Webhook / Custom HTTP API</option>
              </select>
            </div>

            {/* Base URL API Endpoint */}
            <div className="form-group">
              <label className="form-label">Base URL API Endpoint</label>
              <input
                type="url"
                className="form-input"
                value={waConfig.apiUrl}
                onChange={(e) => setWaConfig({ ...waConfig, apiUrl: e.target.value })}
                placeholder="https://api.fonnte.com/send"
                required
              />
            </div>

            {/* API Token / Secret Key */}
            <div className="form-group">
              <label className="form-label">API Token / Secret Key</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type={showToken ? 'text' : 'password'}
                  className="form-input"
                  value={waConfig.apiToken}
                  onChange={(e) => setWaConfig({ ...waConfig, apiToken: e.target.value })}
                  placeholder="Masukkan token API..."
                  required
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowToken(!showToken)}
                >
                  {showToken ? <Icons.EyeOff size={16} /> : <Icons.Eye size={16} />}
                </button>
              </div>
              <span className="form-hint">Token kredensial rahasia yang diperoleh dari dashboard provider WhatsApp API Anda.</span>
            </div>

            {/* Sender Device Phone */}
            <div className="form-group">
              <label className="form-label">Nomor WhatsApp Pengirim (Sender Device)</label>
              <input
                type="text"
                className="form-input"
                value={waConfig.senderPhone}
                onChange={(e) => setWaConfig({ ...waConfig, senderPhone: e.target.value })}
                placeholder="Contoh: 081234567890"
                required
              />
              <span className="form-hint">Nomor handphone yang didaftarkan sebagai nomor pengirim aktif (sender device).</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-2)' }}>
              <button type="submit" className="btn btn-primary" disabled={savingSettings}>
                <Icons.Save size={16} />
                <span>{savingSettings ? 'Menyimpan...' : 'Simpan Kredensial'}</span>
              </button>
            </div>

          </form>
        </div>

        {/* Sidebar Info & Test connection */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          
          {/* Card Connection Uji Coba */}
          <div className="card">
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 'var(--space-2)' }}>
              <Icons.Send size={16} style={{ color: 'var(--color-success)' }} />
              <span>Uji Coba Pengiriman</span>
            </h3>
            <p className="text-muted" style={{ fontSize: 'var(--text-xs)', marginBottom: 'var(--space-4)' }}>
              Kirimkan pesan uji coba instan untuk mengetes validitas Token API dan konektivitas server.
            </p>

            <div className="form-group">
              <label className="form-label">Nomor Tujuan Tes</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  className="form-input"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="0812XXXXXXXX"
                  style={{ flex: 1, fontSize: 'var(--text-xs)' }}
                />
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleTestConnection}
                  disabled={testingConnection}
                >
                  <span>{testingConnection ? 'Mengirim...' : 'Tes Kirim'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Card Help / Security warning */}
          <div className="card card-glass">
            <h4 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-warning)' }}>
              <Icons.AlertTriangle size={16} />
              <span>Hak Akses Terbatas</span>
            </h4>
            <p className="text-muted" style={{ fontSize: 'var(--text-xs)', marginTop: '8px', lineHeight: '1.4' }}>
              Halaman pengaturan kredensial API WhatsApp Gateway ini dilindungi dan hanya dapat dibuka oleh **Superadmin** untuk keamanan token.
            </p>
            <p className="text-muted" style={{ fontSize: 'var(--text-xs)', marginTop: '4px', lineHeight: '1.4' }}>
              Petugas TU/Kasir hanya diizinkan mengedit isi template pesan dan mencentang aktifasi otomatisasi pada menu Notifikasi.
            </p>
          </div>

        </div>

      </div>
    </div>
  );
}
