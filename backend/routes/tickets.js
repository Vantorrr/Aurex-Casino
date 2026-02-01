const express = require('express');
const router = express.Router();
const { auth, adminAuth } = require('../middleware/auth');

// In-memory хранилище тикетов
let tickets = [
  {
    id: 'TKT-001234',
    odid: 'AUREX-000001',
    userId: '1',
    username: 'testuser',
    email: 'test@example.com',
    category: 'withdrawal',
    subject: 'Проблема с выводом на Bitcoin',
    priority: 'high',
    status: 'pending',
    messages: [
      { id: 1, sender: 'user', text: 'Не могу вывести средства на BTC кошелёк', createdAt: new Date().toISOString() },
      { id: 2, sender: 'support', text: 'Здравствуйте! Уточните, пожалуйста, адрес кошелька.', createdAt: new Date().toISOString() },
    ],
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'TKT-001233',
    odid: 'AUREX-000002',
    userId: '2',
    username: 'cryptofan',
    email: 'crypto@email.com',
    category: 'bonus',
    subject: 'Бонус не активировался',
    priority: 'normal',
    status: 'open',
    messages: [
      { id: 1, sender: 'user', text: 'Сделал депозит 10000₽, но бонус 200% не получил', createdAt: new Date().toISOString() },
    ],
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// ============ USER ROUTES ============

// Получить мои тикеты
router.get('/my', auth, async (req, res) => {
  try {
    const myTickets = tickets.filter(t => t.odid === req.user.odid || t.userId === req.user.id);
    res.json({ success: true, data: myTickets });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Создать тикет
router.post('/', auth, async (req, res) => {
  try {
    const { category, subject, message, priority } = req.body;
    
    const newTicket = {
      id: `TKT-${String(Date.now()).slice(-6)}`,
      odid: req.user.odid || `AUREX-${req.user.id}`,
      userId: req.user.id,
      username: req.user.username,
      email: req.user.email,
      category,
      subject,
      priority: priority || 'normal',
      status: 'open',
      messages: [
        { id: 1, sender: 'user', text: message, createdAt: new Date().toISOString() }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    tickets.push(newTicket);
    res.json({ success: true, message: 'Тикет создан', data: newTicket });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Добавить сообщение в тикет
router.post('/:id/message', auth, async (req, res) => {
  try {
    const ticket = tickets.find(t => t.id === req.params.id);
    
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Тикет не найден' });
    }
    
    if (ticket.odid !== req.user.odid && ticket.userId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Нет доступа' });
    }
    
    ticket.messages.push({
      id: ticket.messages.length + 1,
      sender: 'user',
      text: req.body.message,
      createdAt: new Date().toISOString(),
    });
    ticket.updatedAt = new Date().toISOString();
    ticket.status = 'open';
    
    res.json({ success: true, message: 'Сообщение добавлено', data: ticket });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============ ADMIN ROUTES ============

// Получить все тикеты
router.get('/', adminAuth, async (req, res) => {
  try {
    const { status, category, priority } = req.query;
    
    let filtered = [...tickets];
    
    if (status && status !== 'all') {
      filtered = filtered.filter(t => t.status === status);
    }
    if (category) {
      filtered = filtered.filter(t => t.category === category);
    }
    if (priority) {
      filtered = filtered.filter(t => t.priority === priority);
    }
    
    // Сортировка по дате (новые первые)
    filtered.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    
    res.json({ success: true, data: filtered });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Получить тикет по ID
router.get('/:id', adminAuth, async (req, res) => {
  try {
    const ticket = tickets.find(t => t.id === req.params.id);
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Тикет не найден' });
    }
    res.json({ success: true, data: ticket });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Ответить на тикет (админ)
router.post('/:id/reply', adminAuth, async (req, res) => {
  try {
    const ticket = tickets.find(t => t.id === req.params.id);
    
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Тикет не найден' });
    }
    
    ticket.messages.push({
      id: ticket.messages.length + 1,
      sender: 'support',
      text: req.body.message,
      createdAt: new Date().toISOString(),
      agentId: req.user.id,
      agentName: req.user.username,
    });
    ticket.updatedAt = new Date().toISOString();
    ticket.status = 'pending';
    
    res.json({ success: true, message: 'Ответ отправлен', data: ticket });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Изменить статус тикета
router.patch('/:id/status', adminAuth, async (req, res) => {
  try {
    const ticket = tickets.find(t => t.id === req.params.id);
    
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Тикет не найден' });
    }
    
    ticket.status = req.body.status;
    ticket.updatedAt = new Date().toISOString();
    
    res.json({ success: true, message: `Статус изменён на ${req.body.status}`, data: ticket });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Статистика тикетов
router.get('/admin/stats', adminAuth, async (req, res) => {
  try {
    const stats = {
      total: tickets.length,
      open: tickets.filter(t => t.status === 'open').length,
      pending: tickets.filter(t => t.status === 'pending').length,
      resolved: tickets.filter(t => t.status === 'resolved').length,
      closed: tickets.filter(t => t.status === 'closed').length,
      highPriority: tickets.filter(t => t.priority === 'high' && t.status !== 'closed').length,
    };
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
