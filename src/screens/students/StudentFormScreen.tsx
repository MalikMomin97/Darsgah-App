import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert, Modal, FlatList, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '../../components/common/Header';
import { ScreenContainer } from '../../components/layout/ScreenContainer';
import { Card } from '../../components/common/Card';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Chip } from '../../components/common/Chip';
import { SectionHeader } from '../../components/common/SectionHeader';
import { IconCircle } from '../../components/common/IconCircle';
import { FadeInView, PressableScale, haptic } from '../../components/common/Motion';
import { Colors, Spacing, Typography, BorderRadius, Fonts, Shadows } from '../../config/theme';
import { Group } from '../../types';
import { StudentService } from '../../services/studentService';
import { GroupService } from '../../services/groupService';
import { getTodayDateString } from '../../utils/dateUtils';
import { useAppNavigation, useAppRoute } from '../../navigation/appNavigation';

export const StudentFormScreen: React.FC = () => {
  const navigation = useAppNavigation();
  const route = useAppRoute<'StudentForm'>();
  const studentId = route.params?.studentId;
  const isEdit = Boolean(studentId);
  const insets = useSafeAreaInsets();

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [admissionNumber, setAdmissionNumber] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [guardianName, setGuardianName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [registrationDate, setRegistrationDate] = useState(getTodayDateString());
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  // Groups picker
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupPickerVisible, setGroupPickerVisible] = useState(false);
  const [loading, setLoading] = useState(Boolean(studentId));

  const loadGroups = async () => {
    try {
      const data = await GroupService.getGroups(false);
      setGroups(data);
    } catch (e: any) {
      console.error('Failed to load groups:', e);
    }
  };

  const loadStudentData = async (id: string) => {
    try {
      const student = await StudentService.getStudentById(id);
      if (student) {
        setFullName(student.fullName);
        setAdmissionNumber(student.admissionNumber || '');
        setGender((student.gender as any) || 'Male');
        setDateOfBirth(student.dateOfBirth || '');
        setGuardianName(student.guardianName || '');
        setContactPhone(student.contactPhone || '');
        setAddress(student.address || '');
        setNotes(student.notes || '');
        setRegistrationDate(student.registrationDate || getTodayDateString());
        setSelectedGroupId(student.currentGroupId);
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to load student data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => await loadGroups())();
    if (studentId) {
      (async () => await loadStudentData(studentId))();
    }
  }, [studentId]);

  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert('Validation Error', 'Student full name is required.');
      return;
    }

    try {
      setLoading(true);
      if (isEdit && studentId) {
        await StudentService.updateStudent(studentId, {
          fullName: fullName.trim(),
          admissionNumber: admissionNumber.trim() || null,
          gender,
          dateOfBirth: dateOfBirth.trim() || null,
          guardianName: guardianName.trim() || null,
          contactPhone: contactPhone.trim() || null,
          address: address.trim() || null,
          notes: notes.trim() || null,
          currentGroupId: selectedGroupId,
        });
        Alert.alert('Success', 'Student information updated.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        await StudentService.createStudent({
          fullName: fullName.trim(),
          admissionNumber: admissionNumber.trim() || null,
          gender,
          dateOfBirth: dateOfBirth.trim() || null,
          guardianName: guardianName.trim() || null,
          contactPhone: contactPhone.trim() || null,
          address: address.trim() || null,
          notes: notes.trim() || null,
          currentGroupId: selectedGroupId,
          registrationDate,
        });
        Alert.alert('Success', 'Student registered successfully.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to save student.');
    } finally {
      setLoading(false);
    }
  };

  const selectedGroupName =
    groups.find((g) => g.id === selectedGroupId)?.name || 'None (Unassigned)';

  const selectGroup = (id: string | null) => {
    haptic.select();
    setSelectedGroupId(id);
    setGroupPickerVisible(false);
  };

  return (
    <View style={styles.container}>
      <Header
        title={isEdit ? 'Edit Student' : 'Register Student'}
        subtitle={isEdit ? 'Update the student record' : 'Add a new student to the darsgah'}
        onBack={() => navigation.goBack()}
      />
      <ScreenContainer scrollable contentContainerStyle={styles.scrollContent}>
        {/* Basic Student Information */}
        <FadeInView>
          <Card style={styles.sectionCard}>
            <View style={styles.sectionHead}>
              <IconCircle icon="person" size={36} square />
              <SectionHeader title="Student Details" style={styles.sectionHeader} />
            </View>

            <Input
              label="Full Name"
              value={fullName}
              onChangeText={setFullName}
              placeholder="e.g., Muhammad Abdullah"
              required
              leftIcon="person-outline"
            />

            <Input
              label="Admission / Roll Number"
              value={admissionNumber}
              onChangeText={setAdmissionNumber}
              placeholder="e.g., DAR-2026-001"
              leftIcon="card-outline"
            />

            {/* Gender Selector */}
            <Text style={styles.fieldLabel}>Gender</Text>
            <View style={styles.genderRow}>
              {(['Male', 'Female'] as const).map((item) => (
                <Chip
                  key={item}
                  label={item}
                  icon={item === 'Male' ? 'man-outline' : 'woman-outline'}
                  selected={gender === item}
                  onPress={() => setGender(item)}
                  style={styles.genderChip}
                />
              ))}
            </View>

            <Input
              label="Date of Birth"
              value={dateOfBirth}
              onChangeText={setDateOfBirth}
              placeholder="YYYY-MM-DD (e.g., 2015-05-12)"
              leftIcon="calendar-outline"
            />

            <Input
              label="Registration Date"
              value={registrationDate}
              onChangeText={setRegistrationDate}
              placeholder="YYYY-MM-DD"
              leftIcon="time-outline"
              containerStyle={styles.lastInput}
            />
          </Card>
        </FadeInView>

        {/* Group Assignment */}
        <FadeInView index={1}>
          <Card style={styles.sectionCard}>
            <View style={styles.sectionHead}>
              <IconCircle
                icon="layers"
                size={36}
                square
                color={Colors.accentDark}
                bg={Colors.accentLight}
              />
              <SectionHeader title="Group Assignment" style={styles.sectionHeader} />
            </View>
            <Text style={styles.sectionDesc}>
              Assign this student to an educational group (e.g. Group 1, Group 2).
            </Text>

            <PressableScale
              style={styles.groupPickerButton}
              onPress={() => setGroupPickerVisible(true)}
              pressedScale={0.98}
              hapticOnPress
            >
              <View style={styles.groupPickerLeft}>
                <IconCircle
                  icon={selectedGroupId ? 'layers' : 'layers-outline'}
                  size={34}
                  color={selectedGroupId ? Colors.primary : Colors.textMuted}
                  bg={selectedGroupId ? Colors.primaryLight : Colors.surfaceSubtle}
                />
                <View style={styles.groupPickerTextCol}>
                  <Text style={styles.groupPickerLabel}>Current group</Text>
                  <Text style={styles.groupPickerValue} numberOfLines={1}>
                    {selectedGroupName}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-down" size={18} color={Colors.textSecondary} />
            </PressableScale>
          </Card>
        </FadeInView>

        {/* Guardian & Contact */}
        <FadeInView index={2}>
          <Card style={styles.sectionCard}>
            <View style={styles.sectionHead}>
              <IconCircle icon="call" size={36} square color={Colors.info} bg={Colors.infoLight} />
              <SectionHeader title="Guardian & Contact" style={styles.sectionHeader} />
            </View>

            <Input
              label="Guardian / Father's Name"
              value={guardianName}
              onChangeText={setGuardianName}
              placeholder="e.g., Abdul Rahman"
              leftIcon="people-outline"
            />

            <Input
              label="Contact Phone Number"
              value={contactPhone}
              onChangeText={setContactPhone}
              placeholder="e.g., +91 9876543210"
              keyboardType="phone-pad"
              leftIcon="call-outline"
            />

            <Input
              label="Residential Address"
              value={address}
              onChangeText={setAddress}
              placeholder="e.g., House 42, Street 5, Mohalla..."
              multiline
              numberOfLines={2}
              leftIcon="home-outline"
            />

            <Input
              label="Additional Notes / Remarks"
              value={notes}
              onChangeText={setNotes}
              placeholder="e.g., Special memorization goals or health notes"
              multiline
              numberOfLines={2}
              leftIcon="document-text-outline"
              containerStyle={styles.lastInput}
            />
          </Card>
        </FadeInView>
      </ScreenContainer>

      {/* Sticky Save Bar */}
      <View style={[styles.footer, { paddingBottom: Spacing.md + insets.bottom }]}>
        <Button
          title={isEdit ? 'Update Student' : 'Register Student'}
          onPress={handleSave}
          loading={loading}
          icon="checkmark-circle-outline"
          size="lg"
          fullWidth
        />
      </View>

      {/* Group Picker Modal */}
      <Modal
        visible={groupPickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setGroupPickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setGroupPickerVisible(false)} />
          <View style={[styles.modalContent, { paddingBottom: Spacing.xl + insets.bottom }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Group</Text>
              <PressableScale
                style={styles.modalClose}
                onPress={() => setGroupPickerVisible(false)}
                pressedScale={0.9}
                hitSlop={8}
              >
                <Ionicons name="close" size={20} color={Colors.text} />
              </PressableScale>
            </View>

            <PressableScale
              style={[styles.groupOption, selectedGroupId === null && styles.groupOptionSelected]}
              onPress={() => selectGroup(null)}
              pressedScale={0.98}
            >
              <View style={styles.groupOptionLeft}>
                <IconCircle
                  icon="remove-circle-outline"
                  size={36}
                  color={Colors.textSecondary}
                  bg={Colors.surfaceSubtle}
                />
                <Text
                  style={[
                    styles.groupOptionText,
                    selectedGroupId === null && styles.groupOptionTextSelected,
                  ]}
                >
                  None (Unassigned)
                </Text>
              </View>
              {selectedGroupId === null ? (
                <Ionicons name="checkmark-circle" size={22} color={Colors.primary} />
              ) : null}
            </PressableScale>

            <FlatList
              data={groups}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.groupList}
              renderItem={({ item }) => (
                <PressableScale
                  style={[
                    styles.groupOption,
                    selectedGroupId === item.id && styles.groupOptionSelected,
                  ]}
                  onPress={() => selectGroup(item.id)}
                  pressedScale={0.98}
                >
                  <View style={styles.groupOptionLeft}>
                    <IconCircle icon="layers-outline" size={36} />
                    <View style={styles.groupOptionTextCol}>
                      <Text
                        style={[
                          styles.groupOptionText,
                          selectedGroupId === item.id && styles.groupOptionTextSelected,
                        ]}
                      >
                        {item.name}
                      </Text>
                      {item.description ? (
                        <Text style={styles.groupOptionDesc} numberOfLines={1}>
                          {item.description}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                  {selectedGroupId === item.id ? (
                    <Ionicons name="checkmark-circle" size={22} color={Colors.primary} />
                  ) : null}
                </PressableScale>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingBottom: Spacing.xxxl,
  },
  sectionCard: {
    marginBottom: Spacing.lg,
    padding: Spacing.lg,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flex: 1,
    marginBottom: 0,
  },
  sectionDesc: {
    ...Typography.bodySmall,
    marginTop: -Spacing.sm,
    marginBottom: Spacing.md,
  },
  fieldLabel: {
    fontFamily: Fonts.semibold,
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  genderRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  genderChip: {
    flex: 1,
    height: 44,
    justifyContent: 'center',
  },
  lastInput: {
    marginBottom: 0,
  },
  groupPickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceRaised,
  },
  groupPickerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  groupPickerTextCol: {
    flex: 1,
  },
  groupPickerLabel: {
    ...Typography.caption,
  },
  groupPickerValue: {
    ...Typography.titleSmall,
    fontSize: 15,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    ...Shadows.lg,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    maxHeight: '75%',
  },
  modalHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.borderDark,
    marginBottom: Spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  modalTitle: {
    ...Typography.titleMedium,
  },
  modalClose: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupList: {
    gap: Spacing.xs,
    paddingTop: Spacing.xs,
  },
  groupOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  groupOptionSelected: {
    backgroundColor: Colors.primarySoft,
    borderColor: Colors.primaryLight,
  },
  groupOptionLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  groupOptionTextCol: {
    flex: 1,
  },
  groupOptionText: {
    ...Typography.bodyLarge,
    fontFamily: Fonts.semibold,
  },
  groupOptionTextSelected: {
    color: Colors.primary,
    fontFamily: Fonts.bold,
  },
  groupOptionDesc: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
