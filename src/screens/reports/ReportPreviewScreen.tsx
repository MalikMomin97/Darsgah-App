import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { Header } from '../../components/common/Header';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { LoadingScreen } from '../../components/common/LoadingScreen';
import { Colors, Spacing, Typography, BorderRadius } from '../../config/theme';
import { StudentMonthlyReport, GroupMonthlyReport } from '../../types';
import { ReportService } from '../../services/reportService';
import { SettingsService } from '../../services/settingsService';
import { ExportMode, ExportResult, ExportUtils } from '../../utils/exportUtils';
import { formatMonthYearDisplay } from '../../utils/dateUtils';
import { gradeColor } from '../../utils/performance';
import { useAppNavigation, useAppRoute } from '../../navigation/appNavigation';

export const ReportPreviewScreen: React.FC = () => {
  const navigation = useAppNavigation();
  const route = useAppRoute<'ReportPreview'>();
  const { type, targetId, monthYear } = route.params;

  const [institutionName, setInstitutionName] = useState('Darsgah');
  const [studentReport, setStudentReport] = useState<StudentMonthlyReport | null>(null);
  const [groupReport, setGroupReport] = useState<GroupMonthlyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);

  const loadReport = useCallback(async () => {
    try {
      const instName = await SettingsService.getSetting(
        'institution_name',
        'Darsgah Islamic Institute'
      );
      setInstitutionName(instName);

      if (type === 'student') {
        const rep = await ReportService.generateStudentMonthlyReport(targetId, monthYear);
        setStudentReport(rep);
      } else {
        const rep = await ReportService.generateGroupMonthlyReport(targetId, monthYear);
        setGroupReport(rep);
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to generate monthly report.');
    } finally {
      setLoading(false);
    }
  }, [type, targetId, monthYear]);

  useEffect(() => {
    (async () => await loadReport())();
  }, [loadReport]);

  const runExport = async (format: 'pdf' | 'csv', mode: ExportMode) => {
    const setBusy = format === 'pdf' ? setExportingPdf : setExportingCsv;
    try {
      setBusy(true);
      let result: ExportResult | null = null;
      if (type === 'student' && studentReport) {
        result =
          format === 'pdf'
            ? await ExportUtils.exportStudentReportToPdf(studentReport, institutionName, mode)
            : await ExportUtils.exportStudentReportToCsv(studentReport, mode);
      } else if (type === 'group' && groupReport) {
        result =
          format === 'pdf'
            ? await ExportUtils.exportGroupReportToPdf(groupReport, institutionName, mode)
            : await ExportUtils.exportGroupReportToCsv(groupReport, mode);
      }
      if (result?.status === 'saved') {
        Alert.alert('Downloaded', `Saved as ${result.fileName} in the folder you selected.`);
      }
    } catch (e: any) {
      Alert.alert('Export Failed', e?.message || `Could not create the ${format.toUpperCase()} file.`);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <LoadingScreen message="Generating monthly report..." />;
  }

  return (
    <View style={styles.container}>
      <Header
        title="Report Preview"
        onBack={() => navigation.goBack()}
        rightAction={{
          icon: 'share-social-outline',
          label: 'Share',
          onPress: () => runExport('pdf', 'share'),
        }}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Export Buttons Action Bar */}
        <View style={styles.exportBar}>
          <Button
            title="Download PDF"
            icon="download-outline"
            onPress={() => runExport('pdf', 'download')}
            loading={exportingPdf}
            style={styles.exportBtn}
          />
          <Button
            title="Download CSV"
            variant="outline"
            icon="grid-outline"
            onPress={() => runExport('csv', 'download')}
            loading={exportingCsv}
            style={styles.exportBtn}
          />
        </View>

        {/* Paper Document Preview */}
        <Card style={styles.documentCard}>
          {/* Document Header */}
          <View style={styles.docHeader}>
            <Text style={styles.instTitle}>{institutionName}</Text>
            <Text style={styles.docSubtitle}>
              {type === 'student'
                ? `Student Monthly Report • ${formatMonthYearDisplay(monthYear)}`
                : `Group Monthly Report • ${formatMonthYearDisplay(monthYear)}`}
            </Text>
          </View>

          {/* Individual Student Report View */}
          {type === 'student' && studentReport ? (
            <View>
              {/* Student Metadata Box */}
              <View style={styles.metaBox}>
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Student Name:</Text>
                  <Text style={styles.metaVal}>{studentReport.student.fullName}</Text>
                </View>
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Roll Number:</Text>
                  <Text style={styles.metaVal}>
                    {studentReport.student.admissionNumber || 'N/A'}
                  </Text>
                </View>
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Group:</Text>
                  <Text style={styles.metaVal}>
                    {studentReport.student.groupName || 'Unassigned'}
                  </Text>
                </View>
              </View>

              {/* Attendance Statistics */}
              <Text style={styles.sectionTitle}>1. Monthly Attendance</Text>
              <View style={styles.statsGrid}>
                <View style={styles.statBox}>
                  <Text style={[styles.statNum, { color: Colors.primary }]}>
                    {studentReport.attendance.percentage}%
                  </Text>
                  <Text style={styles.statLabel}>Attendance</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={[styles.statNum, { color: Colors.present }]}>
                    {studentReport.attendance.present}
                  </Text>
                  <Text style={styles.statLabel}>Present</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={[styles.statNum, { color: Colors.absent }]}>
                    {studentReport.attendance.absent}
                  </Text>
                  <Text style={styles.statLabel}>Absent</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={[styles.statNum, { color: Colors.late }]}>
                    {studentReport.attendance.late}
                  </Text>
                  <Text style={styles.statLabel}>Late</Text>
                </View>
              </View>

              {/* Learning performance */}
              <Text style={styles.sectionTitle}>2. Learning Performance</Text>
              <View style={styles.performanceBox}>
                <View style={styles.performanceMain}>
                  <Text style={[styles.performancePct, { color: gradeColor(studentReport.performance.grade) }]}>
                    {studentReport.performance.learningPercentage !== null
                      ? `${studentReport.performance.learningPercentage}%`
                      : '—'}
                  </Text>
                  <Text style={styles.statLabel}>Learning</Text>
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  {studentReport.performance.grade ? (
                    <View
                      style={[
                        styles.gradePill,
                        { backgroundColor: gradeColor(studentReport.performance.grade) },
                      ]}
                    >
                      <Text style={styles.gradePillText}>{studentReport.performance.grade}</Text>
                    </View>
                  ) : null}
                  {!studentReport.performance.grade ? (
                    <Text style={styles.performanceMeta}>No lessons rated this month</Text>
                  ) : null}
                </View>
              </View>

              {/* Teacher's remarks */}
              <Text style={styles.sectionTitle}>3. Teacher&apos;s Remarks</Text>
              <Text style={styles.remarksText}>{studentReport.performance.remarks}</Text>
            </View>
          ) : null}

          {/* Group Report View */}
          {type === 'group' && groupReport ? (
            <View>
              <View style={styles.metaBox}>
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Group Name:</Text>
                  <Text style={styles.metaVal}>{groupReport.group.name}</Text>
                </View>
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Active Students:</Text>
                  <Text style={styles.metaVal}>{groupReport.studentCount}</Text>
                </View>
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Average Attendance:</Text>
                  <Text style={[styles.metaVal, { color: Colors.primary }]}>
                    {groupReport.averageAttendancePercentage}%
                  </Text>
                </View>
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Average Learning:</Text>
                  <Text style={[styles.metaVal, { color: Colors.primary }]}>
                    {groupReport.averageLearningPercentage !== null
                      ? `${groupReport.averageLearningPercentage}%`
                      : '—'}
                  </Text>
                </View>
              </View>

              <Text style={styles.sectionTitle}>Student Performance Roster</Text>
              <View style={styles.table}>
                <View style={styles.tableHeaderRow}>
                  <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Student</Text>
                  <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'center' }]}>
                    Att. %
                  </Text>
                  <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'center' }]}>
                    Learning
                  </Text>
                  <Text style={[styles.tableHeaderCell, { flex: 1.5, textAlign: 'center' }]}>
                    Grade
                  </Text>
                </View>

                {groupReport.studentSummaries.map((st) => (
                  <View key={st.student.id} style={styles.tableDataRow}>
                    <Text style={[styles.tableDataCell, { flex: 2, fontWeight: '600' }]}>
                      {st.student.fullName}
                    </Text>
                    <Text
                      style={[
                        styles.tableDataCell,
                        { flex: 1, textAlign: 'center', fontWeight: '700', color: Colors.primary },
                      ]}
                    >
                      {st.attendance.percentage}%
                    </Text>
                    <Text
                      style={[
                        styles.tableDataCell,
                        {
                          flex: 1,
                          textAlign: 'center',
                          fontWeight: '700',
                          color: gradeColor(st.performance.grade),
                        },
                      ]}
                    >
                      {st.performance.learningPercentage !== null
                        ? `${st.performance.learningPercentage}%`
                        : '—'}
                    </Text>
                    <Text
                      style={[
                        styles.tableDataCell,
                        { flex: 1.5, textAlign: 'center', color: gradeColor(st.performance.grade) },
                      ]}
                    >
                      {st.performance.grade || 'Not rated'}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {/* Document Footer Signatures */}
          <View style={styles.docFooter}>
            <Text style={styles.footerDate}>
              Report Generated: {new Date().toLocaleDateString()}
            </Text>
            <Text style={styles.footerSign}>Teacher Signature</Text>
          </View>
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
  scrollContent: {
    padding: Spacing.lg,
  },
  exportBar: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  exportBtn: {
    flex: 1,
  },
  documentCard: {
    padding: Spacing.xl,
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    marginBottom: Spacing.xxl,
  },
  docHeader: {
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
    paddingBottom: Spacing.md,
    marginBottom: Spacing.lg,
  },
  instTitle: {
    ...Typography.titleLarge,
    color: Colors.primary,
    textAlign: 'center',
  },
  docSubtitle: {
    ...Typography.bodyMedium,
    color: Colors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
  metaBox: {
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  metaLabel: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  metaVal: {
    ...Typography.caption,
    fontWeight: '700',
    color: Colors.text,
  },
  sectionTitle: {
    ...Typography.titleSmall,
    color: Colors.primaryDark,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  performanceBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  performanceMain: {
    alignItems: 'center',
    minWidth: 80,
  },
  performancePct: {
    fontSize: 30,
    fontWeight: '800',
  },
  performanceMeta: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  gradePill: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  remarksText: {
    ...Typography.bodyMedium,
    lineHeight: 21,
    marginBottom: Spacing.md,
  },
  gradePillText: {
    ...Typography.caption,
    fontWeight: '800',
    color: Colors.textInverse,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  statBox: {
    flex: 1,
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    alignItems: 'center',
  },
  statNum: {
    ...Typography.titleMedium,
    fontWeight: '800',
  },
  statLabel: {
    ...Typography.caption,
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  table: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: Colors.primaryLight,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  tableHeaderCell: {
    ...Typography.caption,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  tableDataRow: {
    flexDirection: 'row',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  tableDataCell: {
    ...Typography.caption,
    color: Colors.text,
  },
  emptyTableText: {
    ...Typography.caption,
    color: Colors.textMuted,
    fontStyle: 'italic',
    marginBottom: Spacing.md,
  },
  assessmentItem: {
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  assessmentTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  assessmentTitle: {
    ...Typography.caption,
    fontWeight: '700',
    color: Colors.text,
    flex: 1,
  },
  assessmentMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  assessmentDate: {
    ...Typography.caption,
    fontSize: 10,
    color: Colors.textMuted,
  },
  assessmentScore: {
    ...Typography.caption,
    fontSize: 10,
    fontWeight: '700',
    color: Colors.text,
  },
  assessmentRemarks: {
    ...Typography.caption,
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: 2,
    fontStyle: 'italic',
  },
  docFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.border,
    paddingTop: Spacing.md,
    marginTop: Spacing.xl,
  },
  footerDate: {
    ...Typography.caption,
    color: Colors.textMuted,
  },
  footerSign: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
});
