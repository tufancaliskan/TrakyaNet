import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors } from '@/constants/theme';

const TICK = 'M5 12.5 L10 17.5 L19.5 7';
const TICK_LENGTH = 22;
const SWELL = 0.35;
const RULE_END = 0.84;

const AnimatedPath = Animated.createAnimatedComponent(Path);

type SpringCheckProps = {
  label: string;
  caption?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  color?: string;
  fillColor?: string;
  checkColor?: string;
  boxSize?: number;
  boxRadius?: number;
  fontSize?: number;
  strikeLag?: number;
  doneOpacity?: number;
};

export function SpringCheck({
  label,
  caption,
  checked,
  onChange,
  color = colors.ink,
  fillColor = colors.wine,
  checkColor = colors.cream,
  boxSize = 24,
  boxRadius = 8,
  fontSize = 15,
  strikeLag = 0.12,
  doneOpacity = 0.42,
}: SpringCheckProps) {
  const progress = useRef(new Animated.Value(checked ? 1 : 0)).current;
  const press = useRef(new Animated.Value(1)).current;
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    Animated.spring(progress, {
      toValue: checked ? 1 : 0,
      friction: 6,
      tension: 220,
      useNativeDriver: false,
    }).start();
  }, [checked, progress]);

  const held = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const fillScale = progress.interpolate({
    inputRange: [0, 1, 1.35],
    outputRange: [0, 1, 1.35],
    extrapolateLeft: 'clamp',
    extrapolateRight: 'extend',
  });
  const boxScale = progress.interpolate({
    inputRange: [0, 1, 1.4],
    outputRange: [1, 1, 1 + SWELL * 0.4],
    extrapolate: 'clamp',
  });
  const wordOpacity = held.interpolate({
    inputRange: [0, 1],
    outputRange: [1, doneOpacity],
  });
  const ruleScale = held.interpolate({
    inputRange: [0, strikeLag, RULE_END, 1],
    outputRange: [0, 0, 1, 1],
    extrapolate: 'clamp',
  });
  const tickOffset = held.interpolate({
    inputRange: [0, 1],
    outputRange: [TICK_LENGTH, 0],
  });

  function pressIn() {
    Animated.timing(press, { toValue: 0.95, duration: 160, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }

  function pressOut() {
    Animated.timing(press, { toValue: 1, duration: 160, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }

  const ring = boxSize >= 24 ? 2 : 1.5;

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={() => onChange(!checked)}
      onPressIn={pressIn}
      onPressOut={pressOut}
      style={styles.row}
    >
      <Animated.View style={{ transform: [{ scale: press }] }}>
        <Animated.View
          style={[
            styles.box,
            {
              width: boxSize,
              height: boxSize,
              borderRadius: boxRadius,
              transform: [{ scale: boxScale }],
            },
          ]}
        >
          <View
            style={[
              styles.ring,
              { borderRadius: boxRadius, borderWidth: ring, borderColor: color },
            ]}
          />
          <Animated.View
            style={[
              styles.fill,
              { borderRadius: boxRadius, backgroundColor: fillColor, transform: [{ scale: fillScale }] },
            ]}
          />
          <Svg width={boxSize * 0.68} height={boxSize * 0.68} viewBox="0 0 24 24">
            <AnimatedPath
              d={TICK}
              fill="none"
              stroke={checkColor}
              strokeWidth={2.6}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={TICK_LENGTH}
              strokeDashoffset={tickOffset}
            />
          </Svg>
        </Animated.View>
      </Animated.View>
      <View style={styles.copy}>
        {caption ? <Text style={styles.caption}>{caption}</Text> : null}
        <View style={styles.wordWrap}>
          <Animated.Text style={[styles.word, { color, fontSize, opacity: wordOpacity }]}>{label}</Animated.Text>
          <Animated.View
            style={[
              styles.rule,
              {
                backgroundColor: color,
                height: Math.max(1.5, Math.round(fontSize / 6) / 2),
                transform: [{ scaleX: ruleScale }],
              },
            ]}
          />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 56,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  box: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  ring: {
    ...StyleSheet.absoluteFill,
    opacity: 0.28,
  },
  fill: {
    ...StyleSheet.absoluteFill,
  },
  copy: { flex: 1, gap: 2 },
  caption: { color: colors.wineDeep, fontSize: 12, fontWeight: '800', letterSpacing: 0.3 },
  wordWrap: { alignSelf: 'flex-start' },
  word: { fontWeight: '600', lineHeight: 20 },
  rule: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '46%',
    borderRadius: 2,
    transformOrigin: 'left center',
  },
});
