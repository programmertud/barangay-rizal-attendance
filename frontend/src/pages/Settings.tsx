import Card from '../components/Card';

const Settings: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-[var(--text)]">Settings</h1>
        <p className="text-sm text-[var(--muted)]">Manage system preferences</p>
      </div>

      <Card title="Appearance">
        <p className="text-sm text-[var(--muted)]">Use the toggle in the top bar to switch between Light and Dark mode.</p>
      </Card>

      <Card title="About">
        <p className="text-sm text-[var(--muted)]">BRGY. RIZAL ATTENDANCE SYSTEM</p>
      </Card>
    </div>
  );
};

export default Settings;
