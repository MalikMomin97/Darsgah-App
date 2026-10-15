import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { Header } from '../../components/common/Header';
import { ScreenContainer } from '../../components/layout/ScreenContainer';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { Colors, Spacing, Typography } from '../../config/theme';
import { BackupService } from '../../services/backupService';
import { useAppNavigation } from '../../navigation/appNavigation';
import { router } from 'expo-router';

export const BackupRestoreScreen: React.FC = () => {
  const navigation = useAppNavigation();
  const [loading, setLoading] = useState(false);
  const [restoreModalVisible, setRestoreModalVisible] = useState(false);

  const handleExportSqlite = async () => {
    setLoading(true);
    try {
      await BackupService.exportDatabaseFile();
    } catch (e: any) {
      Alert.alert('Backup Error', e?.message || 'Could not export SQLite database.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportJson = async () => {
    setLoading(true);
    try {
      await BackupService.exportJsonBackup();
    } catch (e: any) {
      Alert.alert('Export Error', e?.message || 'Could not export JSON data.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmRestore = async () => {
    setRestoreModalVisible(false);
    setLoading(true);
    try {
      const restored = await BackupService.restoreDatabaseFile();
      if (restored) {
        Alert.alert('Restore Successful', 'Your data has been restored.', [
          {
            text: 'OK',
            // Reset the whole stack so no screen keeps showing pre-restore data
            onPress: () => {
              if (router.canDismiss()) router.dismissAll();
              router.replace('/');
            },
          },
        ]);
      }
    } catch (e: any) {
      Alert.alert('Restore Failed', e?.message || 'Could not restore database file.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header title="Backup & Restore" onBack={() => navigation.goBack()} />
      <ScreenContainer scrollable>
        {/* Full SQLite Backup */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Full SQLite Database Backup</Text>
          <Text style={styles.cardDesc}>
            Exports the raw SQLite database (.db file). This includes all students, attendance, curriculum structures, and historical progress. You can save it to your phone, Google Drive, or send it via WhatsApp/Email.
          </Text>
          <Button
            title="Export SQLite (.db) File"
            icon="share-outline"
            onPress={handleExportSqlite}
            loading={loading}
          />
        </Card>

        {/* JSON Export */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>JSON Data Export</Text>
          <Text style={styles.cardDesc}>
            Exports all tables as a readable JSON file. Useful for data review or importing into custom spreadsheets.
          </Text>
          <Button
            title="Export Data as JSON"
            variant="outline"
            icon="document-text-outline"
            onPress={handleExportJson}
            loading={loading}
          />
        </Card>

        {/* Restore Backup */}
        <Card style={[styles.card, styles.restoreCard]}>
          <Text style={styles.cardTitle}>Restore Database</Text>
          <Text style={styles.cardDesc}>
            Restore your database from an existing .db backup file. This will replace the current active data on this device with the contents of the backup file.
          </Text>
          <Button
            title="Choose .db Backup to Restore"
            variant="secondary"
            icon="folder-open-outline"
            onPress={() => setRestoreModalVisible(true)}
            disabled={loading}
          />
        </Card>
      </ScreenContainer>

      <ConfirmModal
        visible={restoreModalVisible}
        title="Restore Database Backup?"
        message="Restoring from a backup will overwrite the current database on this device. Make sure you have exported a current backup first if you need it."
        confirmText="Choose File & Restore"
        confirmVariant="primary"
        onConfirm={handleConfirmRestore}
        onCancel={() => setRestoreModalVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  card: {
    marginBottom: Spacing.lg,
  },
  cardTitle: {
    ...Typography.titleSmall,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  cardDesc: {
    ...Typography.bodyMedium,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
    lineHeight: 20,
  },
  restoreCard: {
    borderColor: Colors.borderDark,
  },
});
