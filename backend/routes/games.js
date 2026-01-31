const express = require('express');
const { GameSession, Transaction, User } = require('../models/temp-models');
const { auth, optionalAuth } = require('../middleware/auth');
const router = express.Router();

// Get user's game sessions
router.get('/sessions', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const query = { user: req.user.id };
    
    if (status) {
      query.status = status;
    }

    const sessions = await GameSession.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('transactions');

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
    console.error('Get game sessions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get game sessions'
    });
  }
});

// Get specific game session
router.get('/sessions/:sessionId', auth, async (req, res) => {
  try {
    const session = await GameSession.findOne({
      sessionId: req.params.sessionId,
      user: req.user.id
    }).populate('transactions');

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Game session not found'
      });
    }

    res.json({
      success: true,
      data: { session }
    });
  } catch (error) {
    console.error('Get game session error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get game session'
    });
  }
});

// End game session
router.post('/sessions/:sessionId/end', auth, async (req, res) => {
  try {
    const session = await GameSession.findOne({
      sessionId: req.params.sessionId,
      user: req.user.id,
      status: 'active'
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Active game session not found'
      });
    }

    session.endSession();
    await session.save();

    res.json({
      success: true,
      message: 'Game session ended successfully',
      data: { session }
    });
  } catch (error) {
    console.error('End game session error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to end game session'
    });
  }
});

// Get user's game statistics
router.get('/stats', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get aggregated stats
    const stats = await GameSession.aggregate([
      { $match: { user: userId } },
      {
        $group: {
          _id: null,
          totalSessions: { $sum: 1 },
          totalBet: { $sum: '$totalBet' },
          totalWin: { $sum: '$totalWin' },
          totalSpins: { $sum: '$spinsCount' },
          avgSessionDuration: { $avg: { $subtract: ['$endedAt', '$startedAt'] } }
        }
      }
    ]);

    // Get favorite games
    const favoriteGames = await GameSession.aggregate([
      { $match: { user: userId } },
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

    // Get recent sessions
    const recentSessions = await GameSession.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('gameCode gameName totalBet totalWin spinsCount status createdAt endedAt');

    // Calculate profit/loss
    const profit = stats.length > 0 ? stats[0].totalWin - stats[0].totalBet : 0;

    res.json({
      success: true,
      data: {
        overview: stats.length > 0 ? {
          ...stats[0],
          profit,
          avgSessionDuration: Math.floor((stats[0].avgSessionDuration || 0) / 1000) // in seconds
        } : {
          totalSessions: 0,
          totalBet: 0,
          totalWin: 0,
          totalSpins: 0,
          profit: 0,
          avgSessionDuration: 0
        },
        favoriteGames,
        recentSessions
      }
    });
  } catch (error) {
    console.error('Get game stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get game statistics'
    });
  }
});

// Get game history with transactions
router.get('/history', auth, async (req, res) => {
  try {
    const { page = 1, limit = 50, type, gameCode } = req.query;
    const query = { user: req.user.id };
    
    if (type) {
      query.type = type;
    }
    
    if (gameCode) {
      query.gameCode = gameCode;
    }

    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('gameSession', 'sessionId gameName gameCode');

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
    console.error('Get game history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get game history'
    });
  }
});

// Get leaderboard
router.get('/leaderboard', optionalAuth, async (req, res) => {
  try {
    const { period = 'week', type = 'profit' } = req.query;
    
    let dateFilter = new Date();
    switch (period) {
      case 'day':
        dateFilter.setDate(dateFilter.getDate() - 1);
        break;
      case 'week':
        dateFilter.setDate(dateFilter.getDate() - 7);
        break;
      case 'month':
        dateFilter.setMonth(dateFilter.getMonth() - 1);
        break;
      default:
        dateFilter.setDate(dateFilter.getDate() - 7);
    }

    let sortField;
    switch (type) {
      case 'profit':
        sortField = { $subtract: ['$totalWin', '$totalBet'] };
        break;
      case 'wagered':
        sortField = '$totalBet';
        break;
      case 'wins':
        sortField = '$totalWin';
        break;
      default:
        sortField = { $subtract: ['$totalWin', '$totalBet'] };
    }

    const leaderboard = await GameSession.aggregate([
      { $match: { createdAt: { $gte: dateFilter } } },
      {
        $group: {
          _id: '$user',
          totalBet: { $sum: '$totalBet' },
          totalWin: { $sum: '$totalWin' },
          totalSessions: { $sum: 1 },
          totalSpins: { $sum: '$spinsCount' }
        }
      },
      {
        $addFields: {
          profit: { $subtract: ['$totalWin', '$totalBet'] }
        }
      },
      { $sort: { [type === 'profit' ? 'profit' : type === 'wagered' ? 'totalBet' : 'totalWin']: -1 } },
      { $limit: 100 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $project: {
          username: { $arrayElemAt: ['$user.username', 0] },
          totalBet: 1,
          totalWin: 1,
          profit: 1,
          totalSessions: 1,
          totalSpins: 1
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        leaderboard,
        period,
        type
      }
    });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get leaderboard'
    });
  }
});

// Get top games (most played)
router.get('/top-games', optionalAuth, async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    const topGames = await GameSession.aggregate([
      {
        $group: {
          _id: '$gameCode',
          gameName: { $first: '$gameName' },
          totalSessions: { $sum: 1 },
          totalPlayers: { $addToSet: '$user' },
          totalBet: { $sum: '$totalBet' },
          totalWin: { $sum: '$totalWin' },
          avgSessionTime: { $avg: { $subtract: ['$endedAt', '$startedAt'] } }
        }
      },
      {
        $addFields: {
          totalPlayers: { $size: '$totalPlayers' },
          rtp: { $multiply: [{ $divide: ['$totalWin', '$totalBet'] }, 100] }
        }
      },
      { $sort: { totalSessions: -1 } },
      { $limit: parseInt(limit) }
    ]);

    res.json({
      success: true,
      data: { topGames }
    });
  } catch (error) {
    console.error('Get top games error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get top games'
    });
  }
});

module.exports = router;