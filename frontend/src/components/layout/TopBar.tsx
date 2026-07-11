/**
 * TopBar Component
 * Header containing page titles, search bar, notifications, and user profile dropdown
 */
import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext';
import { getInitials, ROLE_LABELS } from '../../lib/utils';
import { NAV_ITEMS } from '../../lib/constants';
import * as Icons from 'lucide-react';
import './TopBar.css';

export default function TopBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('light');

  // Initialize theme
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'dark' | 'light' | null;
    const initialTheme = savedTheme || 'light';
    setTheme(initialTheme);
    document.documentElement.setAttribute('data-theme', initialTheme);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
    localStorage.setItem('theme', nextTheme);
  };

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Find active page title based on path
  const getPageTitle = (): string => {
    const path = location.pathname;
    if (path === '/dashboard') return 'Dashboard Overview';
    
    // Check main NAV_ITEMS
    for (const item of NAV_ITEMS) {
      if (item.path === path) return item.label;
      if (item.children) {
        const activeChild = item.children.find((child) => child.path === path);
        if (activeChild) return activeChild.label;
      }
    }
    return 'Aplikasi Bayaran';
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        <h2 className="topbar-title animate-fade-in">{getPageTitle()}</h2>
      </div>

      <div className="topbar-right">
        {/* Unit Selection Display / Status */}
        <div className="topbar-unit-badge">
          <Icons.School size={16} />
          <span>MI / MTs / MA Terpadu</span>
        </div>

        {/* Notifications Icon (Placeholder for Phase 5) */}
        <button className="topbar-btn" title="Notifikasi" onClick={() => navigate('/notifications')}>
          <Icons.Bell size={20} />
          <span className="topbar-badge"></span>
        </button>

        {/* Theme Toggle Button */}
        <button 
          className="topbar-btn" 
          title={theme === 'dark' ? 'Mode Terang' : 'Mode Gelap'} 
          onClick={toggleTheme}
        >
          {theme === 'dark' ? <Icons.Sun size={20} /> : <Icons.Moon size={20} />}
        </button>

        {/* User Dropdown */}
        <div className="topbar-user" ref={dropdownRef}>
          <button 
            className="topbar-user-trigger" 
            onClick={() => setDropdownOpen(!dropdownOpen)}
            aria-expanded={dropdownOpen}
          >
            <div className="avatar avatar-sm" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              {user?.avatar ? (
                <img src={user.avatar} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                user ? getInitials(user.name) : 'U'
              )}
            </div>
            <div className="topbar-user-info">
              <span className="topbar-username">{user?.name || 'User'}</span>
              <span className="topbar-userrole">{user ? ROLE_LABELS[user.role] : 'Guest'}</span>
            </div>
            <Icons.ChevronDown size={14} className={`topbar-chevron ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {dropdownOpen && (
            <div className="dropdown-menu topbar-dropdown animate-fade-in-down">
              <div className="dropdown-profile-header">
                <span className="dropdown-profile-name">{user?.name}</span>
                <span className="dropdown-profile-email">{user?.email}</span>
              </div>
              <div className="dropdown-separator"></div>
              
              <button className="dropdown-item" onClick={() => { setDropdownOpen(false); navigate('/settings/profile'); }}>
                <Icons.Building2 size={16} />
                <span>Profil Madrasah</span>
              </button>
              
              <button className="dropdown-item" onClick={() => { setDropdownOpen(false); navigate('/settings/user-profile'); }}>
                <Icons.User size={16} />
                <span>Pengaturan Akun</span>
              </button>

              <div className="dropdown-separator"></div>
              
              <button className="dropdown-item danger" onClick={handleLogout}>
                <Icons.LogOut size={16} />
                <span>Keluar</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
