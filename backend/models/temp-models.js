// Временные модели для работы без MongoDB
const bcrypt = require('bcryptjs');

// Заглушка для User модели
const User = {
  findById: (id) => {
    const user = global.tempUsers.find(user => user._id === id);
    if (user) {
      // Добавляем метод comparePassword
      user.comparePassword = async function(password) {
        return await bcrypt.compare(password, this.password);
      };
      
      // Добавляем метод save
      user.save = async function() {
        const index = global.tempUsers.findIndex(u => u._id === this._id);
        if (index !== -1) {
          global.tempUsers[index] = { ...this };
        }
        return Promise.resolve(this);
      };
    }
    return Promise.resolve(user);
  },
  
  findOne: (query) => {
    let user = null;
    
    // Поддержка $or для MongoDB-style запросов
    if (query.$or) {
      for (const condition of query.$or) {
        if (condition.email) {
          user = global.tempUsers.find(u => u.email === condition.email);
        } else if (condition.username) {
          user = global.tempUsers.find(u => u.username === condition.username);
        }
        if (user) break;
      }
    } else if (query.email) {
      user = global.tempUsers.find(u => u.email === query.email);
    } else if (query.username) {
      user = global.tempUsers.find(u => u.username === query.username);
    } else if (query.odid) {
      user = global.tempUsers.find(u => u.odid === query.odid);
    } else if (query.b2b_user_id) {
      user = global.tempUsers.find(u => u.b2b_user_id === query.b2b_user_id);
    } else if (query._id) {
      user = global.tempUsers.find(u => u._id === query._id);
    }
    
    if (user) {
      // Добавляем метод comparePassword
      user.comparePassword = async function(password) {
        return await bcrypt.compare(password, this.password);
      };
      
      // Добавляем метод save
      user.save = async function() {
        const index = global.tempUsers.findIndex(u => u._id === this._id);
        if (index !== -1) {
          global.tempUsers[index] = { ...this };
        }
        return Promise.resolve(this);
      };
    }
    
    return Promise.resolve(user);
  },
  
  findByB2BId: (b2b_user_id) => {
    const user = global.tempUsers.find(user => user.b2b_user_id === b2b_user_id);
    if (user) {
      user.comparePassword = async function(password) {
        return await bcrypt.compare(password, this.password);
      };
      
      // Добавляем метод save
      user.save = async function() {
        const index = global.tempUsers.findIndex(u => u._id === this._id);
        if (index !== -1) {
          global.tempUsers[index] = { ...this };
        }
        return Promise.resolve(this);
      };
    }
    return Promise.resolve(user);
  },
  
  find: (query = {}) => {
    // Return a chainable query object for MongoDB-like API
    let results = [...global.tempUsers];
    
    const queryObj = {
      _results: results,
      _selectedFields: null,
      _sortField: null,
      _sortOrder: 1,
      _limitVal: null,
      _skipVal: 0,
      
      select: function(fields) {
        this._selectedFields = fields;
        return this;
      },
      
      sort: function(sortObj) {
        if (sortObj) {
          const key = Object.keys(sortObj)[0];
          this._sortField = key;
          this._sortOrder = sortObj[key];
        }
        return this;
      },
      
      limit: function(n) {
        this._limitVal = n;
        return this;
      },
      
      skip: function(n) {
        this._skipVal = n;
        return this;
      },
      
      populate: function() {
        // No-op for temp storage
        return this;
      },
      
      then: function(resolve, reject) {
        try {
          let data = [...this._results];
          
          // Apply sort
          if (this._sortField) {
            data.sort((a, b) => {
              const aVal = a[this._sortField] || 0;
              const bVal = b[this._sortField] || 0;
              return this._sortOrder > 0 ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
            });
          }
          
          // Apply skip and limit
          if (this._skipVal) {
            data = data.slice(this._skipVal);
          }
          if (this._limitVal) {
            data = data.slice(0, this._limitVal);
          }
          
          // Apply select (remove password if -password)
          if (this._selectedFields === '-password') {
            data = data.map(u => {
              const { password, ...rest } = u;
              return rest;
            });
          }
          
          resolve(data);
        } catch (err) {
          reject(err);
        }
      }
    };
    
    return queryObj;
  },
  
  countDocuments: (query = {}) => {
    return Promise.resolve(global.tempUsers.length);
  },
  
  create: (userData) => {
    // Generate unique AUREX ID
    const userCount = global.tempUsers.length + 1;
    const odid = `AUREX-${String(userCount).padStart(6, '0')}`;
    
    const newUser = {
      ...userData,
      _id: Date.now().toString(),
      odid: odid, // Unique AUREX ID
      createdAt: new Date(),
      lastLogin: new Date(),
      isActive: true,
      role: userData.role || 'user',
      vipLevel: userData.vipLevel || 1,
      vipPoints: userData.vipPoints || 0,
      balance: userData.balance || 0,
      bonusBalance: userData.bonusBalance || 0,
      currency: userData.currency || 'EUR',
      isAdmin: userData.isAdmin || false,
      isVerified: userData.isVerified || false,
      b2b_user_id: userData.b2b_user_id || `aurex_${Date.now()}`,
      
      // Deposit tracking
      depositCount: 0,
      usedBonuses: {
        firstDeposit: false,
        secondDeposit: false,
        thirdDeposit: false,
        fourthDeposit: false
      },
      
      // Wager tracking
      wager: {
        required: 0,        // Сколько нужно отыграть
        completed: 0,       // Сколько уже отыграно
        active: false,      // Есть ли активный вейджер
        multiplier: 0,      // x35, x30, etc
        expiresAt: null     // Когда истекает
      },
      
      // Active bonuses
      activeBonuses: [],    // Массив активных бонусов
      
      // Referral system
      referral: {
        code: Math.random().toString(36).substring(2, 8).toUpperCase(),
        referredBy: null,
        referralCount: 0,
        referralEarnings: 0
      },
      
      // Limits (responsible gaming)
      limits: {
        dailyDeposit: null,
        weeklyDeposit: null,
        monthlyDeposit: null,
        sessionTime: null,
        selfExcluded: false,
        selfExcludedUntil: null
      },
      
      statistics: {
        totalDeposits: 0,
        totalWithdrawals: 0,
        totalWagered: 0,
        totalWon: 0,
        totalLost: 0,
        gamesPlayed: 0,
        biggestWin: 0,
        favoriteGame: null
      }
    };
    global.tempUsers.push(newUser);
    return Promise.resolve(newUser);
  },
  
  findByIdAndUpdate: (id, update) => {
    const userIndex = global.tempUsers.findIndex(user => user._id === id || user.b2b_user_id === id);
    if (userIndex !== -1) {
      global.tempUsers[userIndex] = { ...global.tempUsers[userIndex], ...update };
      return Promise.resolve(global.tempUsers[userIndex]);
    }
    return Promise.resolve(null);
  },
  
  updateBalance: (userId, newBalance) => {
    const userIndex = global.tempUsers.findIndex(user => user._id === userId || user.b2b_user_id === userId);
    if (userIndex !== -1) {
      global.tempUsers[userIndex].balance = newBalance;
      return Promise.resolve(global.tempUsers[userIndex]);
    }
    return Promise.resolve(null);
  },
  
  deleteOne: (query) => {
    const index = global.tempUsers.findIndex(user => 
      (query._id && user._id === query._id) ||
      (query.email && user.email === query.email)
    );
    if (index !== -1) {
      global.tempUsers.splice(index, 1);
      return Promise.resolve({ deletedCount: 1 });
    }
    return Promise.resolve({ deletedCount: 0 });
  }
};

// Добавляем метод select для имитации mongoose
User.findById = (id) => {
  const user = global.tempUsers.find(user => user._id === id);
  
  if (user) {
    // Добавляем методы к пользователю
    user.comparePassword = async function(password) {
      return await bcrypt.compare(password, this.password);
    };
    
    user.save = async function() {
      const index = global.tempUsers.findIndex(u => u._id === this._id);
      if (index !== -1) {
        global.tempUsers[index] = { ...this };
      }
      return Promise.resolve(this);
    };
  }
  
  return {
    select: (fields) => {
      if (!user) return Promise.resolve(null);
      if (fields === '-password') {
        const { password, ...userWithoutPassword } = user;
        return Promise.resolve(userWithoutPassword);
      }
      return Promise.resolve(user);
    }
  };
};

// Заглушка для GameSession модели
const GameSession = {
  create: (sessionData) => {
    const session = {
      ...sessionData,
      _id: Date.now().toString(),
      createdAt: new Date()
    };
    global.tempSessions.push(session);
    return Promise.resolve(session);
  },
  find: (query = {}) => Promise.resolve(global.tempSessions),
  findById: (id) => Promise.resolve(global.tempSessions.find(s => s._id === id)),
  findByIdAndUpdate: (id, update) => {
    const index = global.tempSessions.findIndex(s => s._id === id);
    if (index !== -1) {
      global.tempSessions[index] = { ...global.tempSessions[index], ...update };
      return Promise.resolve(global.tempSessions[index]);
    }
    return Promise.resolve(null);
  },
  countDocuments: (query = {}) => {
    let sessions = global.tempSessions || [];
    
    if (query.createdAt?.$gte) {
      sessions = sessions.filter(s => new Date(s.createdAt) >= query.createdAt.$gte);
    }
    if (query.status) {
      sessions = sessions.filter(s => s.status === query.status);
    }
    
    return Promise.resolve(sessions.length);
  },
  aggregate: (pipeline = []) => {
    // Simple aggregation simulation
    const sessions = global.tempSessions || [];
    
    let result = { revenue: 0, totalBet: 0, totalWin: 0 };
    sessions.forEach(s => {
      result.totalBet += s.totalBet || 0;
      result.totalWin += s.totalWin || 0;
      result.revenue += (s.totalBet || 0) - (s.totalWin || 0);
    });
    
    return Promise.resolve([result]);
  }
};

// Заглушка для Transaction модели
const Transaction = {
  create: (transactionData) => {
    const transaction = {
      ...transactionData,
      _id: Date.now().toString(),
      createdAt: new Date()
    };
    global.tempTransactions.push(transaction);
    return Promise.resolve(transaction);
  },
  
  find: (query = {}) => {
    let results = [...global.tempTransactions];
    
    const queryObj = {
      _results: results,
      _sortField: null,
      _sortOrder: 1,
      _limitVal: null,
      _skipVal: 0,
      
      sort: function(sortObj) {
        if (sortObj) {
          const key = Object.keys(sortObj)[0];
          this._sortField = key;
          this._sortOrder = sortObj[key];
        }
        return this;
      },
      
      limit: function(n) {
        this._limitVal = n;
        return this;
      },
      
      skip: function(n) {
        this._skipVal = n;
        return this;
      },
      
      populate: function() {
        return this;
      },
      
      then: function(resolve, reject) {
        try {
          let data = [...this._results];
          
          if (this._sortField) {
            data.sort((a, b) => {
              const aVal = a[this._sortField] || 0;
              const bVal = b[this._sortField] || 0;
              return this._sortOrder > 0 ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
            });
          }
          
          if (this._skipVal) data = data.slice(this._skipVal);
          if (this._limitVal) data = data.slice(0, this._limitVal);
          
          resolve(data);
        } catch (err) {
          reject(err);
        }
      }
    };
    
    return queryObj;
  },
  
  findById: (id) => Promise.resolve(global.tempTransactions.find(t => t._id === id)),
  
  countDocuments: (query = {}) => Promise.resolve(global.tempTransactions.length),
  
  aggregate: (pipeline = []) => Promise.resolve([])
};

module.exports = {
  User,
  GameSession,
  Transaction
};