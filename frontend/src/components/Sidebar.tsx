import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const location = useLocation();
  const [logoError, setLogoError] = useState(false);

  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: '▦' },
    { path: '/today', label: 'Today', icon: '📅' },
    { path: '/attendance', label: 'Attendance', icon: '⏱' },
    { path: '/officials', label: 'Officials', icon: '👥' },
    { path: '/bhw', label: 'BHW', icon: '🩺' },
    { path: '/tanod', label: 'Tanod', icon: '🛡' },
    { path: '/reports', label: 'Reports', icon: '↗' },
    { path: '/settings', label: 'Settings', icon: '⚙' },
  ];

  return (
    <aside 
      className={`fixed lg:static inset-y-0 left-0 z-40 w-72 bg-[rgba(15,23,42,0.95)] backdrop-blur-xl border-r border-[var(--border)] shadow-[var(--shadow)] transform transition-transform duration-300 ease-in-out lg:translate-x-0 flex flex-col ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <div className="px-6 py-8 flex-shrink-0">
        <div className="flex items-center justify-between mb-8 lg:hidden">
          <div className="text-[var(--muted)] text-sm font-semibold uppercase tracking-wider">Menu</div>
          <button onClick={onClose} className="p-2 -mr-2 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-[var(--accent)] flex items-center justify-center overflow-hidden shadow-[0_0_20px_rgba(16,185,129,0.4)] border border-[var(--accent-2)]">
            {!logoError ? (
              <img
                src="/logo.png"
                alt="Logo"
                className="h-full w-full object-cover"
                onError={() => setLogoError(true)}
              />
            ) : (
              <span className="text-white font-bold text-2xl">B</span>
            )}
          </div>
          <div>
            <h1 className="text-xl font-extrabold leading-tight tracking-tight text-[var(--text)]">BRGY.</h1>
            <h2 className="text-xl font-extrabold leading-tight tracking-tight text-[var(--text)]">RIZAL</h2>
            <p className="mt-0.5 text-[10px] uppercase tracking-wider text-[var(--accent)] font-semibold">Attendance System</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-8 custom-scrollbar">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted)] mb-4">Navigation</p>
        <nav className="space-y-1.5">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => {
                  if (window.innerWidth < 1024) onClose();
                }}
                className={`flex items-center gap-3.5 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-[var(--accent)]/20 to-transparent text-[var(--text)] border-l-4 border-[var(--accent)] shadow-sm'
                    : 'text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)] hover:translate-x-1'
                }`}
              >
                <span className={`text-lg transition-transform ${isActive ? 'scale-110 text-[var(--accent)]' : ''}`}>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;