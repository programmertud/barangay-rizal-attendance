import { Link } from 'react-router-dom';

const Home: React.FC = () => {
  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-[var(--shadow)]">
        <div className="max-w-2xl space-y-4">
          <h1 className="text-4xl font-bold tracking-tight text-[var(--text)]">BRGY. RIZAL ATTENDANCE SYSTEM</h1>
          <p className="text-[var(--muted)]">
            A simple and modern attendance dashboard for barangay officials. Track daily attendance and generate reports.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/login" className="btn btn-primary">
              Go to Login
            </Link>
            <Link to="/about" className="btn btn-ghost">
              Learn more
            </Link>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow)]">
          <p className="text-sm font-semibold text-[var(--text)]">Fast check-in</p>
          <p className="mt-2 text-sm text-[var(--muted)]">RFID scans automatically create attendance records.</p>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow)]">
          <p className="text-sm font-semibold text-[var(--text)]">Clear status</p>
          <p className="mt-2 text-sm text-[var(--muted)]">Pending during session, Absent only after session ends.</p>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow)]">
          <p className="text-sm font-semibold text-[var(--text)]">Reports</p>
          <p className="mt-2 text-sm text-[var(--muted)]">Export and review attendance summaries quickly.</p>
        </div>
      </section>
    </div>
  );
};

export default Home;
