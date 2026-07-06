import * as Icons from 'lucide-react';

interface ModulePlaceholderPageProps {
  title: string;
  description?: string;
  icon?: string;
}

export default function ModulePlaceholderPage({ title, description, icon }: ModulePlaceholderPageProps) {
  const renderIcon = () => {
    if (!icon) return <Icons.FolderOpen size={48} />;
    const IconComponent = (Icons as unknown as Record<string, React.ComponentType<{ size?: number }>>)[icon];
    return IconComponent ? <IconComponent size={48} /> : <Icons.FolderOpen size={48} />;
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 'calc(100vh - var(--topbar-height) - 100px)',
      textAlign: 'center',
      padding: 'var(--space-6)'
    }} className="animate-fade-in">
      <div style={{
        background: 'var(--color-accent-primary-muted)',
        color: 'var(--color-accent-primary)',
        padding: 'var(--space-4)',
        borderRadius: '50%',
        marginBottom: 'var(--space-4)',
        display: 'inline-flex'
      }}>
        {renderIcon()}
      </div>
      <h2 style={{ marginBottom: 'var(--space-2)' }}>{title}</h2>
      <p style={{ color: 'var(--color-text-secondary)', maxWidth: '500px', marginBottom: 'var(--space-4)' }}>
        {description || 'Modul ini sedang dalam proses pengembangan sesuai jadwal implementasi.'}
      </p>
      <div className="badge badge-info badge-dot">
        Dalam Pengembangan
      </div>
    </div>
  );
}
