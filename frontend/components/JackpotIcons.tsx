import { motion } from 'framer-motion';
import Image from 'next/image';

// Image-based Jackpot Icons with animations
export const EmperorIcon = ({ className = "w-16 h-16" }: { className?: string }) => (
  <motion.div
    className={`relative ${className}`}
    initial={{ scale: 0.8, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    transition={{ type: 'spring', duration: 0.6 }}
  >
    <Image
      src="/images/jackpots/emperor.png"
      alt="Emperor Jackpot"
      fill
      className="object-contain drop-shadow-[0_0_15px_rgba(212,175,55,0.6)]"
    />
  </motion.div>
);

export const GoldIcon = ({ className = "w-16 h-16" }: { className?: string }) => (
  <motion.div
    className={`relative ${className}`}
    initial={{ scale: 0.8, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    transition={{ type: 'spring', duration: 0.6, delay: 0.1 }}
  >
    <Image
      src="/images/jackpots/gold.png"
      alt="Gold Jackpot"
      fill
      className="object-contain drop-shadow-[0_0_12px_rgba(245,158,11,0.5)]"
    />
  </motion.div>
);

export const SilverIcon = ({ className = "w-16 h-16" }: { className?: string }) => (
  <motion.div
    className={`relative ${className}`}
    initial={{ scale: 0.8, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    transition={{ type: 'spring', duration: 0.6, delay: 0.2 }}
  >
    <Image
      src="/images/jackpots/silver.png"
      alt="Silver Jackpot"
      fill
      className="object-contain drop-shadow-[0_0_10px_rgba(192,192,192,0.5)]"
    />
  </motion.div>
);

export const BronzeIcon = ({ className = "w-16 h-16" }: { className?: string }) => (
  <motion.div
    className={`relative ${className}`}
    initial={{ scale: 0.8, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    transition={{ type: 'spring', duration: 0.6, delay: 0.3 }}
  >
    <Image
      src="/images/jackpots/bronze.png"
      alt="Bronze Jackpot"
      fill
      className="object-contain drop-shadow-[0_0_10px_rgba(180,83,9,0.5)]"
    />
  </motion.div>
);

// Export a component that returns the correct icon based on tier
export const JackpotIcon = ({ tier, className = "w-16 h-16" }: { tier: string; className?: string }) => {
  switch (tier) {
    case 'emperor':
      return <EmperorIcon className={className} />;
    case 'gold':
      return <GoldIcon className={className} />;
    case 'silver':
      return <SilverIcon className={className} />;
    case 'bronze':
      return <BronzeIcon className={className} />;
    default:
      return <EmperorIcon className={className} />;
  }
};

export default JackpotIcon;
