import Head from 'next/head';
import { motion } from 'framer-motion';
import { Shield, Lock, Eye, Database, Globe, Mail } from 'lucide-react';
import Layout from '../components/Layout';

export default function PrivacyPage() {
  return (
    <>
      <Head>
        <title>Политика конфиденциальности - AUREX</title>
        <meta name="description" content="Политика конфиденциальности платформы AUREX" />
      </Head>

      <Layout>
        <div className="min-h-screen pt-20 pb-12">
          <div className="max-w-4xl mx-auto px-4">
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-12"
            >
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 rounded-2xl bg-aurex-gold-500/20 flex items-center justify-center">
                  <Shield className="w-8 h-8 text-aurex-gold-500" />
                </div>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-white mb-4">Политика конфиденциальности</h1>
              <p className="text-aurex-platinum-400">Последнее обновление: {new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </motion.div>

            {/* Content */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-2xl p-6 sm:p-8 space-y-8"
            >
              <section>
                <h2 className="text-xl font-bold text-aurex-gold-500 mb-4 flex items-center space-x-2">
                  <Database className="w-5 h-5" />
                  <span>1. Сбор информации</span>
                </h2>
                <div className="text-aurex-platinum-300 space-y-3">
                  <p>Мы собираем следующие типы информации:</p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Персональные данные: имя, email, номер телефона, дата рождения</li>
                    <li>Документы для верификации: паспорт, подтверждение адреса</li>
                    <li>Финансовые данные: история транзакций, платёжные методы</li>
                    <li>Техническая информация: IP-адрес, тип устройства, браузер</li>
                    <li>Игровая активность: история игр, ставок и выигрышей</li>
                  </ul>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-bold text-aurex-gold-500 mb-4 flex items-center space-x-2">
                  <Eye className="w-5 h-5" />
                  <span>2. Использование данных</span>
                </h2>
                <div className="text-aurex-platinum-300 space-y-3">
                  <p>Мы используем вашу информацию для:</p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Предоставления доступа к сервисам платформы</li>
                    <li>Обработки депозитов и выводов</li>
                    <li>Верификации личности (KYC) и предотвращения мошенничества</li>
                    <li>Персонализации игрового опыта</li>
                    <li>Отправки уведомлений об акциях (с вашего согласия)</li>
                    <li>Соблюдения законодательных требований</li>
                  </ul>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-bold text-aurex-gold-500 mb-4 flex items-center space-x-2">
                  <Lock className="w-5 h-5" />
                  <span>3. Защита данных</span>
                </h2>
                <div className="text-aurex-platinum-300 space-y-3">
                  <p>Мы применяем передовые меры безопасности:</p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>256-битное SSL шифрование для всех соединений</li>
                    <li>Хранение данных на защищённых серверах</li>
                    <li>Регулярные аудиты безопасности</li>
                    <li>Двухфакторная аутентификация (2FA)</li>
                    <li>Ограниченный доступ сотрудников к персональным данным</li>
                  </ul>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-bold text-aurex-gold-500 mb-4 flex items-center space-x-2">
                  <Globe className="w-5 h-5" />
                  <span>4. Передача третьим лицам</span>
                </h2>
                <div className="text-aurex-platinum-300 space-y-3">
                  <p>Мы можем передавать данные:</p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Платёжным провайдерам для обработки транзакций</li>
                    <li>Игровым провайдерам для работы игр</li>
                    <li>Регулирующим органам по законному требованию</li>
                    <li>Аудиторам для проверки честности игр</li>
                  </ul>
                  <p className="mt-4">Мы не продаём ваши персональные данные третьим лицам.</p>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-bold text-aurex-gold-500 mb-4">5. Ваши права</h2>
                <div className="text-aurex-platinum-300 space-y-3">
                  <p>В соответствии с GDPR, вы имеете право:</p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Получить доступ к своим персональным данным</li>
                    <li>Исправить неточные данные</li>
                    <li>Удалить свои данные (право на забвение)</li>
                    <li>Ограничить обработку данных</li>
                    <li>Отозвать согласие на обработку</li>
                    <li>Перенести данные на другую платформу</li>
                  </ul>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-bold text-aurex-gold-500 mb-4">6. Cookies</h2>
                <div className="text-aurex-platinum-300 space-y-3">
                  <p>Мы используем cookies для:</p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Поддержания сессии авторизации</li>
                    <li>Запоминания предпочтений</li>
                    <li>Аналитики и улучшения сервиса</li>
                  </ul>
                  <p className="mt-4">Вы можете отключить cookies в настройках браузера.</p>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-bold text-aurex-gold-500 mb-4">7. Хранение данных</h2>
                <div className="text-aurex-platinum-300 space-y-3">
                  <p>Мы храним ваши данные в течение:</p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Период активности аккаунта + 5 лет после закрытия</li>
                    <li>Финансовые данные: минимум 7 лет (законодательные требования)</li>
                    <li>Логи: 12 месяцев</li>
                  </ul>
                </div>
              </section>

              <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                <div className="flex items-start space-x-3">
                  <Mail className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-white font-medium mb-1">Вопросы о конфиденциальности?</div>
                    <p className="text-sm text-aurex-platinum-400">
                      Свяжитесь с нашим DPO (Data Protection Officer): <a href="mailto:privacy@aurex.io" className="text-blue-400 hover:underline">privacy@aurex.io</a>
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </Layout>
    </>
  );
}
