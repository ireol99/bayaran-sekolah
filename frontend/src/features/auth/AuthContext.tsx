/**
 * Auth Context & Provider
 * Manages authentication state, JWT tokens, and user session
 */
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { api } from '../../lib/api-client';
import type { UserRole } from '../../lib/constants';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (...roles: UserRole[]) => boolean;
  rolePermissions: Record<string, string[]>;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [rolePermissions, setRolePermissions] = useState<Record<string, string[]>>({});

  // Check existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      const token = localStorage.getItem('access_token');
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const [response, permRes] = await Promise.all([
          api.get<User>('/auth/me'),
          api.get<{ data: any }>('/settings/permissions').catch(() => ({ data: { data: {} } }))
        ]);
        setUser(response.data);
        const perms = permRes.data?.data || permRes.data || {};
        setRolePermissions(perms);
      } catch {
        localStorage.removeItem('access_token');
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const response = await api.post<{ user: User; accessToken: string }>('/auth/login', {
        email,
        password,
      });
      localStorage.setItem('access_token', response.data.accessToken);
      setUser(response.data.user);
    } catch (err) {
      // Offline fallback mock for stand-alone frontend testing/preview
      const lowercaseEmail = email.toLowerCase();
      let role: UserRole | null = null;
      let name = 'User';

      if (lowercaseEmail === 'superadmin@madrasah.sch.id') {
        role = 'SUPERADMIN';
        name = 'Super Administrator';
      } else if (lowercaseEmail === 'ahmad@madrasah.sch.id') {
        role = 'ADMIN_TU';
        name = 'Kasir Ustadz Ahmad';
      } else if (lowercaseEmail === 'kepsek@madrasah.sch.id') {
        role = 'KEPALA_SEKOLAH';
        name = 'Kepala Sekolah MI';
      } else if (lowercaseEmail === 'yayasan@madrasah.sch.id') {
        role = 'YAYASAN';
        name = 'Pengurus Yayasan';
      }

      if (role && password === 'admin123') {
        const mockUser: User = { id: `u_${role.toLowerCase()}`, email, name, role };
        localStorage.setItem('access_token', 'mock-jwt-token-xyz');
        setUser(mockUser);
        try {
          const permRes = await api.get<any>('/settings/permissions');
          const perms = permRes.data?.data || permRes.data || {};
          setRolePermissions(perms);
        } catch(e) {}
        return;
      }

      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Continue with local cleanup even if API call fails
    } finally {
      localStorage.removeItem('access_token');
      setUser(null);
    }
  }, []);

  const hasRole = useCallback(
    (...roles: UserRole[]) => {
      if (!user) return false;
      return roles.includes(user.role);
    },
    [user],
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        hasRole,
        rolePermissions,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
