import React from 'react';
import { View, Text, StyleSheet, Modal, FlatList, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, BorderRadius } from '../../config/theme';

export interface PickerOption {
  id: string;
  label: string;
  hint?: string;
  /** Shows a check mark, e.g. surah already memorized. */
  done?: boolean;
}

interface PickerModalProps {
  visible: boolean;
  title: string;
  options: PickerOption[];
  selectedId?: string | null;
  emptyText?: string;
  onSelect: (option: PickerOption) => void;
  onClose: () => void;
  onBack?: () => void;
}

export const PickerModal: React.FC<PickerModalProps> = ({
  visible,
  title,
  options,
  selectedId,
  emptyText = 'Nothing to choose yet. Add items from the Curriculum tab.',
  onSelect,
  onClose,
  onBack,
}) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <View style={styles.overlay}>
      <View style={styles.sheet}>
        <View style={styles.header}>
          {onBack ? (
            <TouchableOpacity onPress={onBack} style={styles.headerBtn}>
              <Ionicons name="chevron-back" size={22} color={Colors.text} />
            </TouchableOpacity>
          ) : null}
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
            <Ionicons name="close" size={22} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>
        <FlatList
          data={options}
          keyExtractor={(o) => o.id}
          ListEmptyComponent={<Text style={styles.empty}>{emptyText}</Text>}
          renderItem={({ item }) => {
            const selected = item.id === selectedId;
            return (
              <TouchableOpacity
                style={[styles.option, selected && styles.optionSelected]}
                onPress={() => onSelect(item)}
              >
                <View style={styles.optionText}>
                  <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>
                    {item.label}
                  </Text>
                  {item.hint ? <Text style={styles.optionHint}>{item.hint}</Text> : null}
                </View>
                {item.done ? (
                  <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
                ) : selected ? (
                  <Ionicons name="radio-button-on" size={20} color={Colors.primary} />
                ) : null}
              </TouchableOpacity>
            );
          }}
        />
      </View>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '75%',
    paddingBottom: Spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerBtn: {
    padding: Spacing.xs,
  },
  title: {
    ...Typography.titleSmall,
    flex: 1,
    marginHorizontal: Spacing.xs,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceSubtle,
  },
  optionSelected: {
    backgroundColor: Colors.primaryLight,
  },
  optionText: {
    flex: 1,
  },
  optionLabel: {
    ...Typography.bodyLarge,
  },
  optionLabelSelected: {
    color: Colors.primary,
    fontWeight: '700',
  },
  optionHint: {
    ...Typography.bodySmall,
    marginTop: 2,
  },
  empty: {
    ...Typography.bodyMedium,
    color: Colors.textSecondary,
    textAlign: 'center',
    padding: Spacing.xxl,
  },
});
