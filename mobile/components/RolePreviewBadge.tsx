import { StyleSheet, Text, View } from 'react-native';

import { colors, softShadow } from '@/constants/theme';
import { roleLabel } from '@/lib/format';
import type { SystemRole } from '@/types/database';

export function RolePreviewBadge({ role }: { role: SystemRole | null }) {
  if (!role) return null;
  return (
    <View style={styles.wrap} accessibilityLabel={`Aktif rol: ${roleLabel[role]}`}>
      <Text style={styles.kicker}>Aktif görünüm</Text>
      <View style={styles.chip}>
        <Text style={styles.chipText}>{roleLabel[role]}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 20,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  kicker: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.goldSoft,
    ...softShadow,
  },
  chipText: {
    color: colors.wine,
    fontSize: 12,
    fontWeight: '800',
  },
});
