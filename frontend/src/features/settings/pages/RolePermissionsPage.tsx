import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { api } from '../../../lib/api-client';
import { NAV_ITEMS, ROLES } from '../../../lib/constants';
import * as Icons from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';

export default function RolePermissionsPage() {
  const { hasRole } = useAuth();
  const [permissions, setPermissions] = useState<Record<string, string[]>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Exclude SUPERADMIN from the columns since they always have full access
  const roleKeys = Object.keys(ROLES).filter((r) => r !== 'SUPERADMIN');

  useEffect(() => {
    const fetchPerms = async () => {
      try {
        const res = await api.get<any>('/settings/permissions');
        const data = res.data?.data || res.data || {};
        
        // If DB is empty, initialize with defaults from NAV_ITEMS
        if (Object.keys(data).length === 0) {
          const defaults: Record<string, string[]> = {};
          roleKeys.forEach(r => defaults[r] = []);
          
          NAV_ITEMS.forEach(nav => {
            roleKeys.forEach(role => {
              if (nav.roles.includes(role as any)) {
                defaults[role].push(nav.id);
              }
            });
            if (nav.children) {
              nav.children.forEach(child => {
                roleKeys.forEach(role => {
                  if (child.roles.includes(role as any)) {
                    defaults[role].push(child.id);
                  }
                });
              });
            }
          });
          setPermissions(defaults);
        } else {
          setPermissions(data);
        }
      } catch (e) {
        toast.error('Gagal memuat hak akses');
      } finally {
        setIsLoading(false);
      }
    };
    fetchPerms();
  }, []);

  const handleToggle = (role: string, menuId: string) => {
    setPermissions(prev => {
      const current = prev[role] || [];
      const newPerms = { ...prev };
      if (current.includes(menuId)) {
        newPerms[role] = current.filter(id => id !== menuId);
      } else {
        newPerms[role] = [...current, menuId];
      }
      return newPerms;
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await api.post('/settings/permissions', permissions);
      toast.success('Hak akses berhasil disimpan! Perubahan akan aktif setelah muat ulang.');
    } catch (e) {
      toast.error('Gagal menyimpan hak akses');
    } finally {
      setIsSaving(false);
    }
  };

  if (!hasRole('SUPERADMIN')) {
    return <div className="p-8 text-center text-danger">Akses ditolak. Hanya Superadmin.</div>;
  }

  if (isLoading) {
    return <div className="p-8 text-center text-muted animate-pulse">Memuat hak akses...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }} className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)' }}>Pengaturan Hak Akses</h1>
          <p className="text-muted">Kelola visibilitas menu berdasarkan peran pengguna (Role). SUPERADMIN selalu memiliki akses penuh.</p>
        </div>
        <button className="btn btn-primary" onClick={handleSave} disabled={isSaving}>
          <Icons.Save size={16} />
          <span>{isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
        </button>
      </div>

      <div className="card" style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '300px' }}>Menu / Fitur</th>
              {roleKeys.map(role => (
                <th key={role} style={{ textAlign: 'center' }}>{role.replace('_', ' ')}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {NAV_ITEMS.map((item) => (
              <React.Fragment key={item.id}>
                <tr style={{ background: 'var(--color-bg-secondary)' }}>
                  <td style={{ fontWeight: 'bold' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Icons.Folder size={16} className="text-primary" />
                      {item.label}
                    </div>
                  </td>
                  {roleKeys.map(role => (
                    <td key={`${item.id}-${role}`} style={{ textAlign: 'center' }}>
                      <input 
                        type="checkbox" 
                        className="form-input" 
                        style={{ width: '18px', height: '18px', cursor: 'pointer', margin: '0 auto' }}
                        checked={(permissions[role] || []).includes(item.id)}
                        onChange={() => handleToggle(role, item.id)}
                      />
                    </td>
                  ))}
                </tr>
                {item.children && item.children.map(child => (
                  <tr key={child.id}>
                    <td style={{ paddingLeft: '2rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Icons.File size={14} className="text-muted" />
                        {child.label}
                      </div>
                    </td>
                    {roleKeys.map(role => (
                      <td key={`${child.id}-${role}`} style={{ textAlign: 'center' }}>
                        <input 
                          type="checkbox" 
                          className="form-input" 
                          style={{ width: '18px', height: '18px', cursor: 'pointer', margin: '0 auto' }}
                          checked={(permissions[role] || []).includes(child.id)}
                          onChange={() => handleToggle(role, child.id)}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
