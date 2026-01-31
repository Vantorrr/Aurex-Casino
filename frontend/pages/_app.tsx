import type { AppProps } from 'next/app';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';
import { Inter, Poppins } from 'next/font/google';
import Head from 'next/head';
import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
// import GoldenDrops from '../components/GoldenDrops'; // Временно отключен
import LiveChatWidget from '../components/LiveChatWidget';
import SplashScreen from '../components/SplashScreen';
import '../styles/globals.css';

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter'
});

const poppins = Poppins({ 
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-poppins'
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App({ Component, pageProps }: AppProps) {
  const { initializeAuth } = useAuthStore();
  const [showSplash, setShowSplash] = useState(true);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    initializeAuth();
    
    // Check if splash was already shown in this session
    const splashShown = sessionStorage.getItem('aurex_splash_shown');
    if (splashShown) {
      setShowSplash(false);
    }
  }, [initializeAuth]);

  const handleSplashComplete = () => {
    sessionStorage.setItem('aurex_splash_shown', 'true');
    setShowSplash(false);
  };

  return (
    <>
      {/* Premium Splash Screen - only on first visit per session */}
      {isClient && showSplash && (
        <SplashScreen onComplete={handleSplashComplete} minDuration={3500} />
      )}
      
      <Head>
        <title>AUREX - The Golden Empire of Win</title>
        
        {/* Cinzel Font for Premium Typography */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
        <meta name="description" content="AUREX - премиальная крипто-казино платформа для High-roller и Crypto-investors. Мгновенные крипто-выплаты, VIP программа, эксклюзивные игры." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        
        {/* Favicon */}
        <link rel="icon" type="image/png" href="/favicon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/favicon.png" />
        
        {/* SEO */}
        <meta name="keywords" content="crypto casino, premium casino, slots, bitcoin casino, high-roller, VIP casino, AUREX" />
        <meta name="robots" content="index, follow" />
        <meta name="theme-color" content="#0A0A0A" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://aurex.io/" />
        <meta property="og:title" content="AUREX - The Golden Empire of Win" />
        <meta property="og:description" content="Премиальная крипто-казино платформа для High-roller и Crypto-investors. Мгновенные выплаты, VIP программа, эксклюзивные игры." />
        <meta property="og:image" content="/images/og-image.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content="https://aurex.io/" />
        <meta name="twitter:title" content="AUREX - The Golden Empire of Win" />
        <meta name="twitter:description" content="Премиальная крипто-казино платформа. Мгновенные крипто-выплаты, VIP программа." />
        <meta name="twitter:image" content="/images/og-image.png" />
      </Head>
      
      <QueryClientProvider client={queryClient}>
        <div className={`${inter.variable} ${poppins.variable} font-sans`}>
          <Component {...pageProps} />
          {/* <GoldenDrops /> */}
          <LiveChatWidget />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#0A0A0A',
                color: '#fff',
                border: '1px solid #D4AF37',
                borderRadius: '8px',
              },
              success: {
                iconTheme: {
                  primary: '#10B981',
                  secondary: '#fff',
                },
              },
              error: {
                iconTheme: {
                  primary: '#EF4444',
                  secondary: '#fff',
                },
              },
            }}
          />
        </div>
      </QueryClientProvider>
    </>
  );
}