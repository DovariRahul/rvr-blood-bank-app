import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Cross-platform storage wrapper.
 * Falls back to localStorage on Web platform to bypass expo-secure-store browser limitations.
 */
const storage = {
  async setItem(key, value) {
    if (Platform.OS === 'web') {
      try {
        localStorage.setItem(key, value);
      } catch (e) {
        console.warn('localStorage.setItem failed:', e);
      }
      return;
    }
    
    // Native platforms
    try {
      if (SecureStore.setItemAsync) {
        await SecureStore.setItemAsync(key, value);
      } else {
        localStorage.setItem(key, value);
      }
    } catch (e) {
      console.warn('SecureStore.setItemAsync failed, trying localStorage:', e);
      try {
        localStorage.setItem(key, value);
      } catch (err) {}
    }
  },

  async getItem(key) {
    if (Platform.OS === 'web') {
      try {
        return localStorage.getItem(key);
      } catch (e) {
        return null;
      }
    }

    // Native platforms
    try {
      if (SecureStore.getItemAsync) {
        return await SecureStore.getItemAsync(key);
      } else {
        return localStorage.getItem(key);
      }
    } catch (e) {
      try {
        return localStorage.getItem(key);
      } catch (err) {
        return null;
      }
    }
  },

  async deleteItem(key) {
    if (Platform.OS === 'web') {
      try {
        localStorage.removeItem(key);
      } catch (e) {}
      return;
    }

    // Native platforms
    try {
      if (SecureStore.deleteItemAsync) {
        await SecureStore.deleteItemAsync(key);
      } else {
        localStorage.removeItem(key);
      }
    } catch (e) {
      try {
        localStorage.removeItem(key);
      } catch (err) {}
    }
  }
};

export default storage;
