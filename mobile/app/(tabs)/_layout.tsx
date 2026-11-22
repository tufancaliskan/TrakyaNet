import { useEffect } from 'react';
import { type ColorValue } from 'react-native';
import { Tabs } from 'expo-router';
import { GraduationCap, Megaphone, UserRound, Users } from 'lucide-react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { colors, softShadow } from '@/constants/theme';

function TabIcon({
  focused,
  color,
  size,
  Icon,
}: {
  focused: boolean;
  color: ColorValue;
  size: number;
  Icon: typeof Megaphone;
}) {
  const scale = useSharedValue(1);
  const tint = typeof color === 'string' && color ? color : colors.muted;

  useEffect(() => {
    scale.value = withSpring(focused ? 1.12 : 1, { damping: 12, stiffness: 220 });
  }, [focused, scale]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={style}>
      <Icon color={tint} size={size} />
    </Animated.View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.wine,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: 'transparent',
          height: 66,
          paddingTop: 8,
          paddingBottom: 10,
          ...softShadow,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Genel',
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon focused={focused} color={color} size={size} Icon={Megaphone} />
          ),
        }}
      />
      <Tabs.Screen
        name="classes"
        options={{
          title: 'Sınıflarım',
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon focused={focused} color={color} size={size} Icon={GraduationCap} />
          ),
        }}
      />
      <Tabs.Screen
        name="clubs"
        options={{
          title: 'Kulüpler',
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon focused={focused} color={color} size={size} Icon={Users} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon focused={focused} color={color} size={size} Icon={UserRound} />
          ),
        }}
      />
    </Tabs>
  );
}
