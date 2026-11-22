import { type ReactNode, useEffect } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { AnimatedPressable } from '@/components/AnimatedPressable';
import { colors, displayFont, softShadow } from '@/constants/theme';
import { roleLabel } from '@/lib/format';
import type { SystemRole } from '@/types/database';

export function SafeScreen({
  children,
  edges = ['top'],
  style,
}: {
  children: ReactNode;
  edges?: Edge[];
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <SafeAreaView edges={edges} style={[styles.screen, style]}>
      {children}
    </SafeAreaView>
  );
}

export function PageHeader({
  kicker,
  title,
  subtitle,
  trailing,
  kickerStyle,
}: {
  kicker: string;
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
  kickerStyle?: StyleProp<TextStyle>;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.headerCopy}>
        <Text style={[styles.kicker, kickerStyle]}>{kicker}</Text>
        <View style={styles.rule} />
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {trailing}
    </View>
  );
}

export function Button({
  label,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
}) {
  const busy = loading || disabled;
  return (
    <AnimatedPressable
      accessibilityRole="button"
      disabled={busy}
      haptic={!busy}
      onPress={onPress}
      style={[
        styles.button,
        variant === 'primary' && styles.buttonPrimary,
        variant === 'secondary' && styles.buttonSecondary,
        variant === 'ghost' && styles.buttonGhost,
        variant === 'danger' && styles.buttonDanger,
        busy && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' || variant === 'danger' ? colors.white : colors.wine} />
      ) : (
        <Text
          style={[
            styles.buttonLabel,
            variant === 'secondary' && styles.buttonLabelSecondary,
            variant === 'ghost' && styles.buttonLabelGhost,
          ]}
        >
          {label}
        </Text>
      )}
    </AnimatedPressable>
  );
}

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  autoCapitalize = 'sentences',
  keyboardType = 'default',
  multiline = false,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: KeyboardTypeOptions;
  multiline?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        autoCorrect={autoCapitalize !== 'none'}
        keyboardType={keyboardType}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        style={[styles.input, multiline && styles.inputMultiline]}
      />
    </View>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const index = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  const width = useSharedValue(0);
  const progress = useSharedValue(index);

  useEffect(() => {
    progress.value = withSpring(index, { damping: 18, stiffness: 180 });
  }, [index, progress]);

  const pillStyle = useAnimatedStyle(() => ({
    width: Math.max(width.value / Math.max(options.length, 1) - 0, 0),
    transform: [{ translateX: progress.value * (width.value / Math.max(options.length, 1)) }],
  }));

  return (
    <View
      style={styles.segment}
      onLayout={(event) => {
        width.value = event.nativeEvent.layout.width - 8;
      }}
    >
      <Animated.View style={[styles.segmentPill, pillStyle]} />
      {options.map((option) => {
        const active = option.value === value;
        return (
          <AnimatedPressable
            key={option.value}
            haptic
            scaleTo={0.98}
            onPress={() => onChange(option.value)}
            style={styles.segmentItem}
          >
            <Text style={[styles.segmentLabel, active && styles.segmentLabelActive]}>{option.label}</Text>
          </AnimatedPressable>
        );
      })}
    </View>
  );
}

export function EmptyState({
  title,
  body,
  icon,
}: {
  title: string;
  body: string;
  icon?: ReactNode;
}) {
  return (
    <View style={styles.empty}>
      {icon ? <View style={styles.emptyIcon}>{icon}</View> : null}
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
    </View>
  );
}

export function RoleBadge({ role }: { role: SystemRole }) {
  const tone = role === 'admin' ? styles.badgeWine : role === 'teacher' ? styles.badgeGold : styles.badgeSage;
  const text =
    role === 'admin' ? styles.badgeTextWine : role === 'teacher' ? styles.badgeTextGold : styles.badgeTextSage;
  return (
    <View style={[styles.badge, tone]}>
      <Text style={[styles.badgeText, text]}>{roleLabel[role]}</Text>
    </View>
  );
}

export function InlineError({ message }: { message: string | null }) {
  if (!message) return null;
  return <Text style={styles.error}>{message}</Text>;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerCopy: {
    flex: 1,
    gap: 4,
  },
  kicker: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  rule: {
    width: 36,
    height: 2,
    borderRadius: 2,
    backgroundColor: colors.gold,
    marginTop: 2,
    marginBottom: 4,
  },
  title: {
    color: colors.ink,
    fontFamily: displayFont,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
  },
  button: {
    minHeight: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  buttonPrimary: {
    backgroundColor: colors.wine,
    ...softShadow,
  },
  buttonSecondary: {
    backgroundColor: colors.card,
    ...softShadow,
  },
  buttonGhost: {
    backgroundColor: 'transparent',
  },
  buttonDanger: {
    backgroundColor: colors.danger,
  },
  buttonLabel: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  buttonLabelSecondary: {
    color: colors.ink,
  },
  buttonLabelGhost: {
    color: colors.wine,
  },
  disabled: {
    opacity: 0.55,
  },
  field: {
    gap: 8,
  },
  fieldLabel: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '600',
  },
  input: {
    minHeight: 50,
    borderRadius: 16,
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    color: colors.ink,
    fontSize: 16,
    ...softShadow,
  },
  inputMultiline: {
    minHeight: 110,
    paddingTop: 14,
  },
  segment: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 4,
    borderRadius: 18,
    backgroundColor: '#E9E1D6',
    position: 'relative',
    overflow: 'hidden',
  },
  segmentPill: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    left: 4,
    borderRadius: 14,
    backgroundColor: colors.card,
    ...softShadow,
  },
  segmentItem: {
    flex: 1,
    minHeight: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  segmentLabel: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  segmentLabelActive: {
    color: colors.wine,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 36,
    gap: 8,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.goldSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  emptyTitle: {
    color: colors.ink,
    fontFamily: displayFont,
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 28,
    textAlign: 'center',
  },
  emptyBody: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeWine: { backgroundColor: colors.goldSoft },
  badgeGold: { backgroundColor: colors.goldSoft },
  badgeSage: { backgroundColor: colors.sageSoft },
  badgeText: { fontSize: 12, fontWeight: '700' },
  badgeTextWine: { color: colors.wine },
  badgeTextGold: { color: colors.wine },
  badgeTextSage: { color: colors.sage },
  error: {
    color: colors.danger,
    fontSize: 13,
    lineHeight: 18,
  },
});
