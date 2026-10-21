const mongoose = require('mongoose');
const GridFSStorageProvider = require('./GridFSStorageProvider');
const LocalStorageProvider = require('./LocalStorageProvider');

let currentProvider = null;

function getStorageProvider() {
  if (currentProvider) return currentProvider;

  // Use GridFS if MongoDB connection is open, otherwise fallback to local
  const storageType = process.env.STORAGE_PROVIDER || 'gridfs';

  if (storageType === 'local' || !mongoose.connection || mongoose.connection.readyState !== 1) {
    currentProvider = new LocalStorageProvider();
  } else {
    currentProvider = new GridFSStorageProvider();
  }

  return currentProvider;
}

// Allows switching provider (e.g. during testing or config change)
function setStorageProvider(provider) {
  currentProvider = provider;
}

module.exports = {
  getStorageProvider,
  setStorageProvider,
  GridFSStorageProvider,
  LocalStorageProvider
};
