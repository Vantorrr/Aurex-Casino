const express = require('express');
const router = express.Router();
const { auth, adminAuth } = require('../middleware/auth');

// In-memory хранилище верификаций
let verifications = [
  {
    id: 'VER-001',
    odid: 'AUREX-000001',
    odid: 'AUREX-000001',
    userId: '1',
    username: 'testuser',
    email: 'test@example.com',
    status: 'pending',
    level: 1,
    documents: {
      passport: { uploaded: true, status: 'pending', url: '/uploads/passport_1.jpg' },
      selfie: { uploaded: true, status: 'pending', url: '/uploads/selfie_1.jpg' },
      address: { uploaded: false, status: 'not_uploaded' },
    },
    personalInfo: {
      firstName: 'Иван',
      lastName: 'Петров',
      dateOfBirth: '1990-05-15',
      country: 'Россия',
      city: 'Москва',
      address: 'ул. Пушкина, д. 10',
    },
    submittedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
  },
  {
    id: 'VER-002',
    odid: 'AUREX-000002',
    odid: 'AUREX-000002',
    userId: '2',
    username: 'cryptofan',
    email: 'crypto@email.com',
    status: 'approved',
    level: 2,
    documents: {
      passport: { uploaded: true, status: 'approved', url: '/uploads/passport_2.jpg' },
      selfie: { uploaded: true, status: 'approved', url: '/uploads/selfie_2.jpg' },
      address: { uploaded: true, status: 'approved', url: '/uploads/address_2.jpg' },
    },
    personalInfo: {
      firstName: 'Алексей',
      lastName: 'Смирнов',
      dateOfBirth: '1985-11-20',
      country: 'Россия',
      city: 'Санкт-Петербург',
      address: 'Невский пр., д. 100',
    },
    submittedAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    approvedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
  },
];

// ============ USER ROUTES ============

// Получить статус верификации
router.get('/status', auth, async (req, res) => {
  try {
    const verification = verifications.find(v => v.odid === req.user.odid || v.userId === req.user.id);
    
    if (!verification) {
      return res.json({ 
        success: true, 
        data: { 
          status: 'not_started',
          level: 0,
          message: 'Верификация не начата'
        } 
      });
    }
    
    res.json({ success: true, data: verification });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Начать верификацию
router.post('/start', auth, async (req, res) => {
  try {
    const existing = verifications.find(v => v.odid === req.user.odid || v.userId === req.user.id);
    
    if (existing) {
      return res.status(400).json({ success: false, message: 'Верификация уже начата' });
    }
    
    const newVerification = {
      id: `VER-${String(Date.now()).slice(-6)}`,
      odid,
      odid,
      userId: req.user.id,
      username: req.user.username,
      email: req.user.email,
      status: 'pending',
      level: 0,
      documents: {
        passport: { uploaded: false, status: 'not_uploaded' },
        selfie: { uploaded: false, status: 'not_uploaded' },
        address: { uploaded: false, status: 'not_uploaded' },
      },
      personalInfo: req.body.personalInfo || {},
      submittedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    
    verifications.push(newVerification);
    res.json({ success: true, message: 'Верификация начата', data: newVerification });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Загрузить документ (имитация)
router.post('/upload/:docType', auth, async (req, res) => {
  try {
    const verification = verifications.find(v => v.odid === req.user.odid || v.userId === req.user.id);
    
    if (!verification) {
      return res.status(404).json({ success: false, message: 'Сначала начните верификацию' });
    }
    
    const { docType } = req.params;
    if (!['passport', 'selfie', 'address'].includes(docType)) {
      return res.status(400).json({ success: false, message: 'Неверный тип документа' });
    }
    
    verification.documents[docType] = {
      uploaded: true,
      status: 'pending',
      url: `/uploads/${docType}_${req.user.id}.jpg`,
      uploadedAt: new Date().toISOString(),
    };
    
    res.json({ success: true, message: 'Документ загружен', data: verification });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============ ADMIN ROUTES ============

// Получить все заявки
router.get('/', adminAuth, async (req, res) => {
  try {
    const { status } = req.query;
    
    let filtered = [...verifications];
    if (status && status !== 'all') {
      filtered = filtered.filter(v => v.status === status);
    }
    
    // Сортировка (pending первые)
    filtered.sort((a, b) => {
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (b.status === 'pending' && a.status !== 'pending') return 1;
      return new Date(b.submittedAt) - new Date(a.submittedAt);
    });
    
    res.json({ success: true, data: filtered });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Получить заявку по ID
router.get('/:id', adminAuth, async (req, res) => {
  try {
    const verification = verifications.find(v => v.id === req.params.id);
    if (!verification) {
      return res.status(404).json({ success: false, message: 'Заявка не найдена' });
    }
    res.json({ success: true, data: verification });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Одобрить верификацию
router.post('/:id/approve', adminAuth, async (req, res) => {
  try {
    const verification = verifications.find(v => v.id === req.params.id);
    
    if (!verification) {
      return res.status(404).json({ success: false, message: 'Заявка не найдена' });
    }
    
    verification.status = 'approved';
    verification.level = req.body.level || 1;
    verification.approvedAt = new Date().toISOString();
    verification.approvedBy = req.user.id;
    
    // Обновляем статус документов
    Object.keys(verification.documents).forEach(key => {
      if (verification.documents[key].uploaded) {
        verification.documents[key].status = 'approved';
      }
    });
    
    res.json({ success: true, message: 'Верификация одобрена', data: verification });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Отклонить верификацию
router.post('/:id/reject', adminAuth, async (req, res) => {
  try {
    const verification = verifications.find(v => v.id === req.params.id);
    
    if (!verification) {
      return res.status(404).json({ success: false, message: 'Заявка не найдена' });
    }
    
    verification.status = 'rejected';
    verification.rejectedAt = new Date().toISOString();
    verification.rejectedBy = req.user.id;
    verification.rejectionReason = req.body.reason || 'Документы не соответствуют требованиям';
    
    res.json({ success: true, message: 'Верификация отклонена', data: verification });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Статистика KYC
router.get('/admin/stats', adminAuth, async (req, res) => {
  try {
    const stats = {
      total: verifications.length,
      pending: verifications.filter(v => v.status === 'pending').length,
      approved: verifications.filter(v => v.status === 'approved').length,
      rejected: verifications.filter(v => v.status === 'rejected').length,
    };
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
