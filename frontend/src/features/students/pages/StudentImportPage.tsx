import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { studentService } from '../studentService';
import { read, utils, write } from 'xlsx';
import { toast } from 'sonner';
import * as Icons from 'lucide-react';

interface ParsedStudentRow {
  nis: string;
  nisn?: string;
  name: string;
  level: 'MI' | 'MTS' | 'MA';
  className: string;
  discountCategory: string;
  parentPhone: string;
  isValid: boolean;
  errorReason?: string;
}

export default function StudentImportPage() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedStudentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  // Generate & Download Excel Template
  const handleDownloadTemplate = () => {
    try {
      const sampleData = [
        {
          NIS: '10203001',
          NISN: '0012345678',
          Nama: 'Ahmad Fauzi',
          Tingkat: 'MTS',
          Kelas: 'VII-A',
          'Kategori Diskon': 'Anak Yatim',
          'No HP Wali': '081234567890',
        },
        {
          NIS: '10203002',
          NISN: '0012345679',
          Nama: 'Siti Aminah',
          Tingkat: 'MA',
          Kelas: 'X-IPA',
          'Kategori Diskon': 'Beasiswa Yayasan',
          'No HP Wali': '081234567891',
        },
        {
          NIS: '10203003',
          NISN: '0012345680',
          Nama: 'Muhammad Rizky',
          Tingkat: 'MI',
          Kelas: 'I-A',
          'Kategori Diskon': 'Umum',
          'No HP Wali': '081234567892',
        },
      ];

      const worksheet = utils.json_to_sheet(sampleData);
      worksheet['!cols'] = [
        { wch: 12 }, // NIS
        { wch: 14 }, // NISN
        { wch: 25 }, // Nama
        { wch: 10 }, // Tingkat
        { wch: 12 }, // Kelas
        { wch: 22 }, // Kategori Diskon
        { wch: 18 }, // No HP Wali
      ];

      const workbook = utils.book_new();
      utils.book_append_sheet(workbook, worksheet, 'Template Siswa');

      const excelBuffer = write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'template_import_siswa_madrasah.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Template Excel berhasil diunduh');
    } catch (err: any) {
      toast.error('Gagal mengunduh template Excel');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      parseExcelFile(selectedFile);
    }
  };

  const parseExcelFile = (file: File) => {
    setLoading(true);
    setParsedRows([]);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        
        // Convert to JSON
        const rows = utils.sheet_to_json<Record<string, string | number>>(sheet);
        
        // Map and validate rows
        const formatted: ParsedStudentRow[] = rows.map((row, index) => {
          const nis = String(row['NIS'] || row['nis'] || '').trim();
          const nisn = String(row['NISN'] || row['nisn'] || '').trim();
          const name = String(row['Nama'] || row['nama'] || row['Name'] || '').trim();
          let level = String(row['Tingkat'] || row['tingkat'] || '').trim().toUpperCase();
          const className = String(row['Kelas'] || row['kelas'] || '').trim();
          const discountCategory = String(row['Kategori Diskon'] || row['diskon'] || 'Umum').trim();
          const parentPhone = String(row['No HP Wali'] || row['wali'] || row['parent_phone'] || '').trim();

          // Basic validation rules
          let isValid = true;
          let errorReason = '';

          if (!nis) {
            isValid = false;
            errorReason = 'NIS tidak boleh kosong';
          } else if (!/^\d+$/.test(nis)) {
            isValid = false;
            errorReason = 'NIS harus berupa angka';
          } else if (!name) {
            isValid = false;
            errorReason = 'Nama tidak boleh kosong';
          } else if (!['MI', 'MTS', 'MA'].includes(level)) {
            if (level === 'MTS' || level === 'MTSS' || level === 'MTAS') level = 'MTS';
            else if (level === 'MA' || level === 'MAS') level = 'MA';
            else if (level === 'MI' || level === 'MIS') level = 'MI';
            else {
              isValid = false;
              errorReason = 'Tingkat harus salah satu dari: MI, MTS, MA';
            }
          } else if (!className) {
            isValid = false;
            errorReason = 'Kelas tidak boleh kosong';
          } else if (!parentPhone) {
            isValid = false;
            errorReason = 'No HP Wali tidak boleh kosong';
          }

          return {
            nis,
            nisn,
            name,
            level: level as 'MI' | 'MTS' | 'MA',
            className,
            discountCategory,
            parentPhone,
            isValid,
            errorReason: errorReason ? `Baris ${index + 2}: ${errorReason}` : undefined,
          };
        });

        setParsedRows(formatted);
        toast.success(`Berhasil mengurai ${formatted.length} baris dari Excel`);
      } catch (err) {
        toast.error('Gagal mengurai file Excel. Pastikan format file sesuai.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleImport = async () => {
    const invalidRows = parsedRows.filter((r) => !r.isValid);
    if (invalidRows.length > 0) {
      toast.error('Harap perbaiki baris data yang merah sebelum mengunggah.');
      return;
    }

    setImporting(true);
    try {
      await studentService.importBatch(parsedRows);
      toast.success(`Berhasil mengimpor ${parsedRows.length} siswa`);
      navigate('/students');
    } catch {
      toast.error('Gagal melakukan impor data ke database');
    } finally {
      setImporting(false);
    }
  };

  const invalidCount = parsedRows.filter((r) => !r.isValid).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }} className="animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => navigate('/students')}>
              <Icons.ArrowLeft size={16} />
            </button>
            <h1 style={{ fontSize: 'var(--text-2xl)', margin: 0 }}>Import Siswa Massal</h1>
          </div>
          <p className="text-muted" style={{ marginLeft: '36px', marginTop: '4px' }}>
            Unggah file Excel (.xlsx) untuk menambahkan data siswa secara massal ke unit sekolah.
          </p>
        </div>

        {/* Download Template Button */}
        <button className="btn btn-secondary" onClick={handleDownloadTemplate}>
          <Icons.Download size={16} />
          <span>Download Template Excel</span>
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 'var(--space-6)', alignItems: 'start' }}>
        
        {/* Left Card: File Uploader Info */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="card-title" style={{ margin: 0 }}>Instruksi File</h3>
            <button
              className="btn btn-ghost btn-sm text-primary"
              onClick={handleDownloadTemplate}
              style={{ fontSize: 'var(--text-xs)' }}
            >
              <Icons.Download size={14} />
              <span>Unduh Template</span>
            </button>
          </div>

          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
            Untuk menghindari kegagalan proses penguraian data, gunakan template resminya atau pastikan header kolom Excel sesuai:
          </p>
          <ul style={{ paddingLeft: 'var(--space-4)', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <li><code>NIS</code> — Nomor Induk Siswa (Wajib, angka)</li>
            <li><code>NISN</code> — Nomor Induk Siswa Nasional (Opsional)</li>
            <li><code>Nama</code> — Nama lengkap siswa</li>
            <li><code>Tingkat</code> — MI, MTS, atau MA</li>
            <li><code>Kelas</code> — Nama kelas (misal: VII-A, X-IPA)</li>
            <li><code>Kategori Diskon</code> — (Umum, Anak Yatim, Anak Guru, dll)</li>
            <li><code>No HP Wali</code> — WhatsApp aktif wali murid (Angka saja)</li>
          </ul>

          <div className="divider"></div>

          {/* Upload Drop Zone */}
          <div style={{
            border: '2px dashed var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-6)',
            textAlign: 'center',
            cursor: 'pointer',
            backgroundColor: 'var(--color-bg-tertiary)',
            position: 'relative'
          }}>
            <input
              type="file"
              accept=".xlsx, .xls"
              onChange={handleFileChange}
              style={{
                position: 'absolute',
                inset: 0,
                opacity: 0,
                cursor: 'pointer'
              }}
            />
            <Icons.FileSpreadsheet size={36} style={{ color: 'var(--color-accent-primary)', marginBottom: 'var(--space-2)', opacity: 0.8 }} />
            <div className="font-semibold" style={{ fontSize: 'var(--text-sm)' }}>
              {file ? file.name : 'Pilih file Excel'}
            </div>
            <span className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>
              {file ? `${(file.size / 1024).toFixed(1)} KB` : 'Format .xlsx atau .xls'}
            </span>
          </div>

          {file && (
            <button
              className="btn btn-primary"
              disabled={importing || loading || parsedRows.length === 0 || invalidCount > 0}
              onClick={handleImport}
            >
              {importing ? 'Mengimpor...' : `Proses Impor ${parsedRows.length} Siswa`}
            </button>
          )}
        </div>

        {/* Right Card: Preview Table */}
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: 'var(--space-4)' }}>Preview Data</h3>
          
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-12)' }}>
              <div className="spinner"></div>
              <span className="text-muted" style={{ marginTop: 'var(--space-2)' }}>Sedang membaca berkas...</span>
            </div>
          ) : parsedRows.length === 0 ? (
            <div className="empty-state">
              <Icons.Inbox className="empty-state-icon" />
              <div className="empty-state-title">Belum Ada File Ditambahkan</div>
              <div className="empty-state-description">
                Pilih berkas Excel atau unduh template Excel terlebih dahulu untuk mengisi data siswa.
              </div>
              <button className="btn btn-secondary btn-sm" onClick={handleDownloadTemplate} style={{ marginTop: 'var(--space-3)' }}>
                <Icons.Download size={14} />
                <span>Download Template Excel</span>
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="font-medium" style={{ fontSize: 'var(--text-sm)' }}>
                  Total: {parsedRows.length} siswa
                </span>
                {invalidCount > 0 && (
                  <span className="badge badge-danger">
                    {invalidCount} Baris Bermasalah
                  </span>
                )}
              </div>

              {/* Data Table Scroll */}
              <div className="data-table-wrapper" style={{ maxHeight: '400px' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>NIS</th>
                      <th>NISN</th>
                      <th>Nama</th>
                      <th>Tingkat</th>
                      <th>Kelas</th>
                      <th>Kategori Diskon</th>
                      <th>No HP Wali</th>
                      <th>Status Validasi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.map((row, idx) => (
                      <tr key={idx} style={{ backgroundColor: row.isValid ? 'transparent' : 'hsla(0, 84%, 60%, 0.08)' }}>
                        <td className={row.isValid ? '' : 'text-danger'}>{row.nis}</td>
                        <td className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>{row.nisn || '-'}</td>
                        <td>{row.name}</td>
                        <td><span className="badge badge-neutral">{row.level}</span></td>
                        <td>{row.className}</td>
                        <td>{row.discountCategory}</td>
                        <td>{row.parentPhone}</td>
                        <td>
                          {row.isValid ? (
                            <span className="badge badge-success badge-dot">Valid</span>
                          ) : (
                            <span className="text-danger" style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-medium)' }} title={row.errorReason}>
                              Bermasalah
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
