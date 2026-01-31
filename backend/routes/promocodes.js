const express = require('express');
const router = express.Router();
const { auth, adminAuth } = require('../middleware/auth');

// In-memory хранилище промокодов
let promocodes = [
  {
    id: 'promo-1',
    code: 'WELCOME2024',
    type: 'deposit_bonus',
    value: 100,
    valueType: 'percent',
    maxBonus: 50000,
    minDeposit: 1000,
    wager: 35,
    usageLimit: 1000,
    usedCount: 247,
    isActive: true,
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
    createdAt: new Date().toISOString(),
  },
  {
    id: 'promo-2',
    code: 'FREESPINS50',
    type: 'freespins',
    value: 50,
    valueType: 'fixed',
    usageLimit: 500,
    usedCount: 123,
    isActive: true,
    expiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(), // 6 months
    createdAt: new Date().toISOString(),
  },
  {
    id: 'promo-3',
    code: 'VIP500',
    type: 'bonus',
    value: 500,
    valueType: 'fixed',
    wager: 20,
    usageLimit: 100,
    usedCount: 45,
    isActive: true,
    expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 3 months
    createdAt: new Date().toISOString(),
  },
];

// Использования промокодов
let promocodeUsages = [];

// ============ USER ROUTES ============

// Активировать промокод
router.post('/activate', auth, async (req, res) => {
  try {
    const { code } = req.body;
    
    const promo = promocodes.find(p => p.code.toUpperCase() === code.toUpperCase());
    
    if (!promo) {
      return res.status(404).json({ success: false, message: 'Промокод не найден' });
    }
    
    if (!promo.isActive) {
      return res.status(400).json({ success: false, message: 'Промокод неактивен' });
    }
    
    if (new Date(promo.expiresAt) < new Date()) {
      return res.status(400).json({ success: false, message: 'Промокод истёк' });
    }
    
    if (promo.usedCount >= promo.usageLimit) {
      return res.status(400).json({ success: false, message: 'Лимит использования исчерпан' });
    }
    
    // Проверяем, не использовал ли уже этот пользователь
    const alreadyUsed = promocodeUsages.find(u => u.odid === req.user.odid && u.promoId === promo.id);
    if (alreadyUsed) {
      return res.status(400).json({ success: false, message: 'Вы уже использовали этот промокод' });
    }
    
    // Активируем
    const odid = req.user.odid || `AUREX-${String(req.user.id).padStart(6, '0')}`;
    promo.usedCount++;
    promocodeUsages.push({
      odid,
      odid,
      userId: req.user.id,
      promoId: promo.id,
      code: promo.code,
      value: promo.value,
      valueType: promo.valueType,
      activatedAt: new Date().toISOString(),
    });
    
    res.json({ 
      success: true, 
      message: `Промокод ${promo.code} активирован!`,
      data: {
        type: promo.type,
        value: promo.value,
        valueType: promo.valueType,
        maxBonus: promo.maxBonus,
        wager: promo.wager,
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============ ADMIN ROUTES ============

// Получить все промокоды
router.get('/', adminAuth, async (req, res) => {
  try {
    res.json({ success: true, data: promocodes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Создать промокод
router.post('/', adminAuth, async (req, res) => {
  try {
    const newPromo = {
      id: `promo-${Date.now()}`,
      ...req.body,
      usedCount: 0,
      createdAt: new Date().toISOString(),
    };
    
    promocodes.push(newPromo);
    res.json({ success: true, message: 'Промокод создан', data: newPromo });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Обновить промокод
router.put('/:id', adminAuth, async (req, res) => {
  try {
    const index = promocodes.findIndex(p => p.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Промокод не найден' });
    }
    
    promocodes[index] = { ...promocodes[index], ...req.body };
    res.json({ success: true, message: 'Промокод обновлён', data: promocodes[index] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Переключить статус
router.patch('/:id/toggle', adminAuth, async (req, res) => {
  try {
    const promo = promocodes.find(p => p.id === req.params.id);
    if (!promo) {
      return res.status(404).json({ success: false, message: 'Промокод не найден' });
    }
    
    promo.isActive = !promo.isActive;
    res.json({ success: true, message: `Промокод ${promo.isActive ? 'активирован' : 'деактивирован'}`, data: promo });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Удалить промокод
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const index = promocodes.findIndex(p => p.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Промокод не найден' });
    }
    
    promocodes.splice(index, 1);
    res.json({ success: true, message: 'Промокод удалён' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Статистика промокодов
router.get('/stats', adminAuth, async (req, res) => {
  try {
    const stats = {
      total: promocodes.length,
      active: promocodes.filter(p => p.isActive).length,
      totalUsages: promocodes.reduce((sum, p) => sum + p.usedCount, 0),
    };
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
