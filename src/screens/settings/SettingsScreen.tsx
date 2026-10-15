import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { ScreenContainer } from '../../components/layout/ScreenContainer';
import { Header } from '../../components/common/Header';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { Colors, Spacing, Typography } from '../../config/theme';
import { SettingsService } from '../../services/settingsService';
import { executeRun, withDbTransaction } from '../../db/database';
import { useAppNavigation } from '../../navigation/appNavigation';

export const SettingsScreen: React.FC = () => {
  const navigation = useAppNavigation();
  const [institutionName, setInstitutionName] = useState('');
  const [academicSession, setAcademicSession] = useState('');
  const [saving, setSaving] = useState(false);
  const [resetModalVisible, setResetModalVisible] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const inst = await SettingsService.getSetting('institution_name', 'Darsgah Islamic Institute');
      const session = await SettingsService.getSetting('academic_session', '2026-2027');
      if (!active) return;
      setInstitutionName(inst);
      setAcademicSession(session);
    })();
    return () => {
      active = false;
    };
  }, []);

  const handleSaveSettings = async () => {
    if (!institutionName.trim()) {
      Alert.alert('Validation Error', 'Institution name cannot be blank.');
      return;
    }
    setSaving(true);
    try {
      await SettingsService.setSetting('institution_name', institutionName.trim());
      await SettingsService.setSetting('academic_session', academicSession.trim());
      Alert.alert('Saved', 'Institution settings updated successfully.');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not save settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleResetData = async () => {
    try {
      // Children first; books and chapters (the curriculum) are kept
      await withDbTransaction(async () => {
        await executeRun('DELETE FROM lesson_log;');
        await executeRun('DELETE FROM student_books;');
        await executeRun('DELETE FROM attendance_records;');
        await executeRun('DELETE FROM student_group_history;');
        await executeRun('DELETE FROM students;');
        await executeRun('DELETE FROM groups;');
      });
      setResetModalVisible(false);
      Alert.alert('Reset Complete', 'All operational data has been cleared.');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to reset database.');
    }
  };

  return (
    <View style={styles.outer}>
      <Header
        title="Settings & System"
        onBack={() => navigation.goBack()}
      />
      <ScreenContainer scrollable>
        {/* Institution Info Card */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Institution Information</Text>
          <Input
            label="Darsgah / School Name"
            value={institutionName}
            onChangeText={setInstitutionName}
            placeholder="e.g., Jamia Darsgah Noor"
            leftIcon="school-outline"
          />
          <Input
            label="Academic Session / Year"
            value={academicSession}
            onChangeText={setAcademicSession}
            placeholder="e.g., 2026-2027"
            leftIcon="calendar-outline"
          />
          <Button
            title="Save Settings"
            onPress={handleSaveSettings}
            loading={saving}
            icon="save-outline"
          />
        </Card>

        {/* Database Backup & Restore */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Local Database & Backup</Text>
          <Text style={styles.cardDesc}>
            Export your complete SQLite database file for offline backup or restore a previous database file.
          </Text>
          <Button
            title="Database Backup & Restore"
            variant="secondary"
            onPress={() => navigation.navigate('BackupRestore')}
            icon="server-outline"
          />
        </Card>

        {/* Danger Zone */}
        <Card style={[styles.card, styles.dangerCard]}>
          <Text style={[styles.cardTitle, { color: Colors.danger }]}>Danger Zone</Text>
          <Text style={styles.cardDesc}>
            Clear all students, groups, attendance and lesson ratings. Books and chapters are kept.
          </Text>
          <Button
            title="Reset All Database Records"
            variant="danger"
            onPress={() => setResetModalVisible(true)}
            icon="trash-outline"
          />
        </Card>
      </ScreenContainer>

      <ConfirmModal
        visible={resetModalVisible}
        title="Reset All Data?"
        message="This will permanently delete all students, groups, attendance records and lesson ratings from this device. Books and chapters are kept. This action cannot be undone."
        confirmText="Yes, Reset Everything"
        confirmVariant="danger"
        onConfirm={handleResetData}
        onCancel={() => setResetModalVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  card: {
    marginBottom: Spacing.lg,
  },
  cardTitle: {
    ...Typography.titleSmall,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  cardDesc: {
    ...Typography.bodyMedium,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
    lineHeight: 20,
  },
  dangerCard: {
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
  },
});
