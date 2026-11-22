import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Settings } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnimatedPressable } from '@/components/AnimatedPressable';
import { colors, softShadow } from '@/constants/theme';
import { ENABLE_DEV_ROLE_LOGIN, previewRoleOptions } from '@/lib/devAuth';
import { roleLabel } from '@/lib/format';
import type { SystemRole } from '@/types/database';

export function DevRoleMenu({
  visible,
  current,
  onClose,
  onSelect,
  title = 'Geliştirici Rol Seçimi',
}: {
  visible: boolean;
  current: SystemRole | null;
  onClose: () => void;
  onSelect: (role: SystemRole) => void;
  title?: string;
}) {
  if (!ENABLE_DEV_ROLE_LOGIN) return null;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.help}>Öğrenci gerçek API kullanır. Akademisyen ve idari yerel önizlemedir.</Text>
        {previewRoleOptions.map((option) => {
          const active = current === option.role;
          return (
            <AnimatedPressable
              key={option.role}
              style={[styles.row, active && styles.rowActive]}
              onPress={() => onSelect(option.role)}
            >
              <Text style={[styles.rowText, active && styles.rowTextActive]}>{option.label}</Text>
            </AnimatedPressable>
          );
        })}
      </View>
    </Modal>
  );
}

export function DevSettingsGear({ onPress }: { onPress: () => void }) {
  const insets = useSafeAreaInsets();
  if (!ENABLE_DEV_ROLE_LOGIN) return null;
  return (
    <AnimatedPressable
      accessibilityLabel="Geliştirici ayarları"
      onPress={onPress}
      style={[styles.gear, { top: insets.top + 8 }]}
    >
      <Settings color="#1E4DB7" size={20} />
    </AnimatedPressable>
  );
}

export function DevRolePanel({
  current,
  onSelect,
}: {
  current: SystemRole | null;
  onSelect: (role: SystemRole) => void;
}) {
  if (!ENABLE_DEV_ROLE_LOGIN) return null;
  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>Geliştirici Rol Seçimi</Text>
      <Text style={styles.help}>Öğrenci / Akademisyen / İdari görünümleri arasında geç.</Text>
      <View style={styles.rowWrap}>
        {previewRoleOptions.map((option) => {
          const active = current === option.role;
          return (
            <AnimatedPressable
              key={option.role}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => onSelect(option.role)}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{roleLabel[option.role]}</Text>
            </AnimatedPressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  gear: {
    position: 'absolute',
    right: 16,
    zIndex: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    ...softShadow,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(28,20,24,0.35)',
  },
  sheet: {
    position: 'absolute',
    left: 20,
    right: 20,
    top: '28%',
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 18,
    gap: 10,
    ...softShadow,
  },
  title: { color: colors.ink, fontSize: 17, fontWeight: '800' },
  help: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  row: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  rowActive: { backgroundColor: colors.wine },
  rowText: { color: colors.ink, fontWeight: '700', fontSize: 15 },
  rowTextActive: { color: colors.cream },
  panel: {
    gap: 10,
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 14,
    ...softShadow,
  },
  panelTitle: { color: colors.ink, fontSize: 16, fontWeight: '800' },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.cream,
  },
  chipActive: { backgroundColor: colors.wine },
  chipText: { color: colors.ink, fontSize: 12, fontWeight: '700' },
  chipTextActive: { color: colors.cream },
});
