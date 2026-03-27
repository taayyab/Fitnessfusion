import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, SIZES, FONTS } from '../config/theme';

const { width } = Dimensions.get('window');

// Singleton alert manager
let _showAlert = null;

export const showAlert = (title, message, buttons, options = {}) => {
  if (_showAlert) {
    _showAlert(title, message, buttons, options);
  }
};

// Shortcut helpers
showAlert.success = (title, message, onOk) => {
  showAlert(title, message, [{ text: 'OK', onPress: onOk }], { type: 'success' });
};

showAlert.error = (title, message, onOk) => {
  showAlert(title, message, [{ text: 'OK', onPress: onOk }], { type: 'error' });
};

showAlert.confirm = (title, message, onConfirm, onCancel) => {
  showAlert(title, message, [
    { text: 'Cancel', style: 'cancel', onPress: onCancel },
    { text: 'Confirm', onPress: onConfirm },
  ], { type: 'warning' });
};

showAlert.destructive = (title, message, confirmText, onConfirm) => {
  showAlert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: confirmText || 'Delete', style: 'destructive', onPress: onConfirm },
  ], { type: 'error' });
};

const ICON_MAP = {
  success: { name: 'check-circle', color: COLORS.success },
  error: { name: 'error', color: COLORS.red },
  warning: { name: 'warning', color: COLORS.warning },
  info: { name: 'info', color: COLORS.info },
};

const ThemedAlertProvider = ({ children }) => {
  const [visible, setVisible] = useState(false);
  const [alertData, setAlertData] = useState({
    title: '',
    message: '',
    buttons: [],
    type: 'info',
  });
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    _showAlert = (title, message, buttons, options = {}) => {
      setAlertData({
        title: title || '',
        message: message || '',
        buttons: buttons || [{ text: 'OK' }],
        type: options.type || 'info',
      });
      setVisible(true);
    };

    return () => {
      _showAlert = null;
    };
  }, []);

  useEffect(() => {
    if (visible) {
      scaleAnim.setValue(0.8);
      opacityAnim.setValue(0);
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          damping: 15,
          stiffness: 250,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleClose = (callback) => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setVisible(false);
      if (callback) callback();
    });
  };

  const icon = ICON_MAP[alertData.type] || ICON_MAP.info;
  const accentColor = icon.color;

  return (
    <>
      {children}
      <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
        <Animated.View style={[styles.overlay, { opacity: opacityAnim }]}>
          <TouchableOpacity
            style={styles.overlayTouch}
            activeOpacity={1}
            onPress={() => {
              if (alertData.buttons.length <= 1) handleClose();
            }}
          />
          <Animated.View
            style={[
              styles.container,
              {
                transform: [{ scale: scaleAnim }],
                borderTopColor: accentColor,
              },
            ]}
          >
            {/* Icon */}
            <View style={[styles.iconCircle, { backgroundColor: accentColor + '15' }]}>
              <MaterialIcons name={icon.name} size={32} color={accentColor} />
            </View>

            {/* Title */}
            {alertData.title ? (
              <Text style={styles.title}>{alertData.title}</Text>
            ) : null}

            {/* Message */}
            {alertData.message ? (
              <Text style={styles.message}>{alertData.message}</Text>
            ) : null}

            {/* Buttons */}
            <View style={[
              styles.buttonRow,
              alertData.buttons.length === 1 && styles.buttonRowSingle,
            ]}>
              {alertData.buttons.map((btn, index) => {
                const isDestructive = btn.style === 'destructive';
                const isCancel = btn.style === 'cancel';
                const isPrimary = !isCancel && !isDestructive && index === alertData.buttons.length - 1;

                let btnStyle = styles.btnDefault;
                let textStyle = styles.btnTextDefault;

                if (isCancel) {
                  btnStyle = styles.btnCancel;
                  textStyle = styles.btnTextCancel;
                } else if (isDestructive) {
                  btnStyle = styles.btnDestructive;
                  textStyle = styles.btnTextDestructive;
                } else if (isPrimary || alertData.buttons.length === 1) {
                  btnStyle = [styles.btnPrimary, { backgroundColor: accentColor }];
                  textStyle = styles.btnTextPrimary;
                }

                return (
                  <TouchableOpacity
                    key={index}
                    style={[styles.btn, btnStyle, alertData.buttons.length === 1 && styles.btnFull]}
                    onPress={() => handleClose(btn.onPress)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.btnText, textStyle]}>{btn.text}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Animated.View>
        </Animated.View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  overlayTouch: {
    ...StyleSheet.absoluteFillObject,
  },
  container: {
    width: width - 60,
    maxWidth: 360,
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderTopWidth: 3,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    color: COLORS.white,
    fontSize: SIZES.lg,
    ...FONTS.bold,
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    color: COLORS.textSecondary,
    fontSize: SIZES.md,
    ...FONTS.regular,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  buttonRowSingle: {
    justifyContent: 'center',
  },
  btn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnFull: {
    flex: undefined,
    width: '100%',
  },
  btnCancel: {
    backgroundColor: COLORS.cardLight,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  btnPrimary: {
    backgroundColor: COLORS.red,
  },
  btnDestructive: {
    backgroundColor: COLORS.red,
  },
  btnDefault: {
    backgroundColor: COLORS.cardLight,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  btnText: {
    fontSize: SIZES.md,
    ...FONTS.bold,
  },
  btnTextCancel: {
    color: COLORS.textSecondary,
  },
  btnTextPrimary: {
    color: COLORS.white,
  },
  btnTextDestructive: {
    color: COLORS.white,
  },
  btnTextDefault: {
    color: COLORS.white,
  },
});

export default ThemedAlertProvider;
