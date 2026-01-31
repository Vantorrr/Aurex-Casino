import { useState, useEffect } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { 
  Users, 
  Copy, 
  Share2, 
  Gift, 
  TrendingUp, 
  DollarSign,
  CheckCircle,
  Crown,
  Zap,
  Link as LinkIcon,
  MessageCircle,
  Send,
  Twitter,
  Award,
  Percent
} from 'lucide-react';
import Layout from '../components/Layout';
import AuthGuard from '../components/AuthGuard';
import { useAuthStore } from '../store/authStore';
import { useTranslation } from '../hooks/useTranslation';
import toast from 'react-hot-toast';

interface Referral {
  id: string;
  username: string;
  joinedAt: string;
  totalDeposits: number;
  yourEarnings: number;
  status: 'active' | 'inactive';
}

interface ReferralTier {
  level: number;
  name: string;
  requiredReferrals: number;
  commissionPercent: number;
  bonus: number;
}

export default function ReferralPage() {
  const { user, token } = useAuthStore();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'overview' | 'referrals' | 'withdraw'>('overview');
  const [stats, setStats] = useState({
    totalReferrals: 0,
    activeReferrals: 0,
    totalEarnings: 0,
    pendingEarnings: 0,
    availableWithdraw: 0,
    thisMonthEarnings: 0,
    referralCode: '',
    referralLink: '',
  });
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [tiers, setTiers] = useState<ReferralTier[]>([]);

  useEffect(() => {
    fetchReferralData();
    fetchReferralTiers();
  }, []);

  const fetchReferralTiers = async () => {
    try {
      const res = await fetch('/api/config/referral');
      const data = await res.json();
      if (data.success && data.data.tiers) {
        setTiers(data.data.tiers);
      }
    } catch (error) {
      console.error('Failed to fetch referral tiers:', error);
    }
  };

  const fetchReferralData = async () => {
    try {
      // Получаем статистику
      const statsRes = await fetch('/api/referral/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const statsData = await statsRes.json();
      
      if (statsData.success) {
        setStats({
          totalReferrals: statsData.data.totalReferrals || 0,
          activeReferrals: statsData.data.activeReferrals || 0,
          totalEarnings: statsData.data.totalEarnings || 0,
          pendingEarnings: statsData.data.pendingEarnings || 0,
          availableWithdraw: statsData.data.availableWithdraw || 0,
          thisMonthEarnings: statsData.data.thisMonthEarnings || 0,
          referralCode: statsData.data.referralCode || `REF-${user?.odid}`,
          referralLink: statsData.data.referralLink || `https://aurex.io/?ref=${user?.odid}`,
        });
      }

      // Получаем список рефералов
      const listRes = await fetch('/api/referral/list', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const listData = await listRes.json();
      
      if (listData.success) {
        setReferrals(listData.data.map((r: any) => ({
          id: r.odid,
          username: r.username,
          joinedAt: r.registeredAt,
          totalDeposits: r.totalDeposits || 0,
          yourEarnings: r.yourEarnings || 0,
          status: r.isActive ? 'active' : 'inactive',
        })));
      }
    } catch (error) {
      console.error('Failed to fetch referral data:', error);
      // Пустые данные при ошибке
      setStats({
        totalReferrals: 0,
        activeReferrals: 0,
        totalEarnings: 0,
        pendingEarnings: 0,
        availableWithdraw: 0,
        thisMonthEarnings: 0,
        referralCode: '',
        referralLink: '',
      });
      setReferrals([]);
    } finally {
      setLoading(false);
    }
  };

  const referralCode = stats.referralCode || user?.odid || 'AUREX123';
  const referralLink = stats.referralLink || `https://aurex.io/?ref=${referralCode}`;

  // Default tier fallback
  const defaultTier: ReferralTier = {
    level: 1,
    name: 'Bronze',
    requiredReferrals: 0,
    commissionPercent: 20,
    bonus: 0
  };

  // Calculate current and next tier based on API tiers data
  const currentTier = tiers.length > 0 
    ? tiers.reduce((acc, tier) => stats.totalReferrals >= tier.requiredReferrals ? tier : acc, tiers[0])
    : defaultTier;

  const nextTier = tiers.find(t => t.requiredReferrals > stats.totalReferrals);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(t('profile.referralProgram.copied', { label }));
  };

  const shareLinks = [
    { name: 'Telegram', icon: <Send className="w-5 h-5" />, color: 'bg-blue-500', url: `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(t('profile.referralProgram.shareTelegram'))}` },
    { name: 'WhatsApp', icon: <MessageCircle className="w-5 h-5" />, color: 'bg-green-500', url: `https://wa.me/?text=${encodeURIComponent(`${t('profile.referralProgram.shareWhatsApp')} ${referralLink}`)}` },
    { name: 'Twitter', icon: <Twitter className="w-5 h-5" />, color: 'bg-sky-500', url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(`${t('profile.referralProgram.shareTwitter')} ${referralLink}`)}` },
  ];

  return (
    <AuthGuard>
      <Head>
        <title>Реферальная программа - AUREX Partners</title>
        <meta name="description" content="Приглашай друзей в AUREX и зарабатывай до 20% от их депозитов!" />
      </Head>

      <Layout>
        <div className="min-h-screen pt-20 pb-12">
          {/* Hero */}
          <section className="relative overflow-hidden py-12 sm:py-16">
            <div className="absolute inset-0 aurex-backdrop"></div>
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-aurex-gold-500/10 rounded-full blur-3xl"></div>
            
            <div className="relative max-w-7xl mx-auto px-4 text-center">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex justify-center mb-6">
                  <Image
                    src="/images/aurexlogo.png"
                    alt="AUREX"
                    width={100}
                    height={40}
                    className="h-10 w-auto"
                  />
                </div>

                <h1 className="text-3xl sm:text-4xl md:text-5xl font-black mb-4" style={{ fontFamily: 'Cinzel, serif' }}>
                  <span className="aurex-imperial-text">{t('profile.referralProgram.heroTitle')}</span>
                </h1>
                
                <p className="text-xl text-aurex-platinum-300 mb-8 max-w-2xl mx-auto" dangerouslySetInnerHTML={{ __html: t('profile.referralProgram.heroSubtitle', { percent: 20 }) }} />

                {/* Referral Link Box */}
                <div className="max-w-xl mx-auto p-6 bg-aurex-obsidian-800 border border-aurex-gold-500/30 rounded-2xl">
                  <div className="text-sm text-aurex-platinum-400 mb-2">{t('profile.referralProgram.yourReferralLink')}</div>
                  <div className="flex gap-2">
                    <div className="flex-1 px-4 py-3 bg-aurex-obsidian-900 rounded-xl text-aurex-gold-500 font-mono text-sm truncate">
                      {referralLink}
                    </div>
                    <button
                      onClick={() => copyToClipboard(referralLink, t('profile.referralProgram.yourReferralLink'))}
                      className="px-4 py-3 bg-aurex-gold-500 text-aurex-obsidian-900 rounded-xl font-bold hover:shadow-aurex-gold transition-all flex items-center space-x-2"
                    >
                      <Copy className="w-5 h-5" />
                      <span className="hidden sm:inline">{t('profile.referralProgram.copy')}</span>
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-center gap-4 mt-4">
                    <span className="text-sm text-aurex-platinum-500">{t('profile.referralProgram.share')}</span>
                    {shareLinks.map((link) => (
                      <a
                        key={link.name}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`p-2 ${link.color} text-white rounded-lg hover:opacity-80 transition-opacity`}
                        title={link.name}
                      >
                        {link.icon}
                      </a>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          </section>

          <div className="max-w-7xl mx-auto px-4">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl text-white"
              >
                <Users className="w-8 h-8 mb-3 opacity-80" />
                <div className="text-3xl font-black">{stats.totalReferrals}</div>
                <div className="text-sm opacity-80">{t('profile.referralProgram.totalReferrals')}</div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="p-5 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl text-white"
              >
                <DollarSign className="w-8 h-8 mb-3 opacity-80" />
                <div className="text-3xl font-black">₽{stats.totalEarnings}</div>
                <div className="text-sm opacity-80">{t('profile.referralProgram.totalEarnings')}</div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="p-5 bg-gradient-to-br from-aurex-gold-500 to-amber-600 rounded-2xl text-aurex-obsidian-900"
              >
                <TrendingUp className="w-8 h-8 mb-3 opacity-80" />
                <div className="text-3xl font-black">₽{stats.thisMonthEarnings}</div>
                <div className="text-sm opacity-80">{t('profile.referralProgram.thisMonth')}</div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="p-5 bg-gradient-to-br from-purple-500 to-violet-600 rounded-2xl text-white"
              >
                <Gift className="w-8 h-8 mb-3 opacity-80" />
                <div className="text-3xl font-black">₽{stats.availableWithdraw}</div>
                <div className="text-sm opacity-80">Доступно к выводу</div>
              </motion.div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 overflow-x-auto">
              {[
                { id: 'overview', label: t('profile.referralProgram.tabOverview'), icon: <Zap className="w-4 h-4" /> },
                { id: 'referrals', label: t('profile.referralProgram.tabReferrals'), icon: <Users className="w-4 h-4" /> },
                { id: 'withdraw', label: t('profile.referralProgram.tabWithdraw'), icon: <DollarSign className="w-4 h-4" /> },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-medium whitespace-nowrap transition-all ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-aurex-gold-500 to-aurex-gold-600 text-aurex-obsidian-900'
                      : 'bg-aurex-obsidian-800 text-aurex-platinum-300 border border-aurex-gold-500/20 hover:border-aurex-gold-500/50'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
              {/* Main Content */}
              <div className="lg:col-span-2">
                {activeTab === 'overview' && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                  >
                    {/* Current Tier */}
                    <div className="bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-2xl p-6">
                      <h2 className="text-xl font-bold text-white mb-4">{t('profile.referralProgram.yourPartnerLevel')}</h2>
                      
                      <div className="flex items-center space-x-4 mb-6">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-aurex-gold-500 to-amber-600 flex items-center justify-center">
                          <Award className="w-8 h-8 text-aurex-obsidian-900" />
                        </div>
                        <div>
                          <div className="text-2xl font-black text-aurex-gold-500">{t('profile.referralProgram.level', { level: currentTier.level })}</div>
                          <div className="text-aurex-platinum-400">{t('profile.referralProgram.commission', { percent: currentTier.commissionPercent })}</div>
                        </div>
                      </div>

                      {nextTier && (
                        <div className="mb-4">
                          <div className="flex justify-between text-sm mb-2">
                            <span className="text-aurex-platinum-400">{t('profile.referralProgram.toNextLevel', { level: nextTier.level })}</span>
                            <span className="text-white">{t('profile.referralProgram.referrals', { current: stats.totalReferrals, required: nextTier.requiredReferrals })}</span>
                          </div>
                          <div className="h-3 bg-aurex-obsidian-700 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-aurex-gold-500 to-aurex-gold-400 rounded-full"
                              style={{ width: `${(stats.totalReferrals / nextTier.requiredReferrals) * 100}%` }}
                            />
                          </div>
                          <div className="text-xs text-aurex-platinum-500 mt-2">
                            {t('profile.referralProgram.nextLevelBonus', { percent: nextTier.commissionPercent - currentTier.commissionPercent, bonus: nextTier.bonus.toLocaleString('ru-RU') })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* How it works */}
                    <div className="bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-2xl p-6">
                      <h2 className="text-xl font-bold text-white mb-6">{t('profile.referralProgram.howItWorks')}</h2>
                      
                      <div className="space-y-6">
                        <div className="flex items-start space-x-4">
                          <div className="w-10 h-10 rounded-full bg-aurex-gold-500/20 flex items-center justify-center text-aurex-gold-500 font-bold flex-shrink-0">1</div>
                          <div>
                            <div className="text-white font-medium">{t('profile.referralProgram.step1Title')}</div>
                            <div className="text-sm text-aurex-platinum-400">{t('profile.referralProgram.step1Desc')}</div>
                          </div>
                        </div>
                        
                        <div className="flex items-start space-x-4">
                          <div className="w-10 h-10 rounded-full bg-aurex-gold-500/20 flex items-center justify-center text-aurex-gold-500 font-bold flex-shrink-0">2</div>
                          <div>
                            <div className="text-white font-medium">{t('profile.referralProgram.step2Title')}</div>
                            <div className="text-sm text-aurex-platinum-400">{t('profile.referralProgram.step2Desc')}</div>
                          </div>
                        </div>
                        
                        <div className="flex items-start space-x-4">
                          <div className="w-10 h-10 rounded-full bg-aurex-gold-500/20 flex items-center justify-center text-aurex-gold-500 font-bold flex-shrink-0">3</div>
                          <div>
                            <div className="text-white font-medium">{t('profile.referralProgram.step3Title')}</div>
                            <div className="text-sm text-aurex-platinum-400">{t('profile.referralProgram.step3Desc')}</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Commission Tiers */}
                    <div className="bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-2xl p-6">
                      <h2 className="text-xl font-bold text-white mb-4">{t('profile.referralProgram.commissionTiers')}</h2>
                      
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-aurex-gold-500/20">
                              <th className="text-left py-3 text-aurex-platinum-500 text-sm">{t('profile.referralProgram.tierLevel')}</th>
                              <th className="text-center py-3 text-aurex-platinum-500 text-sm">{t('profile.referralProgram.tierReferrals')}</th>
                              <th className="text-center py-3 text-aurex-platinum-500 text-sm">{t('profile.referralProgram.tierCommission')}</th>
                              <th className="text-right py-3 text-aurex-platinum-500 text-sm">{t('profile.referralProgram.tierBonus')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {tiers.map((tier) => (
                              <tr 
                                key={tier.level} 
                                className={`border-b border-aurex-gold-500/10 ${currentTier.level === tier.level ? 'bg-aurex-gold-500/10' : ''}`}
                              >
                                <td className="py-3">
                                  <div className="flex items-center space-x-2">
                                    {currentTier.level === tier.level && <Crown className="w-4 h-4 text-aurex-gold-500" />}
                                    <span className="text-white font-medium">{t('profile.referralProgram.level', { level: tier.level })}</span>
                                  </div>
                                </td>
                                <td className="text-center py-3 text-aurex-platinum-300">{tier.requiredReferrals}+</td>
                                <td className="text-center py-3 text-aurex-gold-500 font-bold">{tier.commissionPercent}%</td>
                                <td className="text-right py-3 text-white">₽{tier.bonus.toLocaleString('ru-RU')}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'referrals' && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-2xl overflow-hidden"
                  >
                    <div className="p-6 border-b border-aurex-gold-500/20">
                      <h2 className="text-xl font-bold text-white">{t('profile.referralProgram.myReferrals')}</h2>
                    </div>
                    
                    {referrals.length === 0 ? (
                      <div className="p-12 text-center">
                        <Users className="w-12 h-12 mx-auto mb-4 text-aurex-platinum-600" />
                        <p className="text-aurex-platinum-400">{t('profile.referralProgram.noReferrals')}</p>
                        <p className="text-sm text-aurex-platinum-500 mt-2">{t('profile.referralProgram.noReferralsDesc')}</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-aurex-gold-500/10">
                        {referrals.map((ref) => (
                          <div key={ref.id} className="p-4 hover:bg-aurex-obsidian-700/50 transition-colors">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                  ref.status === 'active' ? 'bg-green-500/20' : 'bg-gray-500/20'
                                }`}>
                                  <Users className={`w-5 h-5 ${ref.status === 'active' ? 'text-green-500' : 'text-gray-500'}`} />
                                </div>
                                <div>
                                  <div className="text-white font-medium">{ref.username}</div>
                                  <div className="text-xs text-aurex-platinum-500">
                                    {t('profile.referralProgram.joinedAt', { date: new Date(ref.joinedAt).toLocaleDateString() })}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-aurex-gold-500 font-bold">+₽{ref.yourEarnings}</div>
                                <div className="text-xs text-aurex-platinum-500">
                                  {t('profile.referralProgram.deposits', { amount: ref.totalDeposits })}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}

                {activeTab === 'withdraw' && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-2xl p-6"
                  >
                    <h2 className="text-xl font-bold text-white mb-6">{t('profile.referralProgram.withdrawCommission')}</h2>
                    
                    <div className="p-4 bg-aurex-obsidian-900/50 rounded-xl mb-6">
                      <div className="text-sm text-aurex-platinum-400 mb-1">{t('profile.referralProgram.availableToWithdrawLabel')}</div>
                      <div className="text-4xl font-black text-aurex-gold-500">₽{stats.availableWithdraw}</div>
                    </div>

                    <div className="space-y-4 mb-6">
                      <div className="flex justify-between py-2 border-b border-aurex-gold-500/10">
                        <span className="text-aurex-platinum-400">{t('profile.referralProgram.minWithdraw')}</span>
                        <span className="text-white">₽50</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-aurex-gold-500/10">
                        <span className="text-aurex-platinum-400">{t('profile.referralProgram.pendingAccrual')}</span>
                        <span className="text-yellow-400">₽{stats.pendingEarnings}</span>
                      </div>
                      <div className="flex justify-between py-2">
                        <span className="text-aurex-platinum-400">{t('profile.referralProgram.withdrawMethod')}</span>
                        <span className="text-white">{t('profile.referralProgram.withdrawMethodValue')}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <button className="py-4 bg-gradient-to-r from-aurex-gold-500 to-aurex-gold-600 text-aurex-obsidian-900 font-bold rounded-xl hover:shadow-aurex-gold transition-all">
                        {t('profile.referralProgram.toMainBalance')}
                      </button>
                      <button className="py-4 bg-aurex-obsidian-700 text-aurex-platinum-300 font-bold rounded-xl border border-aurex-gold-500/20 hover:border-aurex-gold-500/50 transition-all">
                        {t('profile.referralProgram.toCrypto')}
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Referral Code */}
                <div className="bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-white mb-4">{t('profile.referralProgram.yourCode')}</h3>
                  <div 
                    onClick={() => copyToClipboard(referralCode, t('profile.referralProgram.yourCode'))}
                    className="p-4 bg-aurex-obsidian-900 rounded-xl text-center cursor-pointer hover:bg-aurex-obsidian-700 transition-colors"
                  >
                    <div className="text-3xl font-black text-aurex-gold-500 tracking-wider mb-2">
                      {referralCode}
                    </div>
                    <div className="text-xs text-aurex-platinum-500 flex items-center justify-center space-x-1">
                      <Copy className="w-3 h-3" />
                      <span>{t('profile.referralProgram.clickToCopy')}</span>
                    </div>
                  </div>
                </div>

                {/* Benefits */}
                <div className="bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-white mb-4">{t('profile.referralProgram.benefits')}</h3>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span className="text-aurex-platinum-300 text-sm">{t('profile.referralProgram.benefit1')}</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span className="text-aurex-platinum-300 text-sm">{t('profile.referralProgram.benefit2')}</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span className="text-aurex-platinum-300 text-sm">{t('profile.referralProgram.benefit3')}</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span className="text-aurex-platinum-300 text-sm">{t('profile.referralProgram.benefit4')}</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span className="text-aurex-platinum-300 text-sm">{t('profile.referralProgram.benefit5')}</span>
                    </div>
                  </div>
                </div>

                {/* Friend Bonus */}
                <div className="bg-gradient-to-br from-aurex-gold-500/20 to-purple-500/20 border border-aurex-gold-500/30 rounded-2xl p-6">
                  <Gift className="w-8 h-8 text-aurex-gold-500 mb-3" />
                  <h3 className="text-lg font-bold text-white mb-2">{t('profile.referralProgram.friendBonus')}</h3>
                  <p className="text-sm text-aurex-platinum-400" dangerouslySetInnerHTML={{ __html: t('profile.referralProgram.friendBonusDesc') }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </AuthGuard>
  );
}
