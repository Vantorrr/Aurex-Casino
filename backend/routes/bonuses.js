const express = require('express');
const { User } = require('../models/temp-models');
const { auth, adminAuth } = require('../middleware/auth');
const router = express.Router();

// In-memory storage for user bonuses
global.tempUserBonuses = global.tempUserBonuses || [];

// Bonus configurations - все бонусы системы
const BONUS_CONFIG = {
  // Приветственные бонусы (по депозитам)
  'first-deposit': {
    id: 'first-deposit',
    type: 'deposit',
    name: '1-й Депозит',
    description: 'Бонус 200% на первый депозит',
    percent: 200,
    maxBonus: 50000,
    minDeposit: 500,
    wagering: 35,
    validDays: 7,
    depositNumber: 1,
    freespins: 100
  },
  'second-deposit': {
    id: 'second-deposit',
    type: 'deposit',
    name: '2-й Депозит',
    description: 'Бонус 150% на второй депозит',
    percent: 150,
    maxBonus: 40000,
    minDeposit: 500,
    wagering: 35,
    validDays: 7,
    depositNumber: 2,
    freespins: 75
  },
  'third-deposit': {
    id: 'third-deposit',
    type: 'deposit',
    name: '3-й Депозит',
    description: 'Бонус 100% на третий депозит',
    percent: 100,
    maxBonus: 30000,
    minDeposit: 500,
    wagering: 30,
    validDays: 7,
    depositNumber: 3,
    freespins: 50
  },
  'fourth-deposit': {
    id: 'fourth-deposit',
    type: 'deposit',
    name: '4-й Депозит',
    description: 'Бонус 75% на четвёртый депозит',
    percent: 75,
    maxBonus: 20000,
    minDeposit: 500,
    wagering: 30,
    validDays: 7,
    depositNumber: 4,
    freespins: 25
  },
  // Reload бонусы
  'reload-weekend': {
    id: 'reload-weekend',
    type: 'reload',
    name: 'Weekend Reload',
    description: 'Бонус 50% на пополнение в выходные',
    percent: 50,
    maxBonus: 25000,
    minDeposit: 1000,
    wagering: 25,
    validDays: 3,
    recurring: true,
    daysOfWeek: [5, 6, 0] // Fri, Sat, Sun
  },
  'reload-monday': {
    id: 'reload-monday',
    type: 'reload',
    name: 'Monday Boost',
    description: 'Бонус 30% на пополнение в понедельник',
    percent: 30,
    maxBonus: 15000,
    minDeposit: 500,
    wagering: 20,
    validDays: 1,
    recurring: true,
    daysOfWeek: [1] // Monday
  },
  // VIP бонусы
  'vip-birthday': {
    id: 'vip-birthday',
    type: 'vip',
    name: 'Birthday Bonus',
    description: 'Особый бонус в день рождения',
    minAmount: 10000,
    maxAmount: 100000,
    wagering: 10,
    validDays: 7,
    requiresVip: true,
    minVipLevel: 3
  },
  'high-roller': {
    id: 'high-roller',
    type: 'vip',
    name: 'High Roller',
    description: 'До 500% для крупных игроков',
    percent: 500,
    maxBonus: 1000000,
    minDeposit: 100000,
    wagering: 40,
    validDays: 30,
    requiresVip: true,
    minVipLevel: 4
  },
  // Crypto бонусы
  'crypto-first': {
    id: 'crypto-first',
    type: 'crypto',
    name: 'Crypto First',
    description: '+50% к первому крипто депозиту',
    percent: 50,
    maxBonus: null, // Без лимита
    minDeposit: 5000,
    wagering: 30,
    validDays: 14,
    cryptoOnly: true
  }
};

// Helper: Get user's bonus data
const getUserBonusData = (userId) => {
  return global.tempUserBonuses.filter(b => b.userId === userId);
};

// Helper: Check if user can activate bonus
const canActivateBonus = (user, bonusId) => {
  const config = BONUS_CONFIG[bonusId];
  if (!config) return { canActivate: false, reason: 'Бонус не найден' };

  const userBonuses = getUserBonusData(user._id);
  
  // Check if already activated
  const existingActive = userBonuses.find(b => b.bonusId === bonusId && b.status === 'active');
  if (existingActive) {
    return { canActivate: false, reason: 'Бонус уже активирован' };
  }

  // Check if already used (for non-recurring bonuses)
  if (!config.recurring) {
    const existingUsed = userBonuses.find(b => b.bonusId === bonusId && b.status === 'used');
    if (existingUsed) {
      return { canActivate: false, reason: 'Бонус уже был использован' };
    }
  }

  // Check deposit requirements for welcome bonuses
  if (config.type === 'deposit' && config.depositNumber) {
    const depositCount = user.depositCount || 0;
    
    // For deposit bonuses, check if previous deposits were made
    if (config.depositNumber > 1) {
      // Check if previous deposit bonus was used
      const prevBonusId = ['first-deposit', 'second-deposit', 'third-deposit', 'fourth-deposit'][config.depositNumber - 2];
      const prevBonus = userBonuses.find(b => b.bonusId === prevBonusId && b.status === 'used');
      if (!prevBonus && depositCount < config.depositNumber - 1) {
        return { canActivate: false, reason: 'Сначала используйте предыдущий бонус' };
      }
    }
    
    // Check if this deposit was already made
    if (depositCount >= config.depositNumber) {
      const wasUsed = userBonuses.find(b => b.bonusId === bonusId);
      if (wasUsed) {
        return { canActivate: false, reason: 'Бонус уже был использован для этого депозита' };
      }
    }
  }

  // Check VIP requirements
  if (config.requiresVip) {
    const userVipLevel = user.vipLevel || 1;
    if (userVipLevel < (config.minVipLevel || 3)) {
      return { canActivate: false, reason: `Требуется VIP уровень ${config.minVipLevel}+` };
    }
  }

  // Check day of week for reload bonuses
  if (config.daysOfWeek) {
    const today = new Date().getDay();
    if (!config.daysOfWeek.includes(today)) {
      const dayNames = ['воскресенье', 'понедельник', 'вторник', 'среду', 'четверг', 'пятницу', 'субботу'];
      const validDays = config.daysOfWeek.map(d => dayNames[d]).join(', ');
      return { canActivate: false, reason: `Доступно только в: ${validDays}` };
    }
  }

  return { canActivate: true };
};

// GET /api/bonuses - Get all available bonuses for user
router.get('/', auth, async (req, res) => {
  try {
    const userResult = User.findById(req.user.id);
    const user = await userResult.select('-password');
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const userBonuses = getUserBonusData(user._id);
    
    const bonuses = Object.values(BONUS_CONFIG).map(config => {
      const userBonus = userBonuses.find(b => b.bonusId === config.id);
      const checkResult = canActivateBonus(user, config.id);
      
      let status = 'available';
      if (userBonus) {
        status = userBonus.status;
      } else if (!checkResult.canActivate) {
        status = 'locked';
      }

      return {
        ...config,
        status,
        reason: checkResult.reason,
        activatedAt: userBonus?.activatedAt,
        usedAt: userBonus?.usedAt,
        bonusAmount: userBonus?.bonusAmount,
        wagerRequired: userBonus?.wagerRequired,
        wagerCompleted: userBonus?.wagerCompleted
      };
    });

    res.json({
      success: true,
      data: bonuses
    });
  } catch (error) {
    console.error('Get bonuses error:', error);
    res.status(500).json({ success: false, error: 'Failed to get bonuses' });
  }
});

// GET /api/bonuses/active - Get user's active bonuses
router.get('/active', auth, async (req, res) => {
  try {
    const userBonuses = getUserBonusData(req.user.id);
    const activeBonuses = userBonuses.filter(b => b.status === 'active');
    
    const bonusesWithConfig = activeBonuses.map(b => ({
      ...b,
      config: BONUS_CONFIG[b.bonusId]
    }));

    res.json({
      success: true,
      data: bonusesWithConfig
    });
  } catch (error) {
    console.error('Get active bonuses error:', error);
    res.status(500).json({ success: false, error: 'Failed to get active bonuses' });
  }
});

// POST /api/bonuses/:bonusId/activate - Activate a bonus
router.post('/:bonusId/activate', auth, async (req, res) => {
  try {
    const { bonusId } = req.params;
    const config = BONUS_CONFIG[bonusId];
    
    if (!config) {
      return res.status(404).json({ success: false, error: 'Бонус не найден' });
    }

    const userResult = User.findById(req.user.id);
    const user = await userResult.select('-password');
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Check if can activate
    const checkResult = canActivateBonus(user, bonusId);
    if (!checkResult.canActivate) {
      return res.status(400).json({ success: false, error: checkResult.reason });
    }

    // Create activation record
    const activation = {
      id: `BONUS-${Date.now()}`,
      odid: `AUREX-BONUS-${String(global.tempUserBonuses.length + 1).padStart(6, '0')}`,
      userId: user._id,
      username: user.username,
      bonusId: bonusId,
      bonusName: config.name,
      bonusType: config.type,
      percent: config.percent,
      maxBonus: config.maxBonus,
      minDeposit: config.minDeposit,
      wagering: config.wagering,
      validDays: config.validDays,
      freespins: config.freespins || 0,
      status: 'active',
      activatedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + config.validDays * 24 * 60 * 60 * 1000).toISOString(),
      usedAt: null,
      bonusAmount: null,
      wagerRequired: null,
      wagerCompleted: 0
    };

    global.tempUserBonuses.push(activation);

    res.json({
      success: true,
      message: `Бонус "${config.name}" активирован! Сделайте депозит для получения.`,
      data: activation
    });
  } catch (error) {
    console.error('Activate bonus error:', error);
    res.status(500).json({ success: false, error: 'Failed to activate bonus' });
  }
});

// POST /api/bonuses/:bonusId/deactivate - Deactivate a bonus
router.post('/:bonusId/deactivate', auth, async (req, res) => {
  try {
    const { bonusId } = req.params;
    
    const bonusIndex = global.tempUserBonuses.findIndex(
      b => b.userId === req.user.id && b.bonusId === bonusId && b.status === 'active'
    );

    if (bonusIndex === -1) {
      return res.status(404).json({ success: false, error: 'Активный бонус не найден' });
    }

    // Remove the activation
    global.tempUserBonuses.splice(bonusIndex, 1);

    res.json({
      success: true,
      message: 'Бонус деактивирован'
    });
  } catch (error) {
    console.error('Deactivate bonus error:', error);
    res.status(500).json({ success: false, error: 'Failed to deactivate bonus' });
  }
});

// POST /api/bonuses/apply-to-deposit - Apply active bonus to deposit
router.post('/apply-to-deposit', auth, async (req, res) => {
  try {
    const { depositAmount, paymentMethod } = req.body;

    if (!depositAmount || depositAmount <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid deposit amount' });
    }

    const userResult = User.findById(req.user.id);
    const user = await userResult.select('-password');
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Find active bonus that matches this deposit
    const userBonuses = getUserBonusData(user._id);
    const activeBonus = userBonuses.find(b => b.status === 'active');

    if (!activeBonus) {
      return res.json({
        success: true,
        data: {
          hasBonus: false,
          depositAmount,
          bonusAmount: 0,
          totalAmount: depositAmount,
          message: 'Нет активных бонусов'
        }
      });
    }

    const config = BONUS_CONFIG[activeBonus.bonusId];

    // Check minimum deposit
    if (depositAmount < config.minDeposit) {
      return res.json({
        success: true,
        data: {
          hasBonus: false,
          depositAmount,
          bonusAmount: 0,
          totalAmount: depositAmount,
          message: `Минимальный депозит для бонуса: ₽${config.minDeposit}`
        }
      });
    }

    // Check crypto requirement
    if (config.cryptoOnly && !['bitcoin', 'ethereum', 'usdt', 'crypto'].includes(paymentMethod?.toLowerCase())) {
      return res.json({
        success: true,
        data: {
          hasBonus: false,
          depositAmount,
          bonusAmount: 0,
          totalAmount: depositAmount,
          message: 'Этот бонус только для крипто депозитов'
        }
      });
    }

    // Calculate bonus
    let bonusAmount = Math.round(depositAmount * (config.percent / 100));
    if (config.maxBonus) {
      bonusAmount = Math.min(bonusAmount, config.maxBonus);
    }

    const wagerRequired = (depositAmount + bonusAmount) * config.wagering;

    // Update bonus record
    const bonusIndex = global.tempUserBonuses.findIndex(b => b.id === activeBonus.id);
    if (bonusIndex !== -1) {
      global.tempUserBonuses[bonusIndex] = {
        ...activeBonus,
        status: 'used',
        usedAt: new Date().toISOString(),
        depositAmount,
        bonusAmount,
        wagerRequired,
        wagerCompleted: 0
      };
    }

    // Update user
    user.bonusBalance = (user.bonusBalance || 0) + bonusAmount;
    user.depositCount = (user.depositCount || 0) + 1;
    
    // Track used bonuses
    if (!user.usedBonuses) user.usedBonuses = {};
    if (config.depositNumber === 1) user.usedBonuses.firstDeposit = true;
    if (config.depositNumber === 2) user.usedBonuses.secondDeposit = true;
    if (config.depositNumber === 3) user.usedBonuses.thirdDeposit = true;
    if (config.depositNumber === 4) user.usedBonuses.fourthDeposit = true;

    // Update wager
    user.wager = {
      required: (user.wager?.required || 0) + wagerRequired,
      completed: user.wager?.completed || 0,
      active: true,
      multiplier: config.wagering,
      expiresAt: new Date(Date.now() + config.validDays * 24 * 60 * 60 * 1000).toISOString()
    };

    await user.save();

    res.json({
      success: true,
      data: {
        hasBonus: true,
        bonusName: config.name,
        depositAmount,
        bonusAmount,
        freespins: config.freespins || 0,
        totalAmount: depositAmount + bonusAmount,
        wagerRequired,
        wagerMultiplier: config.wagering,
        message: `Бонус ${config.percent}% применён! +₽${bonusAmount.toLocaleString('ru-RU')}`
      }
    });
  } catch (error) {
    console.error('Apply bonus error:', error);
    res.status(500).json({ success: false, error: 'Failed to apply bonus' });
  }
});

// GET /api/bonuses/history - Get bonus history
router.get('/history', auth, async (req, res) => {
  try {
    const userBonuses = getUserBonusData(req.user.id);
    const history = userBonuses
      .filter(b => b.status === 'used')
      .sort((a, b) => new Date(b.usedAt) - new Date(a.usedAt));

    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('Get bonus history error:', error);
    res.status(500).json({ success: false, error: 'Failed to get history' });
  }
});

// ===================== ADMIN ROUTES =====================

// GET /api/bonuses/admin/all - Get all bonuses (admin)
router.get('/admin/all', adminAuth, async (req, res) => {
  try {
    const allBonuses = global.tempUserBonuses.sort(
      (a, b) => new Date(b.activatedAt) - new Date(a.activatedAt)
    );

    const stats = {
      totalActivations: allBonuses.length,
      activeCount: allBonuses.filter(b => b.status === 'active').length,
      usedCount: allBonuses.filter(b => b.status === 'used').length,
      totalBonusAmount: allBonuses
        .filter(b => b.status === 'used')
        .reduce((sum, b) => sum + (b.bonusAmount || 0), 0)
    };

    res.json({
      success: true,
      data: {
        bonuses: allBonuses,
        stats,
        config: BONUS_CONFIG
      }
    });
  } catch (error) {
    console.error('Admin get bonuses error:', error);
    res.status(500).json({ success: false, error: 'Failed to get bonuses' });
  }
});

module.exports = router;
