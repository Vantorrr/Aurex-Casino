import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Play } from 'lucide-react';
import { motion } from 'framer-motion';

interface CategoryCardProps {
  title: string;
  onlineCount: number;
  href: string;
  gradient: string;
  image?: string;
  buttonText?: string;
  isSport?: boolean;
  onClick?: (e: React.MouseEvent) => void;
}

export default function CategoryCard({
  title,
  onlineCount,
  href,
  gradient,
  image,
  buttonText = 'Играть',
  isSport = false,
  onClick
}: CategoryCardProps) {
  return (
    <Link href={href} onClick={onClick} className="block h-full">
      <motion.div 
        whileHover={{ y: -5 }}
        className={`relative overflow-hidden rounded-3xl ${gradient} border border-white/10 shadow-2xl group h-[240px] md:h-[280px] flex flex-col cursor-pointer`}
      >
        {/* Noise & Overlay */}
        <div className="absolute inset-0 bg-[url('/images/noise.png')] opacity-20 mix-blend-overlay pointer-events-none"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none"></div>
        
        {/* Content */}
        <div className="relative z-10 p-6 flex flex-col h-full justify-between">
          
          {/* Header */}
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-2xl md:text-3xl font-black text-white mb-2 tracking-tight drop-shadow-md uppercase italic" style={{ fontFamily: 'Cinzel, serif' }}>
                {title}
              </h3>
              <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full w-fit border border-white/10">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.8)]"></div>
                <span className="text-xs font-bold text-green-400 font-mono">{onlineCount.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Main Image/Character Placeholder */}
          {/* В будущем сюда можно вставить реальные картинки персонажей */}
          <div className={`absolute right-0 bottom-0 h-full w-1/2 transition-transform duration-500 group-hover:scale-110 opacity-80 group-hover:opacity-100`}>
             {/* Placeholder gradient shape if no image */}
             <div className="w-full h-full bg-gradient-to-t from-black/50 to-transparent"></div>
          </div>

          {/* Sport Live Widget (Decoration) */}
          {isSport && (
             <div className="absolute right-4 top-16 bg-black/60 backdrop-blur-md rounded-lg p-3 border border-white/10 transform rotate-3 group-hover:rotate-0 transition-transform">
                <div className="flex items-center justify-between gap-4 text-xs text-gray-300 mb-1">
                   <span>⚽️ LIVE</span>
                   <span className="text-red-500 animate-pulse">●</span>
                </div>
                <div className="text-white font-bold text-sm">
                   Real Madrid <span className="text-aurex-gold-500 mx-1">2:1</span> Barcelona
                </div>
             </div>
          )}

          {/* Button */}
          <div className="mt-auto">
            <button className="bg-white/10 backdrop-blur-md hover:bg-white/20 text-white border border-white/20 font-bold px-6 py-3 rounded-xl transition-all flex items-center gap-2 group-hover:bg-aurex-gold-500 group-hover:text-black group-hover:border-aurex-gold-500">
              {buttonText} <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      </motion.div>
    </Link>
  );
}
