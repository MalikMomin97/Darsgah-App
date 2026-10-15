import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableWithoutFeedback } from 'react-native';
import { Colors, Spacing, BorderRadius, Typography, Shadows } from '../../config/theme';
import { Button } from './Button';

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'danger' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  visible,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmVariant = 'danger',
  onConfirm,
  onCancel,
  loading = false,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <TouchableWithoutFeedback onPress={onCancel}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalCard}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.message}>{message}</Text>

              <View style={styles.buttonRow}>
                <Button
                  title={cancelText}
                  variant="secondary"
                  size="md"
                  onPress={onCancel}
                  disabled={loading}
                  style={styles.actionBtn}
                />
                <Button
                  title={confirmText}
                  variant={confirmVariant}
                  size="md"
                  onPress={onConfirm}
                  loading={loading}
                  style={styles.actionBtn}
                />
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    ...Shadows.lg,
  },
  title: {
    ...Typography.titleSmall,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  message: {
    ...Typography.bodyMedium,
    color: Colors.textSecondary,
    marginBottom: Spacing.xl,
    lineHeight: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
  },
  actionBtn: {
    flex: 1,
  },
});
