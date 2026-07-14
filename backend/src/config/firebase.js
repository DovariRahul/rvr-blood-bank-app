const admin = require('firebase-admin');
const { logger } = require('../utils/logger');

/**
 * Initialize Firebase Admin SDK for push notifications.
 * Extracted from the original fcm.service.js for clean separation.
 */
let isFirebaseInitialized = false;

const fs = require('fs');
const path = require('path');

function initFirebase() {
  if (isFirebaseInitialized) return true;

  try {
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    const resolvedPath = serviceAccountPath ? path.resolve(serviceAccountPath) : null;

    if (resolvedPath && fs.existsSync(resolvedPath)) {
      // Load from file path
      const serviceAccount = require(resolvedPath);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      isFirebaseInitialized = true;
      logger.info('Firebase Admin initialized successfully from service account file.');
    } else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      // Fallback: load from JSON string in env (original approach)
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      isFirebaseInitialized = true;
      logger.info('Firebase Admin initialized successfully from env variable.');
    } else {
      logger.warn('Firebase service account not configured. FCM notifications will be simulated.');
    }
  } catch (error) {
    logger.error('Failed to initialize Firebase Admin:', error.message);
  }

  return isFirebaseInitialized;
}

function getFirebaseInitStatus() {
  return isFirebaseInitialized;
}

module.exports = { initFirebase, getFirebaseInitStatus, admin };
