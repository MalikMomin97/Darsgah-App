import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Modal,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../../components/common/Header';
import { ScreenContainer } from '../../components/layout/ScreenContainer';
import { Card } from '../../components/common/Card';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Colors, Spacing, Typography, BorderRadius } from '../../config/theme';
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

  return (
    <View style={styles.container}>
      <Header
        title={isEdit ? 'Edit Student' : 'Register Student'}
        onBack={() => navigation.goBack()}
      />
      <ScreenContainer scrollable>
        {/* Basic Student Information */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Student Details</Text>

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
              <TouchableOpacity
                key={item}
                style={[styles.genderChip, gender === item && styles.genderChipActive]}
                onPress={() => setGender(item)}
              >
                <Ionicons
                  name={item === 'Male' ? 'man-outline' : 'woman-outline'}
                  size={16}
                  color={gender === item ? Colors.textInverse : Colors.textSecondary}
                />
                <Text
                  style={[
                    styles.genderText,
                    gender === item && styles.genderTextActive,
                  ]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
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
          />
        </Card>

        {/* Group Assignment */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Group Assignment</Text>
          <Text style={styles.sectionDesc}>
            Assign this student to an educational group (e.g. Group 1, Group 2).
          </Text>

          <TouchableOpacity
            style={styles.groupPickerButton}
            onPress={() => setGroupPickerVisible(true)}
          >
            <View style={styles.groupPickerLeft}>
              <Ionicons name="layers-outline" size={20} color={Colors.primary} />
              <Text style={styles.groupPickerValue}>{selectedGroupName}</Text>
            </View>
            <Ionicons name="chevron-down" size={18} color={Colors.textSecondary} />
          </TouchableOpacity>
        </Card>

        {/* Guardian & Contact */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Guardian & Contact</Text>

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
          />
        </Card>

        <Button
          title={isEdit ? 'Update Student' : 'Register Student'}
          onPress={handleSave}
          loading={loading}
          icon="checkmark-circle-outline"
          style={{ marginBottom: Spacing.xxl }}
        />
      </ScreenContainer>

      {/* Group Picker Modal */}
      <Modal
        visible={groupPickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setGroupPickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Group</Text>
              <TouchableOpacity onPress={() => setGroupPickerVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[
                styles.groupOption,
                selectedGroupId === null && styles.groupOptionSelected,
              ]}
              onPress={() => {
                setSelectedGroupId(null);
                setGroupPickerVisible(false);
              }}
            >
              <Text
                style={[
                  styles.groupOptionText,
                  selectedGroupId === null && styles.groupOptionTextSelected,
                ]}
              >
                None (Unassigned)
              </Text>
              {selectedGroupId === null ? (
                <Ionicons name="checkmark" size={20} color={Colors.primary} />
              ) : null}
            </TouchableOpacity>

            <FlatList
              data={groups}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.groupOption,
                    selectedGroupId === item.id && styles.groupOptionSelected,
                  ]}
                  onPress={() => {
                    setSelectedGroupId(item.id);
                    setGroupPickerVisible(false);
                  }}
                >
                  <View>
                    <Text
                      style={[
                        styles.groupOptionText,
                        selectedGroupId === item.id && styles.groupOptionTextSelected,
                      ]}
                    >
                      {item.name}
                    </Text>
                    {item.description ? (
                      <Text style={styles.groupOptionDesc}>{item.description}</Text>
                    ) : null}
                  </View>
                  {selectedGroupId === item.id ? (
                    <Ionicons name="checkmark" size={20} color={Colors.primary} />
                  ) : null}
                </TouchableOpacity>
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
  sectionCard: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.titleSmall,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  sectionDesc: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  fieldLabel: {
    ...Typography.bodyMedium,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  genderRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  genderChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  genderChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  genderText: {
    ...Typography.bodyMedium,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  genderTextActive: {
    color: Colors.textInverse,
    fontWeight: '700',
  },
  groupPickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
  },
  groupPickerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  groupPickerValue: {
    ...Typography.bodyLarge,
    color: Colors.text,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.xl,
    maxHeight: '75%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  modalTitle: {
    ...Typography.titleMedium,
    color: Colors.text,
  },
  groupOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    borderRadius: BorderRadius.sm,
  },
  groupOptionSelected: {
    backgroundColor: Colors.primaryLight,
  },
  groupOptionText: {
    ...Typography.bodyLarge,
    color: Colors.text,
    fontWeight: '600',
  },
  groupOptionTextSelected: {
    color: Colors.primary,
  },
  groupOptionDesc: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
