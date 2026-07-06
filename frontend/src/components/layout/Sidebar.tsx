/**
 * Sidebar Navigation
 * Collapsible sidebar with RBAC-filtered menu items
 */
import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext';
import { NAV_ITEMS, APP_NAME, type NavItem } from '../../lib/constants';
import { cn } from '../../lib/utils';
import * as Icons from 'lucide-react';
import './Sidebar.css';

// Dynamic icon resolver
function getIcon(iconName: string, size = 20) {
  const Icon = (Icons as unknown as Record<string, React.ComponentType<{ size?: number }>>)[iconName];
  return Icon ? <Icon size={size} /> : null;
}

export default function Sidebar() {
  const { user, rolePermissions } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Helper to check if a menu ID is allowed for the user
  const isAllowed = (menuId: string, defaultRoles: string[]) => {
    if (!user) return false;
    if (user.role === 'SUPERADMIN') return true; // Superadmin always has access
    
    // Check if rolePermissions has an entry for the user's role
    const perms = rolePermissions?.[user.role];
    if (Array.isArray(perms) && perms.length > 0) {
      return perms.includes(menuId);
    }
    
    // Fallback to static constants if DB config not set up yet
    return defaultRoles.includes(user.role);
  };

  // Filter nav items based on user role and dynamic permissions
  const filteredNavItems = NAV_ITEMS.filter(
    (item) => isAllowed(item.id, item.roles)
  );

  const toggleGroup = (id: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const isGroupActive = (item: NavItem) => {
    if (item.children) {
      return item.children.some((child) => location.pathname === child.path);
    }
    return location.pathname === item.path;
  };

  // Auto-expand groups that contain the active route
  const isExpanded = (item: NavItem) => {
    return expandedGroups.has(item.id) || isGroupActive(item);
  };

  return (
    <aside className={cn('sidebar', collapsed && 'sidebar-collapsed')}>
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <svg width="32" height="32" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="48" height="48" rx="12" fill="url(#sidebar-logo-grad)" />
            <path d="M24 12L34 18V30L24 36L14 30V18L24 12Z" stroke="white" strokeWidth="2" fill="none"/>
            <circle cx="24" cy="24" r="4" fill="white" opacity="0.9"/>
            <defs>
              <linearGradient id="sidebar-logo-grad" x1="0" y1="0" x2="48" y2="48">
                <stop stopColor="hsl(160, 84%, 39%)" />
                <stop offset="1" stopColor="hsl(199, 89%, 48%)" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        {!collapsed && <span className="sidebar-logo-text">{APP_NAME}</span>}
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {filteredNavItems.map((item) => {
          const filteredChildren = item.children?.filter(
            (child) => isAllowed(child.id, child.roles)
          );
          const hasChildren = filteredChildren && filteredChildren.length > 0;

          if (hasChildren) {
            return (
              <div key={item.id} className="nav-group">
                <button
                  className={cn(
                    'nav-item nav-group-toggle',
                    isGroupActive(item) && 'nav-item-active-parent'
                  )}
                  onClick={() => toggleGroup(item.id)}
                  title={collapsed ? item.label : undefined}
                >
                  <span className="nav-item-icon">{getIcon(item.icon)}</span>
                  {!collapsed && (
                    <>
                      <span className="nav-item-label">{item.label}</span>
                      <span className={cn('nav-chevron', isExpanded(item) && 'nav-chevron-open')}>
                        <Icons.ChevronDown size={14} />
                      </span>
                    </>
                  )}
                </button>

                {!collapsed && isExpanded(item) && (
                  <div className="nav-group-children animate-fade-in-down">
                    {filteredChildren.map((child) => (
                      <NavLink
                        key={child.id}
                        to={child.path}
                        end={child.path === item.path}
                        className={({ isActive }) =>
                          cn('nav-item nav-item-child', isActive && 'nav-item-active')
                        }
                      >
                        <span className="nav-item-icon">{getIcon(child.icon, 16)}</span>
                        <span className="nav-item-label">{child.label}</span>
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          return (
            <NavLink
              key={item.id}
              to={item.path}
              className={({ isActive }) =>
                cn('nav-item', isActive && 'nav-item-active')
              }
              title={collapsed ? item.label : undefined}
            >
              <span className="nav-item-icon">{getIcon(item.icon)}</span>
              {!collapsed && <span className="nav-item-label">{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Collapse Toggle */}
      <button
        className="sidebar-collapse-btn"
        onClick={() => setCollapsed(!collapsed)}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <Icons.ChevronsLeft
          size={18}
          style={{ transform: collapsed ? 'rotate(180deg)' : 'none', transition: 'transform 200ms ease' }}
        />
      </button>
    </aside>
  );
}
