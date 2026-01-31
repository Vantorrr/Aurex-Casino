import { motion } from 'framer-motion';
import Image from 'next/image';

interface VIPIconProps {
  level: number;
  className?: string;
}

export const VIPIcon = ({ level, className = '' }: VIPIconProps) => {
  const getIconPath = () => {
    switch (level) {
      case 1:
        return '/images/vip/vip-bronze.png';
      case 2:
        return '/images/vip/vip-silver.png';
      case 3:
        return '/images/vip/vip-gold.png';
      case 4:
        return '/images/vip/vip-platinum.png';
      case 5:
        return '/images/vip/vip-emperor.png';
      default:
        return '/images/vip/vip-bronze.png';
    }
  };

  return (
    <motion.div
      className={`relative ${className}`}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.1 }}
      transition={{ duration: 0.3 }}
    >
      <Image
        src={getIconPath()}
        alt={`VIP Level ${level}`}
        width={120}
        height={120}
        className="w-full h-full object-contain drop-shadow-2xl"
      />
    </motion.div>
  );
};
