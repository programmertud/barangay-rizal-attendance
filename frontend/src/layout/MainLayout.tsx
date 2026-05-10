import type { ReactNode } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';

interface MainLayoutProps {
  children: ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  return (
    <div className="flex h-screen bg-[var(--bg)] text-[var(--text)]">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-[var(--surface-2)] p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default MainLayout;