const express = require('express');
const { body, validationResult } = require('express-validator');
const { User, GameSession, Transaction } = require('../models/temp-models');
const { auth } = require('../middleware/auth');
const router = express.Router();

// Get user profile
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password')
      .populate('referredBy', 'username');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Get referral count
    const referralCount = await User.countDocuments({ referredBy: user._id });

    // Get recent activity
    const recentTransactions = await Transaction.find({ user: user._id })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('type amount currency status createdAt');

    res.json({
      success: true,
      data: {
        user: {
          ...user.toObject(),
          referralCount
        },
        recentTransactions
      }
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user profile'
    });
  }
});

// Update user settings
router.put('/settings', auth, [
  body('notifications.email').optional().isBoolean(),
  body('notifications.push').optional().isBoolean(),
  body('notifications.sms').optional().isBoolean(),
  body('privacy.showOnline').optional().isBoolean(),
  body('privacy.showStats').optional().isBoolean(),
  body('limits.dailyDeposit').optional().isFloat({ min: 0 }),
  body('limits.sessionTime').optional().isInt({ min: 0 })
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

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Update settings
    if (req.body.notifications) {
      Object.assign(user.settings.notifications, req.body.notifications);
    }
    if (req.body.privacy) {
      Object.assign(user.settings.privacy, req.body.privacy);
    }
    if (req.body.limits) {
      Object.assign(user.settings.limits, req.body.limits);
    }

    await user.save();

    res.json({
      success: true,
      message: 'Settings updated successfully',
      data: { settings: user.settings }
    });
  } catch (error) {
    console.error('Update user settings error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update settings'
    });
  }
});

// Get user statistics
router.get('/statistics', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { period = 'all' } = req.query;

    let dateFilter = {};
    if (period !== 'all') {
      const date = new Date();
      switch (period) {
        case 'today':
          date.setHours(0, 0, 0, 0);
          break;
        case 'week':
          date.setDate(date.getDate() - 7);
          break;
        case 'month':
          date.setMonth(date.getMonth() - 1);
          break;
      }
      dateFilter = { createdAt: { $gte: date } };
    }

    // Game statistics
    const gameStats = await GameSession.aggregate([
      { $match: { user: userId, ...dateFilter } },
      {
        $group: {
          _id: null,
          totalSessions: { $sum: 1 },
          totalBet: { $sum: '$totalBet' },
          totalWin: { $sum: '$totalWin' },
          totalSpins: { $sum: '$spinsCount' },
          avgBet: { $avg: '$totalBet' },
          maxWin: { $max: '$totalWin' },
          maxBet: { $max: '$totalBet' }
        }
      }
    ]);

    // Payment statistics
    const paymentStats = await Transaction.aggregate([
      { 
        $match: { 
          user: userId, 
          type: { $in: ['deposit', 'withdrawal'] },
          status: 'completed',
          ...dateFilter 
        } 
      },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Top games
    const topGames = await GameSession.aggregate([
      { $match: { user: userId, ...dateFilter } },
      {
        $group: {
          _id: '$gameCode',
          gameName: { $first: '$gameName' },
          sessions: { $sum: 1 },
          totalBet: { $sum: '$totalBet' },
          totalWin: { $sum: '$totalWin' },
          totalSpins: { $sum: '$spinsCount' }
        }
      },
      { $sort: { sessions: -1 } },
      { $limit: 10 }
    ]);

    // Monthly statistics for chart
    const monthlyStats = await GameSession.aggregate([
      { $match: { user: userId } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          totalBet: { $sum: '$totalBet' },
          totalWin: { $sum: '$totalWin' },
          sessions: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      { $limit: 12 }
    ]);

    const stats = gameStats.length > 0 ? gameStats[0] : {
      totalSessions: 0,
      totalBet: 0,
      totalWin: 0,
      totalSpins: 0,
      avgBet: 0,
      maxWin: 0,
      maxBet: 0
    };

    const deposits = paymentStats.find(p => p._id === 'deposit') || { total: 0, count: 0 };
    const withdrawals = paymentStats.find(p => p._id === 'withdrawal') || { total: 0, count: 0 };

    res.json({
      success: true,
      data: {
        period,
        gameStats: {
          ...stats,
          profit: stats.totalWin - stats.totalBet,
          rtp: stats.totalBet > 0 ? (stats.totalWin / stats.totalBet * 100) : 0
        },
        paymentStats: {
          totalDeposited: deposits.total,
          depositCount: deposits.count,
          totalWithdrawn: Math.abs(withdrawals.total),
          withdrawalCount: withdrawals.count,
          netDeposit: deposits.total + withdrawals.total
        },
        topGames,
        monthlyStats
      }
    });
  } catch (error) {
    console.error('Get user statistics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user statistics'
    });
  }
});

// Get referral information
router.get('/referrals', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;

    // Get referred users
    const referrals = await User.find({ referredBy: userId })
      .select('username createdAt totalDeposited gamesPlayed')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const totalReferrals = await User.countDocuments({ referredBy: userId });

    // Calculate referral earnings (5% commission on deposits)
    const referralEarnings = await Transaction.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'userInfo'
        }
      },
      {
        $match: {
          'userInfo.referredBy': userId,
          type: 'deposit',
          status: 'completed'
        }
      },
      {
        $group: {
          _id: null,
          totalCommission: { $sum: { $multiply: ['$amount', 0.05] } },
          totalDeposits: { $sum: '$amount' }
        }
      }
    ]);

    const earnings = referralEarnings.length > 0 ? referralEarnings[0] : {
      totalCommission: 0,
      totalDeposits: 0
    };

    res.json({
      success: true,
      data: {
        referrals,
        totalReferrals,
        earnings,
        referralCode: req.user.referralCode,
        referralLink: `${process.env.FRONTEND_URL}/register?ref=${req.user.referralCode}`,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalReferrals,
          pages: Math.ceil(totalReferrals / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get referrals error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get referral information'
    });
  }
});

// Get user's bonuses
router.get('/bonuses', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;

    const bonusTransactions = await Transaction.find({
      user: userId,
      type: 'bonus'
    })
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const totalBonuses = await Transaction.countDocuments({
      user: userId,
      type: 'bonus'
    });

    const totalBonusAmount = await Transaction.aggregate([
      {
        $match: {
          user: userId,
          type: 'bonus',
          status: 'completed'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        bonuses: bonusTransactions,
        totalBonusAmount: totalBonusAmount.length > 0 ? totalBonusAmount[0].total : 0,
        currentBonusBalance: req.user.bonusBalance,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalBonuses,
          pages: Math.ceil(totalBonuses / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get bonuses error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get bonus information'
    });
  }
});

// Claim daily bonus
router.post('/claim-daily-bonus', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Check if user already claimed bonus today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastBonus = await Transaction.findOne({
      user: user._id,
      type: 'bonus',
      description: { $regex: /Daily bonus/ },
      createdAt: { $gte: today }
    });

    if (lastBonus) {
      return res.status(400).json({
        success: false,
        error: 'Daily bonus already claimed today'
      });
    }

    // Calculate bonus amount based on VIP level
    const bonusAmount = 50 + (user.vipLevel * 10);

    // Create bonus transaction
    const transaction = new Transaction({
      user: user._id,
      transactionId: Transaction.generateTransactionId(),
      type: 'bonus',
      amount: bonusAmount,
      currency: 'RUB',
      balanceBefore: user.bonusBalance,
      balanceAfter: user.bonusBalance + bonusAmount,
      description: `Daily bonus - VIP Level ${user.vipLevel}`,
      status: 'completed',
      ipAddress: req.ip
    });

    // Update user bonus balance
    user.bonusBalance += bonusAmount;

    await Promise.all([transaction.save(), user.save()]);

    res.json({
      success: true,
      message: 'Daily bonus claimed successfully',
      data: {
        bonusAmount,
        newBonusBalance: user.bonusBalance
      }
    });
  } catch (error) {
    console.error('Claim daily bonus error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to claim daily bonus'
    });
  }
});

// Get VIP status and progress
router.get('/vip-status', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // VIP levels and requirements
    const vipLevels = [
      { level: 0, required: 0, benefits: ['Welcome bonus'] },
      { level: 1, required: 10000, benefits: ['5% deposit bonus', 'Priority support'] },
      { level: 2, required: 50000, benefits: ['10% deposit bonus', 'Weekly cashback'] },
      { level: 3, required: 100000, benefits: ['15% deposit bonus', 'Monthly bonus'] },
      { level: 4, required: 250000, benefits: ['20% deposit bonus', 'Personal manager'] },
      { level: 5, required: 500000, benefits: ['25% deposit bonus', 'Exclusive games'] },
      { level: 6, required: 1000000, benefits: ['30% deposit bonus', 'VIP tournaments'] },
      { level: 7, required: 2500000, benefits: ['35% deposit bonus', 'Premium support'] },
      { level: 8, required: 5000000, benefits: ['40% deposit bonus', 'Custom limits'] },
      { level: 9, required: 10000000, benefits: ['45% deposit bonus', 'VIP events'] },
      { level: 10, required: 25000000, benefits: ['50% deposit bonus', 'Ultimate VIP'] }
    ];

    const currentLevel = vipLevels.find(level => level.level === user.vipLevel);
    const nextLevel = vipLevels.find(level => level.level === user.vipLevel + 1);

    const progressToNext = nextLevel ? 
      (user.totalWagered / nextLevel.required) * 100 : 100;

    res.json({
      success: true,
      data: {
        currentLevel,
        nextLevel,
        totalWagered: user.totalWagered,
        progressToNext: Math.min(progressToNext, 100),
        remainingToNext: nextLevel ? Math.max(nextLevel.required - user.totalWagered, 0) : 0
      }
    });
  } catch (error) {
    console.error('Get VIP status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get VIP status'
    });
  }
});

module.exports = router;