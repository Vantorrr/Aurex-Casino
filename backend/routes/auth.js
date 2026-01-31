const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { User } = require('../models/temp-models');
const config = require('../config/config');
const { auth } = require('../middleware/auth');
const router = express.Router();

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn
  });
};

// Register
router.post('/register', [
  body('username')
    .isLength({ min: 3, max: 32 })
    .withMessage('Username must be between 3 and 32 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers and underscores'),
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  body('firstName')
    .optional()
    .isLength({ max: 50 })
    .withMessage('First name must not exceed 50 characters'),
  body('lastName')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Last name must not exceed 50 characters')
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

    const { username, email, password, firstName, lastName } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: existingUser.email === email ? 'Email already registered' : 'Username already taken'
      });
    }

    // Create new user
    const user = new User({
      username,
      email,
      password,
      firstName,
      lastName,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    // Generate referral code
    user.generateReferralCode();

    // Give welcome bonus
    user.balance.RUB = 1000; // 1000 RUB welcome bonus
    user.bonusBalance = 500; // 500 RUB bonus balance

    await user.save();

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          balance: user.balance,
          bonusBalance: user.bonusBalance,
          referralCode: user.referralCode,
          vipLevel: user.vipLevel,
          isVerified: user.isVerified
        },
        token
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Registration failed'
    });
  }
});

// Login - поддержка входа по email ИЛИ username
router.post('/login', [
  body('password')
    .notEmpty()
    .withMessage('Password is required')
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

    // Поддержка login (username) или email
    const { login, email, password } = req.body;
    const loginValue = login || email;

    if (!loginValue) {
      return res.status(400).json({
        success: false,
        error: 'Email или логин обязателен'
      });
    }

    // Поиск пользователя по email ИЛИ username
    let user = await User.findOne({ email: loginValue });
    if (!user) {
      user = await User.findOne({ username: loginValue });
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Неверный логин или пароль'
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Неверный логин или пароль'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'Аккаунт деактивирован'
      });
    }

    // Update last login info
    user.lastLogin = new Date();
    user.ipAddress = req.ip;
    user.userAgent = req.get('User-Agent');
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          odid: user.odid || `AUREX-${String(user._id).padStart(6, '0')}`,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          balance: user.balance || 0,
          bonusBalance: user.bonusBalance || 0,
          vipLevel: user.vipLevel || 1,
          vipPoints: user.vipPoints || 0,
          isVerified: user.isVerified || false,
          isAdmin: user.isAdmin || false,
          role: user.isAdmin ? 'admin' : (user.role || 'user'),
          lastLogin: user.lastLogin,
          depositCount: user.depositCount || 0,
          usedBonuses: user.usedBonuses || {
            firstDeposit: false,
            secondDeposit: false,
            thirdDeposit: false,
            fourthDeposit: false
          },
          wager: user.wager || { required: 0, completed: 0, active: false },
          referral: user.referral || { code: '', referredBy: null, referralCount: 0, referralEarnings: 0 }
        },
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed'
    });
  }
});

// Get current user
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          odid: user.odid || `AUREX-${String(user._id).padStart(6, '0')}`,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: user.fullName,
          avatar: user.avatar,
          balance: user.balance,
          bonusBalance: user.bonusBalance,
          totalBalanceRUB: user.totalBalanceRUB,
          vipLevel: user.vipLevel,
          isVerified: user.isVerified,
          isAdmin: user.isAdmin,
          referralCode: user.referralCode,
          totalDeposited: user.totalDeposited,
          totalWithdrawn: user.totalWithdrawn,
          gamesPlayed: user.gamesPlayed,
          totalWagered: user.totalWagered,
          depositCount: user.depositCount || 0,
          usedBonuses: user.usedBonuses || {},
          wager: user.wager,
          settings: user.settings,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt
        }
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user data'
    });
  }
});

// Update user profile
router.put('/profile', auth, [
  body('firstName')
    .optional()
    .isLength({ max: 50 })
    .withMessage('First name must not exceed 50 characters'),
  body('lastName')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Last name must not exceed 50 characters'),
  body('settings.notifications.email')
    .optional()
    .isBoolean()
    .withMessage('Email notifications must be boolean'),
  body('settings.notifications.push')
    .optional()
    .isBoolean()
    .withMessage('Push notifications must be boolean'),
  body('settings.privacy.showOnline')
    .optional()
    .isBoolean()
    .withMessage('Show online status must be boolean')
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
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Update allowed fields
    if (updates.firstName !== undefined) user.firstName = updates.firstName;
    if (updates.lastName !== undefined) user.lastName = updates.lastName;
    if (updates.settings) {
      if (updates.settings.notifications) {
        Object.assign(user.settings.notifications, updates.settings.notifications);
      }
      if (updates.settings.privacy) {
        Object.assign(user.settings.privacy, updates.settings.privacy);
      }
    }

    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: user.fullName,
          settings: user.settings
        }
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update profile'
    });
  }
});

// Change password
router.put('/change-password', auth, [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one lowercase letter, one uppercase letter, and one number')
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

    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to change password'
    });
  }
});

// Refresh token
router.post('/refresh', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      data: { token }
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh token'
    });
  }
});

// Get current user
router.get('/me', auth, async (req, res) => {
  try {
    const userResult = User.findById(req.user.id);
    const user = await userResult.select('-password');
    if (!user || !user.isActive) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user data'
    });
  }
});

// Get user's transactions history
router.get('/transactions', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20, type } = req.query;
    
    // Get transactions from global store
    const allTransactions = global.tempTransactions || [];
    
    // Filter by user
    let userTransactions = allTransactions.filter(t => 
      t.user === req.user.id || t.userId === req.user.id
    );
    
    // Filter by type if specified
    if (type && type !== 'all') {
      userTransactions = userTransactions.filter(t => t.type === type);
    }
    
    // Sort by date (newest first)
    userTransactions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // Paginate
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const paginatedTransactions = userTransactions.slice(offset, offset + parseInt(limit));
    
    res.json({
      success: true,
      data: {
        transactions: paginatedTransactions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: userTransactions.length,
          pages: Math.ceil(userTransactions.length / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get transactions'
    });
  }
});

// Get user's game history
router.get('/games/history', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    
    // Get game sessions from global store
    const allSessions = global.tempGameSessions || [];
    
    // Filter by user
    let userSessions = allSessions.filter(s => 
      s.user === req.user.id || s.userId === req.user.id
    );
    
    // Sort by date (newest first)
    userSessions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // Paginate
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const paginatedSessions = userSessions.slice(offset, offset + parseInt(limit));
    
    // Calculate stats
    const stats = {
      totalGames: userSessions.length,
      totalBet: userSessions.reduce((sum, s) => sum + (s.totalBet || 0), 0),
      totalWin: userSessions.reduce((sum, s) => sum + (s.totalWin || 0), 0),
      biggestWin: Math.max(0, ...userSessions.map(s => s.totalWin || 0))
    };
    
    res.json({
      success: true,
      data: {
        sessions: paginatedSessions,
        stats,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: userSessions.length,
          pages: Math.ceil(userSessions.length / parseInt(limit))
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

// Logout (client-side only, token blacklisting would require Redis)
router.post('/logout', auth, (req, res) => {
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

module.exports = router;