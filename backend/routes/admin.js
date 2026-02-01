const express = require('express');
const { body, validationResult } = require('express-validator');
const { User, GameSession, Transaction } = require('../models/temp-models');
const { adminAuth } = require('../middleware/auth');
const router = express.Router();

// Dashboard statistics
router.get('/dashboard', adminAuth, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);

    // User statistics
    const totalUsers = await User.countDocuments();
    const todayUsers = await User.countDocuments({ createdAt: { $gte: today } });
    const activeUsers = await User.countDocuments({ 
      lastLogin: { $gte: yesterday },
      isActive: true 
    });

    // Game statistics
    const totalSessions = await GameSession.countDocuments();
    const todaySessions = await GameSession.countDocuments({ createdAt: { $gte: today } });
    const activeSessions = await GameSession.countDocuments({ status: 'active' });

    // Financial statistics
    const totalDeposits = await Transaction.aggregate([
      { $match: { type: 'deposit', status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]);

    const todayDeposits = await Transaction.aggregate([
      { $match: { type: 'deposit', status: 'completed', createdAt: { $gte: today } } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]);

    const totalWithdrawals = await Transaction.aggregate([
      { $match: { type: 'withdrawal', status: 'completed' } },
      { $group: { _id: null, total: { $sum: { $abs: '$amount' } }, count: { $sum: 1 } } }
    ]);

    const todayWithdrawals = await Transaction.aggregate([
      { $match: { type: 'withdrawal', status: 'completed', createdAt: { $gte: today } } },
      { $group: { _id: null, total: { $sum: { $abs: '$amount' } }, count: { $sum: 1 } } }
    ]);

    // Game revenue (bets - wins)
    const totalGameRevenue = await GameSession.aggregate([
      { $group: { _id: null, revenue: { $sum: { $subtract: ['$totalBet', '$totalWin'] } } } }
    ]);

    const todayGameRevenue = await GameSession.aggregate([
      { $match: { createdAt: { $gte: today } } },
      { $group: { _id: null, revenue: { $sum: { $subtract: ['$totalBet', '$totalWin'] } } } }
    ]);

    // Top games
    const topGames = await GameSession.aggregate([
      { $match: { createdAt: { $gte: thisMonth } } },
      {
        $group: {
          _id: '$gameCode',
          gameName: { $first: '$gameName' },
          sessions: { $sum: 1 },
          revenue: { $sum: { $subtract: ['$totalBet', '$totalWin'] } },
          totalBet: { $sum: '$totalBet' },
          totalWin: { $sum: '$totalWin' }
        }
      },
      { $sort: { revenue: -1 } },
      { $limit: 10 }
    ]);

    // Daily revenue chart data (last 30 days)
    const revenueChart = await Transaction.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          type: { $in: ['deposit', 'withdrawal'] },
          status: 'completed'
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            type: '$type'
          },
          amount: { $sum: '$amount' }
        }
      },
      { $sort: { '_id.date': 1 } }
    ]);

    res.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          today: todayUsers,
          active: activeUsers
        },
        games: {
          totalSessions,
          todaySessions,
          activeSessions
        },
        finance: {
          totalDeposits: totalDeposits[0]?.total || 0,
          todayDeposits: todayDeposits[0]?.total || 0,
          totalWithdrawals: totalWithdrawals[0]?.total || 0,
          todayWithdrawals: todayWithdrawals[0]?.total || 0,
          pendingWithdrawals: 0,
          revenue: (totalDeposits[0]?.total || 0) - (totalWithdrawals[0]?.total || 0),
          totalGameRevenue: totalGameRevenue[0]?.revenue || 0,
          todayGameRevenue: todayGameRevenue[0]?.revenue || 0
        },
        topGames,
        revenueChart
      }
    });
  } catch (error) {
    console.error('Get admin dashboard error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get dashboard data'
    });
  }
});

// Get all users with pagination and filters
router.get('/users', adminAuth, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      search, 
      status, 
      role,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = {};
    
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    if (status) {
      query.isActive = status === 'active';
    }

    if (role) {
      query.role = role;
    }

    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const users = await User.find(query)
      .select('-password')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get admin users error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get users'
    });
  }
});

// Get user details with statistics
router.get('/users/:userId', adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .select('-password')
      .populate('referredBy', 'username email');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Get user's game statistics
    const gameStats = await GameSession.aggregate([
      { $match: { user: user._id } },
      {
        $group: {
          _id: null,
          totalSessions: { $sum: 1 },
          totalBet: { $sum: '$totalBet' },
          totalWin: { $sum: '$totalWin' },
          totalSpins: { $sum: '$spinsCount' }
        }
      }
    ]);

    // Get user's payment statistics
    const paymentStats = await Transaction.aggregate([
      { $match: { user: user._id, type: { $in: ['deposit', 'withdrawal'] }, status: 'completed' } },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Get recent transactions
    const recentTransactions = await Transaction.find({ user: user._id })
      .sort({ createdAt: -1 })
      .limit(20);

    // Get referral count
    const referralCount = await User.countDocuments({ referredBy: user._id });

    const deposits = paymentStats.find(p => p._id === 'deposit') || { total: 0, count: 0 };
    const withdrawals = paymentStats.find(p => p._id === 'withdrawal') || { total: 0, count: 0 };

    res.json({
      success: true,
      data: {
        user,
        stats: {
          games: gameStats[0] || { totalSessions: 0, totalBet: 0, totalWin: 0, totalSpins: 0 },
          payments: {
            totalDeposited: deposits.total,
            depositCount: deposits.count,
            totalWithdrawn: Math.abs(withdrawals.total),
            withdrawalCount: withdrawals.count
          },
          referralCount
        },
        recentTransactions
      }
    });
  } catch (error) {
    console.error('Get admin user details error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user details'
    });
  }
});

// Update user
router.put('/users/:userId', adminAuth, [
  body('isActive').optional().isBoolean(),
  body('role').optional().isIn(['user', 'admin', 'moderator']),
  body('vipLevel').optional().isInt({ min: 0, max: 10 }),
  body('balance.RUB').optional().isFloat({ min: 0 }),
  body('bonusBalance').optional().isFloat({ min: 0 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const updates = req.body;
    const user = await User.findById(req.params.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Update allowed fields
    if (updates.isActive !== undefined) user.isActive = updates.isActive;
    if (updates.role !== undefined) user.role = updates.role;
    if (updates.vipLevel !== undefined) user.vipLevel = updates.vipLevel;
    if (updates.bonusBalance !== undefined) user.bonusBalance = updates.bonusBalance;
    
    if (updates.balance) {
      Object.keys(updates.balance).forEach(currency => {
        if (user.balance[currency] !== undefined) {
          user.balance[currency] = updates.balance[currency];
        }
      });
    }

    await user.save();

    res.json({
      success: true,
      message: 'User updated successfully',
      data: { user }
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user'
    });
  }
});

// Find user by ODID or ID
router.get('/users/find/:identifier', adminAuth, async (req, res) => {
  try {
    const { identifier } = req.params;
    let user = null;
    
    // Try to find by ODID first
    user = await User.findOne({ odid: identifier });
    
    // If not found, try by username
    if (!user) {
      user = await User.findOne({ username: identifier });
    }
    
    // If not found, try by email
    if (!user) {
      user = await User.findOne({ email: identifier });
    }
    
    // If not found, try by ID
    if (!user) {
      const userById = await User.findById(identifier);
      if (userById) {
        const result = await userById.select('-password');
        user = result;
      }
    }
    
    // If still not found, try partial match
    if (!user) {
      const allUsersQuery = User.find({});
      const allUsers = await allUsersQuery.select('-password');
      user = allUsers.find(u => 
        u.odid?.includes(identifier) || 
        u._id?.toString().includes(identifier) ||
        u.username?.toLowerCase().includes(identifier.toLowerCase())
      );
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Пользователь не найден'
      });
    }

    // Remove password from response
    const { password, ...userWithoutPassword } = user;

    res.json({
      success: true,
      data: userWithoutPassword
    });
  } catch (error) {
    console.error('Find user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to find user'
    });
  }
});

// Add/remove balance by user ID or ODID
router.post('/users/:identifier/balance', adminAuth, [
  body('amount').isFloat({ min: -1000000000, max: 1000000000 }),
  body('type').isIn(['add', 'subtract', 'set']),
  body('balanceType').optional().isIn(['balance', 'bonusBalance']),
  body('reason').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { identifier } = req.params;
    const { amount, type, balanceType = 'balance', reason } = req.body;

    // Find user by ID, ODID, or username
    let user = await User.findOne({ odid: identifier });
    if (!user) {
      user = await User.findOne({ username: identifier });
    }
    if (!user) {
      const userByIdQuery = User.findById(identifier);
      user = await userByIdQuery.select('-password');
    }
    if (!user) {
      // Try partial match
      const allUsersQuery = User.find({});
      const allUsers = await allUsersQuery.select('-password');
      user = allUsers.find(u => 
        u.odid?.includes(identifier) || 
        u._id?.toString().includes(identifier) ||
        u.username?.toLowerCase().includes(identifier.toLowerCase())
      );
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Пользователь не найден'
      });
    }

    const oldBalance = balanceType === 'bonusBalance' ? (user.bonusBalance || 0) : (user.balance || 0);
    let newBalance = oldBalance;

    if (type === 'add') {
      newBalance = oldBalance + amount;
    } else if (type === 'subtract') {
      newBalance = Math.max(0, oldBalance - amount);
    } else if (type === 'set') {
      newBalance = Math.max(0, amount);
    }

    if (balanceType === 'bonusBalance') {
      user.bonusBalance = newBalance;
    } else {
      user.balance = newBalance;
    }

    await user.save();

    // Log the transaction
    const transaction = {
      id: `ADMIN-${Date.now()}`,
      odid: `AUREX-TRX-${String(global.tempTransactions?.length + 1 || 1).padStart(6, '0')}`,
      user: user._id,
      type: type === 'subtract' ? 'admin_debit' : 'admin_credit',
      amount: type === 'subtract' ? -amount : amount,
      status: 'completed',
      method: 'admin',
      description: reason || `Ручное ${type === 'add' ? 'пополнение' : type === 'subtract' ? 'списание' : 'установка'} баланса`,
      processedBy: req.user.id,
      createdAt: new Date().toISOString()
    };
    
    if (global.tempTransactions) {
      global.tempTransactions.push(transaction);
    }

    res.json({
      success: true,
      message: `Баланс ${type === 'add' ? 'пополнен' : type === 'subtract' ? 'списан' : 'установлен'} успешно`,
      data: {
        user: {
          id: user._id,
          odid: user.odid,
          username: user.username,
          email: user.email
        },
        oldBalance,
        newBalance,
        change: newBalance - oldBalance,
        balanceType,
        transaction
      }
    });
  } catch (error) {
    console.error('Add balance error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update balance'
    });
  }
});

// Get all transactions
router.get('/transactions', adminAuth, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      type, 
      status,
      userId,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = {};
    
    if (type) query.type = type;
    if (status) query.status = status;
    if (userId) query.user = userId;

    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const transactions = await Transaction.find(query)
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('user', 'username email')
      .populate('gameSession', 'sessionId gameName');

    const total = await Transaction.countDocuments(query);

    res.json({
      success: true,
      data: {
        transactions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get admin transactions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get transactions'
    });
  }
});

// Get all game sessions
router.get('/sessions', adminAuth, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      status,
      gameCode,
      userId,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = {};
    
    if (status) query.status = status;
    if (gameCode) query.gameCode = gameCode;
    if (userId) query.user = userId;

    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const sessions = await GameSession.find(query)
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('user', 'username email');

    const total = await GameSession.countDocuments(query);

    res.json({
      success: true,
      data: {
        sessions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get admin sessions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get game sessions'
    });
  }
});

// Add bonus to user
router.post('/users/:userId/bonus', adminAuth, [
  body('amount').isFloat({ min: 1 }).withMessage('Amount must be greater than 0'),
  body('currency').isIn(['RUB', 'USD', 'EUR']).withMessage('Invalid currency'),
  body('description').isLength({ min: 1, max: 255 }).withMessage('Description is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { amount, currency, description } = req.body;
    const userId = req.params.userId;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Create bonus transaction
    const transaction = new Transaction({
      user: userId,
      transactionId: Transaction.generateTransactionId(),
      type: 'bonus',
      amount: amount,
      currency: currency,
      balanceBefore: user.bonusBalance,
      balanceAfter: user.bonusBalance + amount,
      description: description,
      status: 'completed'
    });

    // Update user balance
    user.bonusBalance += amount;

    await Promise.all([transaction.save(), user.save()]);

    res.json({
      success: true,
      message: 'Bonus added successfully',
      data: {
        transaction,
        newBonusBalance: user.bonusBalance
      }
    });
  } catch (error) {
    console.error('Add bonus error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add bonus'
    });
  }
});

// System settings
const Settings = require('../models/Settings');

// Get all settings
router.get('/settings', adminAuth, async (req, res) => {
  try {
    const settings = await Settings.get();
    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Get admin settings error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get settings'
    });
  }
});

// Update settings section
router.put('/settings/:section', adminAuth, async (req, res) => {
  try {
    const { section } = req.params;
    const validSections = ['general', 'bonuses', 'payments', 'vip', 'security'];
    
    if (!validSections.includes(section)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid settings section'
      });
    }
    
    const settings = await Settings.updateSection(section, req.body);
    
    console.log(`Admin ${req.user.username} updated ${section} settings`);
    
    res.json({
      success: true,
      message: `${section} settings updated`,
      data: settings
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update settings'
    });
  }
});

// Update all settings at once
router.put('/settings', adminAuth, async (req, res) => {
  try {
    const settings = await Settings.updateAll(req.body);
    
    console.log(`Admin ${req.user.username} updated all settings`);
    
    res.json({
      success: true,
      message: 'All settings updated',
      data: settings
    });
  } catch (error) {
    console.error('Update all settings error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update settings'
    });
  }
});

// Reset settings to defaults
router.post('/settings/reset', adminAuth, async (req, res) => {
  try {
    const settings = await Settings.reset();
    
    console.log(`Admin ${req.user.username} reset settings to defaults`);
    
    res.json({
      success: true,
      message: 'Settings reset to defaults',
      data: settings
    });
  } catch (error) {
    console.error('Reset settings error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset settings'
    });
  }
});

module.exports = router;