import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../../components/common/Header';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Chip } from '../../components/common/Chip';
import { IconCircle } from '../../components/common/IconCircle';
import { SectionHeader } from '../../components/common/SectionHeader';
import { FadeInView, PressableScale, haptic } from '../../components/common/Motion';
import {
  Colors,
  Spacing,
  Typography,
  BorderRadius,
  Fonts,
  Shadows,
  arabicAware,
} from '../../config/theme';
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
import { initialsOf } from '../../utils/avatar';

type ReportType = 'student' | 'group';

const REPORT_TYPES: {
  value: ReportType;
  title: string;
  caption: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  {
    value: 'student',
    title: 'Student',
    caption: 'Individual Student Report',
    icon: 'person-outline',
  },
  { value: 'group', title: 'Group', caption: 'Group Summary Report', icon: 'layers-outline' },
];

interface SelectRowProps {
  index: number;
  title: string;
  subtitle: string;
  selected: boolean;
  onPress: () => void;
  leading: React.ReactNode;
}

const SelectRow: React.FC<SelectRowProps> = ({
  index,
  title,
  subtitle,
  selected,
  onPress,
  leading,
}) => (
  <FadeInView index={index}>
    <PressableScale
      onPress={() => {
        haptic.select();
        onPress();
      }}
      pressedScale={0.98}
      style={[styles.row, selected && styles.rowActive]}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
    >
      {leading}
      <View style={styles.rowInfo}>
        <Text
          style={[styles.rowTitle, selected && styles.rowTitleActive, arabicAware(title, 15)]}
          numberOfLines={1}
        >
          {title}
        </Text>
        <Text style={styles.rowSub} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      <View style={[styles.radio, selected && styles.radioActive]}>
        {selected ? <Ionicons name="checkmark" size={14} color={Colors.textInverse} /> : null}
      </View>
    </PressableScale>
  </FadeInView>
);

export const MonthlyReportsScreen: React.FC = () => {
  const navigation = useAppNavigation();

  const [selectedMonthYear, setSelectedMonthYear] = useState(getCurrentMonthYear());
  const [reportType, setReportType] = useState<ReportType>('student');
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
  const targetName =
    reportType === 'student'
      ? selectedStudent?.fullName || 'No Student Selected'
      : selectedGroup?.name || 'No Group Selected';

  return (
    <View style={styles.container}>
      <Header title="Monthly Reports" />

      {/* Month carousel */}
      <View style={styles.monthBar}>
        <Text style={styles.monthLabel}>Reporting period</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.monthScroll}
        >
          {monthOptions.map((opt) => (
            <Chip
              key={opt.value}
              label={opt.label}
              icon={selectedMonthYear === opt.value ? 'calendar' : undefined}
              selected={selectedMonthYear === opt.value}
              onPress={() => setSelectedMonthYear(opt.value)}
            />
          ))}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={loadData}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
      >
        {/* Report type: segmented control */}
        <FadeInView style={styles.section}>
          <SectionHeader title="Report Type" />
          <View style={styles.segment}>
            {REPORT_TYPES.map((opt) => {
              const active = reportType === opt.value;
              return (
                <PressableScale
                  key={opt.value}
                  onPress={() => {
                    if (!active) haptic.select();
                    setReportType(opt.value);
                  }}
                  pressedScale={0.97}
                  style={[styles.segmentItem, active && styles.segmentItemActive]}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                >
                  <IconCircle
                    icon={opt.icon}
                    size={34}
                    square
                    color={active ? Colors.primary : Colors.textMuted}
                    bg={active ? Colors.primaryLight : Colors.surfaceSubtle}
                  />
                  <View style={styles.segmentText}>
                    <Text style={[styles.segmentTitle, active && styles.segmentTitleActive]}>
                      {opt.title}
                    </Text>
                    <Text style={styles.segmentCaption} numberOfLines={2}>
                      {opt.caption}
                    </Text>
                  </View>
                </PressableScale>
              );
            })}
          </View>
        </FadeInView>

        {/* Target selector */}
        <FadeInView index={1} style={styles.section}>
          <SectionHeader
            title={reportType === 'student' ? 'Select Student' : 'Select Group'}
            meta={`${reportType === 'student' ? students.length : groups.length}`}
          />
          <Text style={styles.sectionDesc}>
            {reportType === 'student'
              ? 'Choose the student for whom you want to generate attendance and syllabus progress.'
              : 'Choose the group for a comprehensive comparative attendance and academic progress overview.'}
          </Text>

          <Card padding="sm" style={styles.listCard}>
            <ScrollView
              style={styles.selectorScroll}
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
            >
              {reportType === 'student' ? (
                students.length === 0 ? (
                  <Text style={styles.emptyText}>No students available</Text>
                ) : (
                  students.map((st, i) => {
                    const selected = selectedStudentId === st.id;
                    return (
                      <SelectRow
                        key={st.id}
                        index={i}
                        title={st.fullName}
                        subtitle={`${st.admissionNumber ? `Roll: ${st.admissionNumber} • ` : ''}${
                          st.groupName || 'No Group'
                        }`}
                        selected={selected}
                        onPress={() => setSelectedStudentId(st.id)}
                        leading={
                          <View style={[styles.avatar, selected && styles.avatarActive]}>
                            <Text style={[styles.avatarText, selected && styles.avatarTextActive]}>
                              {initialsOf(st.fullName)}
                            </Text>
                          </View>
                        }
                      />
                    );
                  })
                )
              ) : groups.length === 0 ? (
                <Text style={styles.emptyText}>No groups available</Text>
              ) : (
                groups.map((grp, i) => {
                  const selected = selectedGroupId === grp.id;
                  return (
                    <SelectRow
                      key={grp.id}
                      index={i}
                      title={grp.name}
                      subtitle={`${grp.studentCount ?? 0} Enrolled Students`}
                      selected={selected}
                      onPress={() => setSelectedGroupId(grp.id)}
                      leading={
                        <IconCircle
                          icon="people"
                          size={40}
                          color={selected ? Colors.textInverse : Colors.primary}
                          bg={selected ? Colors.primary : Colors.primaryLight}
                        />
                      }
                    />
                  );
                })
              )}
            </ScrollView>
          </Card>
        </FadeInView>

        {/* Selected summary + primary action */}
        <FadeInView index={2}>
          <Card padding="xl" elevation="md">
            <View style={styles.summaryAccent} />
            <View style={styles.summaryTopRow}>
              <IconCircle
                icon={reportType === 'student' ? 'document-text' : 'bar-chart'}
                size={52}
                square
                color={Colors.accentDark}
                bg={Colors.accentLight}
              />
              <View style={styles.summaryTextWrap}>
                <Text style={styles.summaryOverline}>
                  {reportType === 'student' ? 'Student report' : 'Group report'}
                </Text>
                <Text style={[styles.summaryName, arabicAware(targetName, 17)]} numberOfLines={2}>
                  {targetName}
                </Text>
                <View style={styles.periodRow}>
                  <Ionicons name="calendar-outline" size={13} color={Colors.textSecondary} />
                  <Text style={styles.summaryPeriod}>
                    Period: {formatMonthYearDisplay(selectedMonthYear)}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.hairline} />

            <Button
              title="Generate & View Full Report"
              icon="eye-outline"
              size="lg"
              fullWidth
              onPress={handleOpenReport}
            />
          </Card>
        </FadeInView>
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
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.background,
  },
  monthLabel: {
    ...Typography.overline,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  monthScroll: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xxxl * 2,
  },
  section: {
    marginBottom: Spacing.xxl,
  },
  sectionDesc: {
    ...Typography.bodySmall,
    marginTop: -Spacing.xs,
    marginBottom: Spacing.md,
  },

  // Segmented control
  segment: {
    flexDirection: 'row',
    gap: Spacing.xs,
    padding: Spacing.xs,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  segmentItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  segmentItemActive: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  segmentText: {
    flex: 1,
  },
  segmentTitle: {
    ...Typography.titleSmall,
    fontSize: 15,
    color: Colors.textSecondary,
  },
  segmentTitleActive: {
    fontFamily: Fonts.bold,
    color: Colors.primary,
  },
  segmentCaption: {
    ...Typography.caption,
    fontSize: 10.5,
    lineHeight: 13,
  },

  // Selection list
  listCard: {
    paddingVertical: Spacing.xs,
  },
  selectorScroll: {
    maxHeight: 300,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.sm + 2,
    marginVertical: 2,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  rowActive: {
    backgroundColor: Colors.primarySoft,
    borderColor: Colors.primaryMuted,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarActive: {
    backgroundColor: Colors.primary,
  },
  avatarText: {
    fontFamily: Fonts.bold,
    fontSize: 14,
    color: Colors.primary,
  },
  avatarTextActive: {
    color: Colors.textInverse,
  },
  rowInfo: {
    flex: 1,
  },
  rowTitle: {
    ...Typography.bodyMedium,
    fontFamily: Fonts.semibold,
    fontSize: 15,
  },
  rowTitleActive: {
    fontFamily: Fonts.bold,
    color: Colors.primaryDark,
  },
  rowSub: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    borderColor: Colors.borderDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  emptyText: {
    ...Typography.bodySmall,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingVertical: Spacing.xl,
  },

  // Summary
  summaryAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    borderTopLeftRadius: BorderRadius.lg - 1,
    borderTopRightRadius: BorderRadius.lg - 1,
    backgroundColor: Colors.accent,
  },
  summaryTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  summaryTextWrap: {
    flex: 1,
  },
  summaryOverline: {
    ...Typography.overline,
    color: Colors.accentDark,
    marginBottom: 2,
  },
  summaryName: {
    ...Typography.titleMedium,
    color: Colors.primaryDark,
  },
  periodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  summaryPeriod: {
    ...Typography.bodySmall,
  },
  hairline: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.lg,
  },
});
