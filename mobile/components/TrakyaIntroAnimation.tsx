import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  type SharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, ClipPath, Defs, G, Path, Polygon, Rect, Text } from 'react-native-svg';

const GOLD = '#BA8E1B';
const NAVY = '#002387';
const WHITE = '#FFFFFF';
const SIZE = 248;
const ARC_R = 194;
const TITLE = 'TRAKYA ÜNİVERSİTESİ';

const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedText = Animated.createAnimatedComponent(Text);

type Props = {
  onAnimationComplete?: () => void;
  size?: number;
  /** true ise yürüyüş animasyonu oynatılmaz; logo bitmiş halde kalır. */
  skipAnimation?: boolean;
};

function railY(x: number) {
  'worklet';
  const t = Math.min(1, Math.max(0, (x - 16) / (256 - 16)));
  return 278 - t * 28;
}

function ArcTitle({ opacity }: { opacity: SharedValue<number> }) {
  // Continuous arc band matching the static PNG logo: large bold type, tight gaps.
  const letters = TITLE.split('');
  const span = (88 * Math.PI) / 180;
  const weights = letters.map((letter) => (letter === ' ' ? 0.45 : 1));
  const totalWeight = weights.reduce((sum, value) => sum + value, 0);
  const unit = (2 * span) / totalWeight;
  let cursor = -span;
  const placed = letters.map((letter, index) => {
    const half = (weights[index]! * unit) / 2;
    cursor += half;
    const angle = cursor;
    cursor += half;
    return { letter, angle, index };
  });

  const groupProps = useAnimatedProps(() => ({
    opacity: opacity.value,
  }));

  return (
    <AnimatedG animatedProps={groupProps}>
      {placed.map(({ letter, angle, index }) => {
        if (letter === ' ') return null;
        const x = 256 + ARC_R * Math.sin(angle);
        const y = 256 - ARC_R * Math.cos(angle);
        const deg = (angle * 180) / Math.PI;
        return (
          <Text
            key={`${letter}-${index}`}
            x={x}
            y={y}
            fill={NAVY}
            fontSize={45}
            fontWeight="900"
            letterSpacing={0.5}
            textAnchor="middle"
            alignmentBaseline="middle"
            transform={`rotate(${deg} ${x} ${y})`}
          >
            {letter}
          </Text>
        );
      })}
    </AnimatedG>
  );
}

function StickFigure({
  progress,
  fromX,
  toX,
  color,
  opacity,
  jumpY,
  scale,
}: {
  progress: SharedValue<number>;
  fromX: number;
  toX: number;
  color: string;
  opacity: SharedValue<number>;
  jumpY: SharedValue<number>;
  scale: SharedValue<number>;
}) {
  const rootProps = useAnimatedProps(() => {
    const x = fromX + (toX - fromX) * progress.value;
    const y = railY(x) - 18 + jumpY.value;
    return {
      opacity: opacity.value,
      transform: [{ translateX: x }, { translateY: y }, { scale: scale.value }],
    };
  });

  const leftLeg = useAnimatedProps(() => {
    const swing = Math.sin(progress.value * Math.PI * 6) * 22;
    return {
      transform: [{ translateY: 8 }, { rotate: `${swing}deg` }, { translateY: -8 }],
    };
  });

  const rightLeg = useAnimatedProps(() => {
    const swing = Math.sin(progress.value * Math.PI * 6) * 22;
    return {
      transform: [{ translateY: 8 }, { rotate: `${-swing}deg` }, { translateY: -8 }],
    };
  });

  const leftArm = useAnimatedProps(() => {
    const swing = Math.sin(progress.value * Math.PI * 6) * 18;
    return {
      transform: [{ translateY: -8 }, { rotate: `${-swing}deg` }, { translateY: 8 }],
    };
  });

  const rightArm = useAnimatedProps(() => {
    const swing = Math.sin(progress.value * Math.PI * 6) * 18;
    return {
      transform: [{ translateY: -8 }, { rotate: `${swing}deg` }, { translateY: 8 }],
    };
  });

  return (
    <AnimatedG animatedProps={rootProps}>
      <Circle cx={0} cy={-22} r={7} fill={color} />
      <Path d="M 0,-14 L 0,8" stroke={color} strokeWidth={3.2} strokeLinecap="round" />
      <AnimatedG animatedProps={leftArm}>
        <Path d="M 0,-8 L -11,4" stroke={color} strokeWidth={3} strokeLinecap="round" />
      </AnimatedG>
      <AnimatedG animatedProps={rightArm}>
        <Path d="M 0,-8 L 11,4" stroke={color} strokeWidth={3} strokeLinecap="round" />
      </AnimatedG>
      <AnimatedG animatedProps={leftLeg}>
        <Path d="M 0,8 L -9,24" stroke={color} strokeWidth={3.2} strokeLinecap="round" />
      </AnimatedG>
      <AnimatedG animatedProps={rightLeg}>
        <Path d="M 0,8 L 9,24" stroke={color} strokeWidth={3.2} strokeLinecap="round" />
      </AnimatedG>
    </AnimatedG>
  );
}

export function TrakyaIntroAnimation({ onAnimationComplete, size = SIZE, skipAnimation = false }: Props) {
  const completeRef = useRef(onAnimationComplete);
  completeRef.current = onAnimationComplete;
  const started = useRef(false);

  const sceneScale = useSharedValue(skipAnimation ? 1 : 1.55);
  const walk = useSharedValue(skipAnimation ? 1 : 0);
  const leftOpacity = useSharedValue(skipAnimation ? 0 : 1);
  const rightOpacity = useSharedValue(skipAnimation ? 0 : 1);
  const leftJump = useSharedValue(0);
  const rightJump = useSharedValue(0);
  const leftScale = useSharedValue(1);
  const rightScale = useSharedValue(1);
  const ringOpacity = useSharedValue(skipAnimation ? 1 : 0);
  const ringScale = useSharedValue(skipAnimation ? 1 : 0.92);
  const riverOpacity = useSharedValue(skipAnimation ? 1 : 0);
  const riverY = useSharedValue(skipAnimation ? 0 : 14);
  const digit1 = useSharedValue(skipAnimation ? 1 : 0);
  const digit2 = useSharedValue(skipAnimation ? 1 : 0);
  const digit98 = useSharedValue(skipAnimation ? 1 : 0);
  const digit98Scale = useSharedValue(skipAnimation ? 1 : 0.6);
  const titleOpacity = useSharedValue(skipAnimation ? 1 : 0);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const finish = () => completeRef.current?.();

    if (skipAnimation) {
      finish();
      return;
    }

    const ease = Easing.out(Easing.cubic);

    // 0 – 1150: walk
    walk.value = withTiming(1, { duration: 1150, easing: Easing.inOut(Easing.quad) });

    // 500 – 900: ring
    ringOpacity.value = withDelay(500, withTiming(1, { duration: 400, easing: ease }));
    ringScale.value = withDelay(500, withTiming(1, { duration: 400, easing: ease }));

    // 800 – 1200: river
    riverOpacity.value = withDelay(800, withTiming(1, { duration: 400, easing: ease }));
    riverY.value = withDelay(800, withTiming(0, { duration: 400, easing: ease }));

    // 1150 – 1550: jump + 1 / 98 / 2
    leftJump.value = withDelay(
      1150,
      withSequence(
        withTiming(-42, { duration: 180, easing: Easing.out(Easing.cubic) }),
        withTiming(0, { duration: 220, easing: Easing.in(Easing.cubic) }),
      ),
    );
    rightJump.value = withDelay(
      1150,
      withSequence(
        withTiming(-42, { duration: 180, easing: Easing.out(Easing.cubic) }),
        withTiming(0, { duration: 220, easing: Easing.in(Easing.cubic) }),
      ),
    );
    leftScale.value = withDelay(
      1150,
      withSequence(withTiming(0.82, { duration: 120 }), withTiming(1, { duration: 180 })),
    );
    rightScale.value = withDelay(
      1150,
      withSequence(withTiming(0.82, { duration: 120 }), withTiming(1, { duration: 180 })),
    );

    leftOpacity.value = withDelay(1280, withTiming(0, { duration: 200 }));
    rightOpacity.value = withDelay(1280, withTiming(0, { duration: 200 }));
    digit1.value = withDelay(1280, withTiming(1, { duration: 220, easing: ease }));
    digit2.value = withDelay(1280, withTiming(1, { duration: 220, easing: ease }));

    digit98.value = withDelay(1380, withTiming(1, { duration: 170, easing: ease }));
    digit98Scale.value = withDelay(1380, withSpring(1, { damping: 14, stiffness: 160 }));

    // 1500 – 1800: title
    titleOpacity.value = withDelay(1500, withTiming(1, { duration: 300, easing: ease }));

    // 1750 – 2000: settle
    sceneScale.value = withDelay(
      1750,
      withTiming(1, { duration: 250, easing: ease }, (finished) => {
        if (finished) {
          runOnJS(finish)();
        }
      }),
    );
  }, [
    walk,
    ringOpacity,
    ringScale,
    riverOpacity,
    riverY,
    leftJump,
    rightJump,
    leftScale,
    rightScale,
    leftOpacity,
    rightOpacity,
    digit1,
    digit2,
    digit98,
    digit98Scale,
    titleOpacity,
    sceneScale,
    skipAnimation,
  ]);

  const sceneStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sceneScale.value }],
  }));

  const ringGroupProps = useAnimatedProps(() => ({
    opacity: ringOpacity.value,
    transform: [
      { translateX: 256 },
      { translateY: 256 },
      { scale: ringScale.value },
      { translateX: -256 },
      { translateY: -256 },
    ],
  }));

  const riverGroupProps = useAnimatedProps(() => ({
    opacity: riverOpacity.value,
    transform: [{ translateY: riverY.value }],
  }));

  const digit1Props = useAnimatedProps(() => ({ opacity: digit1.value }));
  const digit2Props = useAnimatedProps(() => ({ opacity: digit2.value }));
  const digit98Props = useAnimatedProps(() => ({
    opacity: digit98.value,
    transform: [
      { translateX: 256 },
      { translateY: 224 },
      { scale: digit98Scale.value },
      { translateX: -256 },
      { translateY: -224 },
    ],
  }));

  return (
    <View style={[styles.wrap, { width: size, height: size }]} accessibilityLabel="Trakya Üniversitesi logo animasyonu">
      <Animated.View style={[styles.scene, sceneStyle]}>
        <Svg width={size} height={size} viewBox="0 0 512 512">
          <Defs>
            <ClipPath id="logoInnerClip">
              <Circle cx={256} cy={256} r={236} />
            </ClipPath>
          </Defs>

          <AnimatedG animatedProps={ringGroupProps}>
            <AnimatedCircle cx={256} cy={256} r={244} fill="none" stroke={GOLD} strokeWidth={14} />
          </AnimatedG>

          {/* Sea behind bridge: filled navy body + close white foam ribbons */}
          <AnimatedG animatedProps={riverGroupProps} clipPath="url(#logoInnerClip)">
            <Path
              d="M 40,382 Q 62,366 85,382 T 128,382 T 170,382 T 213,382 T 256,382 T 299,382 T 342,382 T 385,382 T 427,382 T 472,382 L 472,500 L 40,500 Z"
              fill={NAVY}
            />
            <Path
              d="M 40,408 Q 62,392 85,408 T 128,408 T 170,408 T 213,408 T 256,408 T 299,408 T 342,408 T 385,408 T 427,408 T 472,408"
              fill="none"
              stroke={WHITE}
              strokeWidth={6.5}
              strokeLinecap="round"
            />
            <Path
              d="M 40,434 Q 62,418 85,434 T 128,434 T 170,434 T 213,434 T 256,434 T 299,434 T 342,434 T 385,434 T 427,434 T 472,434"
              fill="none"
              stroke={WHITE}
              strokeWidth={6.5}
              strokeLinecap="round"
            />
          </AnimatedG>

          {/* Bridge unchanged */}
          <Polygon points="200,138 312,138 326,162 186,162" fill={GOLD} />
          <Rect x={200} y={168} width={112} height={82} fill={GOLD} />
          <Polygon points="16,280 200,250 312,250 496,280 496,294 256,260 16,294" fill={GOLD} />
          <Path
            d="M 16,302 L 256,268 L 496,302 L 480,368 C 462,332 408,332 390,368 L 354,368 C 332,308 180,308 158,368 L 122,368 C 104,332 50,332 32,368 Z"
            fill={GOLD}
          />

          <StickFigure
            progress={walk}
            fromX={35}
            toX={215}
            color={NAVY}
            opacity={leftOpacity}
            jumpY={leftJump}
            scale={leftScale}
          />
          <StickFigure
            progress={walk}
            fromX={477}
            toX={297}
            color={WHITE}
            opacity={rightOpacity}
            jumpY={rightJump}
            scale={rightScale}
          />

          <AnimatedText
            animatedProps={digit1Props}
            x={216}
            y={224}
            fill={WHITE}
            fontSize={42}
            fontWeight="700"
            textAnchor="middle"
          >
            1
          </AnimatedText>
          <AnimatedG animatedProps={digit98Props}>
            <Text x={242} y={224} fill={WHITE} fontSize={42} fontWeight="700" textAnchor="middle">
              9
            </Text>
            <Text x={270} y={224} fill={WHITE} fontSize={42} fontWeight="700" textAnchor="middle">
              8
            </Text>
          </AnimatedG>
          <AnimatedText
            animatedProps={digit2Props}
            x={296}
            y={224}
            fill={WHITE}
            fontSize={42}
            fontWeight="700"
            textAnchor="middle"
          >
            2
          </AnimatedText>

          <ArcTitle opacity={titleOpacity} />
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  scene: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
