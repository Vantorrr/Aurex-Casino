const bcrypt = require('bcryptjs');

// Создаем админского пользователя
const createAdminUser = async () => {
  const hashedPassword = await bcrypt.hash('admin123', 12);
  
  const adminUser = {
    _id: 'admin_001',
    odid: 'AUREX-000001', // ✅ Уникальный ID игрока
    username: 'admin',
    email: 'admin@aurex.io',
    password: hashedPassword,
    balance: 100000, // 100,000 рублей
    bonusBalance: 0,
    currency: 'RUB',
    vipLevel: 5, // Emperor (максимальный VIP)
    vipPoints: 999999, // Максимум очков
    isVerified: true,
    isAdmin: true,
    isActive: true,
    b2b_user_id: 'aurex_admin_001',
    createdAt: new Date(),
    lastLogin: new Date(),
    depositCount: 0,
    usedBonuses: {},
    gameHistory: [],
    transactions: []
  };

  return adminUser;
};

// Создаем тестового пользователя
const createTestUser = async () => {
  const hashedPassword = await bcrypt.hash('test123', 12);
  
  const testUser = {
    _id: 'user_001', 
    odid: 'AUREX-000002', // ✅ Уникальный ID игрока
    username: 'testuser',
    email: 'test@aurex.io',
    password: hashedPassword,
    balance: 50000, // 50,000 рублей
    bonusBalance: 0,
    currency: 'RUB',
    vipLevel: 3, // Gold level
    vipPoints: 15000, // Прогресс к Platinum
    isVerified: true,
    isAdmin: false,
    isActive: true,
    b2b_user_id: 'aurex_user_001',
    createdAt: new Date(),
    lastLogin: new Date(),
    depositCount: 0,
    usedBonuses: {},
    gameHistory: [],
    transactions: []
  };

  return testUser;
};

module.exports = {
  createAdminUser,
  createTestUser
};