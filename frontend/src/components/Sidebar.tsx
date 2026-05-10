import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const Sidebar: React.FC = () => {
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
    <aside className="w-72 bg-[var(--surface)] border-r border-[var(--border)] shadow-[var(--shadow)]">
      <div className="px-6 py-8">
        <div className="flex items-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-[var(--accent)] flex items-center justify-center overflow-hidden shadow-[var(--shadow-soft)]">
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
            <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-[var(--text)]">BRGY.</h1>
            <h2 className="text-2xl font-extrabold leading-tight tracking-tight text-[var(--text)]">RIZAL</h2>
            <p className="mt-1 text-xs text-[var(--muted)]">Attendance System</p>
          </div>
        </div>

        <div className="mt-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">Navigation</p>
          <nav className="mt-3 space-y-1">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-[var(--accent)]/16 text-[var(--text)] border-l-4 border-[var(--accent)]'
                      : 'text-[var(--muted)] hover:bg-[var(--accent)]/10 hover:text-[var(--text)]'
                  }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;