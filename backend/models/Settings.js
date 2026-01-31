const { getDb, generateId } = require('./temp-models');

// Default settings
const defaultSettings = {
  general: {
    siteName: 'AUREX',
    siteUrl: 'https://aurex.io',
    supportEmail: 'support@aurex.io',
    defaultLanguage: 'ru',
    defaultCurrency: 'RUB',
    maintenanceMode: false,
    registrationEnabled: true
  },
  bonuses: {
    welcomeBonus1: 200,
    welcomeBonus2: 150,
    welcomeBonus3: 100,
    welcomeBonus4: 75,
    welcomeWager: 35,
    minDeposit: 10,
    maxBonusAmount: 500,
    freeSpinsWager: 30
  },
  payments: {
    minDeposit: 10,
    maxDeposit: 50000,
    minWithdrawal: 20,
    maxWithdrawal: 10000,
    withdrawalFee: 0,
    cryptoEnabled: true,
    cardsEnabled: true,
    bankTransferEnabled: true
  },
  vip: {
    bronzePoints: 0,
    silverPoints: 1000,
    goldPoints: 5000,
    platinumPoints: 25000,
    emperorPoints: 100000,
    bronzeCashback: 5,
    silverCashback: 7,
    goldCashback: 10,
    platinumCashback: 12,
    emperorCashback: 15
  },
  security: {
    twoFactorRequired: false,
    kycRequired: true,
    kycWithdrawalLimit: 0,
    maxLoginAttempts: 5,
    sessionTimeout: 60,
    ipWhitelist: ''
  }
};

// In-memory settings storage (in production would be MongoDB)
let settingsCache = null;

const Settings = {
  // Get all settings
  async get() {
    const db = getDb();
    
    if (!db.settings) {
      db.settings = { ...defaultSettings, id: 'global', updatedAt: new Date().toISOString() };
    }
    
    return db.settings;
  },

  // Update settings by section
  async updateSection(section, data) {
    const db = getDb();
    
    if (!db.settings) {
      db.settings = { ...defaultSettings, id: 'global', updatedAt: new Date().toISOString() };
    }
    
    if (db.settings[section]) {
      db.settings[section] = { ...db.settings[section], ...data };
      db.settings.updatedAt = new Date().toISOString();
    }
    
    return db.settings;
  },

  // Update all settings at once
  async updateAll(data) {
    const db = getDb();
    
    db.settings = {
      ...defaultSettings,
      ...data,
      id: 'global',
      updatedAt: new Date().toISOString()
    };
    
    return db.settings;
  },

  // Get specific section
  async getSection(section) {
    const settings = await this.get();
    return settings[section] || null;
  },

  // Reset to defaults
  async reset() {
    const db = getDb();
    db.settings = { ...defaultSettings, id: 'global', updatedAt: new Date().toISOString() };
    return db.settings;
  }
};

module.exports = Settings;
