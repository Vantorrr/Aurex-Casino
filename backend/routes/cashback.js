const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { auth, adminAuth } = require('../middleware/auth');

// Получить VIP конфиг кэшбэка
async function getVipCashbackPercent(vipLevel) {
  const cashbackRates = {
    1: 5,   // Bronze
    2: 7,   // Silver
    3: 10,  // Gold
    4: 12,  // Platinum
    5: 15   // Emperor
  };
  return cashbackRates[vipLevel] || 5;
}

// Получить доступный кэшбэк
router.get('/available', auth, async (req, res) => {
  try {
    // Получаем VIP уровень пользователя
    const userResult = await pool.query(
      'SELECT vip_level FROM users WHERE id = $1',
      [req.user.id]
    );
    const vipLevel = userResult.rows[0]?.vip_level || 1;
    const cashbackPercent = await getVipCashbackPercent(vipLevel);
    
    // Получаем незаклейменный кэшбэк
    const result = await pool.query(
      `SELECT * FROM cashback_records 
       WHERE user_id = $1 AND status = 'pending'
       ORDER BY created_at DESC`,
      [req.user.id]
    );
    
    const totalAvailable = result.rows.reduce((sum, r) => sum + parseFloat(r.amount), 0);
    
    res.json({ 
      success: true, 
      data: {
        available: totalAvailable,
        percent: cashbackPercent,
        vipLevel,
        records: result.rows.map(r => ({
          id: r.id,
          amount: parseFloat(r.amount),
          period: r.period,
          createdAt: r.created_at
        }))
      }
    });
  } catch (error) {
    console.error('Get available cashback error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Забрать кэшбэк
router.post('/claim', auth, async (req, res) => {
  try {
    // Получаем все pending кэшбэки
    const result = await pool.query(
      `SELECT * FROM cashback_records 
       WHERE user_id = $1 AND status = 'pending'`,
      [req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Нет доступного кэшбэка' });
    }
    
    const totalAmount = result.rows.reduce((sum, r) => sum + parseFloat(r.amount), 0);
    const totalWager = result.rows.reduce((sum, r) => sum + parseFloat(r.wager_required || 0), 0);
    
    // Обновляем статус
    await pool.query(
      `UPDATE cashback_records 
       SET status = 'claimed', claimed_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND status = 'pending'`,
      [req.user.id]
    );
    
    // Добавляем на бонусный баланс
    await pool.query(
      'UPDATE users SET bonus_balance = bonus_balance + $1 WHERE id = $2',
      [totalAmount, req.user.id]
    );
    
    // Создаём бонус с вейджером если нужно
    if (totalWager > 0) {
      await pool.query(
        `INSERT INTO bonuses (user_id, bonus_type, amount, wagering_requirement, wagering_completed, status, expires_at)
         VALUES ($1, 'cashback', $2, $3, 0, 'active', NOW() + INTERVAL '7 days')`,
        [req.user.id, totalAmount, totalWager]
      );
    }
    
    res.json({ 
      success: true, 
      message: `Кэшбэк ₽${totalAmount.toFixed(2)} получен!`,
      data: {
        amount: totalAmount,
        wagerRequired: totalWager
      }
    });
  } catch (error) {
    console.error('Claim cashback error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Получить историю кэшбэка
router.get('/history', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    const result = await pool.query(
      `SELECT * FROM cashback_records 
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user.id, parseInt(limit), offset]
    );
    
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get cashback history error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============ SYSTEM ROUTES (вызываются при проигрышах) ============

// Начислить кэшбэк (вызывается системой при проигрыше)
router.post('/accrue', auth, async (req, res) => {
  try {
    const { lossAmount, period = 'daily' } = req.body;
    
    if (!lossAmount || lossAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Неверная сумма' });
    }
    
    // Получаем VIP уровень
    const userResult = await pool.query(
      'SELECT vip_level FROM users WHERE id = $1',
      [req.user.id]
    );
    const vipLevel = userResult.rows[0]?.vip_level || 1;
    const cashbackPercent = await getVipCashbackPercent(vipLevel);
    
    const cashbackAmount = lossAmount * (cashbackPercent / 100);
    const wagerRequired = cashbackAmount * 5; // x5 вейджер на кэшбэк
    
    await pool.query(
      `INSERT INTO cashback_records (user_id, amount, period, wager_required, status)
       VALUES ($1, $2, $3, $4, 'pending')`,
      [req.user.id, cashbackAmount, period, wagerRequired]
    );
    
    res.json({ 
      success: true, 
      data: {
        cashbackAmount,
        percent: cashbackPercent
      }
    });
  } catch (error) {
    console.error('Accrue cashback error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============ ADMIN ROUTES ============

// Статистика кэшбэка
router.get('/admin/stats', adminAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_records,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'claimed') as claimed,
        COALESCE(SUM(amount), 0) as total_amount,
        COALESCE(SUM(amount) FILTER (WHERE status = 'pending'), 0) as pending_amount,
        COALESCE(SUM(amount) FILTER (WHERE status = 'claimed'), 0) as claimed_amount
      FROM cashback_records
    `);
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Cashback stats error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
