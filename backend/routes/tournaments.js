const express = require('express');
const router = express.Router();
const { auth, adminAuth } = require('../middleware/auth');

// In-memory хранилище турниров (заменится на MongoDB)
let tournaments = [
  {
    id: 'tournament-1',
    name: 'Daily Battle',
    description: 'Ежедневный турнир с призовым фондом ₽500,000',
    type: 'daily',
    status: 'active',
    prizePool: 500000,
    currency: '₽',
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    minBet: 20,
    maxParticipants: 1000,
    participants: [],
    leaderboard: [],
    prizes: [
      { position: '1', amount: 200000 },
      { position: '2', amount: 100000 },
      { position: '3', amount: 50000 },
      { position: '4-10', amount: 20000 },
      { position: '11-50', amount: 5000 },
    ],
    rules: ['Минимальная ставка: ₽20', 'Учитываются только слоты', 'Победитель определяется по множителю'],
    gameIcon: '🎰',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tournament-2',
    name: 'Weekly Championship',
    description: 'Недельный чемпионат с призами до ₽2,500,000',
    type: 'weekly',
    status: 'active',
    prizePool: 2500000,
    currency: '₽',
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    minBet: 50,
    maxParticipants: 5000,
    participants: [],
    leaderboard: [],
    prizes: [
      { position: '1', amount: 1000000 },
      { position: '2', amount: 500000 },
      { position: '3', amount: 250000 },
      { position: '4-10', amount: 75000 },
      { position: '11-50', amount: 10000 },
    ],
    rules: ['Минимальная ставка: ₽50', 'Все игры учитываются', 'Очки за выигрышные спины'],
    gameIcon: '🏆',
    createdAt: new Date().toISOString(),
  },
];

// Участия игроков в турнирах
let tournamentParticipations = [];

// ============ PUBLIC ROUTES ============

// Получить все активные турниры
router.get('/', async (req, res) => {
  try {
    const { status, type } = req.query;
    
    let filtered = [...tournaments];
    
    if (status) {
      filtered = filtered.filter(t => t.status === status);
    }
    
    if (type) {
      filtered = filtered.filter(t => t.type === type);
    }
    
    // Добавляем количество участников
    const result = filtered.map(t => ({
      ...t,
      participantsCount: t.participants.length,
    }));
    
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Получить турнир по ID
router.get('/:id', async (req, res) => {
  try {
    const tournament = tournaments.find(t => t.id === req.params.id);
    
    if (!tournament) {
      return res.status(404).json({ success: false, message: 'Турнир не найден' });
    }
    
    res.json({ success: true, data: tournament });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Получить лидерборд турнира
router.get('/:id/leaderboard', async (req, res) => {
  try {
    const tournament = tournaments.find(t => t.id === req.params.id);
    
    if (!tournament) {
      return res.status(404).json({ success: false, message: 'Турнир не найден' });
    }
    
    // Сортируем по очкам
    const leaderboard = [...tournament.leaderboard].sort((a, b) => b.points - a.points);
    
    res.json({ success: true, data: leaderboard });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============ USER ROUTES (требуют авторизации) ============

// Зарегистрироваться на турнир
router.post('/:id/join', auth, async (req, res) => {
  try {
    const tournament = tournaments.find(t => t.id === req.params.id);
    
    if (!tournament) {
      return res.status(404).json({ success: false, message: 'Турнир не найден' });
    }
    
    if (tournament.status !== 'active') {
      return res.status(400).json({ success: false, message: 'Турнир не активен' });
    }
    
    if (tournament.participants.includes(req.user.id)) {
      return res.status(400).json({ success: false, message: 'Вы уже участвуете в этом турнире' });
    }
    
    if (tournament.participants.length >= tournament.maxParticipants) {
      return res.status(400).json({ success: false, message: 'Турнир заполнен' });
    }
    
    // Добавляем участника
    const odid = req.user.odid || `AUREX-${String(req.user.id).padStart(6, '0')}`;
    
    tournament.participants.push(req.user.id);
    tournament.leaderboard.push({
      odid,
      odid,
      userId: req.user.id,
      username: req.user.username,
      points: 0,
      bestMultiplier: 0,
      gamesPlayed: 0,
      joinedAt: new Date().toISOString(),
    });
    
    // Сохраняем участие
    tournamentParticipations.push({
      odid,
      userId: req.user.id,
      tournamentId: req.params.id,
      joinedAt: new Date().toISOString(),
    });
    
    res.json({ 
      success: true, 
      message: 'Вы успешно зарегистрировались на турнир',
      data: { odid, tournamentId: tournament.id, participantsCount: tournament.participants.length }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Получить мои турниры
router.get('/user/my', auth, async (req, res) => {
  try {
    const myTournaments = tournaments.filter(t => t.participants.includes(req.user.id));
    
    res.json({ success: true, data: myTournaments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============ ADMIN ROUTES ============

// Создать турнир
router.post('/', adminAuth, async (req, res) => {
  try {
    const {
      name,
      description,
      type,
      prizePool,
      startDate,
      endDate,
      minBet,
      maxParticipants,
      prizes,
      rules,
      gameIcon
    } = req.body;
    
    const newTournament = {
      id: `tournament-${Date.now()}`,
      name,
      description,
      type: type || 'daily',
      status: 'scheduled',
      prizePool: prizePool || 0,
      currency: '₽',
      startDate,
      endDate,
      minBet: minBet || 20,
      maxParticipants: maxParticipants || 1000,
      participants: [],
      leaderboard: [],
      prizes: prizes || [],
      rules: rules || [],
      gameIcon: gameIcon || '🎰',
      createdAt: new Date().toISOString(),
      createdBy: req.user.id,
    };
    
    tournaments.push(newTournament);
    
    res.json({ success: true, message: 'Турнир создан', data: newTournament });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Обновить турнир
router.put('/:id', adminAuth, async (req, res) => {
  try {
    const index = tournaments.findIndex(t => t.id === req.params.id);
    
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Турнир не найден' });
    }
    
    tournaments[index] = {
      ...tournaments[index],
      ...req.body,
      updatedAt: new Date().toISOString(),
    };
    
    res.json({ success: true, message: 'Турнир обновлён', data: tournaments[index] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Изменить статус турнира
router.patch('/:id/status', adminAuth, async (req, res) => {
  try {
    const { status } = req.body;
    const tournament = tournaments.find(t => t.id === req.params.id);
    
    if (!tournament) {
      return res.status(404).json({ success: false, message: 'Турнир не найден' });
    }
    
    tournament.status = status;
    tournament.updatedAt = new Date().toISOString();
    
    res.json({ success: true, message: `Статус изменён на ${status}`, data: tournament });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Удалить турнир
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const index = tournaments.findIndex(t => t.id === req.params.id);
    
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Турнир не найден' });
    }
    
    tournaments.splice(index, 1);
    
    res.json({ success: true, message: 'Турнир удалён' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Получить всех участников турнира (для админки)
router.get('/:id/participants', adminAuth, async (req, res) => {
  try {
    const tournament = tournaments.find(t => t.id === req.params.id);
    
    if (!tournament) {
      return res.status(404).json({ success: false, message: 'Турнир не найден' });
    }
    
    res.json({ success: true, data: tournament.leaderboard });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Получить статистику турниров (для админки)
router.get('/admin/stats', adminAuth, async (req, res) => {
  try {
    const stats = {
      total: tournaments.length,
      active: tournaments.filter(t => t.status === 'active').length,
      scheduled: tournaments.filter(t => t.status === 'scheduled').length,
      completed: tournaments.filter(t => t.status === 'completed').length,
      totalPrizePool: tournaments.reduce((sum, t) => sum + t.prizePool, 0),
      totalParticipants: tournaments.reduce((sum, t) => sum + t.participants.length, 0),
    };
    
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Получить расписание турниров
router.get('/schedule/all', async (req, res) => {
  try {
    // Generate schedule from actual tournament data
    const schedule = [
      ...tournaments.filter(t => t.type === 'daily').slice(0, 1).map(t => ({
        type: t.name,
        time: 'Каждый день 00:00',
        prize: `₽${t.prizePool.toLocaleString('ru-RU')}`
      })),
      ...tournaments.filter(t => t.type === 'weekly').slice(0, 1).map(t => ({
        type: t.name,
        time: 'Понедельник 00:00',
        prize: `₽${t.prizePool.toLocaleString('ru-RU')}`
      })),
      ...tournaments.filter(t => t.type === 'monthly').slice(0, 1).map(t => ({
        type: t.name,
        time: '1 число месяца',
        prize: `₽${t.prizePool.toLocaleString('ru-RU')}`
      })),
      ...tournaments.filter(t => t.type === 'special').slice(0, 1).map(t => ({
        type: t.name,
        time: 'Каждые выходные',
        prize: `₽${t.prizePool.toLocaleString('ru-RU')}`
      })),
    ];
    
    res.json({ success: true, data: schedule });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
