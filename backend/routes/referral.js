const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');

// In-memory хранилище рефералов
let referrals = [];
let referralEarnings = [];

// ============ USER ROUTES ============

// Получить реферальную статистику
router.get('/stats', auth, async (req, res) => {
  try {
    const odid = req.user.odid || `AUREX-${String(req.user.id).padStart(6, '0')}`;
    
    // Находим рефералов этого пользователя
    const myReferrals = referrals.filter(r => r.referrerId === req.user.id);
    const myEarnings = referralEarnings.filter(e => e.referrerId === req.user.id);
    
    const totalEarnings = myEarnings.reduce((sum, e) => sum + e.amount, 0);
    const thisMonthEarnings = myEarnings
      .filter(e => new Date(e.createdAt).getMonth() === new Date().getMonth())
      .reduce((sum, e) => sum + e.amount, 0);
    
    const stats = {
      odid,
      referralCode: `REF-${odid}`,
      referralLink: `https://aurex.io/?ref=${odid}`,
      totalReferrals: myReferrals.length,
      activeReferrals: myReferrals.filter(r => r.isActive).length,
      totalEarnings,
      thisMonthEarnings,
      availableWithdraw: totalEarnings * 0.8, // 80% доступно
      pendingEarnings: totalEarnings * 0.2,
      tier: getTier(myReferrals.length),
      commission: getCommission(myReferrals.length),
    };
    
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Получить список рефералов
router.get('/list', auth, async (req, res) => {
  try {
    const myReferrals = referrals
      .filter(r => r.referrerId === req.user.id)
      .map(r => ({
        odid: r.odid,
        odid: r.odid,
        username: r.username,
        registeredAt: r.registeredAt,
        totalDeposits: r.totalDeposits || 0,
        yourEarnings: r.yourEarnings || 0,
        isActive: r.isActive,
        lastActive: r.lastActive,
      }));
    
    res.json({ success: true, data: myReferrals });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Регистрация по реферальной ссылке (вызывается при регистрации)
router.post('/register', async (req, res) => {
  try {
    const { referralCode, userId, username, odid } = req.body;
    
    if (!referralCode) {
      return res.json({ success: true, message: 'Без реферала' });
    }
    
    // Находим реферера по коду
    const referrerOdid = referralCode.replace('REF-', '');
    
    referrals.push({
      odid,
      odid,
      odid,
      odid,
      userId,
      username,
      referrerId: referrerOdid,
      referrerOdid: referrerOdid,
      registeredAt: new Date().toISOString(),
      totalDeposits: 0,
      yourEarnings: 0,
      isActive: true,
      lastActive: new Date().toISOString(),
    });
    
    res.json({ success: true, message: 'Реферал зарегистрирован' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Начислить комиссию (вызывается при депозите реферала)
router.post('/commission', async (req, res) => {
  try {
    const { odid, amount } = req.body;
    
    // Находим реферала
    const referral = referrals.find(r => r.odid === odid);
    if (!referral) {
      return res.json({ success: true, message: 'Не реферал' });
    }
    
    // Считаем комиссию
    const commission = getCommission(
      referrals.filter(r => r.referrerId === referral.referrerId).length
    );
    const earnings = amount * (commission / 100);
    
    // Сохраняем
    referralEarnings.push({
      referrerId: referral.referrerId,
      odid,
      odid,
      odid,
      amount: earnings,
      depositAmount: amount,
      commission,
      createdAt: new Date().toISOString(),
    });
    
    // Обновляем статистику реферала
    referral.totalDeposits = (referral.totalDeposits || 0) + amount;
    referral.yourEarnings = (referral.yourEarnings || 0) + earnings;
    referral.lastActive = new Date().toISOString();
    
    res.json({ success: true, message: 'Комиссия начислена', data: { earnings } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Вывод реферальных
router.post('/withdraw', auth, async (req, res) => {
  try {
    const myEarnings = referralEarnings.filter(e => e.referrerId === req.user.id);
    const available = myEarnings.reduce((sum, e) => sum + e.amount, 0) * 0.8;
    
    if (available < 5000) {
      return res.status(400).json({ success: false, message: 'Минимум для вывода: ₽5,000' });
    }
    
    // Здесь была бы логика вывода
    
    res.json({ success: true, message: `₽${available.toLocaleString()} выведено на баланс` });
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
