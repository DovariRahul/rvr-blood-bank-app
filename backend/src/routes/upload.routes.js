const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { uploadLimiter } = require('../middleware/rateLimiter');
const { uploadMedicalProof: uploadMedicalProofMiddleware, uploadAvatar: uploadAvatarMiddleware } = require('../middleware/upload');
const { uploadMedicalProof, uploadAvatar, deleteUpload } = require('../controllers/upload.controller');

// Medical proof upload (authenticated, rate limited)
router.post('/medical-proof', authenticate, uploadLimiter, uploadMedicalProofMiddleware, uploadMedicalProof);

// Avatar upload (authenticated, rate limited)
router.post('/avatar', authenticate, uploadLimiter, uploadAvatarMiddleware, uploadAvatar);

// Delete upload (authenticated)
router.delete('/:publicId', authenticate, deleteUpload);

module.exports = router;
