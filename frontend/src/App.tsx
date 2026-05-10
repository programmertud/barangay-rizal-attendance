import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './services/firebase';
import MainLayout from './layout/MainLayout';
import PublicLayout from './layout/PublicLayout';
import Login from './pages/Login';
import Home from './pages/Home';
import About from './pages/About';
import Dashboard from './pages/Dashboard';
import Officials from './pages/Officials';
import Attendance from './pages/Attendance';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import BHW from './pages/BHW';
import Tanod from './pages/Tanod';
import Today from './pages/Today';

function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  return (
    <Router>
      <div className="App">
        {user ? (
          <MainLayout>
            <Routes>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/today" element={<Today />} />
              <Route path="/officials" element={<Officials />} />
              <Route path="/bhw" element={<BHW />} />
              <Route path="/tanod" element={<Tanod />} />
              <Route path="/attendance" element={<Attendance />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </MainLayout>
        ) : (
          <Routes>
            <Route element={<PublicLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/about" element={<About />} />
              <Route path="/login" element={<Login onLogin={() => {}} />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        )}
      </div>
    </Router>
  );
}

export default App;
