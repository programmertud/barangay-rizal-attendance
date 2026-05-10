import { NavLink } from 'react-router-dom';

const PublicTopbar: React.FC = () => {
  const linkBase = 'px-4 py-2 rounded-xl text-sm font-semibold transition-colors border';

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow)]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-2xl font-extrabold tracking-tight text-[var(--text)] sm:text-3xl md:text-4xl">
            BRGY. RIZAL ATTENDANCE SYSTEM
          </p>
        </div>

        <nav className="flex flex-wrap items-center gap-2 sm:justify-end">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `${linkBase} ${
                isActive
                  ? 'bg-[#7c3aed] text-white border-[#7c3aed]'
                  : 'bg-transparent text-white/90 border-[#7c3aed] hover:bg-[#7c3aed]/15'
              }`
            }
          >
            Home
          </NavLink>
          <NavLink
            to="/about"
            className={({ isActive }) =>
              `${linkBase} ${
                isActive
                  ? 'bg-[#7c3aed] text-white border-[#7c3aed]'
                  : 'bg-transparent text-white/90 border-[#7c3aed] hover:bg-[#7c3aed]/15'
              }`
            }
          >
            About
          </NavLink>
          <NavLink
            to="/login"
            className={({ isActive }) =>
              `${linkBase} ${
                isActive
                  ? 'bg-[#7c3aed] text-white border-[#7c3aed]'
                  : 'bg-transparent text-white/90 border-[#7c3aed] hover:bg-[#7c3aed]/15'
              }`
            }
          >
            Login
          </NavLink>
        </nav>
      </div>
    </header>
  );
};

export default PublicTopbar;
