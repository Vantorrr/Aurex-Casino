import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

interface SplashScreenProps {
  onComplete: () => void;
  minDuration?: number;
}

export default function SplashScreen({ onComplete, minDuration = 3500 }: SplashScreenProps) {
  const [currentMessage, setCurrentMessage] = useState(0);
  const [isExiting, setIsExiting] = useState(false);
  const [progress, setProgress] = useState(0);

  // Изящные сообщения загрузки (минимализм)
  const loadingMessages = [
    'Preparing your experience...',
    'Loading premium games...',
    'Almost ready...',
  ];

  useEffect(() => {
    // Плавный прогресс
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) return 100;
        return prev + 1;
      });
    }, minDuration / 100);

    // Меняем сообщения каждые ~1.2 сек
    const messageInterval = setInterval(() => {
      setCurrentMessage(prev => (prev + 1) % loadingMessages.length);
    }, 1200);

    // Завершение
    const exitTimeout = setTimeout(() => {
      setIsExiting(true);
      setTimeout(onComplete, 800);
    }, minDuration);

    return () => {
      clearInterval(progressInterval);
      clearInterval(messageInterval);
      clearTimeout(exitTimeout);
    };
  }, [minDuration, onComplete]);

  return (
    <AnimatePresence>
      {!isExiting && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: 'easeInOut' }}
          className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-black"
        >
          {/* Центральное золотое свечение */}
          <motion.div
            className="absolute w-[600px] h-[600px] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(212, 175, 55, 0.15) 0%, rgba(212, 175, 55, 0.05) 40%, transparent 70%)',
            }}
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.5, 0.8, 0.5],
            }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          />

          {/* Тонкие золотые частицы */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {Array.from({ length: 30 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 rounded-full bg-aurex-gold-500"
                style={{
                  left: `${10 + Math.random() * 80}%`,
                  top: `${Math.random() * 100}%`,
                }}
                animate={{
                  y: [0, -100],
                  opacity: [0, 0.6, 0],
                  scale: [0, 1, 0],
                }}
                transition={{
                  duration: 4 + Math.random() * 3,
                  repeat: Infinity,
                  delay: Math.random() * 5,
                  ease: 'easeOut',
                }}
              />
            ))}
          </div>

          {/* Основной контент */}
          <div className="relative z-10 flex flex-col items-center px-4">
            
            {/* Логотип AUREX */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="relative mb-16"
            >
              {/* Мягкое свечение под логотипом */}
              <div 
                className="absolute inset-0 blur-3xl opacity-40"
                style={{
                  background: 'radial-gradient(ellipse, rgba(212, 175, 55, 0.5) 0%, transparent 70%)',
                  transform: 'scale(1.5) translateY(20px)',
                }}
              />
              
              <Image
                src="/images/aurexlogo.png"
                alt="AUREX"
                width={320}
                height={110}
                className="relative z-10"
                priority
              />
            </motion.div>

            {/* Прогресс бар — тонкий и элегантный */}
            <motion.div
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              className="w-64 sm:w-80 mb-8"
            >
              <div className="h-[2px] rounded-full overflow-hidden bg-white/10">
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    background: 'linear-gradient(90deg, #D4AF37, #F5D77A, #D4AF37)',
                    backgroundSize: '200% 100%',
                  }}
                  animate={{ 
                    backgroundPosition: ['0% 0%', '100% 0%', '0% 0%'],
                  }}
                  transition={{ 
                    backgroundPosition: { duration: 2, repeat: Infinity, ease: 'linear' },
                  }}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </motion.div>

            {/* Сообщение загрузки — минималистичное */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="text-center h-8"
            >
              <AnimatePresence mode="wait">
                <motion.p
                  key={currentMessage}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.4 }}
                  className="text-sm tracking-widest text-aurex-platinum-400 uppercase"
                >
                  {loadingMessages[currentMessage]}
                </motion.p>
              </AnimatePresence>
            </motion.div>

            {/* Процент */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              transition={{ delay: 1 }}
              className="mt-4"
            >
              <span className="text-xs font-mono text-aurex-platinum-500">
                {progress}%
              </span>
            </motion.div>
          </div>

          {/* Нижний копирайт */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            transition={{ delay: 1.5 }}
            className="absolute bottom-8 left-0 right-0 text-center"
          >
            <p className="text-xs tracking-wider text-aurex-platinum-600">
              THE GOLDEN EMPIRE OF WIN
            </p>
          </motion.div>

          {/* Тонкая золотая линия сверху */}
          <motion.div
            className="absolute top-0 left-0 right-0 h-[1px]"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.5), transparent)',
            }}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.3, duration: 1 }}
          />

          {/* Тонкая золотая линия снизу */}
          <motion.div
            className="absolute bottom-0 left-0 right-0 h-[1px]"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.5), transparent)',
            }}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.3, duration: 1 }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
