/**
 * Madrasah Profile Page
 * Profile configuration controls for header text formatting and logo print branding
 */
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { api } from '../../../lib/api-client';
import * as Icons from 'lucide-react';

export default function MadrasahProfilePage() {
  const [schoolName, setSchoolName] = useState('Yayasan Pendidikan Islam Madrasah Terpadu');
  const [miName, setMiName] = useState('Madrasah Ibtidaiyah (MI) Terpadu');
  const [mtsName, setMtsName] = useState('Madrasah Tsanawiyah (MTs) Terpadu');
  const [maName, setMaName] = useState('Madrasah Aliyah (MA) Terpadu');
  const [address, setAddress] = useState('Jl. Pendidikan Islam No. 45, Kecamatan Sukamaju, Kota Bandung');
  const [phone, setPhone] = useState('022-7654321');
  const [email, setEmail] = useState('info@madrasah-terpadu.sch.id');
  const [receiptFooter, setReceiptFooter] = useState('Terima kasih atas pembayaran Anda. Semoga berkah.');
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await api.get<any>('/settings/profile');
        const data = res.data?.data || res.data; // Handle wrapped response
        if (data) {
          setSchoolName(data.schoolName || '');
          setMiName(data.miName || '');
          setMtsName(data.mtsName || '');
          setMaName(data.maName || '');
          setAddress(data.address || '');
          setPhone(data.phone || '');
          setEmail(data.email || '');
          setReceiptFooter(data.receiptFooter || '');
        }
      } catch (err) {
        toast.error('Gagal memuat profil madrasah');
      } finally {
        setIsLoading(false);
      }
    };
    loadProfile();
  }, []);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      await api.post('/settings/profile', {
        schoolName,
        miName,
        mtsName,
        maName,
        address,
        phone,
        email,
        receiptFooter,
      });
      toast.success('Profil madrasah berhasil diperbarui ke database');
    } catch (err: any) {
      toast.error(err.message || 'Gagal memperbarui profil madrasah');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-muted animate-pulse">Memuat konfigurasi profil madrasah...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }} className="animate-fade-in">
      <div>
        <h1 style={{ fontSize: 'var(--text-2xl)' }}>Profil Madrasah</h1>
        <p className="text-muted">Kelola informasi sekolah yayasan, alamat, kontak, dan logo kop struk POS.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-6)', alignItems: 'start' }}>
        
        {/* Form Settings */}
        <div className="card">
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <h3 className="card-title">Informasi Yayasan</h3>

            <div className="form-group">
              <label className="form-label">Nama Yayasan / Lembaga Induk</label>
              <input
                type="text"
                className="form-input"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                required
              />
            </div>

            <div className="divider"></div>
            <h3 className="card-title">Nama Unit Pendidikan</h3>

            <div className="form-group">
              <label className="form-label">Unit Madrasah Ibtidaiyah (MI)</label>
              <input
                type="text"
                className="form-input"
                value={miName}
                onChange={(e) => setMiName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Unit Madrasah Tsanawiyah (MTs)</label>
              <input
                type="text"
                className="form-input"
                value={mtsName}
                onChange={(e) => setMtsName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Unit Madrasah Aliyah (MA)</label>
              <input
                type="text"
                className="form-input"
                value={maName}
                onChange={(e) => setMaName(e.target.value)}
                required
              />
            </div>

            <div className="divider"></div>
            <h3 className="card-title">Kontak & Alamat</h3>

            <div className="form-group">
              <label className="form-label">Alamat Lengkap</label>
              <textarea
                className="form-input"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={3}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
              <div className="form-group">
                <label className="form-label">Nomor Telepon</label>
                <input
                  type="text"
                  className="form-input"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email Madrasah</label>
                <input
                  type="email"
                  className="form-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="divider"></div>
            <h3 className="card-title">Konfigurasi Struk Kasir</h3>

            <div className="form-group">
              <label className="form-label">Pesan Catatan Kaki (Receipt Footnote)</label>
              <textarea
                className="form-input"
                value={receiptFooter}
                onChange={(e) => setReceiptFooter(e.target.value)}
                rows={3}
                placeholder="Pesan di bagian bawah struk pembayaran"
              />
              <span className="form-hint">Muncul secara otomatis pada saat cetak struk POS printer thermal.</span>
            </div>

            <div className="divider"></div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                {isSubmitting ? 'Menyimpan...' : 'Simpan Profil'}
              </button>
            </div>
          </form>
        </div>

        {/* Logo print preview sidebar panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          
          {/* Logo Card */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-4)', textAlign: 'center' }}>
            <h3 className="card-title">Logo Madrasah</h3>
            
            <div style={{
              width: '120px',
              height: '120px',
              borderRadius: 'var(--radius-lg)',
              border: '2px dashed var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              backgroundColor: 'var(--color-bg-tertiary)',
              position: 'relative'
            }}>
              {logoPreview ? (
                <img src={logoPreview} alt="Logo Madrasah" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              ) : (
                <Icons.Building size={40} style={{ color: 'var(--color-text-muted)', opacity: 0.5 }} />
              )}
            </div>

            <div style={{ position: 'relative' }}>
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                style={{
                  position: 'absolute',
                  inset: 0,
                  opacity: 0,
                  cursor: 'pointer'
                }}
              />
              <button type="button" className="btn btn-secondary btn-sm" style={{ pointerEvents: 'none' }}>
                <Icons.Upload size={14} />
                <span>Pilih Foto Logo</span>
              </button>
            </div>
            <span className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>
              Format yang didukung: PNG, JPG (Maks 1MB). Direkomendasikan format square 1:1 transparan.
            </span>
          </div>

          {/* Struk Kop Preview */}
          <div className="card card-glass">
            <h4 className="font-heading" style={{ fontSize: 'var(--text-sm)', marginBottom: 'var(--space-3)' }}>
              Simulasi Kop Struk POS
            </h4>
            <div style={{
              background: '#fff',
              color: '#000',
              padding: 'var(--space-4)',
              borderRadius: 'var(--radius-md)',
              fontFamily: 'monospace',
              fontSize: '11px',
              lineHeight: '1.4',
              textAlign: 'center',
              border: '1px solid #ddd'
            }}>
              {logoPreview && (
                <img src={logoPreview} alt="kop" style={{ width: '32px', height: '32px', marginBottom: '4px', objectFit: 'contain' }} />
              )}
              <div style={{ fontWeight: 'bold', fontSize: '13px' }}>{schoolName}</div>
              <div style={{ fontSize: '9px' }}>{address}</div>
              <div>Telp: {phone}</div>
              <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }}></div>
              <div style={{ textAlign: 'left' }}>
                <div>No. Trans : TX-20260704-001</div>
                <div>Tanggal   : 04 Juli 2026 11:42</div>
                <div>Kasir     : Ustadz Ahmad</div>
              </div>
              <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }}></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>SPP Juli 2025</span>
                <span>Rp 150.000</span>
              </div>
              <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }}></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                <span>TOTAL</span>
                <span>Rp 150.000</span>
              </div>
              <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }}></div>
              <div style={{ fontSize: '9px', fontStyle: 'italic' }}>"{receiptFooter}"</div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
