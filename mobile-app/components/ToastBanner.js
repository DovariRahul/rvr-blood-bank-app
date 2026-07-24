import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Animated, Platform } from 'react-native';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { clearToastMessage } from '../store/slices/authSlice';
import { Ionicons } from '@expo/vector-icons';

/**
 * ToastBanner — auto-dismissing notification banner.
 * • Green (type: 'success') — for login, register, and action confirmations.
 * • Red   (type: 'error')   — for logout and deletions.
 */
export default function ToastBanner() {
  const dispatch = useAppDispatch();
  const { toastMessage, toastType } = useAppSelector((state) => state.auth);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef(null);

  useEffect(() => {
    // Clear any existing pending timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (toastMessage) {
      // Always reset opacity to 0 first so re-triggers animate from scratch
      fadeAnim.setValue(0);

      // Fade in over 400ms
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();

      // After 4 seconds, fade out then clear from Redux
      timerRef.current = setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }).start(() => {
          dispatch(clearToastMessage());
        });
      }, 4000);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [toastMessage]);

  // Don't render when there is no message
  if (!toastMessage) return null;

  const isError = toastType === 'error';
  const bgColor = isError ? '#DC2626' : '#16A34A';
  const iconName = isError ? 'alert-circle' : 'checkmark-circle';

  return (
    <Animated.View
      style={[
        styles.container,
        { opacity: fadeAnim, backgroundColor: bgColor },
      ]}
    >
      <View style={styles.content}>
        <Ionicons name={iconName} size={22} color="#fff" style={styles.icon} />
        <Text style={styles.text} numberOfLines={2}>{toastMessage}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 10,
  },
  text: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
    lineHeight: 20,
  },
});
