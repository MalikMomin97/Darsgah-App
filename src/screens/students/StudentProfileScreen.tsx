import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../../components/common/Header';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { LoadingScreen } from '../../components/common/LoadingScreen';
import { Colors, Spacing, Typography, BorderRadius } from '../../config/theme';
import { Student, StudentGroupHistory, Group, StudentBookProgress } from '../../types';
import { StudentService } from '../../services/studentService';
import { GroupService } from '../../services/groupService';
import { LearningService } from '../../services/learningService';
import { LearningOverviewCard } from '../../components/learning/LearningOverviewCard';
import { formatDateDisplay } from '../../utils/dateUtils';
import { useFocusEffect } from 'expo-router';
import { useAppNavigation, useAppRoute } from '../../navigation/appNavigation';


export const StudentProfileScreen: React.FC = () => {
  const navigation = useAppNavigation();
  const route = useAppRoute<'StudentProfile'>();
  const studentId = route.params.studentId;

  const [student, setStudent] = useState<Student | null>(null);
  const [history, setHistory] = useState<StudentGroupHistory[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [books, setBooks] = useState<StudentBookProgress[]>([]);
  const [loading, setLoading] = useState(true);

  // Transfer Group Modal state
  const [transferModalVisible, setTransferModalVisible] = useState(false);
  const [selectedNewGroupId, setSelectedNewGroupId] = useState<string | null>(null);
  const [transferring, setTransferring] = useState(false);

  // Archive Confirm Modal
  const [archiveModalVisible, setArchiveModalVisible] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [std, hist, allGroups, overview] = await Promise.all([
        StudentService.getStudentById(studentId),
        StudentService.getStudentGroupHistory(studentId),
        GroupService.getGroups(false),
        LearningService.getStudentBooks(studentId),
      ]);
      setStudent(std);
      setBooks(overview);
      setHistory(hist);
      setGroups(allGroups);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to load student profile.');
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleToggleActive = async () => {
    if (!student) return;
    try {
      await StudentService.setStudentActiveStatus(student.id, !student.isActive);
      loadData();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to update active status.');
    }
  };

  const handleArchiveToggle = async () => {
    if (!student) return;
    try {
      if (student.isArchived) {
        await StudentService.unarchiveStudent(student.id);
        Alert.alert('Success', 'Student restored to active database.');
      } else {
        await StudentService.archiveStudent(student.id);
        Alert.alert('Success', 'Student archived. All learning and attendance history is safely preserved.');
      }
      setArchiveModalVisible(false);
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to archive student.');
    }
  };

  const handleTransferGroup = async () => {
    if (!student) return;
    try {
      setTransferring(true);
      await StudentService.moveStudentToGroup(student.id, selectedNewGroupId, 'Group reassignment');
      setTransferModalVisible(false);
      Alert.alert('Success', 'Student moved to new group. Membership history recorded.');
      loadData();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to move student.');
    } finally {
      setTransferring(false);
    }
  };

  if (loading && !student) {
    return <LoadingScreen message="Loading student profile..." />;
  }

  if (!student) {
    return (
      <View style={styles.container}>
        <Header title="Student Profile" onBack={() => navigation.goBack()} />
        <View style={styles.notFoundWrap}>
          <Text style={styles.notFoundText}>Student record not found.</Text>
          <Button title="Go Back" onPress={() => navigation.goBack()} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header
        title="Student Profile"
        onBack={() => navigation.goBack()}
        rightAction={{
          icon: 'create-outline',
          label: 'Edit',
          onPress: () => navigation.navigate('StudentForm', { studentId: student.id }),
        }}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Header Hero */}
        <Card style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarLetter}>
                {student.fullName.charAt(0).toUpperCase()}
              </Text>
            </View>

            <View style={styles.heroInfo}>
              <Text style={styles.studentName}>{student.fullName}</Text>
              <Text style={styles.admissionText}>
                {student.admissionNumber ? `Roll No: ${student.admissionNumber}` : 'No Roll Number'}
              </Text>
              <View style={styles.badgesRow}>
                <Badge type={student.isArchived ? 'archived' : student.isActive ? 'active' : 'inactive'} />
                {student.groupName ? (
                  <View style={styles.groupBadge}>
                    <Ionicons name="layers" size={12} color={Colors.primary} />
                    <Text style={styles.groupBadgeText}>{student.groupName}</Text>
                  </View>
                ) : (
                  <View style={[styles.groupBadge, { backgroundColor: Colors.surfaceSubtle }]}>
                    <Text style={[styles.groupBadgeText, { color: Colors.textMuted }]}>No Group</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Quick Academic Actions */}
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity
              style={[styles.primaryActionBtn, { backgroundColor: Colors.primary }]}
              onPress={() => navigation.navigate('StudentLearning', { studentId: student.id })}
            >
              <Ionicons name="book-outline" size={18} color={Colors.textInverse} />
              <Text style={styles.actionBtnText}>Learning</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.primaryActionBtn, { backgroundColor: Colors.info }]}
              onPress={() => navigation.navigate('AttendanceHistory', { studentId: student.id })}
            >
              <Ionicons name="calendar-outline" size={18} color={Colors.textInverse} />
              <Text style={styles.actionBtnText}>Attendance</Text>
            </TouchableOpacity>
          </View>
        </Card>

        <LearningOverviewCard
          books={books}
          onOpen={() => navigation.navigate('StudentLearning', { studentId: student.id })}
        />

        {/* Contact & Personal Information */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Personal Information</Text>

          <View style={styles.infoRow}>
            <Ionicons name="people-outline" size={18} color={Colors.textSecondary} />
            <View style={styles.infoTextCol}>
              <Text style={styles.infoLabel}>Guardian / Father</Text>
              <Text style={styles.infoValue}>{student.guardianName || 'Not specified'}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="call-outline" size={18} color={Colors.textSecondary} />
            <View style={styles.infoTextCol}>
              <Text style={styles.infoLabel}>Phone Number</Text>
              <Text style={styles.infoValue}>{student.contactPhone || 'Not specified'}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={18} color={Colors.textSecondary} />
            <View style={styles.infoTextCol}>
              <Text style={styles.infoLabel}>Date of Birth</Text>
              <Text style={styles.infoValue}>{formatDateDisplay(student.dateOfBirth)}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={18} color={Colors.textSecondary} />
            <View style={styles.infoTextCol}>
              <Text style={styles.infoLabel}>Registration Date</Text>
              <Text style={styles.infoValue}>{formatDateDisplay(student.registrationDate)}</Text>
            </View>
          </View>

          {student.address ? (
            <View style={styles.infoRow}>
              <Ionicons name="home-outline" size={18} color={Colors.textSecondary} />
              <View style={styles.infoTextCol}>
                <Text style={styles.infoLabel}>Address</Text>
                <Text style={styles.infoValue}>{student.address}</Text>
              </View>
            </View>
          ) : null}

          {student.notes ? (
            <View style={styles.infoRow}>
              <Ionicons name="document-text-outline" size={18} color={Colors.textSecondary} />
              <View style={styles.infoTextCol}>
                <Text style={styles.infoLabel}>Notes / Remarks</Text>
                <Text style={styles.infoValue}>{student.notes}</Text>
              </View>
            </View>
          ) : null}
        </Card>

        {/* Group Membership & Transfer */}
        <Card style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle}>Group Membership History</Text>
            <TouchableOpacity
              style={styles.transferLink}
              onPress={() => {
                setSelectedNewGroupId(student.currentGroupId);
                setTransferModalVisible(true);
              }}
            >
              <Ionicons name="swap-horizontal" size={16} color={Colors.primary} />
              <Text style={styles.transferLinkText}>Transfer Group</Text>
            </TouchableOpacity>
          </View>

          {history.length === 0 ? (
            <Text style={styles.emptyHistoryText}>No group history recorded yet.</Text>
          ) : (
            history.map((item, index) => (
              <View key={item.id} style={styles.historyItem}>
                <View style={styles.historyDotWrap}>
                  <View
                    style={[
                      styles.historyDot,
                      !item.leftDate && styles.historyDotActive,
                    ]}
                  />
                  {index !== history.length - 1 && <View style={styles.historyLine} />}
                </View>
                <View style={styles.historyContent}>
                  <View style={styles.historyTopRow}>
                    <Text style={styles.historyGroupName}>{item.groupName}</Text>
                    {!item.leftDate ? (
                      <Badge label="Current" type="active" size="sm" />
                    ) : null}
                  </View>
                  <Text style={styles.historyDates}>
                    {formatDateDisplay(item.joinedDate)} —{' '}
                    {item.leftDate ? formatDateDisplay(item.leftDate) : 'Present'}
                  </Text>
                  {item.notes ? (
                    <Text style={styles.historyNotes}>{item.notes}</Text>
                  ) : null}
                </View>
              </View>
            ))
          )}
        </Card>

        {/* Student Status & Archiving Controls */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Status Controls</Text>
          <View style={styles.controlButtons}>
            <Button
              title={student.isActive ? 'Mark as Inactive' : 'Mark as Active'}
              variant="secondary"
              icon={student.isActive ? 'pause-circle-outline' : 'play-circle-outline'}
              onPress={handleToggleActive}
              style={{ marginBottom: Spacing.sm }}
            />

            <Button
              title={student.isArchived ? 'Restore Student' : 'Archive Student'}
              variant={student.isArchived ? 'outline' : 'danger'}
              icon={student.isArchived ? 'refresh-outline' : 'archive-outline'}
              onPress={() => setArchiveModalVisible(true)}
            />
          </View>
        </Card>
      </ScrollView>

      {/* Transfer Group Modal */}
      <Modal
        visible={transferModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setTransferModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Transfer Student to Group</Text>
              <TouchableOpacity onPress={() => setTransferModalVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.transferPrompt}>
              Select the new group for {student.fullName}. The transfer date and historical records will be automatically logged.
            </Text>

            <FlatList
              data={groups}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.groupOption,
                    selectedNewGroupId === item.id && styles.groupOptionSelected,
                  ]}
                  onPress={() => setSelectedNewGroupId(item.id)}
                >
                  <Text
                    style={[
                      styles.groupOptionText,
                      selectedNewGroupId === item.id && styles.groupOptionTextSelected,
                    ]}
                  >
                    {item.name}
                  </Text>
                  {selectedNewGroupId === item.id ? (
                    <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
                  ) : null}
                </TouchableOpacity>
              )}
            />

            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                variant="secondary"
                onPress={() => setTransferModalVisible(false)}
                style={{ flex: 1 }}
              />
              <Button
                title="Confirm Transfer"
                variant="primary"
                onPress={handleTransferGroup}
                loading={transferring}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Archive Confirm Modal */}
      <ConfirmModal
        visible={archiveModalVisible}
        title={student.isArchived ? 'Restore Student?' : 'Archive Student?'}
        message={
          student.isArchived
            ? `Restore ${student.fullName} back to active students?`
            : `Are you sure you want to archive ${student.fullName}? All attendance records and learning progress will remain safely intact in reports.`
        }
        confirmText={student.isArchived ? 'Yes, Restore' : 'Yes, Archive'}
        confirmVariant={student.isArchived ? 'primary' : 'danger'}
        onConfirm={handleArchiveToggle}
        onCancel={() => setArchiveModalVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  notFoundWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  notFoundText: {
    ...Typography.bodyLarge,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  heroCard: {
    marginBottom: Spacing.lg,
    padding: Spacing.lg,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    ...Typography.titleLarge,
    color: Colors.primary,
    fontWeight: '800',
  },
  heroInfo: {
    flex: 1,
  },
  studentName: {
    ...Typography.titleMedium,
    color: Colors.text,
  },
  admissionText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    marginTop: 2,
    marginBottom: 4,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  groupBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  groupBadgeText: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '700',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.md,
  },
  primaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  actionBtnText: {
    ...Typography.button,
    fontSize: 13,
    color: Colors.textInverse,
  },
  card: {
    marginBottom: Spacing.lg,
  },
  cardTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  cardTitle: {
    ...Typography.titleSmall,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  transferLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  transferLinkText: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '700',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  infoTextCol: {
    flex: 1,
  },
  infoLabel: {
    ...Typography.caption,
    color: Colors.textMuted,
  },
  infoValue: {
    ...Typography.bodyMedium,
    color: Colors.text,
    marginTop: 2,
  },
  emptyHistoryText: {
    ...Typography.bodySmall,
    color: Colors.textMuted,
  },
  historyItem: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  historyDotWrap: {
    alignItems: 'center',
    width: 16,
  },
  historyDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.borderDark,
    marginTop: 4,
  },
  historyDotActive: {
    backgroundColor: Colors.primary,
  },
  historyLine: {
    width: 2,
    flex: 1,
    backgroundColor: Colors.border,
    marginTop: 4,
  },
  historyContent: {
    flex: 1,
  },
  historyTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyGroupName: {
    ...Typography.bodyMedium,
    fontWeight: '700',
    color: Colors.text,
  },
  historyDates: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  historyNotes: {
    ...Typography.caption,
    color: Colors.textMuted,
    marginTop: 2,
  },
  controlButtons: {
    gap: Spacing.xs,
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
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  modalTitle: {
    ...Typography.titleMedium,
    color: Colors.text,
  },
  transferPrompt: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  groupOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  groupOptionSelected: {
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.md,
  },
  groupOptionText: {
    ...Typography.bodyLarge,
    color: Colors.text,
  },
  groupOptionTextSelected: {
    fontWeight: '700',
    color: Colors.primary,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
});
