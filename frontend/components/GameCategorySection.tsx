import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';

interface GameCategorySectionProps {
  title: string;
  onlineCount: number;
  href: string;
  gradient?: string;
  backgroundImage?: string;
  gameImages?: string[];
  buttonText?: string;
  onClick?: (e: React.MouseEvent) => void;
}

export default function GameCategorySection({
  title,
  onlineCount,
  href,
  gradient,
  backgroundImage,
  gameImages = [],
  buttonText = 'Играть',
  onClick
}: GameCategorySectionProps) {
  // Dynamic online counter
  const [currentOnline, setCurrentOnline] = useState(onlineCount);

  useEffect(() => {
    const interval = setInterval(() => {
      // Random fluctuation ±3-8 players
      const change = Math.floor(Math.random() * 12) - 5;
      setCurrentOnline(prev => Math.max(1700, Math.min(1850, prev + change)));
    }, 1000);

    return () => clearInterval(interval);
  }, []);
  return (
    <div 
      className={`relative overflow-hidden rounded-2xl ${!backgroundImage ? gradient : ''} border border-white/5 shadow-2xl cursor-pointer transition-transform hover:scale-[1.01] duration-300`}
      onClick={onClick}
      style={backgroundImage ? {
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      } : undefined}
    >
      {/* Dark Overlay for better text readability */}
      {backgroundImage && (
        <div className="absolute inset-0 bg-black/50"></div>
      )}
      
      {/* Content */}
      <div className="relative z-10 p-4 md:p-8 min-h-[280px] md:min-h-[350px] flex flex-col items-center justify-center">
        
        {/* Play Button (GOLD) - Absolute positioned top-right */}
        <button
          onClick={onClick}
          className="absolute top-4 right-4 md:top-8 md:right-8 bg-gradient-to-r from-aurex-gold-500 to-aurex-gold-600 hover:from-aurex-gold-400 hover:to-aurex-gold-500 text-aurex-obsidian-900 font-black px-4 py-2 md:px-8 md:py-4 rounded-lg md:rounded-xl flex items-center gap-2 md:gap-3 transition-all shadow-xl shadow-aurex-gold-500/30 hover:shadow-2xl hover:shadow-aurex-gold-500/50 hover:scale-105 text-sm md:text-base"
        >
          <span className="md:text-lg">{buttonText}</span>
          <ArrowRight className="w-4 h-4 md:w-6 md:h-6" />
        </button>

        {/* Title & Online - Top left */}
        <div className="absolute top-4 left-4 md:top-8 md:left-8">
          <h3 className="text-2xl md:text-4xl font-black text-white mb-2 md:mb-3 tracking-tight drop-shadow-lg">
            {title}
          </h3>
          <div className="flex items-center gap-2 bg-black/50 backdrop-blur-sm px-2 py-1 md:px-3 md:py-1.5 rounded-full w-fit border border-white/20">
            <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,1)]"></div>
            <span className="text-xs md:text-sm font-bold text-green-400">{currentOnline} игроков</span>
          </div>
        </div>

        {/* Game Images Row (Center) */}
        {gameImages.length > 0 && (
          <div className="flex justify-center items-center gap-2 md:gap-5 overflow-x-auto scrollbar-hide max-w-full px-2">
            {gameImages.map((img, idx) => (
              <div 
                key={idx}
                className="relative w-24 h-32 md:w-40 md:h-52 flex-shrink-0 rounded-lg md:rounded-xl overflow-hidden border-2 border-white/30 shadow-2xl transition-all duration-300 hover:scale-110 hover:border-aurex-gold-500 hover:shadow-aurex-gold-500/30"
                onClick={(e) => e.stopPropagation()}
              >
                <Image
                  src={img}
                  alt={`Game ${idx + 1}`}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
