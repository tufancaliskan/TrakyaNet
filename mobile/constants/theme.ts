import { Platform, type TextStyle, type ViewStyle } from 'react-native';

export const colors = {
  wine: '#9A7014',
  wineDeep: '#6F4E0C',
  gold: '#C69521',
  goldSoft: '#F8EDD4',
  cream: '#F3EEE6',
  card: '#FFFCF8',
  ink: '#1C1418',
  muted: '#74686C',
  line: '#E4D9CE',
  sage: '#2F6A4F',
  sageSoft: '#E4F2EA',
  danger: '#8E2A2A',
  dangerSoft: '#F8E8E6',
  white: '#FFFFFF',
};

export const displayFont = Platform.select<TextStyle['fontFamily']>({
  ios: 'System',
  android: 'sans-serif',
  default: 'System',
});

export const bodyFont = Platform.select<TextStyle['fontFamily']>({
  ios: 'System',
  android: 'sans-serif',
  default: 'System',
});

export const softShadow: ViewStyle = {
  shadowColor: '#3A2E18',
  shadowOpacity: 0.06,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 6 },
  elevation: 2,
};

export const shadow: ViewStyle = softShadow;
