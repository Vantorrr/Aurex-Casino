const express = require('express');
const { User } = require('../models/temp-models');
const { auth, adminAuth } = require('../middleware/auth');
const router = express.Router();

// In-memory storage for cashback records
global.tempCashbacks = global.tempCashbacks || [];

// Cashback configuration
const CASHBACK_CONFIG = {
  regular: {
    percent: 8,      // 8% для обычных игроков
    wagering: 10,    // x10 вейджер
    maxAmount: 30000 // Максимум ₽30,000
  },
  vip: {
    percent: 15,     // 15% для VIP
    wagering: 3,     // x3 вейджер
    maxAmount: 150000 // Максимум ₽150,000
  },
  minVipLevel: 3     // VIP начинается с уровня 3 (Gold)
};

// Helper: Get week start (Monday 00:00)
const getWeekStart = (date = new Date()) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

// Helper: Get week end (Sunday 23:59:59)
const getWeekEnd = (date = new Date()) => {
  const start = getWeekStart(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
};

// Helper: Calculate player's weekly loss
const calculateWeeklyLoss = (user, weekStart, weekEnd) => {
  // В реальной системе здесь был бы запрос к БД транзакций
  // Сейчас используем симуляцию на основе статистики пользователя
  
  const stats = user.statistics || {};
  const totalWagered = stats.totalWagered || 0;
  const totalWon = stats.totalWon || 0;
  
  // Потери = ставки - выигрыши (если отрицательное = выигрыш)
  const netLoss = totalWagered - totalWon;
  
  // Возвращаем только если в минусе (потери > 0)
  return netLoss > 0 ? netLoss : 0;
};

// GET /api/cashback/status - Get user's cashback status
router.get('/status', auth, async (req, res) => {
  try {
    const userResult = User.findById(req.user.id);
    const user = await userResult.select('-password');
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const weekStart = getWeekStart();
    const weekEnd = getWeekEnd();
    const isVip = (user.vipLevel || 1) >= CASHBACK_CONFIG.minVipLevel;
    const config = isVip ? CASHBACK_CONFIG.vip : CASHBACK_CONFIG.regular;

    // Calculate current week loss
    const weeklyLoss = calculateWeeklyLoss(user, weekStart, weekEnd);
    const potentialCashback = Math.min(weeklyLoss * (config.percent / 100), config.maxAmount);

    // Check if cashback already received this week
    const existingCashback = global.tempCashbacks.find(cb => 
      cb.userId === user._id && 
      new Date(cb.weekStart).getTime() === weekStart.getTime()
    );

    res.json({
      success: true,
      data: {
        isVip,
        vipLevel: user.vipLevel || 1,
        cashbackPercent: config.percent,
        wagering: config.wagering,
        maxAmount: config.maxAmount,
        weekStart: weekStart.toISOString(),
        weekEnd: weekEnd.toISOString(),
        weeklyLoss,
        potentialCashback: Math.round(potentialCashback),
        alreadyReceived: !!existingCashback,
        receivedAmount: existingCashback?.amount || 0,
        nextCashbackDay: 'Суббота'
      }
    });
  } catch (error) {
    console.error('Get cashback status error:', error);
    res.status(500).json({ success: false, error: 'Failed to get cashback status' });
  }
});

// GET /api/cashback/history - Get user's cashback history
router.get('/history', auth, async (req, res) => {
  try {
    const userCashbacks = global.tempCashbacks
      .filter(cb => cb.userId === req.user.id)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      success: true,
      data: userCashbacks
    });
  } catch (error) {
    console.error('Get cashback history error:', error);
    res.status(500).json({ success: false, error: 'Failed to get cashback history' });
  }
});

// POST /api/cashback/claim - Claim weekly cashback (if eligible)
router.post('/claim', auth, async (req, res) => {
  try {
    const userResult = User.findById(req.user.id);
    const user = await userResult.select('-password');
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const weekStart = getWeekStart();
    const weekEnd = getWeekEnd();
    const today = new Date();
    
    // Check if it's Saturday (day 6)
    if (today.getDay() !== 6) {
      return res.status(400).json({ 
        success: false, 
        error: 'Кэшбэк можно получить только по субботам!' 
      });
    }

    // Check if already claimed this week
    const existingCashback = global.tempCashbacks.find(cb => 
      cb.userId === user._id && 
      new Date(cb.weekStart).getTime() === weekStart.getTime()
    );

    if (existingCashback) {
      return res.status(400).json({ 
        success: false, 
        error: 'Кэшбэк за эту неделю уже получен!' 
      });
    }

    // Calculate loss and cashback
    const isVip = (user.vipLevel || 1) >= CASHBACK_CONFIG.minVipLevel;
    const config = isVip ? CASHBACK_CONFIG.vip : CASHBACK_CONFIG.regular;
    const weeklyLoss = calculateWeeklyLoss(user, weekStart, weekEnd);

    if (weeklyLoss <= 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Нет потерь за эту неделю. Кэшбэк не положен!' 
      });
    }

    const cashbackAmount = Math.min(
      Math.round(weeklyLoss * (config.percent / 100)),
      config.maxAmount
    );

    // Create cashback record
    const cashback = {
      id: `CB-${Date.now()}`,
      odid: `AUREX-CB-${String(global.tempCashbacks.length + 1).padStart(6, '0')}`,
      userId: user._id,
      username: user.username,
      amount: cashbackAmount,
      weeklyLoss,
      percent: config.percent,
      wagering: config.wagering,
      wagerRequired: cashbackAmount * config.wagering,
      wagerCompleted: 0,
      isVip,
      vipLevel: user.vipLevel || 1,
      weekStart: weekStart.toISOString(),
      weekEnd: weekEnd.toISOString(),
      status: 'active',
      createdAt: new Date().toISOString()
    };

    global.tempCashbacks.push(cashback);

    // Add to user's bonus balance
    user.bonusBalance = (user.bonusBalance || 0) + cashbackAmount;
    
    // Update wager requirements
    user.wager = {
      required: (user.wager?.required || 0) + cashback.wagerRequired,
      completed: user.wager?.completed || 0,
      active: true,
      multiplier: config.wagering,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
    };

    await user.save();

    res.json({
      success: true,
      message: `Кэшбэк ${cashbackAmount}₽ успешно начислен!`,
      data: cashback
    });
  } catch (error) {
    console.error('Claim cashback error:', error);
    res.status(500).json({ success: false, error: 'Failed to claim cashback' });
  }
});

// ===================== ADMIN ROUTES =====================

// GET /api/cashback/admin/all - Get all cashback records (admin)
router.get('/admin/all', adminAuth, async (req, res) => {
  try {
    const cashbacks = global.tempCashbacks
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const stats = {
      totalCashbacks: cashbacks.length,
      totalAmount: cashbacks.reduce((sum, cb) => sum + cb.amount, 0),
      thisWeek: cashbacks.filter(cb => 
        new Date(cb.weekStart).getTime() === getWeekStart().getTime()
      ).length
    };

    res.json({
      success: true,
      data: {
        cashbacks,
        stats
      }
    });
  } catch (error) {
    console.error('Admin get cashbacks error:', error);
    res.status(500).json({ success: false, error: 'Failed to get cashbacks' });
  }
});

// POST /api/cashback/admin/process - Process cashback for all eligible users (admin)
router.post('/admin/process', adminAuth, async (req, res) => {
  try {
    const weekStart = getWeekStart();
    const weekEnd = getWeekEnd();
    const users = await User.find();
    
    const results = {
      processed: 0,
      skipped: 0,
      totalAmount: 0,
      details: []
    };

    for (const user of users) {
      // Skip admins
      if (user.isAdmin) {
        results.skipped++;
        continue;
      }

      // Check if already has cashback this week
      const existingCashback = global.tempCashbacks.find(cb => 
        cb.userId === user._id && 
        new Date(cb.weekStart).getTime() === weekStart.getTime()
      );

      if (existingCashback) {
        results.skipped++;
        results.details.push({
          userId: user._id,
          username: user.username,
          status: 'already_received'
        });
        continue;
      }

      // Calculate loss
      const weeklyLoss = calculateWeeklyLoss(user, weekStart, weekEnd);

      if (weeklyLoss <= 0) {
        results.skipped++;
        results.details.push({
          userId: user._id,
          username: user.username,
          status: 'no_loss'
        });
        continue;
      }

      // Determine config based on VIP
      const isVip = (user.vipLevel || 1) >= CASHBACK_CONFIG.minVipLevel;
      const config = isVip ? CASHBACK_CONFIG.vip : CASHBACK_CONFIG.regular;

      const cashbackAmount = Math.min(
        Math.round(weeklyLoss * (config.percent / 100)),
        config.maxAmount
      );

      // Create cashback
      const cashback = {
        id: `CB-${Date.now()}-${user._id}`,
        odid: `AUREX-CB-${String(global.tempCashbacks.length + 1).padStart(6, '0')}`,
        userId: user._id,
        username: user.username,
        amount: cashbackAmount,
        weeklyLoss,
        percent: config.percent,
        wagering: config.wagering,
        wagerRequired: cashbackAmount * config.wagering,
        wagerCompleted: 0,
        isVip,
        vipLevel: user.vipLevel || 1,
        weekStart: weekStart.toISOString(),
        weekEnd: weekEnd.toISOString(),
        status: 'active',
        processedByAdmin: true,
        createdAt: new Date().toISOString()
      };

      global.tempCashbacks.push(cashback);

      // Update user balance
      user.bonusBalance = (user.bonusBalance || 0) + cashbackAmount;
      user.wager = {
        required: (user.wager?.required || 0) + cashback.wagerRequired,
        completed: user.wager?.completed || 0,
        active: true,
        multiplier: config.wagering,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      };

      await user.save();

      results.processed++;
      results.totalAmount += cashbackAmount;
      results.details.push({
        userId: user._id,
        username: user.username,
        status: 'success',
        amount: cashbackAmount,
        isVip
      });
    }

    res.json({
      success: true,
      message: `Кэшбэк обработан! Начислено ${results.processed} игрокам на сумму ${results.totalAmount}₽`,
      data: results
    });
  } catch (error) {
    console.error('Admin process cashback error:', error);
    res.status(500).json({ success: false, error: 'Failed to process cashback' });
  }
});

// POST /api/cashback/admin/user/:userId - Manually add cashback to user (admin)
router.post('/admin/user/:userId', adminAuth, async (req, res) => {
  try {
    const { amount, reason } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid amount' });
    }

    const userResult = User.findById(req.params.userId);
    const user = await userResult.select('-password');
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const isVip = (user.vipLevel || 1) >= CASHBACK_CONFIG.minVipLevel;
    const config = isVip ? CASHBACK_CONFIG.vip : CASHBACK_CONFIG.regular;

    const cashback = {
      id: `CB-MANUAL-${Date.now()}`,
      odid: `AUREX-CB-${String(global.tempCashbacks.length + 1).padStart(6, '0')}`,
      userId: user._id,
      username: user.username,
      amount: amount,
      weeklyLoss: 0,
      percent: 0,
      wagering: config.wagering,
      wagerRequired: amount * config.wagering,
      wagerCompleted: 0,
      isVip,
      vipLevel: user.vipLevel || 1,
      weekStart: null,
      weekEnd: null,
      status: 'active',
      isManual: true,
      reason: reason || 'Ручное начисление администратором',
      processedByAdmin: true,
      createdAt: new Date().toISOString()
    };

    global.tempCashbacks.push(cashback);

    // Update user
    user.bonusBalance = (user.bonusBalance || 0) + amount;
    user.wager = {
      required: (user.wager?.required || 0) + cashback.wagerRequired,
      completed: user.wager?.completed || 0,
      active: true,
      multiplier: config.wagering,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    };

    await user.save();

    res.json({
      success: true,
      message: `Кэшбэк ${amount}₽ начислен пользователю ${user.username}`,
      data: cashback
    });
  } catch (error) {
    console.error('Admin manual cashback error:', error);
    res.status(500).json({ success: false, error: 'Failed to add cashback' });
  }
});

module.exports = router;
