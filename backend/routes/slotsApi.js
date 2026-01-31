const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const config = require('../config/config');
const { User, GameSession, Transaction } = require('../models/temp-models');
const { auth } = require('../middleware/auth');
const router = express.Router();

// Slots API Service Class
class SlotsApiService {
  constructor() {
    this.baseUrl = config.slotsApi.baseUrl;
    this.fallbackUrl = config.slotsApi.fallbackUrl;
    this.operatorId = config.slotsApi.operatorId;
    this.callbackUrl = config.slotsApi.callbackUrl;
  }

  // Get all games list
  async getGamesList() {
    try {
      const cmd = {
        api: "ls-games-by-operator-id-get",
        operator_id: this.operatorId
      };
      
      const response = await axios.get(`${this.baseUrl}/frontendsrv/apihandler.api`, {
        params: { cmd: JSON.stringify(cmd) },
        timeout: 10000
      });
      
      return response.data;
    } catch (error) {
      console.error('Error fetching games list:', error);
      throw new Error('Failed to fetch games list');
    }
  }

  // Authenticate user with slots provider
  async authenticateUser(userId, gameCode, currency = 'RUB') {
    try {
      const user = await User.findById(userId);
      if (!user) throw new Error('User not found');

      const authData = {
        user_id: userId,
        user_ip: user.ipAddress || '127.0.0.1',
        user_auth_token: this.generateAuthToken(userId),
        currency: currency,
        game_code: gameCode
      };

      const response = await axios.post(`${this.baseUrl}/auth`, authData, {
        timeout: 10000
      });

      return response.data;
    } catch (error) {
      console.error('Authentication error:', error);
      throw new Error('Authentication failed');
    }
  }

  // Start game session
  async startGameSession(userId, gameCode, currency = 'RUB', language = 'ru') {
    try {
      const user = await User.findById(userId);
      if (!user) throw new Error('User not found');

      // Create game session
      const sessionId = this.generateSessionId();
      const gameSession = new GameSession({
        user: userId,
        gameCode: gameCode,
        gameName: gameCode, // This should be mapped from games list
        sessionId: sessionId,
        operatorId: this.operatorId,
        currency: currency,
        startBalance: user.balance[currency] || 0,
        currentBalance: user.balance[currency] || 0,
        ipAddress: user.ipAddress,
        userAgent: user.userAgent
      });

      await gameSession.save();

      // Generate game URL
      const gameUrl = this.generateGameUrl(userId, gameCode, sessionId, currency, language);

      gameSession.gameUrl = gameUrl;
      await gameSession.save();

      return {
        sessionId: sessionId,
        gameUrl: gameUrl,
        balance: user.balance[currency] || 0,
        currency: currency
      };
    } catch (error) {
      console.error('Start game session error:', error);
      throw new Error('Failed to start game session');
    }
  }

  // Generate game URL
  generateGameUrl(userId, gameCode, sessionId, currency, language) {
    const params = new URLSearchParams({
      operator_id: this.operatorId,
      user_id: userId,
      auth_token: this.generateAuthToken(userId),
      currency: currency,
      language: language,
      home_url: config.server.frontendUrl
    });

    return `${this.baseUrl}/games/${gameCode}/game?${params.toString()}`;
  }

  // Generate auth token
  generateAuthToken(userId) {
    const timestamp = Date.now();
    const data = `${userId}:${timestamp}:${config.jwt.secret}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  // Generate session ID
  generateSessionId() {
    return crypto.randomBytes(16).toString('hex');
  }

  // Process bet transaction
  async processBet(transactionData) {
    const { user_id, session_id, bet_amount, currency, game_code, round_id, transaction_id } = transactionData;

    try {
      const user = await User.findById(user_id);
      if (!user) throw new Error('User not found');

      const gameSession = await GameSession.findOne({ sessionId: session_id, status: 'active' });
      if (!gameSession) throw new Error('Game session not found or inactive');

      // Check if user has sufficient balance
      if (!user.canAfford(currency, bet_amount)) {
        throw new Error('Insufficient balance');
      }

      // Create transaction
      const transaction = new Transaction({
        user: user_id,
        gameSession: gameSession._id,
        transactionId: transaction_id,
        type: 'bet',
        amount: -bet_amount, // Negative for bet
        currency: currency,
        balanceBefore: user.balance[currency],
        balanceAfter: user.balance[currency] - bet_amount,
        gameCode: game_code,
        roundId: round_id
      });

      // Update user balance
      user.updateBalance(currency, -bet_amount);
      user.totalWagered += bet_amount;
      user.gamesPlayed += 1;

      // Update game session
      gameSession.totalBet += bet_amount;
      gameSession.currentBalance = user.balance[currency];
      gameSession.spinsCount += 1;
      gameSession.updateActivity();

      // Save all changes
      await Promise.all([
        transaction.save(),
        user.save(),
        gameSession.save()
      ]);

      transaction.complete();
      await transaction.save();

      return {
        success: true,
        balance: user.balance[currency],
        transaction_id: transaction_id
      };
    } catch (error) {
      console.error('Process bet error:', error);
      throw error;
    }
  }

  // Process win transaction
  async processWin(transactionData) {
    const { user_id, session_id, win_amount, currency, game_code, round_id, transaction_id } = transactionData;

    try {
      const user = await User.findById(user_id);
      if (!user) throw new Error('User not found');

      const gameSession = await GameSession.findOne({ sessionId: session_id, status: 'active' });
      if (!gameSession) throw new Error('Game session not found or inactive');

      // Create transaction
      const transaction = new Transaction({
        user: user_id,
        gameSession: gameSession._id,
        transactionId: transaction_id,
        type: 'win',
        amount: win_amount,
        currency: currency,
        balanceBefore: user.balance[currency],
        balanceAfter: user.balance[currency] + win_amount,
        gameCode: game_code,
        roundId: round_id
      });

      // Update user balance
      user.updateBalance(currency, win_amount);

      // Update game session
      gameSession.totalWin += win_amount;
      gameSession.currentBalance = user.balance[currency];
      gameSession.updateActivity();

      // Save all changes
      await Promise.all([
        transaction.save(),
        user.save(),
        gameSession.save()
      ]);

      transaction.complete();
      await transaction.save();

      return {
        success: true,
        balance: user.balance[currency],
        transaction_id: transaction_id
      };
    } catch (error) {
      console.error('Process win error:', error);
      throw error;
    }
  }
}

const slotsService = new SlotsApiService();

// Routes

// Get games list
router.get('/games', async (req, res) => {
  try {
    const apiData = await slotsService.getGamesList();
    
    // Парсим данные в нужный формат для frontend
    const processedGames = [];
    
    if (apiData && apiData.locator && apiData.locator.groups) {
      apiData.locator.groups.forEach(group => {
        if (group.games && Array.isArray(group.games)) {
          group.games.forEach(game => {
            processedGames.push({
              id: game.gm_bk_id,
              name: game.gm_title,
              provider: group.gr_title,
              image: game.icons && game.icons[0] ? 
                `https://icdnchannel.com${apiData.locator.ico_baseurl}${game.icons[0].ic_name}` : 
                null,
              gameUrl: game.gm_url,
              category: 'slots',
              lines: game.gm_ln,
              isNew: game.gm_new || false,
              isHot: (game.gm_bk_id % 4 === 0), // каждая 4-я игра "hot"
              rtp: 90 + (game.gm_bk_id % 10), // детерминированный RTP
              popularity: 70 + (game.gm_bk_id % 30) // детерминированная популярность
            });
          });
        }
      });
    }
    
    res.json({ 
      success: true, 
      data: {
        games: processedGames,
        total: processedGames.length,
        groups: apiData.locator ? apiData.locator.groups : []
      }
    });
  } catch (error) {
    console.error('Error in /games endpoint:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Start game session
router.post('/start-game', auth, async (req, res) => {
  try {
    const { gameCode, currency = 'RUB', language = 'ru' } = req.body;
    const userId = req.user.id;

    const gameData = await slotsService.startGameSession(userId, gameCode, currency, language);
    
    res.json({ 
      success: true, 
      data: gameData 
    });
  } catch (error) {
    res.status(400).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Callback endpoints for slots provider

// Auth callback
router.post('/callback/auth', async (req, res) => {
  try {
    const { user_id, user_auth_token } = req.body;
    
    const user = await User.findById(user_id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify auth token (implement your verification logic)
    
    res.json({
      api: 'do-auth-user-ingame',
      answer: {
        operator_id: slotsService.operatorId,
        user_id: user_id,
        user_nickname: user.username,
        balance: user.balance.RUB,
        bonus_balance: user.bonusBalance,
        auth_token: user_auth_token,
        game_token: slotsService.generateAuthToken(user_id),
        error_code: 0,
        error_description: 'ok',
        currency: 'RUB',
        timestamp: Math.floor(Date.now() / 1000)
      },
      success: true
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Authentication failed',
      error_code: 1
    });
  }
});

// Bet callback
router.post('/callback/bet', async (req, res) => {
  try {
    const result = await slotsService.processBet(req.body);
    
    res.json({
      api: 'do-debit-user-ingame',
      answer: {
        operator_id: slotsService.operatorId,
        transaction_id: req.body.transaction_id,
        user_id: req.body.user_id,
        user_nickname: 'Player',
        balance: result.balance,
        error_code: 0,
        error_description: 'ok',
        currency: req.body.currency,
        timestamp: Math.floor(Date.now() / 1000)
      },
      success: true
    });
  } catch (error) {
    res.status(400).json({
      api: 'do-debit-user-ingame',
      answer: {
        operator_id: slotsService.operatorId,
        transaction_id: req.body.transaction_id,
        error_code: 2,
        error_description: error.message,
        timestamp: Math.floor(Date.now() / 1000)
      },
      success: false
    });
  }
});

// Win callback
router.post('/callback/win', async (req, res) => {
  try {
    const result = await slotsService.processWin(req.body);
    
    res.json({
      api: 'do-credit-user-ingame',
      answer: {
        operator_id: slotsService.operatorId,
        transaction_id: req.body.transaction_id,
        user_id: req.body.user_id,
        user_nickname: 'Player',
        balance: result.balance,
        error_code: 0,
        error_description: 'ok',
        currency: req.body.currency,
        timestamp: Math.floor(Date.now() / 1000)
      },
      success: true
    });
  } catch (error) {
    res.status(400).json({
      api: 'do-credit-user-ingame',
      answer: {
        operator_id: slotsService.operatorId,
        transaction_id: req.body.transaction_id,
        error_code: 2,
        error_description: error.message,
        timestamp: Math.floor(Date.now() / 1000)
      },
      success: false
    });
  }
});

// Get user balance
router.post('/callback/balance', async (req, res) => {
  try {
    const { user_id } = req.body;
    
    const user = await User.findById(user_id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      api: 'do-get-balance-user-ingame',
      answer: {
        operator_id: slotsService.operatorId,
        user_id: user_id,
        user_nickname: user.username,
        balance: user.balance.RUB,
        bonus_balance: user.bonusBalance,
        error_code: 0,
        error_description: 'ok',
        currency: 'RUB',
        timestamp: Math.floor(Date.now() / 1000)
      },
      success: true
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to get balance',
      error_code: 1
    });
  }
});

module.exports = router;