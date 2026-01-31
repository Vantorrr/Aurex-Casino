import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Home, Search, ArrowLeft, Gamepad2 } from 'lucide-react';
import Layout from '../components/Layout';
import { useTranslation } from '../hooks/useTranslation';

export default function Custom404() {
  const { t } = useTranslation();

  return (
    <>
      <Head>
        <title>{t('notFound.title')}</title>
        <meta name="description" content={t('notFound.metaDescription')} />
      </Head>

      <Layout>
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="text-center">
            {/* Logo */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-center mb-8"
            >
              <Image
                src="/images/aurexlogo.png"
                alt="AUREX"
                width={120}
                height={45}
                className="h-12 w-auto opacity-50"
              />
            </motion.div>

            {/* 404 Number */}
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="relative mb-8"
            >
              <div className="text-[150px] sm:text-[200px] font-black leading-none" style={{ fontFamily: 'Cinzel, serif' }}>
                <span className="aurex-imperial-text">404</span>
              </div>
              <div className="absolute inset-0 bg-aurex-gold-500/20 blur-3xl -z-10"></div>
            </motion.div>

            {/* Message */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-4">
                {t('notFound.heading')}
              </h1>
              <p className="text-aurex-platinum-400 max-w-md mx-auto mb-8">
                {t('notFound.description')}
              </p>
            </motion.div>

            {/* Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Link
                href="/"
                className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-aurex-gold-500 to-aurex-gold-600 text-aurex-obsidian-900 font-bold rounded-xl hover:shadow-aurex-gold transition-all"
              >
                <Home className="w-5 h-5" />
                <span>{t('notFound.goHome')}</span>
              </Link>
              <Link
                href="/games"
                className="flex items-center space-x-2 px-6 py-3 bg-aurex-obsidian-800 border border-aurex-gold-500/20 text-aurex-platinum-300 font-medium rounded-xl hover:border-aurex-gold-500/50 transition-all"
              >
                <Gamepad2 className="w-5 h-5" />
                <span>{t('notFound.goToGames')}</span>
              </Link>
            </motion.div>

            {/* Popular Links */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="mt-12 pt-8 border-t border-aurex-gold-500/10"
            >
              <p className="text-aurex-platinum-500 text-sm mb-4">{t('notFound.popularPages')}</p>
              <div className="flex flex-wrap justify-center gap-3">
                {[
                  { href: '/promotions', label: t('notFound.promotions') },
                  { href: '/tournaments', label: t('notFound.tournaments') },
                  { href: '/vip', label: t('notFound.vip') },
                  { href: '/wallet', label: t('notFound.wallet') },
                  { href: '/support', label: t('notFound.support') },
                ].map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="px-4 py-2 bg-aurex-obsidian-800/50 border border-aurex-gold-500/10 rounded-lg text-aurex-platinum-400 text-sm hover:border-aurex-gold-500/30 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </Layout>
    </>
  );
}
