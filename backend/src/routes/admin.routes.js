const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/roles');
const { paginationValidator } = require('../middleware/validator');
const {
  getAnalytics, getActiveRequests, getPendingVerification, verifyRequest,
  updateUser, getAuditLog, getUsers, getUserById,
} = require('../controllers/admin.controller');

// All admin routes require admin role
router.use(authenticate, authorize('admin'));

router.get('/analytics', getAnalytics);
router.get('/requests/active', getActiveRequests);
router.get('/requests/pending-verification', getPendingVerification);
router.patch('/requests/:id/verify', verifyRequest);
router.get('/users', paginationValidator, getUsers);
router.get('/users/:id', getUserById);
router.patch('/users/:id', updateUser);
router.get('/audit-log', paginationValidator, getAuditLog);

module.exports = router;
