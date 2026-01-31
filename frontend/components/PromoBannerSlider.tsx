import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, 
  ChevronRight, 
  Gift, 
  Crown, 
  Zap, 
  Trophy,
  Sparkles,
  Wallet
} from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';

interface PromoBanner {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  buttonText: string;
  buttonLink: string;
  gradient: string;
  backgroundImage: string;
  icon: React.ReactNode;
  tag?: string;
  tagColor?: string;
}

export default function PromoBannerSlider() {
  const { t } = useTranslation();

  const banners: PromoBanner[] = [
    {
      id: 'welcome',
      title: t('banners.welcome.title'),
      subtitle: t('banners.welcome.subtitle'),
      description: t('banners.welcome.description'),
      buttonText: t('banners.welcome.buttonText'),
      buttonLink: '/promotions',
      gradient: 'from-aurex-gold-600/80 via-amber-500/70 to-orange-500/60',
      backgroundImage: '/images/banners/banner-welcome.jpg',
      icon: <Gift className="w-16 h-16" />,
      tag: t('banners.welcome.tag'),
      tagColor: 'bg-red-500'
    },
    {
      id: 'vip',
      title: t('banners.vip.title'),
      subtitle: t('banners.vip.subtitle'),
      description: t('banners.vip.description'),
      buttonText: t('banners.vip.buttonText'),
      buttonLink: '/vip',
      gradient: 'from-purple-600/80 via-violet-500/70 to-indigo-600/60',
      backgroundImage: '/images/banners/banner-vip.jpg',
      icon: <Crown className="w-16 h-16" />,
      tag: t('banners.vip.tag'),
      tagColor: 'bg-purple-500'
    },
    {
      id: 'crypto',
      title: t('banners.crypto.title'),
      subtitle: t('banners.crypto.subtitle'),
      description: t('banners.crypto.description'),
      buttonText: t('banners.crypto.buttonText'),
      buttonLink: '/wallet',
      gradient: 'from-cyan-500/80 via-blue-500/70 to-indigo-600/60',
      backgroundImage: '/images/banners/banner-crypto.jpg',
      icon: <Wallet className="w-16 h-16" />,
      tag: t('banners.crypto.tag'),
      tagColor: 'bg-cyan-500'
    },
    {
      id: 'tournament',
      title: t('banners.tournament.title'),
      subtitle: t('banners.tournament.subtitle'),
      description: t('banners.tournament.description'),
      buttonText: t('banners.tournament.buttonText'),
      buttonLink: '/tournaments',
      gradient: 'from-aurex-gold-500/80 via-yellow-500/70 to-amber-400/60',
      backgroundImage: '/images/banners/banner-tournament.jpg',
      icon: <Trophy className="w-16 h-16" />,
      tag: t('banners.tournament.tag'),
      tagColor: 'bg-green-500'
    },
    {
      id: 'drops',
      title: t('banners.drops.title'),
      subtitle: t('banners.drops.subtitle'),
      description: t('banners.drops.description'),
      buttonText: t('banners.drops.buttonText'),
      buttonLink: '/games',
      gradient: 'from-rose-500/80 via-pink-500/70 to-fuchsia-600/60',
      backgroundImage: '/images/banners/banner-drops.jpg',
      icon: <Sparkles className="w-16 h-16" />,
      tag: t('banners.drops.tag'),
      tagColor: 'bg-pink-500'
    }
  ];
  const [current, setCurrent] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  useEffect(() => {
    if (!isAutoPlaying) return;
    
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % banners.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [isAutoPlaying]);

  const goTo = (index: number) => {
    setCurrent(index);
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  const prev = () => goTo((current - 1 + banners.length) % banners.length);
  const next = () => goTo((current + 1) % banners.length);

  const banner = banners[current];

  return (
    <section className="py-8 sm:py-12 relative">
      <div className="max-w-7xl mx-auto px-4">
        <div 
          className="relative rounded-2xl sm:rounded-3xl overflow-hidden"
          onMouseEnter={() => setIsAutoPlaying(false)}
          onMouseLeave={() => setIsAutoPlaying(true)}
        >
          {/* Banner */}
          <AnimatePresence mode="wait">
            <motion.div
              key={banner.id}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
              className="relative p-6 sm:p-8 md:p-12 min-h-[280px] sm:min-h-[320px] flex items-center overflow-hidden"
            >
              {/* Background Image */}
              <div className="absolute inset-0">
                <Image
                  src={banner.backgroundImage}
                  alt={banner.title}
                  fill
                  className="object-cover"
                  priority
                />
              </div>
              
              {/* Gradient Overlay */}
              <div className={`absolute inset-0 bg-gradient-to-r ${banner.gradient}`}></div>
              
              {/* Dark overlay for better text readability */}
              <div className="absolute inset-0 bg-black/30"></div>

              {/* Content */}
              <div className="relative z-10 flex flex-col md:flex-row items-center justify-between w-full gap-6">
                <div className="flex-1 text-center md:text-left">
                  {/* Tag */}
                  {banner.tag && (
                    <span className={`inline-block px-3 py-1 ${banner.tagColor} text-white text-xs font-bold rounded-full mb-4 animate-pulse`}>
                      {banner.tag}
                    </span>
                  )}

                  <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white mb-2 drop-shadow-lg">
                    {banner.title}
                  </h2>
                  <div className="text-3xl sm:text-4xl md:text-5xl font-black text-white mb-4 drop-shadow-lg" style={{ fontFamily: 'Cinzel, serif' }}>
                    {banner.subtitle}
                  </div>
                  <p className="text-white/90 text-sm sm:text-base md:text-lg mb-6 max-w-xl">
                    {banner.description}
                  </p>

                  <Link
                    href={banner.buttonLink}
                    className="inline-flex items-center space-x-2 px-6 sm:px-8 py-3 sm:py-4 bg-white text-aurex-obsidian-900 font-bold rounded-xl hover:shadow-2xl hover:scale-105 transition-all duration-300"
                  >
                    <Zap className="w-5 h-5" />
                    <span>{banner.buttonText}</span>
                  </Link>
                </div>

                {/* Icon */}
                <div className="hidden md:flex items-center justify-center w-40 h-40 lg:w-48 lg:h-48 bg-white/20 rounded-2xl backdrop-blur-sm border border-white/30 text-white">
                  {banner.icon}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Navigation Arrows */}
          <button
            onClick={prev}
            className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/60 transition-colors z-20"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={next}
            className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/60 transition-colors z-20"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          {/* Dots */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center space-x-2 z-20">
            {banners.map((_, idx) => (
              <button
                key={idx}
                onClick={() => goTo(idx)}
                className={`transition-all duration-300 ${
                  idx === current
                    ? 'w-8 h-2 bg-white rounded-full'
                    : 'w-2 h-2 bg-white/50 rounded-full hover:bg-white/80'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Mini Promo Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-6">
          {[
            { icon: <Gift className="w-5 h-5" />, text: t('banners.miniCards.firstDeposit'), color: 'text-aurex-gold-500' },
            { icon: <Trophy className="w-5 h-5" />, text: t('banners.miniCards.tournament'), color: 'text-green-500' },
            { icon: <Crown className="w-5 h-5" />, text: t('banners.miniCards.vipCashback'), color: 'text-purple-500' },
            { icon: <Sparkles className="w-5 h-5" />, text: t('banners.miniCards.goldenDrops'), color: 'text-pink-500' },
          ].map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="flex items-center space-x-3 p-3 sm:p-4 bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-xl hover:border-aurex-gold-500/40 transition-colors"
            >
              <div className={item.color}>
                {item.icon}
              </div>
              <span className="text-aurex-platinum-300 text-xs sm:text-sm font-medium">{item.text}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
