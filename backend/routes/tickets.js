const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { auth, adminAuth } = require('../middleware/auth');
const telegramNotify = require('../services/telegramNotify');

// ============ USER ROUTES ============

// Получить тикеты пользователя
router.get('/my', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT t.*, 
        (SELECT COUNT(*) FROM ticket_messages WHERE ticket_id = t.id) as message_count
       FROM tickets t
       WHERE t.user_id = $1
       ORDER BY t.updated_at DESC`,
      [req.user.id]
    );
    
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get my tickets error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Создать тикет
router.post('/', auth, async (req, res) => {
  try {
    const { subject, message, category, priority } = req.body;
    
    if (!subject || !message) {
      return res.status(400).json({ success: false, message: 'Тема и сообщение обязательны' });
    }
    
    const result = await pool.query(
      `INSERT INTO tickets (user_id, subject, message, category, priority, status)
       VALUES ($1, $2, $3, $4, $5, 'open') RETURNING *`,
      [req.user.id, subject, message, category || 'general', priority || 'medium']
    );
    
    const ticket = result.rows[0];
    
    // Добавляем первое сообщение
    await pool.query(
      `INSERT INTO ticket_messages (ticket_id, user_id, message, is_staff)
       VALUES ($1, $2, $3, false)`,
      [ticket.id, req.user.id, message]
    );
    
    // Уведомляем менеджеров в Telegram
    telegramNotify.notifyNewTicket(ticket, req.user).catch(err => {
      console.error('Telegram notify error:', err.message);
    });
    
    res.json({ success: true, message: 'Тикет создан', data: ticket });
  } catch (error) {
    console.error('Create ticket error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Получить тикет с сообщениями
router.get('/:id', auth, async (req, res) => {
  try {
    const ticketResult = await pool.query(
      'SELECT * FROM tickets WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    
    if (ticketResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Тикет не найден' });
    }
    
    const messagesResult = await pool.query(
      `SELECT tm.*, u.username 
       FROM ticket_messages tm
       JOIN users u ON tm.user_id = u.id
       WHERE tm.ticket_id = $1
       ORDER BY tm.created_at ASC`,
      [req.params.id]
    );
    
    res.json({ 
      success: true, 
      data: {
        ...ticketResult.rows[0],
        messages: messagesResult.rows
      }
    });
  } catch (error) {
    console.error('Get ticket error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Добавить сообщение в тикет
router.post('/:id/message', auth, async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ success: false, message: 'Сообщение обязательно' });
    }
    
    // Проверяем что тикет принадлежит пользователю
    const ticketResult = await pool.query(
      'SELECT * FROM tickets WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    
    if (ticketResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Тикет не найден' });
    }
    
    await pool.query(
      `INSERT INTO ticket_messages (ticket_id, user_id, message, is_staff)
       VALUES ($1, $2, $3, false)`,
      [req.params.id, req.user.id, message]
    );
    
    await pool.query(
      'UPDATE tickets SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [req.params.id]
    );
    
    // Уведомляем менеджеров в Telegram о новом сообщении
    const ticket = ticketResult.rows[0];
    telegramNotify.notifyTicketMessage(ticket, req.user, message, true).catch(err => {
      console.error('Telegram notify error:', err.message);
    });
    
    res.json({ success: true, message: 'Сообщение отправлено' });
  } catch (error) {
    console.error('Add message error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============ ADMIN ROUTES ============

// Получить все тикеты
router.get('/', adminAuth, async (req, res) => {
  try {
    const { status, priority } = req.query;
    
    let query = `
      SELECT t.*, u.username, u.email, u.odid,
        (SELECT COUNT(*) FROM ticket_messages WHERE ticket_id = t.id) as message_count
      FROM tickets t
      JOIN users u ON t.user_id = u.id
    `;
    const conditions = [];
    const values = [];
    
    if (status && status !== 'all') {
      values.push(status);
      conditions.push(`t.status = $${values.length}`);
    }
    
    if (priority && priority !== 'all') {
      values.push(priority);
      conditions.push(`t.priority = $${values.length}`);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ` ORDER BY 
      CASE t.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
      CASE t.status WHEN 'open' THEN 0 WHEN 'in_progress' THEN 1 ELSE 2 END,
      t.updated_at DESC`;
    
    const result = await pool.query(query, values);
    
    const data = result.rows.map(t => ({
      id: t.id,
      odid: t.odid,
      userId: t.user_id,
      username: t.username,
      email: t.email,
      subject: t.subject,
      message: t.message,
      category: t.category,
      priority: t.priority,
      status: t.status,
      messageCount: parseInt(t.message_count),
      messages: [],
      createdAt: t.created_at,
      updatedAt: t.updated_at
    }));
    
    res.json({ success: true, data });
  } catch (error) {
    console.error('Get all tickets error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Получить тикет (админ)
router.get('/admin/:id', adminAuth, async (req, res) => {
  try {
    const ticketResult = await pool.query(
      `SELECT t.*, u.username, u.email, u.odid
       FROM tickets t
       JOIN users u ON t.user_id = u.id
       WHERE t.id = $1`,
      [req.params.id]
    );
    
    if (ticketResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Тикет не найден' });
    }
    
    const messagesResult = await pool.query(
      `SELECT tm.*, u.username, u.is_admin
       FROM ticket_messages tm
       JOIN users u ON tm.user_id = u.id
       WHERE tm.ticket_id = $1
       ORDER BY tm.created_at ASC`,
      [req.params.id]
    );
    
    res.json({ 
      success: true, 
      data: {
        ...ticketResult.rows[0],
        messages: messagesResult.rows
      }
    });
  } catch (error) {
    console.error('Get ticket admin error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Ответить на тикет (админ)
router.post('/admin/:id/reply', adminAuth, async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ success: false, message: 'Сообщение обязательно' });
    }
    
    // Получаем информацию о тикете для уведомления пользователя
    const ticketInfo = await pool.query(
      'SELECT user_id FROM tickets WHERE id = $1',
      [req.params.id]
    );
    
    if (ticketInfo.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Тикет не найден' });
    }
    
    // Добавляем ответ
    await pool.query(
      `INSERT INTO ticket_messages (ticket_id, user_id, message, is_staff)
       VALUES ($1, $2, $3, true)`,
      [req.params.id, req.user.id, message]
    );
    
    // Обновляем статус тикета
    await pool.query(
      `UPDATE tickets SET status = 'in_progress', assigned_to = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [req.user.id, req.params.id]
    );
    
    // Уведомляем пользователя в Telegram (если привязан)
    const userId = ticketInfo.rows[0].user_id;
    telegramNotify.notifyUserReply(userId, req.params.id, message).catch(err => {
      console.error('Telegram user notify error:', err.message);
    });
    
    res.json({ success: true, message: 'Ответ отправлен' });
  } catch (error) {
    console.error('Reply ticket error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Изменить статус тикета
router.patch('/admin/:id/status', adminAuth, async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['open', 'in_progress', 'resolved', 'closed'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Неверный статус' });
    }
    
    await pool.query(
      'UPDATE tickets SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [status, req.params.id]
    );
    
    res.json({ success: true, message: 'Статус обновлён' });
  } catch (error) {
    console.error('Update ticket status error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Статистика тикетов
router.get('/admin/stats', adminAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'open') as open,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
        COUNT(*) FILTER (WHERE status = 'resolved') as resolved,
        COUNT(*) FILTER (WHERE status = 'closed') as closed,
        COUNT(*) FILTER (WHERE priority = 'urgent') as urgent,
        COUNT(*) FILTER (WHERE created_at > CURRENT_DATE) as today
      FROM tickets
    `);
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Ticket stats error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
