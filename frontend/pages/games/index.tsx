import { useState, useMemo, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Filter, 
  Grid3X3, 
  List, 
  SlidersHorizontal,
  TrendingUp,
  Star,
  Clock,
  X,
  Play,
  Flame,
  Gamepad2,
  Trophy,
  Zap,
  ChevronRight
} from 'lucide-react';
import Layout from '../../components/Layout';
import AuthGuard from '../../components/AuthGuard';
import GameCard from '../../components/GameCard';
import GameModal from '../../components/GameModal';
import PromoBannerSlider from '../../components/PromoBannerSlider';
import { useGamesQuery } from '../../hooks/useGames';
import { useTranslation } from '../../hooks/useTranslation';

import CategoryCard from '../../components/CategoryCard';
import { toast } from 'react-hot-toast';

const categories = [
  { id: 'all', nameKey: 'games.allGames', icon: Grid3X3 },
  { id: 'slots', nameKey: 'games.slots', icon: Gamepad2 },
  { id: 'live', nameKey: 'games.liveCasino', icon: Zap },
  { id: 'new', nameKey: 'games.new', icon: Clock },
  { id: 'popular', nameKey: 'games.popular', icon: Flame },
  { id: 'jackpot', nameKey: 'games.jackpot', icon: Trophy },
  { id: 'table', nameKey: 'games.table', icon: List },
];

const sortOptions = [
  { id: 'popularity', name: 'По популярности', icon: TrendingUp },
  { id: 'newest', name: 'Сначала новые', icon: Clock },
  { id: 'rating', name: 'По рейтингу', icon: Star },
  { id: 'name', name: 'По алфавиту', icon: List },
];

export default function GamesPage() {
  const { t } = useTranslation();
  const { data: gamesData, isLoading } = useGamesQuery();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedProviders, setSelectedProviders] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('popularity');
  const [showFilters, setShowFilters] = useState(false);
  const [providers, setProviders] = useState<string[]>([]);
  
  // Fetch providers from API
  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const res = await fetch('/api/config/providers');
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          const providerNames = data.data.map((p: any) => 
            typeof p === 'string' ? p : p.name
          );
          setProviders(providerNames);
        }
      } catch (error) {
        console.error('Failed to fetch providers:', error);
      }
    };
    fetchProviders();
  }, []);
  
  // Game Modal state
  const [selectedGame, setSelectedGame] = useState<any>(null);
  const [gameMode, setGameMode] = useState<'demo' | 'real'>('demo');
  const [isGameModalOpen, setIsGameModalOpen] = useState(false);

  // Game handlers
  const handleGamePlay = (gameData: any) => {
    setSelectedGame(gameData);
    setGameMode(gameData.mode || 'demo');
    setIsGameModalOpen(true);
  };

  const handleGameModalClose = () => {
    setIsGameModalOpen(false);
    setSelectedGame(null);
  };

  const handleGameModeChange = (mode: 'demo' | 'real') => {
    setGameMode(mode);
  };

  // Extract games from API response
  const allGames = useMemo(() => {
    if (!gamesData?.data?.games) {
      return [];
    }
    return gamesData.data.games;
  }, [gamesData]);

  // Filter and sort games
  const filteredGames = useMemo(() => {
    let filtered = [...allGames];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(game => 
        game.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Category filter
    if (selectedCategory !== 'all') {
      // Basic category filtering logic
      if (selectedCategory === 'new') filtered = filtered.filter(g => g.isNew);
      else if (selectedCategory === 'popular') filtered = filtered.filter(g => g.isHot || (g.popularity || 0) > 80);
      else if (selectedCategory === 'jackpot') filtered = filtered.filter(g => g.jackpot);
      // For 'slots', 'live', 'table' - we would need actual category data from API
      // For now, assume 'slots' is default if not specified, 'live' has 'live' in provider or name
      else if (selectedCategory === 'live') filtered = filtered.filter(g => g.provider?.toLowerCase().includes('evolution') || g.provider?.toLowerCase().includes('live'));
    }

    // Provider filter
    if (selectedProviders.length > 0) {
      filtered = filtered.filter(game => 
        selectedProviders.includes(game.provider)
      );
    }

    // Sort games
    switch (sortBy) {
      case 'name':
        filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        break;
      case 'popularity':
        filtered.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
        break;
      case 'rating':
        filtered.sort((a, b) => (b.rtp || 96) - (a.rtp || 96));
        break;
      case 'newest':
        // Assuming higher ID or isNew flag implies newer
        filtered.sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0));
        break;
    }

    return filtered;
  }, [allGames, searchTerm, selectedCategory, selectedProviders, sortBy]);

  const handleProviderToggle = (provider: string) => {
    setSelectedProviders(prev => 
      prev.includes(provider) 
        ? prev.filter(p => p !== provider)
        : [...prev, provider]
    );
  };

  // Section Data (Mocking sections from allGames)
  const popularGames = useMemo(() => allGames.filter(g => g.isHot || (g.popularity || 0) > 85).slice(0, 10), [allGames]);
  const newGames = useMemo(() => allGames.filter(g => g.isNew).slice(0, 10), [allGames]);
  const liveGames = useMemo(() => allGames.filter(g => g.provider?.toLowerCase().includes('evolution') || g.provider?.toLowerCase().includes('live')).slice(0, 10), [allGames]);

  const handleSportClick = (e: React.MouseEvent) => {
    e.preventDefault();
    toast.error('Раздел "Спорт" находится в разработке. Скоро открытие!', {
      style: {
        background: '#1F2937',
        color: '#fff',
        border: '1px solid #D4AF37',
      },
      icon: '🚧',
    });
  };

  return (
    <AuthGuard>
      <Head>
        <title>Игры - AUREX Casino</title>
      </Head>
      <Layout>
        <div className="bg-aurex-obsidian-900 min-h-screen pb-20">
          
          {/* 1. Promo Slider (Hero) */}
          <div className="pt-20">
            <PromoBannerSlider />
          </div>

          <div className="max-w-7xl mx-auto px-4">

            {/* NEW: Dragon Money Style Category Cards (Only on 'all' tab) */}
            {!searchTerm && selectedCategory === 'all' && selectedProviders.length === 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 -mt-4">
                {/* SLOTS */}
                <CategoryCard
                  title="Слоты"
                  onlineCount={1420}
                  href="#"
                  onClick={(e) => { e.preventDefault(); setSelectedCategory('slots'); }}
                  gradient="bg-gradient-to-br from-indigo-600 to-blue-900"
                  buttonText="Играть"
                />
                
                {/* SPORT */}
                <CategoryCard
                  title="Sport"
                  onlineCount={312}
                  href="/sport"
                  gradient="bg-gradient-to-br from-red-600 to-rose-900"
                  buttonText="Ставки"
                  isSport={true}
                  onClick={handleSportClick}
                />

                {/* LIVE */}
                <CategoryCard
                  title="Live Games"
                  onlineCount={850}
                  href="#"
                  onClick={(e) => { e.preventDefault(); setSelectedCategory('live'); }}
                  gradient="bg-gradient-to-br from-emerald-600 to-teal-900"
                  buttonText="Live Дилеры"
                />
              </div>
            )}
            
            {/* 2. Category Navigation (Dragon Style Tabs) */}
            <div className="sticky top-20 z-30 bg-aurex-obsidian-900/95 backdrop-blur-md py-4 border-b border-white/5 mb-8 -mx-4 px-4 md:mx-0 md:px-0 md:rounded-xl md:border md:top-24">
              <div className="flex items-center justify-between gap-4 overflow-x-auto scrollbar-hide pb-2 md:pb-0">
                <div className="flex gap-2">
                  {categories.map(cat => {
                    const Icon = cat.icon;
                    const isActive = selectedCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition-all duration-300 ${
                          isActive 
                            ? 'bg-aurex-gold-500 text-aurex-obsidian-900 shadow-lg shadow-aurex-gold-500/20 scale-105' 
                            : 'bg-aurex-obsidian-800 text-aurex-platinum-400 hover:bg-aurex-obsidian-700 hover:text-white'
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${isActive ? 'text-aurex-obsidian-900' : 'text-aurex-gold-500'}`} />
                        {t(cat.nameKey)}
                      </button>
                    );
                  })}
                </div>

                {/* Search & Filter Toggles */}
                <div className="flex items-center gap-2 pl-4 border-l border-white/10">
                  <div className="relative hidden md:block">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                      type="text" 
                      placeholder="Поиск игры..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="bg-aurex-obsidian-800 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:border-aurex-gold-500/50 focus:outline-none w-48 lg:w-64 transition-all"
                    />
                  </div>
                  <button 
                    onClick={() => setShowFilters(!showFilters)}
                    className={`p-2.5 rounded-lg border border-white/10 transition-colors ${showFilters ? 'bg-aurex-gold-500 text-black' : 'bg-aurex-obsidian-800 text-gray-400 hover:text-white'}`}
                  >
                    <SlidersHorizontal className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Mobile Search (visible only on mobile) */}
              <div className="mt-4 md:hidden relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Поиск игры..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-aurex-obsidian-800 border border-white/10 rounded-lg pl-9 pr-4 py-3 text-sm text-white focus:border-aurex-gold-500/50 focus:outline-none"
                />
              </div>

              {/* Expanded Filters */}
              <AnimatePresence>
                {showFilters && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-4 mt-4 border-t border-white/10">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div>
                          <h4 className="text-white font-bold mb-3 text-sm">Сортировка</h4>
                          <div className="space-y-2">
                            {sortOptions.map(opt => (
                              <button
                                key={opt.id}
                                onClick={() => setSortBy(opt.id)}
                                className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition-colors ${sortBy === opt.id ? 'bg-white/10 text-aurex-gold-500' : 'text-gray-400 hover:text-white'}`}
                              >
                                <opt.icon className="w-4 h-4" />
                                {opt.name}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="md:col-span-3">
                          <h4 className="text-white font-bold mb-3 text-sm">Провайдеры</h4>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 max-h-40 overflow-y-auto custom-scrollbar pr-2">
                            {providers.map(p => (
                              <button
                                key={p}
                                onClick={() => handleProviderToggle(p)}
                                className={`px-3 py-2 rounded-lg text-xs text-left truncate transition-colors ${selectedProviders.includes(p) ? 'bg-aurex-gold-500 text-black font-bold' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}`}
                              >
                                {p}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* 3. Game Sections (Dragon Style) */}
            
            {/* Only show sections if NO search/filter is active (Default View) */}
            {!searchTerm && selectedCategory === 'all' && selectedProviders.length === 0 ? (
              <div className="space-y-12">
                
                {/* Popular Section */}
                <section>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-orange-500/20 rounded-lg text-orange-500">
                        <Flame className="w-6 h-6" />
                      </div>
                      <h2 className="text-2xl font-bold text-white">Популярные</h2>
                    </div>
                    <button onClick={() => setSelectedCategory('popular')} className="text-sm text-aurex-platinum-400 hover:text-white flex items-center gap-1 transition-colors">
                      Все <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {popularGames.map((game, i) => (
                      <GameCard key={game.id || i} game={game} onPlay={handleGamePlay} />
                    ))}
                  </div>
                </section>

                {/* New Games Section */}
                <section>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-green-500/20 rounded-lg text-green-500">
                        <Clock className="w-6 h-6" />
                      </div>
                      <h2 className="text-2xl font-bold text-white">Новинки</h2>
                    </div>
                    <button onClick={() => setSelectedCategory('new')} className="text-sm text-aurex-platinum-400 hover:text-white flex items-center gap-1 transition-colors">
                      Все <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {newGames.map((game, i) => (
                      <GameCard key={game.id || i} game={game} onPlay={handleGamePlay} />
                    ))}
                  </div>
                </section>

                {/* Live Casino Section */}
                {liveGames.length > 0 && (
                  <section>
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-purple-500/20 rounded-lg text-purple-500">
                          <Zap className="w-6 h-6" />
                        </div>
                        <h2 className="text-2xl font-bold text-white">Live Casino</h2>
                      </div>
                      <button onClick={() => setSelectedCategory('live')} className="text-sm text-aurex-platinum-400 hover:text-white flex items-center gap-1 transition-colors">
                        Все <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                      {liveGames.map((game, i) => (
                        <GameCard key={game.id || i} game={game} onPlay={handleGamePlay} />
                      ))}
                    </div>
                  </section>
                )}

                {/* All Games Grid (Infinite Scroll style) */}
                <section>
                  <div className="flex items-center gap-2 mb-6">
                    <div className="p-2 bg-aurex-gold-500/20 rounded-lg text-aurex-gold-500">
                      <Grid3X3 className="w-6 h-6" />
                    </div>
                    <h2 className="text-2xl font-bold text-white">Все игры</h2>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {allGames.slice(0, 20).map((game, i) => (
                      <GameCard key={game.id || i} game={game} onPlay={handleGamePlay} />
                    ))}
                  </div>
                  <div className="mt-8 text-center">
                    <button 
                      onClick={() => setSelectedCategory('all')}
                      className="px-8 py-3 bg-aurex-obsidian-800 border border-white/10 rounded-xl text-white font-bold hover:bg-aurex-obsidian-700 hover:border-aurex-gold-500/50 transition-all"
                    >
                      Показать больше игр
                    </button>
                  </div>
                </section>

              </div>
            ) : (
              /* Filtered Results View */
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white">
                    Результаты поиска <span className="text-aurex-platinum-400 text-lg font-normal ml-2">({filteredGames.length})</span>
                  </h2>
                </div>
                
                {filteredGames.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {filteredGames.map((game, i) => (
                      <GameCard key={game.id || i} game={game} onPlay={handleGamePlay} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-20 bg-aurex-obsidian-800/50 rounded-2xl border border-white/5">
                    <Search className="w-16 h-16 text-aurex-platinum-600 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-white mb-2">Игры не найдены</h3>
                    <p className="text-aurex-platinum-400">Попробуйте изменить параметры поиска</p>
                    <button 
                      onClick={() => { setSearchTerm(''); setSelectedCategory('all'); setSelectedProviders([]); }}
                      className="mt-6 px-6 py-2 bg-aurex-gold-500 text-black rounded-lg font-bold hover:bg-aurex-gold-400 transition-colors"
                    >
                      Сбросить фильтры
                    </button>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </Layout>
      
      {/* Game Modal */}
      <GameModal
        isOpen={isGameModalOpen}
        onClose={handleGameModalClose}
        game={selectedGame}
        mode={gameMode}
        onModeChange={handleGameModeChange}
      />
    </AuthGuard>
  );
}