import { type ReactNode } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

const AnimatedRoot = Animated.createAnimatedComponent(Pressable);

type Props = Omit<PressableProps, 'style'> & {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  haptic?: boolean;
  scaleTo?: number;
};

export function AnimatedPressable({
  children,
  style,
  haptic = true,
  scaleTo = 0.97,
  disabled,
  onPressIn,
  onPressOut,
  onPress,
  ...rest
}: Props) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedRoot
      {...rest}
      disabled={disabled}
      onPress={(event) => {
        if (haptic && !disabled) {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        onPress?.(event);
      }}
      onPressIn={(event) => {
        if (!disabled) {
          scale.value = withSpring(scaleTo, { damping: 18, stiffness: 320 });
        }
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        scale.value = withSpring(1, { damping: 14, stiffness: 220 });
        onPressOut?.(event);
      }}
      style={[style, animatedStyle]}
    >
      {children}
    </AnimatedRoot>
  );
}
