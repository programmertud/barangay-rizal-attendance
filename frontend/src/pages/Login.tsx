import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../services/firebase';

interface LoginProps {
  onLogin: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await signInWithEmailAndPassword(auth, email, password);
      onLogin();
    } catch (err: any) {
      console.error('Firebase sign-in error', err);
      const message = err?.code ? `${err.code.replace('auth/', '')}` : 'Invalid credentials';
      setError(message);
    }
  };

  return (
    <div className="flex justify-center px-4">
      <div className="w-full max-w-md py-6">
        <div className="rounded-3xl border border-[var(--border)] bg-[rgba(15, 23, 42, 0.85)] px-10 py-10 shadow-[var(--shadow)] backdrop-blur-md">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white">Barangay Attendance</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">Sign in to manage attendance records</p>
          </div>

          <form className="mt-10 space-y-6" onSubmit={handleLogin}>
            <div className="space-y-4">
              <label className="ui-label">Email address</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="ui-input bg-black/20"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-4">
              <label className="ui-label">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="ui-input"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <button
              type="submit"
              className="btn btn-primary w-full py-3"
            >
              Sign in
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;