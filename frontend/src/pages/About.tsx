const About: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-[var(--shadow)]">
        <h1 className="text-3xl font-bold text-[var(--text)]">About</h1>
        <p className="mt-3 text-sm text-[var(--muted)]">
          This system is built for BRGY. RIZAL to manage attendance of barangay officials. It supports RFID-based scanning,
          morning/afternoon sessions, and reporting.
        </p>
      </div>

      <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-[var(--shadow)]">
        <h2 className="text-lg font-semibold text-[var(--text)]">Privacy & Data</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Official photos are stored as small compressed images inside Firestore documents (profile-size only) to simplify
          deployment.
        </p>
      </div>
    </div>
  );
};

export default About;
