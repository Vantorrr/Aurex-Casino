const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { User } = require('../models/temp-models');

// ============ USER ROUTES ============

// Получить реферальную статистику
router.get('/stats', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    const odid = user.odid || `AUREX-${String(user._id).slice(-6).toUpperCase()}`;
    
    // Get referral data (support both structures)
    const referralData = user.referral || {};
    const totalEarnings = referralData.referralEarnings || user.referralEarnings || 0;
    const referralCount = referralData.referralCount || user.referralCount || 0;
    const referralCode = referralData.code || user.referralCode || `REF-${odid}`;
    
    const stats = {
      odid,
      referralCode: referralCode,
      referralLink: `https://aurex.casino/?ref=${referralCode}`,
      totalReferrals: referralCount,
      activeReferrals: 0, // Simplified for temp-models
      totalEarnings,
      thisMonthEarnings: totalEarnings,
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
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    const referralData = user.referral || {};
    const referralCount = referralData.referralCount || user.referralCount || 0;
    const commission = getCommission(referralCount);
    
    // For temp-models, we return empty list (no way to query by referredBy easily)
    // In production with MongoDB, this would query properly
    const formattedReferrals = [];
    
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
    
    const referralData = user.referral || {};
    const available = referralData.referralEarnings || user.referralEarnings || 0;
    
    if (available < 500) {
      return res.status(400).json({ success: false, message: 'Минимум для вывода: ₽500' });
    }
    
    // Переводим на основной баланс
    if (user.balance && typeof user.balance === 'object') {
      user.balance.RUB = (user.balance.RUB || 0) + available;
    }
    
    if (user.referral) {
      user.referral.referralEarnings = 0;
    } else {
      user.referralEarnings = 0;
    }
    
    await User.findByIdAndUpdate(user._id, user);
    
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
