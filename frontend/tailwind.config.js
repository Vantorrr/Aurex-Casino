/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // AUREX Premium Color Palette
        aurex: {
          // Черный обсидиан
          obsidian: {
            900: '#0A0A0A',
            800: '#121212',
            700: '#1A1A1A',
            600: '#252525',
            500: '#2F2F2F',
          },
          // Теплое золото (главный акцент)
          gold: {
            50: '#FFF9E6',
            100: '#FFF3CC',
            200: '#FFE799',
            300: '#FFDB66',
            400: '#FFCF33',
            500: '#D4AF37',  // Теплое золото
            600: '#B8941F',
            700: '#9C7A14',
            800: '#80600C',
            900: '#644608',
          },
          // Платиновый отблеск
          platinum: {
            100: '#F5F5F5',
            200: '#E5E5E5',
            300: '#D4D4D4',
            400: '#A3A3A3',
            500: '#737373',
            600: '#525252',
          },
          // Дополнительные акценты для крипто
          crypto: {
            bitcoin: '#F7931A',
            ethereum: '#627EEA',
            usdt: '#26A17B',
            premium: '#FFD700',
          },
          // Статусные цвета для VIP
          status: {
            bronze: '#CD7F32',
            silver: '#C0C0C0',
            gold: '#D4AF37',
            platinum: '#E5E4E2',
            diamond: '#B9F2FF',
            black: '#1A1A1A',
          }
        },
        // Legacy поддержка старых цветов
        casino: {
          gold: '#D4AF37',
          'gold-dark': '#B8941F',
          purple: '#6B46C1',
          'purple-dark': '#553C9A',
          green: '#10B981',
          'green-dark': '#059669',
          red: '#EF4444',
          'red-dark': '#DC2626',
        },
        dark: {
          100: '#1A1A1A',
          200: '#121212',
          300: '#0A0A0A',
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        // AUREX Premium Gradients
        'aurex-gold': 'linear-gradient(135deg, #D4AF37 0%, #FFD700 50%, #B8941F 100%)',
        'aurex-obsidian': 'linear-gradient(135deg, #0A0A0A 0%, #1A1A1A 50%, #121212 100%)',
        'aurex-platinum': 'linear-gradient(135deg, #E5E5E5 0%, #F5F5F5 50%, #D4D4D4 100%)',
        'aurex-empire': 'linear-gradient(135deg, #0A0A0A 0%, #D4AF37 50%, #0A0A0A 100%)',
        'aurex-vip': 'linear-gradient(to right, #D4AF37, #FFD700, #E5E4E2)',
        'aurex-black-card': 'linear-gradient(135deg, #000000 0%, #1A1A1A 50%, #D4AF37 100%)',
        // Legacy
        'casino-gold': 'linear-gradient(135deg, #FFD700 0%, #B8860B 100%)',
        'casino-purple': 'linear-gradient(135deg, #6B46C1 0%, #553C9A 100%)',
        'casino-dark': 'linear-gradient(135deg, #1a1a1a 0%, #0f0f0f 100%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'slide-down': 'slideDown 0.5s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out',
        'bounce-slow': 'bounce 2s infinite',
        'pulse-slow': 'pulse 3s infinite',
        'spin-slow': 'spin 3s linear infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px #FFD700, 0 0 10px #FFD700, 0 0 15px #FFD700' },
          '100%': { boxShadow: '0 0 10px #FFD700, 0 0 20px #FFD700, 0 0 30px #FFD700' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        heading: ['Poppins', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'casino': '0 4px 20px rgba(255, 215, 0, 0.3)',
        'casino-lg': '0 8px 40px rgba(255, 215, 0, 0.4)',
        'neon-purple': '0 0 20px rgba(107, 70, 193, 0.5)',
        'neon-green': '0 0 20px rgba(16, 185, 129, 0.5)',
        // AUREX Premium Shadows
        'aurex-gold': '0 4px 24px rgba(212, 175, 55, 0.4)',
        'aurex-gold-lg': '0 8px 48px rgba(212, 175, 55, 0.5)',
        'aurex-platinum': '0 4px 20px rgba(229, 229, 229, 0.2)',
        'aurex-obsidian': '0 10px 40px rgba(10, 10, 10, 0.9)',
        'aurex-glow': '0 0 30px rgba(212, 175, 55, 0.6), 0 0 60px rgba(212, 175, 55, 0.4)',
        'aurex-inner': 'inset 0 2px 8px rgba(212, 175, 55, 0.3)',
      },
    },
  },
  plugins: [],
};