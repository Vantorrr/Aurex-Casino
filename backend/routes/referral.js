const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const User = require('../models/User');

// ============ USER ROUTES ============

// Получить реферальную статистику
router.get('/stats', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    const odid = user.odid || `AUREX-${String(user._id).slice(-6).toUpperCase()}`;
    
    // Находим рефералов этого пользователя (тех кто указал этого юзера как referredBy)
    const myReferrals = await User.find({ referredBy: user._id });
    
    const totalEarnings = user.referralEarnings || 0;
    const referralCount = user.referralCount || 0;
    
    const stats = {
      odid,
      referralCode: user.referralCode || `REF-${odid}`,
      referralLink: `https://aurex.io/?ref=${user.referralCode}`,
      totalReferrals: referralCount,
      activeReferrals: myReferrals.filter(r => r.lastLoginAt && new Date(r.lastLoginAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length,
      totalEarnings,
      thisMonthEarnings: totalEarnings, // Упрощённо
      availableWithdraw: totalEarnings,
      pendingEarnings: 0,
      tier: getTier(referralCount),
      commission: getCommission(referralCount),
    };
    
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Получить список рефералов
router.get('/list', auth, async (req, res) => {
  try {
    const myReferrals = await User.find({ referredBy: req.user.id })
      .select('username createdAt totalDeposited lastLoginAt odid')
      .lean();
    
    const referralCount = await User.findById(req.user.id).select('referralCount');
    const commission = getCommission(referralCount?.referralCount || 0);
    
    const formattedReferrals = myReferrals.map(r => ({
      odid: r.odid || `AUREX-${String(r._id).slice(-6).toUpperCase()}`,
      username: r.username,
      registeredAt: r.createdAt,
      totalDeposits: r.totalDeposited || 0,
      yourEarnings: Math.floor((r.totalDeposited || 0) * commission / 100),
      isActive: r.lastLoginAt && new Date(r.lastLoginAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      lastActive: r.lastLoginAt || r.createdAt,
    }));
    
    res.json({ success: true, data: formattedReferrals });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Вывод реферальных на основной баланс
router.post('/withdraw', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    const available = user.referralEarnings || 0;
    
    if (available < 500) {
      return res.status(400).json({ success: false, message: 'Минимум для вывода: ₽500' });
    }
    
    // Переводим на основной баланс
    user.updateBalance('RUB', available);
    user.referralEarnings = 0;
    await user.save();
    
    res.json({ success: true, message: `₽${available.toLocaleString()} переведено на баланс` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Хелперы
function getTier(referralsCount) {
  if (referralsCount >= 100) return { name: 'Diamond', level: 5 };
  if (referralsCount >= 50) return { name: 'Platinum', level: 4 };
  if (referralsCount >= 25) return { name: 'Gold', level: 3 };
  if (referralsCount >= 10) return { name: 'Silver', level: 2 };
  if (referralsCount >= 5) return { name: 'Bronze', level: 1 };
  return { name: 'Starter', level: 0 };
}

function getCommission(referralsCount) {
  if (referralsCount >= 100) return 50;
  if (referralsCount >= 50) return 45;
  if (referralsCount >= 25) return 40;
  if (referralsCount >= 10) return 35;
  if (referralsCount >= 5) return 30;
  return 25;
}

module.exports = router;
