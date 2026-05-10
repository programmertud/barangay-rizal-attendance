import type { ReactNode } from 'react';

interface CardProps {
  title: string;
  children: ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ title, children, className = '' }) => {
  return (
    <div className={`bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-[var(--shadow)] p-6 transition-all hover:shadow-[var(--shadow-soft)] ${className}`}>
      <h3 className="text-lg font-semibold text-[var(--text)] mb-4">{title}</h3>
      {children}
    </div>
  );
};

export default Card;