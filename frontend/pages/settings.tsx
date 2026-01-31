import Head from 'next/head';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  Settings,
  Globe,
  Moon,
  Sun,
  Volume2,
  VolumeX,
  Bell,
  BellOff,
  Eye,
  EyeOff,
  Palette,
  Languages,
  DollarSign,
  Shield,
  Smartphone,
  Monitor,
  Save,
  ChevronRight,
  Check,
  RefreshCw
} from 'lucide-react';
import Layout from '../components/Layout';
import AuthGuard from '../components/AuthGuard';
import { useAuthStore } from '../store/authStore';
import { 
  useSettingsStore, 
  Language, 
  Currency, 
  languageNames, 
  currencySymbols, 
  currencyNames 
} from '../store/settingsStore';
import { useTranslation } from '../hooks/useTranslation';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  
  const {
    language,
    currency,
    theme,
    soundEnabled,
    musicEnabled,
    notificationsEnabled,
    emailNotifications,
    pushNotifications,
    hideBalance,
    compactMode,
    animationsEnabled,
    setLanguage,
    setCurrency,
    setTheme,
    toggleSound,
    toggleMusic,
    toggleNotifications,
    toggleEmailNotifications,
    togglePushNotifications,
    toggleHideBalance,
    toggleCompactMode,
    toggleAnimations,
  } = useSettingsStore();

  const languages: { code: Language; name: string; flag: string }[] = [
    { code: 'ru', name: 'Русский', flag: '🇷🇺' },
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'pt', name: 'Português', flag: '🇧🇷' },
  ];

  const currencies: { code: Currency; symbol: string; name: string }[] = [
    { code: 'RUB', symbol: '₽', name: 'Российский рубль' },
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'BTC', symbol: '₿', name: 'Bitcoin' },
    { code: 'USDT', symbol: '₮', name: 'Tether' },
  ];

  const handleSave = () => {
    toast.success(t('settings.saved'));
  };

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    toast.success(`${t('settings.language')}: ${languageNames[lang].name}`);
  };

  const handleCurrencyChange = (curr: Currency) => {
    setCurrency(curr);
    toast.success(`${t('settings.currency')}: ${currencyNames[curr]}`);
  };

  const Toggle = ({ enabled, onChange, label }: { enabled: boolean; onChange: () => void; label: string }) => (
    <button
      onClick={onChange}
      className={`relative w-14 h-7 rounded-full transition-colors ${
        enabled ? 'bg-aurex-gold-500' : 'bg-aurex-obsidian-600'
      }`}
    >
      <div className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform ${
        enabled ? 'left-8' : 'left-1'
      }`} />
    </button>
  );

  return (
    <AuthGuard>
      <Head>
        <title>{t('settings.title')} - AUREX</title>
        <meta name="description" content="Настройки аккаунта AUREX" />
      </Head>

      <Layout>
        <div className="min-h-screen pt-20 pb-12">
          <div className="max-w-4xl mx-auto px-4">
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <h1 className="text-3xl font-black text-white mb-2">{t('settings.title')}</h1>
              <p className="text-aurex-platinum-400">{t('settings.subtitle')}</p>
            </motion.div>

            <div className="space-y-6">
              {/* Language & Currency */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-2xl p-6"
              >
                <h2 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
                  <Globe className="w-5 h-5 text-aurex-gold-500" />
                  <span>{t('settings.language')} & {t('settings.currency')}</span>
                </h2>

                <div className="grid sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm text-aurex-platinum-400 mb-3">{t('settings.language')}</label>
                    <div className="space-y-2">
                      {languages.map((lang) => (
                        <button
                          key={lang.code}
                          onClick={() => handleLanguageChange(lang.code)}
                          className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${
                            language === lang.code
                              ? 'bg-aurex-gold-500/20 border border-aurex-gold-500'
                              : 'bg-aurex-obsidian-900/50 border border-transparent hover:border-aurex-gold-500/30'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <span className="text-xl">{lang.flag}</span>
                            <span className="text-white">{lang.name}</span>
                          </div>
                          {language === lang.code && (
                            <Check className="w-5 h-5 text-aurex-gold-500" />
                          )}
                        </button>
                      ))}
                    </div>
                    <p className="mt-3 text-xs text-aurex-platinum-500 flex items-center">
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Интерфейс обновится автоматически
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm text-aurex-platinum-400 mb-3">{t('settings.currency')}</label>
                    <div className="space-y-2">
                      {currencies.map((curr) => (
                        <button
                          key={curr.code}
                          onClick={() => handleCurrencyChange(curr.code)}
                          className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${
                            currency === curr.code
                              ? 'bg-aurex-gold-500/20 border border-aurex-gold-500'
                              : 'bg-aurex-obsidian-900/50 border border-transparent hover:border-aurex-gold-500/30'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <span className="text-aurex-gold-500 font-bold text-lg w-6">{curr.symbol}</span>
                            <span className="text-white">{curr.name}</span>
                          </div>
                          {currency === curr.code && (
                            <Check className="w-5 h-5 text-aurex-gold-500" />
                          )}
                        </button>
                      ))}
                    </div>
                    <p className="mt-3 text-xs text-aurex-platinum-500 flex items-center">
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Все суммы будут конвертированы
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Display */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-2xl p-6"
              >
                <h2 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
                  <Palette className="w-5 h-5 text-aurex-gold-500" />
                  <span>Отображение</span>
                </h2>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-aurex-obsidian-900/50 rounded-xl">
                    <div className="flex items-center space-x-3">
                      {hideBalance ? <EyeOff className="w-5 h-5 text-aurex-platinum-500" /> : <Eye className="w-5 h-5 text-aurex-gold-500" />}
                      <div>
                        <div className="text-white font-medium">{t('settings.hideBalance')}</div>
                        <div className="text-sm text-aurex-platinum-500">Баланс будет скрыт звёздочками</div>
                      </div>
                    </div>
                    <Toggle
                      enabled={hideBalance}
                      onChange={toggleHideBalance}
                      label="Скрыть баланс"
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-aurex-obsidian-900/50 rounded-xl">
                    <div className="flex items-center space-x-3">
                      <Monitor className="w-5 h-5 text-aurex-gold-500" />
                      <div>
                        <div className="text-white font-medium">{t('settings.compactMode')}</div>
                        <div className="text-sm text-aurex-platinum-500">Меньше отступов, больше контента</div>
                      </div>
                    </div>
                    <Toggle
                      enabled={compactMode}
                      onChange={toggleCompactMode}
                      label="Компактный режим"
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-aurex-obsidian-900/50 rounded-xl">
                    <div className="flex items-center space-x-3">
                      <Palette className="w-5 h-5 text-aurex-gold-500" />
                      <div>
                        <div className="text-white font-medium">{t('settings.animations')}</div>
                        <div className="text-sm text-aurex-platinum-500">Плавные переходы и эффекты</div>
                      </div>
                    </div>
                    <Toggle
                      enabled={animationsEnabled}
                      onChange={toggleAnimations}
                      label="Анимации"
                    />
                  </div>
                </div>
              </motion.div>

              {/* Sound */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-2xl p-6"
              >
                <h2 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
                  <Volume2 className="w-5 h-5 text-aurex-gold-500" />
                  <span>Звук</span>
                </h2>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-aurex-obsidian-900/50 rounded-xl">
                    <div className="flex items-center space-x-3">
                      {soundEnabled ? <Volume2 className="w-5 h-5 text-aurex-gold-500" /> : <VolumeX className="w-5 h-5 text-aurex-platinum-500" />}
                      <div>
                        <div className="text-white font-medium">{t('settings.sound')}</div>
                        <div className="text-sm text-aurex-platinum-500">Звуки в играх и интерфейсе</div>
                      </div>
                    </div>
                    <Toggle
                      enabled={soundEnabled}
                      onChange={toggleSound}
                      label="Звуковые эффекты"
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-aurex-obsidian-900/50 rounded-xl">
                    <div className="flex items-center space-x-3">
                      <Volume2 className="w-5 h-5 text-aurex-gold-500" />
                      <div>
                        <div className="text-white font-medium">{t('settings.music')}</div>
                        <div className="text-sm text-aurex-platinum-500">Музыка в лобби и играх</div>
                      </div>
                    </div>
                    <Toggle
                      enabled={musicEnabled}
                      onChange={toggleMusic}
                      label="Фоновая музыка"
                    />
                  </div>
                </div>
              </motion.div>

              {/* Notifications */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-2xl p-6"
              >
                <h2 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
                  <Bell className="w-5 h-5 text-aurex-gold-500" />
                  <span>{t('settings.notifications')}</span>
                </h2>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-aurex-obsidian-900/50 rounded-xl">
                    <div className="flex items-center space-x-3">
                      {notificationsEnabled ? <Bell className="w-5 h-5 text-aurex-gold-500" /> : <BellOff className="w-5 h-5 text-aurex-platinum-500" />}
                      <div>
                        <div className="text-white font-medium">Все уведомления</div>
                        <div className="text-sm text-aurex-platinum-500">Главный переключатель</div>
                      </div>
                    </div>
                    <Toggle
                      enabled={notificationsEnabled}
                      onChange={toggleNotifications}
                      label="Все уведомления"
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-aurex-obsidian-900/50 rounded-xl">
                    <div className="flex items-center space-x-3">
                      <Smartphone className="w-5 h-5 text-aurex-gold-500" />
                      <div>
                        <div className="text-white font-medium">{t('settings.pushNotifications')}</div>
                        <div className="text-sm text-aurex-platinum-500">Уведомления в браузере</div>
                      </div>
                    </div>
                    <Toggle
                      enabled={pushNotifications}
                      onChange={togglePushNotifications}
                      label="Push-уведомления"
                    />
                  </div>
                </div>
              </motion.div>

              {/* Quick Links */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-2xl overflow-hidden"
              >
                <Link href="/profile" className="flex items-center justify-between p-4 hover:bg-aurex-obsidian-700 transition-colors border-b border-aurex-gold-500/10">
                  <div className="flex items-center space-x-3">
                    <Shield className="w-5 h-5 text-aurex-gold-500" />
                    <span className="text-white">Безопасность аккаунта</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-aurex-platinum-500" />
                </Link>
                <Link href="/responsible-gaming" className="flex items-center justify-between p-4 hover:bg-aurex-obsidian-700 transition-colors border-b border-aurex-gold-500/10">
                  <div className="flex items-center space-x-3">
                    <Shield className="w-5 h-5 text-aurex-gold-500" />
                    <span className="text-white">{t('footer.responsibleGaming')}</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-aurex-platinum-500" />
                </Link>
                <Link href="/verification" className="flex items-center justify-between p-4 hover:bg-aurex-obsidian-700 transition-colors">
                  <div className="flex items-center space-x-3">
                    <Shield className="w-5 h-5 text-aurex-gold-500" />
                    <span className="text-white">{t('footer.verification')}</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-aurex-platinum-500" />
                </Link>
              </motion.div>

              {/* Save Button */}
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                onClick={handleSave}
                className="w-full py-4 bg-gradient-to-r from-aurex-gold-500 to-aurex-gold-600 text-aurex-obsidian-900 font-bold rounded-xl flex items-center justify-center space-x-2 hover:shadow-aurex-gold transition-all"
              >
                <Save className="w-5 h-5" />
                <span>{t('settings.saveSettings')}</span>
              </motion.button>
            </div>
          </div>
        </div>
      </Layout>
    </AuthGuard>
  );
}
