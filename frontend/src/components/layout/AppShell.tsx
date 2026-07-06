/**
 * AppShell Component
 * Main layout wrapper that combines Sidebar, TopBar, and the Content area
 */
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import './AppShell.css';

export default function AppShell() {
  return (
    <div className="app-shell animate-fade-in">
      <Sidebar />
      <div className="main-content">
        <TopBar />
        <main className="content-area">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
