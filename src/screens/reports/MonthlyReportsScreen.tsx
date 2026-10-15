import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../../components/common/Header';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Colors, Spacing, Typography, BorderRadius } from '../../config/theme';
import { Student, Group } from '../../types';
import { StudentService } from '../../services/studentService';
import { GroupService } from '../../services/groupService';
import {
  getCurrentMonthYear,
  getMonthOptions,
  formatMonthYearDisplay,
} from '../../utils/dateUtils';
import { useFocusEffect } from 'expo-router';
import { useAppNavigation } from '../../navigation/appNavigation';


export const MonthlyReportsScreen: React.FC = () => {
  const navigation = useAppNavigation();

  const [selectedMonthYear, setSelectedMonthYear] = useState(getCurrentMonthYear());
  const [reportType, setReportType] = useState<'student' | 'group'>('student');
  const [students, setStudents] = useState<Student[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const monthOptions = getMonthOptions();

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [allStudents, allGroups] = await Promise.all([
        StudentService.getStudents({ includeArchived: false }),
        GroupService.getGroups(false),
      ]);
      setStudents(allStudents);
      setGroups(allGroups);

      if (!selectedStudentId && allStudents.length > 0) {
        setSelectedStudentId(allStudents[0].id);
      }
      if (!selectedGroupId && allGroups.length > 0) {
        setSelectedGroupId(allGroups[0].id);
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to load report options.');
    } finally {
      setLoading(false);
    }
  }, [selectedStudentId, selectedGroupId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleOpenReport = () => {
    if (reportType === 'student') {
      if (!selectedStudentId) {
        Alert.alert('Selection Error', 'Please select a student to generate their report.');
        return;
      }
      navigation.navigate('ReportPreview', {
        type: 'student',
        targetId: selectedStudentId,
        monthYear: selectedMonthYear,
      });
    } else {
      if (!selectedGroupId) {
        Alert.alert('Selection Error', 'Please select a group to generate its report.');
        return;
      }
      navigation.navigate('ReportPreview', {
        type: 'group',
        targetId: selectedGroupId,
        monthYear: selectedMonthYear,
      });
    }
  };

  const selectedStudent = students.find((s) => s.id === selectedStudentId);
  const selectedGroup = groups.find((g) => g.id === selectedGroupId);

  return (
    <View style={styles.container}>
      <Header title="Monthly Reports" />

      {/* Month Carousel */}
      <View style={styles.monthBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.monthScroll}
        >
          {monthOptions.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.monthChip,
                selectedMonthYear === opt.value && styles.monthChipActive,
              ]}
              onPress={() => setSelectedMonthYear(opt.value)}
            >
              <Text
                style={[
                  styles.monthChipText,
                  selectedMonthYear === opt.value && styles.monthChipTextActive,
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadData} colors={[Colors.primary]} />
        }
      >
        {/* Report Type Selector: Student vs Group */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Report Type</Text>
          <View style={styles.typeSelectorRow}>
            <TouchableOpacity
              style={[
                styles.typeBtn,
                reportType === 'student' && styles.typeBtnActive,
              ]}
              onPress={() => setReportType('student')}
            >
              <Ionicons
                name="person-outline"
                size={18}
                color={reportType === 'student' ? Colors.textInverse : Colors.textSecondary}
              />
              <Text
                style={[
                  styles.typeBtnText,
                  reportType === 'student' && styles.typeBtnTextActive,
                ]}
              >
                Individual Student Report
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.typeBtn,
                reportType === 'group' && styles.typeBtnActive,
              ]}
              onPress={() => setReportType('group')}
            >
              <Ionicons
                name="layers-outline"
                size={18}
                color={reportType === 'group' ? Colors.textInverse : Colors.textSecondary}
              />
              <Text
                style={[
                  styles.typeBtnText,
                  reportType === 'group' && styles.typeBtnTextActive,
                ]}
              >
                Group Summary Report
              </Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Target Selector */}
        {reportType === 'student' ? (
          <Card style={styles.card}>
            <Text style={styles.cardTitle}>Select Student</Text>
            <Text style={styles.cardDesc}>
              Choose the student for whom you want to generate attendance and syllabus progress.
            </Text>

            <ScrollView style={styles.selectorScroll} nestedScrollEnabled>
              {students.map((st) => (
                <TouchableOpacity
                  key={st.id}
                  style={[
                    styles.targetItem,
                    selectedStudentId === st.id && styles.targetItemActive,
                  ]}
                  onPress={() => setSelectedStudentId(st.id)}
                >
                  <View style={styles.targetInfo}>
                    <Text
                      style={[
                        styles.targetName,
                        selectedStudentId === st.id && styles.targetNameActive,
                      ]}
                    >
                      {st.fullName}
                    </Text>
                    <Text style={styles.targetSub}>
                      {st.admissionNumber ? `Roll: ${st.admissionNumber} • ` : ''}
                      {st.groupName || 'No Group'}
                    </Text>
                  </View>
                  {selectedStudentId === st.id && (
                    <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Card>
        ) : (
          <Card style={styles.card}>
            <Text style={styles.cardTitle}>Select Group</Text>
            <Text style={styles.cardDesc}>
              Choose the group for a comprehensive comparative attendance and academic progress overview.
            </Text>

            <ScrollView style={styles.selectorScroll} nestedScrollEnabled>
              {groups.map((grp) => (
                <TouchableOpacity
                  key={grp.id}
                  style={[
                    styles.targetItem,
                    selectedGroupId === grp.id && styles.targetItemActive,
                  ]}
                  onPress={() => setSelectedGroupId(grp.id)}
                >
                  <View style={styles.targetInfo}>
                    <Text
                      style={[
                        styles.targetName,
                        selectedGroupId === grp.id && styles.targetNameActive,
                      ]}
                    >
                      {grp.name}
                    </Text>
                    <Text style={styles.targetSub}>
                      {grp.studentCount ?? 0} Enrolled Students
                    </Text>
                  </View>
                  {selectedGroupId === grp.id && (
                    <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Card>
        )}

        {/* Selected Summary Card */}
        <Card style={styles.previewSummaryCard}>
          <View style={styles.previewTopRow}>
            <View style={styles.previewIconCircle}>
              <Ionicons
                name={reportType === 'student' ? 'document-text' : 'bar-chart'}
                size={24}
                color={Colors.primary}
              />
            </View>
            <View style={styles.previewTextWrap}>
              <Text style={styles.previewTargetName}>
                {reportType === 'student'
                  ? selectedStudent?.fullName || 'No Student Selected'
                  : selectedGroup?.name || 'No Group Selected'}
              </Text>
              <Text style={styles.previewPeriod}>
                Period: {formatMonthYearDisplay(selectedMonthYear)}
              </Text>
            </View>
          </View>

          <Button
            title="Generate & View Full Report"
            icon="eye-outline"
            onPress={handleOpenReport}
            style={{ marginTop: Spacing.sm }}
          />
        </Card>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  monthBar: {
    backgroundColor: Colors.surface,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  monthScroll: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.xs,
  },
  monthChip: {
    paddingVertical: 6,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  monthChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  monthChipText: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  monthChipTextActive: {
    color: Colors.textInverse,
    fontWeight: '700',
  },
  scrollContent: {
    padding: Spacing.lg,
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
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  typeSelectorRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xs,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  typeBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  typeBtnText: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  typeBtnTextActive: {
    color: Colors.textInverse,
    fontWeight: '700',
  },
  selectorScroll: {
    maxHeight: 220,
  },
  targetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.xs,
    backgroundColor: Colors.surface,
  },
  targetItemActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  targetInfo: {
    flex: 1,
  },
  targetName: {
    ...Typography.bodyMedium,
    fontWeight: '600',
    color: Colors.text,
  },
  targetNameActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  targetSub: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  previewSummaryCard: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    padding: Spacing.lg,
    marginBottom: Spacing.xxl,
  },
  previewTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  previewIconCircle: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewTextWrap: {
    flex: 1,
  },
  previewTargetName: {
    ...Typography.titleSmall,
    color: Colors.primaryDark,
  },
  previewPeriod: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
