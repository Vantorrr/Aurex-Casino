const express = require('express');
const router = express.Router();

// Middleware для логирования всех запросов от провайдера
router.use((req, res, next) => {
  console.log('🎮 Callback от провайдера:', {
    method: req.method,
    url: req.url,
    headers: req.headers,
    body: req.body,
    query: req.query
  });
  next();
});

// Обработка do-auth-user-ingame запроса
router.post('/do-auth-user-ingame', async (req, res) => {
  try {
    const { user_id, auth_token, operator_id, game_id, currency, lang, mode } = req.body;
    
    console.log('🔑 Авторизация пользователя в игре:', {
      user_id,
      auth_token,
      operator_id, 
      game_id,
      currency,
      lang,
      mode
    });

    let user = null;
    
    if (auth_token === 'demo') {
      // Демо режим - используем демо пользователя
      user = global.tempUsers.find(u => u.b2b_user_id === 'aurex_demo_001');
      if (!user) {
        user = {
          _id: 'demo_user',
          username: 'Demo Player',
          balance: 10000,
          currency: currency || 'RUB',
          b2b_user_id: 'aurex_demo_001',
          is_demo: true
        };
      }
    } else {
      // Реальный режим - ищем пользователя по user_id (который должен быть B2B ID)
      user = global.tempUsers.find(u => u.b2b_user_id === user_id || u._id === user_id);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }
    }

    // Создаем игровую сессию
    const sessionId = `session_${Date.now()}_${user._id}`;
    global.tempSessions.push({
      session_id: sessionId,
      user_id: user._id,
      b2b_user_id: user.b2b_user_id,
      game_id,
      balance: user.balance,
      currency: user.currency,
      created_at: new Date(),
      expires_at: Date.now() + (60 * 60 * 1000) // 1 час
    });

    console.log(`✅ Пользователь ${user.username} авторизован. Баланс: ${user.balance}₽`);

    // Возвращаем успешный ответ
    res.json({
      success: true,
      user: {
        id: user.b2b_user_id,
        username: user.username,
        balance: user.balance,
        currency: user.currency
      },
      session: {
        session_id: sessionId,
        game_url: `https://int.apichannel.cloud/games/${game_id}`,
        expires_at: Date.now() + (60 * 60 * 1000)
      }
    });

  } catch (error) {
    console.error('❌ Ошибка авторизации:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Обработка get-balance запроса
router.post('/get-balance', async (req, res) => {
  try {
    const { user_id, session_id } = req.body;
    
    console.log('💰 Запрос баланса:', { user_id, session_id });

    // Ищем сессию
    const session = global.tempSessions.find(s => s.session_id === session_id);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    // Ищем пользователя
    const user = global.tempUsers.find(u => u._id === session.user_id || u.b2b_user_id === session.b2b_user_id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    console.log(`💰 Баланс пользователя ${user.username}: ${user.balance}₽`);
    
    res.json({
      success: true,
      balance: user.balance,
      currency: user.currency || 'RUB'
    });

  } catch (error) {
    console.error('❌ Ошибка получения баланса:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Обработка make-bet запроса
router.post('/make-bet', async (req, res) => {
  try {
    const { user_id, session_id, amount, bet_id, game_round_id } = req.body;
    
    console.log('🎲 Ставка:', { user_id, session_id, amount, bet_id, game_round_id });

    // Ищем сессию
    const session = global.tempSessions.find(s => s.session_id === session_id);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    // Ищем пользователя
    const userIndex = global.tempUsers.findIndex(u => u._id === session.user_id || u.b2b_user_id === session.b2b_user_id);
    if (userIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const user = global.tempUsers[userIndex];
    
    // Проверяем баланс
    if (user.balance < amount) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient balance',
        balance: user.balance
      });
    }

    // Списываем ставку
    const newBalance = user.balance - amount;
    global.tempUsers[userIndex].balance = newBalance;

    // Создаем транзакцию
    const transactionId = `bet_${Date.now()}`;
    global.tempTransactions.push({
      _id: transactionId,
      user_id: user._id,
      b2b_user_id: user.b2b_user_id,
      type: 'bet',
      amount: -amount,
      balance_before: user.balance,
      balance_after: newBalance,
      game_round_id,
      bet_id,
      created_at: new Date()
    });

    console.log(`🎲 Ставка ${amount}₽ от ${user.username}. Новый баланс: ${newBalance}₽`);
    
    res.json({
      success: true,
      balance: newBalance,
      currency: user.currency || 'RUB',
      transaction_id: transactionId
    });

  } catch (error) {
    console.error('❌ Ошибка ставки:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Обработка win запроса
router.post('/win', async (req, res) => {
  try {
    const { user_id, session_id, amount, win_id, game_round_id } = req.body;
    
    console.log('🎉 Выигрыш:', { user_id, session_id, amount, win_id, game_round_id });

    // Ищем сессию
    const session = global.tempSessions.find(s => s.session_id === session_id);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    // Ищем пользователя
    const userIndex = global.tempUsers.findIndex(u => u._id === session.user_id || u.b2b_user_id === session.b2b_user_id);
    if (userIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const user = global.tempUsers[userIndex];
    
    // Добавляем выигрыш
    const newBalance = user.balance + amount;
    global.tempUsers[userIndex].balance = newBalance;

    // Создаем транзакцию
    const transactionId = `win_${Date.now()}`;
    global.tempTransactions.push({
      _id: transactionId,
      user_id: user._id,
      b2b_user_id: user.b2b_user_id,
      type: 'win',
      amount: amount,
      balance_before: user.balance,
      balance_after: newBalance,
      game_round_id,
      win_id,
      created_at: new Date()
    });

    console.log(`🎉 Выигрыш ${amount}₽ для ${user.username}. Новый баланс: ${newBalance}₽`);
    
    res.json({
      success: true,
      balance: newBalance,
      currency: user.currency || 'RUB',
      transaction_id: transactionId
    });

  } catch (error) {
    console.error('❌ Ошибка выигрыша:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Обработка cancel-bet запроса
router.post('/cancel-bet', async (req, res) => {
  try {
    const { user_id, session_id, bet_id, amount } = req.body;
    
    console.log('🔄 Отмена ставки:', { user_id, session_id, bet_id, amount });

    // Ищем сессию
    const session = global.tempSessions.find(s => s.session_id === session_id);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    // Ищем пользователя
    const userIndex = global.tempUsers.findIndex(u => u._id === session.user_id || u.b2b_user_id === session.b2b_user_id);
    if (userIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const user = global.tempUsers[userIndex];
    
    // Возвращаем ставку
    const newBalance = user.balance + amount;
    global.tempUsers[userIndex].balance = newBalance;

    // Создаем транзакцию отмены
    const transactionId = `cancel_${Date.now()}`;
    global.tempTransactions.push({
      _id: transactionId,
      user_id: user._id,
      b2b_user_id: user.b2b_user_id,
      type: 'cancel',
      amount: amount,
      balance_before: user.balance,
      balance_after: newBalance,
      bet_id,
      created_at: new Date()
    });

    console.log(`🔄 Отмена ставки ${amount}₽ для ${user.username}. Новый баланс: ${newBalance}₽`);
    
    res.json({
      success: true,
      balance: newBalance,
      currency: user.currency || 'RUB',
      transaction_id: transactionId
    });

  } catch (error) {
    console.error('❌ Ошибка отмены ставки:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Обработка game-end запроса
router.post('/game-end', async (req, res) => {
  try {
    const { user_id, session_id, game_round_id } = req.body;
    
    console.log('🏁 Конец игры:', { user_id, session_id, game_round_id });

    res.json({
      success: true,
      message: 'Game session ended'
    });

  } catch (error) {
    console.error('❌ Ошибка завершения игры:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Обработка любых других callback запросов (только на /api/callback/*)
router.all('*', (req, res) => {
  console.log('🤔 Неизвестный callback запрос:', {
    method: req.method,
    url: req.url,
    body: req.body,
    query: req.query
  });
  
  res.json({
    success: true,
    message: 'Callback received'
  });
});

module.exports = router;