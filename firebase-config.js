const admin = require('firebase-admin');
require('dotenv').config();

// Initialize Firebase Admin with service account
const serviceAccount = require('./serviceAccountKey.json');

const app = admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET
});

const db = admin.firestore();

module.exports = { db }; 