import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ScreenContainer } from '../../components/layout/ScreenContainer';
import { Header } from '../../components/common/Header';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { IconCircle } from '../../components/common/IconCircle';
import { FadeInView, PressableScale, haptic } from '../../components/common/Motion';
import {
  Colors,
  Spacing,
  Typography,
  Fonts,
  BorderRadius,
  Shadows,
  Gradients,
} from '../../config/theme';
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
      const inst = await SettingsService.getSetting(
        'institution_name',
        'Darsgah Islamic Institute'
      );
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
      <Header title="Settings & System" onBack={() => navigation.goBack()} />
      <ScreenContainer scrollable contentContainerStyle={styles.content}>
        {/* Institution summary */}
        <FadeInView>
          <LinearGradient
            colors={Gradients.brand}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.profileCard}
          >
            <View style={styles.profileRing} />
            <View style={styles.profileIcon}>
              <Ionicons name="school" size={24} color={Colors.accentLight} />
            </View>
            <View style={styles.profileText}>
              <Text style={styles.profileName} numberOfLines={2}>
                {institutionName.trim() || 'Your Darsgah'}
              </Text>
              {academicSession.trim() ? (
                <Text style={styles.profileSession}>Session {academicSession.trim()}</Text>
              ) : null}
            </View>
          </LinearGradient>
        </FadeInView>

        {/* Institution Info */}
        <FadeInView index={1}>
          <Text style={styles.groupLabel}>Institution Information</Text>
          <Card style={styles.groupCard} padding="lg">
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
              icon="checkmark-circle-outline"
              fullWidth
            />
          </Card>
        </FadeInView>

        {/* Database Backup & Restore */}
        <FadeInView index={2}>
          <Text style={styles.groupLabel}>Local Database & Backup</Text>
          <Card style={styles.groupCard} padding="xs">
            <PressableScale
              style={styles.row}
              pressedScale={0.985}
              onPress={() => {
                haptic.select();
                navigation.navigate('BackupRestore');
              }}
              accessibilityRole="button"
              accessibilityLabel="Database Backup & Restore"
            >
              <IconCircle icon="server-outline" size={40} square />
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>Database Backup & Restore</Text>
                <Text style={styles.rowDesc}>
                  Export your complete SQLite database file for offline backup or restore a previous
                  database file.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
            </PressableScale>
          </Card>
        </FadeInView>

        {/* About */}
        <FadeInView index={3}>
          <Text style={styles.groupLabel}>About</Text>
          <Card style={styles.groupCard} padding="xs">
            <PressableScale
              style={styles.row}
              pressedScale={0.985}
              onPress={() => {
                haptic.select();
                navigation.navigate('About');
              }}
              accessibilityRole="button"
              accessibilityLabel="About Us"
            >
              <IconCircle
                icon="information-circle-outline"
                size={40}
                square
                color={Colors.accentDark}
                bg={Colors.accentLight}
              />
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>About Us</Text>
                <Text style={styles.rowDesc}>About Darsgah, its features and the developers.</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
            </PressableScale>
          </Card>
        </FadeInView>

        {/* Danger Zone */}
        <FadeInView index={4}>
          <Text style={[styles.groupLabel, { color: Colors.danger }]}>Danger Zone</Text>
          <Card style={[styles.groupCard, styles.dangerCard]} padding="xs">
            <PressableScale
              style={styles.row}
              pressedScale={0.985}
              onPress={() => {
                haptic.warning();
                setResetModalVisible(true);
              }}
              accessibilityRole="button"
              accessibilityLabel="Reset All Database Records"
            >
              <IconCircle
                icon="trash-outline"
                size={40}
                square
                color={Colors.danger}
                bg={Colors.dangerLight}
              />
              <View style={styles.rowText}>
                <Text style={[styles.rowTitle, { color: Colors.danger }]}>
                  Reset All Database Records
                </Text>
                <Text style={styles.rowDesc}>
                  Clear all students, groups, attendance and lesson ratings. Books and chapters are
                  kept.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.danger} />
            </PressableScale>
          </Card>
        </FadeInView>

        <Text style={styles.creditText}>
          Developed by <Text style={styles.creditName}>Khadim e Andrabia</Text>
        </Text>
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
  content: {
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xxxl,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.xl,
    ...Shadows.md,
  },
  profileRing: {
    position: 'absolute',
    top: -50,
    right: -40,
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 20,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  profileIcon: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.accentGlow,
    borderWidth: 1,
    borderColor: 'rgba(212, 166, 69, 0.38)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileText: {
    flex: 1,
  },
  profileName: {
    ...Typography.titleMedium,
    color: Colors.textInverse,
  },
  profileSession: {
    fontFamily: Fonts.medium,
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.72)',
    marginTop: 2,
  },
  groupLabel: {
    ...Typography.overline,
    marginLeft: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  groupCard: {
    marginBottom: Spacing.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  rowText: {
    flex: 1,
  },
  rowTitle: {
    ...Typography.titleSmall,
    fontSize: 15,
  },
  rowDesc: {
    ...Typography.bodySmall,
    marginTop: 2,
  },
  dangerCard: {
    borderColor: Colors.dangerLight,
  },
  creditText: {
    ...Typography.caption,
    textAlign: 'center',
    marginTop: Spacing.xxl,
    marginBottom: Spacing.lg,
  },
  creditName: {
    fontFamily: Fonts.semibold,
    color: Colors.primary,
  },
});
