import { signOut } from 'firebase/auth';
import { auth } from '../services/firebase';
import { useNow } from '../hooks/useNow';
import { useTheme } from '../hooks/useTheme';

interface HeaderProps {
  onMenuClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const now = useNow(1000);
  const { theme, toggleTheme } = useTheme();

  const handleLogout = async () => {
    await signOut(auth);
  };

  return (
    <header className="sticky top-0 z-20 bg-[var(--surface)] backdrop-blur-md border-b border-[var(--border)] shadow-[var(--shadow-soft)]">
      <div className="flex items-center justify-between px-4 py-3 md:px-6 md:py-4">
        <div className="flex items-center gap-3">
          <button 
            onClick={onMenuClick}
            className="lg:hidden p-2 -ml-2 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="hidden sm:block">
            <h2 className="text-lg md:text-xl font-semibold text-[var(--text)] truncate">BRGY. RIZAL ATTENDANCE</h2>
            <p className="text-xs md:text-sm text-[var(--muted)]">{now.toLocaleDateString()} • {now.toLocaleTimeString()}</p>
          </div>
          <div className="sm:hidden text-lg font-bold">BRGY. RIZAL</div>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-full hover:bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--text)] transition-colors"
            title="Toggle Theme"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>

          <div className="hidden md:flex items-center gap-3 border-l border-[var(--border)] pl-4 ml-2">
            <div className="w-8 h-8 rounded-full bg-[var(--accent)] flex items-center justify-center text-white font-bold text-sm shadow-[var(--shadow-soft)]">
              A
            </div>
            <div className="hidden lg:block">
              <p className="text-sm font-semibold text-[var(--text)] leading-none">Admin</p>
              <p className="text-xs text-[var(--muted)] mt-1">Barangay</p>
            </div>
          </div>
          
          <button
            onClick={handleLogout}
            className="hidden sm:block btn btn-danger btn-sm ml-2"
          >
            Logout
          </button>
          
          <button
            onClick={handleLogout}
            className="sm:hidden p-2 rounded-full text-red-400 hover:bg-red-400/10"
            title="Logout"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;