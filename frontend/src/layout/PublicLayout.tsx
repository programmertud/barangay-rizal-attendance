import { Outlet } from 'react-router-dom';
import PublicTopbar from '../components/PublicTopbar';

const PublicLayout: React.FC = () => {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--bg)] text-[var(--text)]">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#4c1d95] via-[#0f172a] to-black opacity-80" />
      <div className="pointer-events-none absolute -left-40 -top-40 h-[480px] w-[480px] rounded-full bg-[#7c3aed] opacity-25 blur-3xl" />
      <div className="pointer-events-none absolute -right-40 top-20 h-[520px] w-[520px] rounded-full bg-[#22d3ee] opacity-10 blur-3xl" />

      <div className="relative">
        <PublicTopbar />
        <main className="mx-auto w-full max-w-6xl px-4 py-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default PublicLayout;
