const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/roles');
const { bloodRequestValidator, paginationValidator } = require('../middleware/validator');
const {
  createRequest, getRequest, getRequests, updateRequestStatus, cancelRequest, deleteRequest,
} = require('../controllers/requests.controller');

router.post('/', authenticate, authorize('requester', 'donor', 'admin'), bloodRequestValidator, createRequest);
router.get('/', authenticate, paginationValidator, getRequests);
router.get('/:id', authenticate, getRequest);
router.patch('/:id/status', authenticate, authorize('admin'), updateRequestStatus);
router.patch('/:id/cancel', authenticate, cancelRequest);
router.delete('/:id', authenticate, deleteRequest);

module.exports = router;
