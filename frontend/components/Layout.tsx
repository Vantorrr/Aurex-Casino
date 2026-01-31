import { ReactNode } from 'react';
import Header from './Header';
import Footer from './Footer';

interface LayoutProps {
  children: ReactNode;
  className?: string;
  transparentBg?: boolean;
}

export default function Layout({ children, className = '', transparentBg = false }: LayoutProps) {
  return (
    <div className={`min-h-screen ${transparentBg ? 'bg-transparent' : 'bg-dark-300'} ${className}`}>
      <Header />
      <main className="relative">
        {children}
      </main>
      <Footer />
    </div>
  );
}