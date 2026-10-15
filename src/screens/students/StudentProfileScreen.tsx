import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Modal,
  FlatList,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '../../components/common/Header';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { StatCard } from '../../components/common/StatCard';
import { IconCircle } from '../../components/common/IconCircle';
import { SectionHeader } from '../../components/common/SectionHeader';
import { EmptyState } from '../../components/common/EmptyState';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { LoadingScreen } from '../../components/common/LoadingScreen';
import { FadeInView, PressableScale, haptic } from '../../components/common/Motion';
import {
  Colors,
  Spacing,
  Typography,
  BorderRadius,
  Fonts,
  Gradients,
  Shadows,
} from '../../config/theme';
import { Student, StudentGroupHistory, Group, StudentBookProgress } from '../../types';
import { StudentService } from '../../services/studentService';
import { GroupService } from '../../services/groupService';
import { LearningService } from '../../services/learningService';
import { LearningOverviewCard } from '../../components/learning/LearningOverviewCard';
import { formatDateDisplay } from '../../utils/dateUtils';
import { useFocusEffect } from 'expo-router';
import { useAppNavigation, useAppRoute } from '../../navigation/appNavigation';
import { avatarTone, initialsOf } from '../../utils/avatar';

export const StudentProfileScreen: React.FC = () => {
  const navigation = useAppNavigation();
  const route = useAppRoute<'StudentProfile'>();
  const studentId = route.params.studentId;
  const insets = useSafeAreaInsets();

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
        Alert.alert(
          'Success',
          'Student archived. All learning and attendance history is safely preserved.'
        );
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
        <EmptyState
          icon="person-outline"
          title="Not Found"
          description="Student record not found."
          style={styles.notFoundWrap}
        />
        <View style={styles.notFoundAction}>
          <Button title="Go Back" onPress={() => navigation.goBack()} />
        </View>
      </View>
    );
  }

  const tone = avatarTone(student.fullName);
  const chaptersDone = books.reduce((sum, b) => sum + b.completedCount, 0);

  const infoRows: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    value: string;
    color: string;
    bg: string;
  }[] = [
    {
      icon: 'people-outline',
      label: 'Guardian / Father',
      value: student.guardianName || 'Not specified',
      color: Colors.primary,
      bg: Colors.primaryLight,
    },
    {
      icon: 'call-outline',
      label: 'Phone Number',
      value: student.contactPhone || 'Not specified',
      color: Colors.info,
      bg: Colors.infoLight,
    },
    {
      icon: 'calendar-outline',
      label: 'Date of Birth',
      value: formatDateDisplay(student.dateOfBirth),
      color: Colors.accentDark,
      bg: Colors.accentLight,
    },
    {
      icon: 'time-outline',
      label: 'Registration Date',
      value: formatDateDisplay(student.registrationDate),
      color: Colors.success,
      bg: Colors.successLight,
    },
  ];
  if (student.address) {
    infoRows.push({
      icon: 'home-outline',
      label: 'Address',
      value: student.address,
      color: Colors.holiday,
      bg: Colors.holidayBg,
    });
  }
  if (student.notes) {
    infoRows.push({
      icon: 'document-text-outline',
      label: 'Notes / Remarks',
      value: student.notes,
      color: Colors.textSecondary,
      bg: Colors.surfaceSubtle,
    });
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
        <FadeInView style={styles.heroCard}>
          <LinearGradient
            colors={Gradients.brand}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.heroGlow} />

          <View style={styles.heroTopRow}>
            <View style={styles.avatarRing}>
              <View style={[styles.avatar, { backgroundColor: tone.bg }]}>
                <Text style={[styles.avatarLetter, { color: tone.fg }]}>
                  {initialsOf(student.fullName)}
                </Text>
              </View>
            </View>

            <View style={styles.heroInfo}>
              <Text style={styles.studentName} numberOfLines={2}>
                {student.fullName}
              </Text>
              <Text style={styles.admissionText}>
                {student.admissionNumber ? `Roll No: ${student.admissionNumber}` : 'No Roll Number'}
              </Text>
            </View>
          </View>

          <View style={styles.badgesRow}>
            <Badge
              type={student.isArchived ? 'archived' : student.isActive ? 'active' : 'inactive'}
            />
            {student.groupName ? (
              <View style={styles.heroChip}>
                <Ionicons name="layers" size={12} color={Colors.textInverse} />
                <Text style={styles.heroChipText}>{student.groupName}</Text>
              </View>
            ) : (
              <View style={[styles.heroChip, styles.heroChipMuted]}>
                <Text style={[styles.heroChipText, styles.heroChipTextMuted]}>No Group</Text>
              </View>
            )}
          </View>

          {/* Quick Academic Actions */}
          <View style={styles.actionButtonsRow}>
            <PressableScale
              style={[styles.heroActionBtn, styles.heroActionPrimary]}
              onPress={() => navigation.navigate('StudentLearning', { studentId: student.id })}
              hapticOnPress
            >
              <Ionicons name="book-outline" size={18} color={Colors.primary} />
              <Text style={[styles.actionBtnText, { color: Colors.primary }]}>Learning</Text>
            </PressableScale>

            <PressableScale
              style={[styles.heroActionBtn, styles.heroActionGhost]}
              onPress={() => navigation.navigate('AttendanceHistory', { studentId: student.id })}
              hapticOnPress
            >
              <Ionicons name="calendar-outline" size={18} color={Colors.textInverse} />
              <Text style={styles.actionBtnText}>Attendance</Text>
            </PressableScale>
          </View>
        </FadeInView>

        {/* Stat Tiles */}
        <FadeInView index={1} style={styles.statsRow}>
          <StatCard title="Books" value={books.length} icon="library-outline" />
          <StatCard
            title="Chapters Done"
            value={chaptersDone}
            icon="checkmark-done-outline"
            color={Colors.success}
            bgColor={Colors.successLight}
          />
          <StatCard
            title="Groups"
            value={history.length}
            icon="git-branch-outline"
            color={Colors.accentDark}
            bgColor={Colors.accentLight}
          />
        </FadeInView>

        <FadeInView index={2}>
          <LearningOverviewCard
            books={books}
            onOpen={() => navigation.navigate('StudentLearning', { studentId: student.id })}
          />
        </FadeInView>

        {/* Contact & Personal Information */}
        <FadeInView index={3}>
          <SectionHeader title="Personal Information" style={styles.sectionHeader} />
          <Card style={styles.card} padding="md">
            {infoRows.map((row, index) => (
              <View
                key={row.label}
                style={[styles.infoRow, index < infoRows.length - 1 && styles.infoRowDivider]}
              >
                <IconCircle icon={row.icon} size={38} square color={row.color} bg={row.bg} />
                <View style={styles.infoTextCol}>
                  <Text style={styles.infoLabel}>{row.label}</Text>
                  <Text style={styles.infoValue}>{row.value}</Text>
                </View>
              </View>
            ))}
          </Card>
        </FadeInView>

        {/* Group Membership & Transfer */}
        <FadeInView index={4}>
          <View style={styles.cardTitleRow}>
            <SectionHeader title="Group Membership History" style={styles.sectionHeaderInline} />
            <PressableScale
              style={styles.transferLink}
              onPress={() => {
                setSelectedNewGroupId(student.currentGroupId);
                setTransferModalVisible(true);
              }}
              pressedScale={0.94}
              hapticOnPress
            >
              <Ionicons name="swap-horizontal" size={15} color={Colors.primary} />
              <Text style={styles.transferLinkText}>Transfer Group</Text>
            </PressableScale>
          </View>

          <Card style={styles.card}>
            {history.length === 0 ? (
              <Text style={styles.emptyHistoryText}>No group history recorded yet.</Text>
            ) : (
              history.map((item, index) => (
                <View
                  key={item.id}
                  style={[styles.historyItem, index === history.length - 1 && styles.historyLast]}
                >
                  <View style={styles.historyDotWrap}>
                    <View style={[styles.historyDot, !item.leftDate && styles.historyDotActive]} />
                    {index !== history.length - 1 && <View style={styles.historyLine} />}
                  </View>
                  <View style={styles.historyContent}>
                    <View style={styles.historyTopRow}>
                      <Text style={styles.historyGroupName}>{item.groupName}</Text>
                      {!item.leftDate ? <Badge label="Current" type="active" size="sm" /> : null}
                    </View>
                    <Text style={styles.historyDates}>
                      {formatDateDisplay(item.joinedDate)} —{' '}
                      {item.leftDate ? formatDateDisplay(item.leftDate) : 'Present'}
                    </Text>
                    {item.notes ? <Text style={styles.historyNotes}>{item.notes}</Text> : null}
                  </View>
                </View>
              ))
            )}
          </Card>
        </FadeInView>

        {/* Student Status & Archiving Controls */}
        <FadeInView index={5}>
          <SectionHeader title="Status Controls" style={styles.sectionHeader} />
          <Card style={styles.card}>
            <View style={styles.controlButtons}>
              <Button
                title={student.isActive ? 'Mark as Inactive' : 'Mark as Active'}
                variant="secondary"
                icon={student.isActive ? 'pause-circle-outline' : 'play-circle-outline'}
                onPress={handleToggleActive}
                fullWidth
              />

              <Button
                title={student.isArchived ? 'Restore Student' : 'Archive Student'}
                variant={student.isArchived ? 'outline' : 'danger'}
                icon={student.isArchived ? 'refresh-outline' : 'archive-outline'}
                onPress={() => setArchiveModalVisible(true)}
                fullWidth
              />
            </View>
          </Card>
        </FadeInView>
      </ScrollView>

      {/* Transfer Group Modal */}
      <Modal
        visible={transferModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setTransferModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setTransferModalVisible(false)} />
          <View style={[styles.modalContent, { paddingBottom: Spacing.xl + insets.bottom }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Transfer Student to Group</Text>
              <PressableScale
                style={styles.modalClose}
                onPress={() => setTransferModalVisible(false)}
                pressedScale={0.9}
                hitSlop={8}
              >
                <Ionicons name="close" size={20} color={Colors.text} />
              </PressableScale>
            </View>

            <Text style={styles.transferPrompt}>
              Select the new group for {student.fullName}. The transfer date and historical records
              will be automatically logged.
            </Text>

            <FlatList
              data={groups}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.groupList}
              renderItem={({ item }) => (
                <PressableScale
                  style={[
                    styles.groupOption,
                    selectedNewGroupId === item.id && styles.groupOptionSelected,
                  ]}
                  onPress={() => {
                    haptic.select();
                    setSelectedNewGroupId(item.id);
                  }}
                  pressedScale={0.98}
                >
                  <View style={styles.groupOptionLeft}>
                    <IconCircle
                      icon={selectedNewGroupId === item.id ? 'layers' : 'layers-outline'}
                      size={36}
                    />
                    <Text
                      style={[
                        styles.groupOptionText,
                        selectedNewGroupId === item.id && styles.groupOptionTextSelected,
                      ]}
                    >
                      {item.name}
                    </Text>
                  </View>
                  {selectedNewGroupId === item.id ? (
                    <Ionicons name="checkmark-circle" size={22} color={Colors.primary} />
                  ) : null}
                </PressableScale>
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
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.xxxl,
  },
  notFoundWrap: {
    flex: 1,
  },
  notFoundAction: {
    alignItems: 'center',
    paddingBottom: Spacing.xxxl,
  },
  heroCard: {
    marginBottom: Spacing.lg,
    padding: Spacing.xl,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    backgroundColor: Colors.primary,
    ...Shadows.lg,
  },
  heroGlow: {
    position: 'absolute',
    top: -70,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.accentGlow,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  avatarRing: {
    padding: 3,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    ...Typography.titleLarge,
    fontFamily: Fonts.extrabold,
    letterSpacing: 0.5,
  },
  heroInfo: {
    flex: 1,
  },
  studentName: {
    ...Typography.titleLarge,
    color: Colors.textInverse,
  },
  admissionText: {
    ...Typography.bodySmall,
    fontFamily: Fonts.medium,
    color: 'rgba(255, 255, 255, 0.75)',
    marginTop: 2,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  heroChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  heroChipMuted: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  heroChipText: {
    fontFamily: Fonts.semibold,
    fontSize: 12,
    color: Colors.textInverse,
  },
  heroChipTextMuted: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  heroActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 46,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  heroActionPrimary: {
    backgroundColor: Colors.surface,
  },
  heroActionGhost: {
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.28)',
  },
  actionBtnText: {
    ...Typography.button,
    fontSize: 14,
    color: Colors.textInverse,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    marginTop: Spacing.md,
  },
  sectionHeaderInline: {
    flex: 1,
    marginBottom: 0,
  },
  card: {
    marginBottom: Spacing.lg,
  },
  cardTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  transferLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 32,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryLight,
  },
  transferLinkText: {
    fontFamily: Fonts.semibold,
    fontSize: 12.5,
    color: Colors.primary,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xs,
  },
  infoRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  infoTextCol: {
    flex: 1,
  },
  infoLabel: {
    ...Typography.overline,
  },
  infoValue: {
    ...Typography.bodyMedium,
    fontFamily: Fonts.semibold,
    marginTop: 3,
  },
  emptyHistoryText: {
    ...Typography.bodySmall,
    color: Colors.textMuted,
  },
  historyItem: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  historyLast: {
    paddingBottom: 0,
  },
  historyDotWrap: {
    alignItems: 'center',
    width: 16,
  },
  historyDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.borderDark,
    marginTop: 4,
  },
  historyDotActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primaryLight,
  },
  historyLine: {
    width: 2,
    flex: 1,
    backgroundColor: Colors.border,
    marginTop: 4,
    marginBottom: -Spacing.lg + 4,
  },
  historyContent: {
    flex: 1,
  },
  historyTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  historyGroupName: {
    ...Typography.bodyMedium,
    fontFamily: Fonts.bold,
    flexShrink: 1,
  },
  historyDates: {
    ...Typography.bodySmall,
    marginTop: 2,
  },
  historyNotes: {
    ...Typography.caption,
    marginTop: 2,
  },
  controlButtons: {
    gap: Spacing.sm,
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
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  modalTitle: {
    ...Typography.titleMedium,
    flex: 1,
  },
  modalClose: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transferPrompt: {
    ...Typography.bodySmall,
    marginBottom: Spacing.md,
  },
  groupList: {
    gap: Spacing.xs,
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
  groupOptionText: {
    ...Typography.bodyLarge,
    fontFamily: Fonts.medium,
  },
  groupOptionTextSelected: {
    fontFamily: Fonts.bold,
    color: Colors.primary,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
});
