import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import { COLORS, SIZES, FONTS, SHADOWS } from '../config/theme';

const GradientButton = ({ title, onPress, loading, disabled, style, variant = 'primary', icon }) => {
  const isPrimary = variant === 'primary';

  return (
    <TouchableOpacity
      style={[
        styles.button,
        isPrimary ? styles.primaryButton : styles.outlineButton,
        disabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={COLORS.white} size="small" />
      ) : (
        <View style={styles.content}>
          {icon}
          <Text style={[styles.text, !isPrimary && styles.outlineText, icon && { marginLeft: 8 }]}>
            {title}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    height: 54,
    borderRadius: SIZES.radius,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.button,
  },
  primaryButton: {
    backgroundColor: COLORS.red,
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: COLORS.red,
  },
  disabled: {
    opacity: 0.5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    color: COLORS.white,
    fontSize: SIZES.base,
    ...FONTS.bold,
    letterSpacing: 0.5,
  },
  outlineText: {
    color: COLORS.red,
  },
});

export default GradientButton;
