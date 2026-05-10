import { signOut } from 'firebase/auth';
import { auth } from '../services/firebase';
import { useNow } from '../hooks/useNow';
import { useTheme } from '../hooks/useTheme';

const Header: React.FC = () => {
  const now = useNow(1000);
  const { theme, toggleTheme } = useTheme();

  const handleLogout = async () => {
    await signOut(auth);
  };

  return (
    <header className="sticky top-0 z-20 bg-[var(--surface)] border-b border-[var(--border)] shadow-[var(--shadow)]">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between px-6 py-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-[var(--text)]">BRGY. RIZAL ATTENDANCE SYSTEM</h2>
            <p className="text-sm text-[var(--muted)]">{now.toLocaleDateString()} • {now.toLocaleTimeString()}</p>
          </div>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <button
            type="button"
            onClick={toggleTheme}
            className="btn btn-ghost"
          >
            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </button>

          <button
            onClick={handleLogout}
            className="btn btn-danger"
          >
            Logout
          </button>

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[var(--accent)] flex items-center justify-center text-white font-semibold">
              A
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--text)]">Admin</p>
              <p className="text-xs text-[var(--muted)]">Barangay</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;