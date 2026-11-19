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
  ios: 'Georgia',
  android: 'serif',
  default: 'serif',
});

export const shadow: ViewStyle = {
  shadowColor: '#1C1418',
  shadowOpacity: 0.07,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 8 },
  elevation: 2,
};
