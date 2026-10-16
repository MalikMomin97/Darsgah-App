import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../../components/common/Header';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { LoadingScreen } from '../../components/common/LoadingScreen';
import { FadeInView } from '../../components/common/Motion';
import {
  Colors,
  Spacing,
  Typography,
  BorderRadius,
  Fonts,
  Gradients,
  arabicAware,
} from '../../config/theme';
import { StudentMonthlyReport, GroupMonthlyReport } from '../../types';
import { ReportService } from '../../services/reportService';
import { SettingsService } from '../../services/settingsService';
import { ExportMode, ExportResult, ExportUtils } from '../../utils/exportUtils';
import { formatMonthYearDisplay } from '../../utils/dateUtils';
import { gradeColor } from '../../utils/performance';
import { useAppNavigation, useAppRoute } from '../../navigation/appNavigation';

/** Translucent tint of a 6-digit hex colour (e.g. a grade colour) for soft backgrounds. */
const tint = (hex: string, alpha: string) => (/^#[0-9a-f]{6}$/i.test(hex) ? `${hex}${alpha}` : hex);

const SectionTitle: React.FC<{ number?: number; title: string }> = ({ number, title }) => (
  <View style={styles.sectionTitleRow}>
    {number !== undefined ? (
      <View style={styles.sectionNumber}>
        <Text style={styles.sectionNumberText}>{number}</Text>
      </View>
    ) : null}
    <Text style={styles.sectionTitle}>{title}</Text>
    <View style={styles.sectionRule} />
  </View>
);

const MetaRow: React.FC<{
  label: string;
  value: string | number;
  last?: boolean;
  color?: string;
}> = ({ label, value, last, color }) => (
  <View style={[styles.metaRow, !last && styles.metaRowDivider]}>
    <Text style={styles.metaLabel}>{label}</Text>
    <Text
      style={[styles.metaVal, color ? { color } : null, arabicAware(String(value), 13)]}
      numberOfLines={1}
    >
      {value}
    </Text>
  </View>
);

const StatTile: React.FC<{
  value: string | number;
  label: string;
  color: string;
  bg: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = ({ value, label, color, bg, icon }) => (
  <View style={[styles.statBox, { backgroundColor: bg }]}>
    <Ionicons name={icon} size={16} color={color} />
    <Text style={[styles.statNum, { color }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

export const ReportPreviewScreen: React.FC = () => {
  const navigation = useAppNavigation();
  const route = useAppRoute<'ReportPreview'>();
  const { type, targetId, monthYear } = route.params;

  const [institutionName, setInstitutionName] = useState('Darsgah Tracker');
  const [studentReport, setStudentReport] = useState<StudentMonthlyReport | null>(null);
  const [groupReport, setGroupReport] = useState<GroupMonthlyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [exportingPdf, setExportingPdf] = useState(false);

  const loadReport = useCallback(async () => {
    try {
      const instName = await SettingsService.getSetting('institution_name', 'Darsgah Tracker');
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

  const runExport = async (mode: ExportMode) => {
    try {
      setExportingPdf(true);
      let result: ExportResult | null = null;
      if (type === 'student' && studentReport) {
        result = await ExportUtils.exportStudentReportToPdf(studentReport, institutionName, mode);
      } else if (type === 'group' && groupReport) {
        result = await ExportUtils.exportGroupReportToPdf(groupReport, institutionName, mode);
      }
      if (result?.status === 'saved') {
        Alert.alert('Downloaded', `Saved as ${result.fileName} in the folder you selected.`);
      }
    } catch (e: any) {
      Alert.alert('Export Failed', e?.message || 'Could not create the PDF file.');
    } finally {
      setExportingPdf(false);
    }
  };

  if (loading) {
    return <LoadingScreen message="Generating monthly report..." />;
  }

  const studentGradeColor = studentReport ? gradeColor(studentReport.performance.grade) : '';

  return (
    <View style={styles.container}>
      <Header
        title="Report Preview"
        onBack={() => navigation.goBack()}
        rightAction={{
          icon: 'share-social-outline',
          label: 'Share',
          onPress: () => runExport('share'),
        }}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Export action */}
        <FadeInView style={styles.exportBar}>
          <Button
            title="Download PDF"
            icon="download-outline"
            size="lg"
            onPress={() => runExport('download')}
            loading={exportingPdf}
            style={styles.exportBtn}
          />
        </FadeInView>

        {/* Paper document preview */}
        <FadeInView index={1}>
          <Card padding="xs" elevation="md" style={styles.documentCard}>
            <View style={styles.documentClip}>
              {/* Header band */}
              <LinearGradient
                colors={Gradients.brand}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.docHeader}
              >
                <View style={styles.crest}>
                  <Ionicons name="school" size={22} color={Colors.accent} />
                </View>
                <Text style={[styles.instTitle, arabicAware(institutionName, 22)]}>
                  {institutionName}
                </Text>
                <View style={styles.goldRuleRow}>
                  <View style={styles.goldRule} />
                  <View style={styles.goldDiamond} />
                  <View style={styles.goldRule} />
                </View>
                <Text style={styles.docKind}>
                  {type === 'student' ? 'Student Monthly Report' : 'Group Monthly Report'}
                </Text>
                <Text style={styles.docPeriod}>{formatMonthYearDisplay(monthYear)}</Text>
              </LinearGradient>
              <View style={styles.goldBar} />

              <View style={styles.docBody}>
                {/* Individual student report */}
                {type === 'student' && studentReport ? (
                  <View>
                    <FadeInView index={2} style={styles.metaBox}>
                      <MetaRow label="Student Name" value={studentReport.student.fullName} />
                      <MetaRow
                        label="Roll Number"
                        value={studentReport.student.admissionNumber || 'N/A'}
                      />
                      <MetaRow
                        label="Group"
                        value={studentReport.student.groupName || 'Unassigned'}
                        last
                      />
                    </FadeInView>

                    {/* Attendance statistics */}
                    <FadeInView index={3}>
                      <SectionTitle number={1} title="Monthly Attendance" />
                      <View style={styles.statsGrid}>
                        <StatTile
                          value={`${studentReport.attendance.percentage}%`}
                          label="Attendance"
                          color={Colors.primary}
                          bg={Colors.primarySoft}
                          icon="pie-chart-outline"
                        />
                        <StatTile
                          value={studentReport.attendance.present}
                          label="Present"
                          color={Colors.present}
                          bg={Colors.presentBg}
                          icon="checkmark-circle-outline"
                        />
                        <StatTile
                          value={studentReport.attendance.absent}
                          label="Absent"
                          color={Colors.absent}
                          bg={Colors.absentBg}
                          icon="close-circle-outline"
                        />
                      </View>
                    </FadeInView>

                    {/* Learning performance */}
                    <FadeInView index={4}>
                      <SectionTitle number={2} title="Learning Performance" />
                      <View
                        style={[
                          styles.performanceBox,
                          {
                            borderColor: tint(studentGradeColor, '40'),
                            backgroundColor: tint(studentGradeColor, '0D'),
                          },
                        ]}
                      >
                        <View
                          style={[styles.performanceStripe, { backgroundColor: studentGradeColor }]}
                        />
                        <View style={styles.performanceMain}>
                          <Text style={[styles.performancePct, { color: studentGradeColor }]}>
                            {studentReport.performance.learningPercentage !== null
                              ? `${studentReport.performance.learningPercentage}%`
                              : '—'}
                          </Text>
                          <Text style={styles.statLabel}>Learning</Text>
                        </View>
                        <View style={styles.performanceSide}>
                          {studentReport.performance.grade ? (
                            <>
                              <Text style={styles.performanceOverline}>Grade</Text>
                              <View
                                style={[styles.gradePill, { backgroundColor: studentGradeColor }]}
                              >
                                <Ionicons name="ribbon" size={13} color={Colors.textInverse} />
                                <Text style={styles.gradePillText}>
                                  {studentReport.performance.grade}
                                </Text>
                              </View>
                            </>
                          ) : (
                            <Text style={styles.performanceMeta}>No lessons rated this month</Text>
                          )}
                        </View>
                      </View>
                    </FadeInView>

                    {/* Teacher's remarks */}
                    <FadeInView index={5}>
                      <SectionTitle number={3} title="Teacher's Remarks" />
                      <View style={styles.remarksBox}>
                        <Ionicons
                          name="chatbox-ellipses-outline"
                          size={16}
                          color={Colors.accentDark}
                          style={styles.remarksIcon}
                        />
                        <Text style={styles.remarksText}>{studentReport.performance.remarks}</Text>
                      </View>
                    </FadeInView>
                  </View>
                ) : null}

                {/* Group report */}
                {type === 'group' && groupReport ? (
                  <View>
                    <FadeInView index={2} style={styles.metaBox}>
                      <MetaRow label="Group Name" value={groupReport.group.name} />
                      <MetaRow label="Active Students" value={groupReport.studentCount} />
                      <MetaRow
                        label="Average Attendance"
                        value={`${groupReport.averageAttendancePercentage}%`}
                        color={Colors.primary}
                      />
                      <MetaRow
                        label="Average Learning"
                        value={
                          groupReport.averageLearningPercentage !== null
                            ? `${groupReport.averageLearningPercentage}%`
                            : '—'
                        }
                        color={Colors.primary}
                        last
                      />
                    </FadeInView>

                    <FadeInView index={3}>
                      <SectionTitle title="Student Performance Roster" />
                      <View style={styles.table}>
                        <View style={styles.tableHeaderRow}>
                          <Text style={[styles.tableHeaderCell, styles.colName]}>Student</Text>
                          <Text style={[styles.tableHeaderCell, styles.colNum]}>Att. %</Text>
                          <Text style={[styles.tableHeaderCell, styles.colNum]}>Learning</Text>
                          <Text style={[styles.tableHeaderCell, styles.colGrade]}>Grade</Text>
                        </View>

                        {groupReport.studentSummaries.map((st, i) => {
                          const color = gradeColor(st.performance.grade);
                          return (
                            <View
                              key={st.student.id}
                              style={[styles.tableDataRow, i % 2 === 1 && styles.tableDataRowZebra]}
                            >
                              <Text
                                style={[
                                  styles.tableDataCell,
                                  styles.colName,
                                  styles.cellName,
                                  arabicAware(st.student.fullName, 12),
                                ]}
                                numberOfLines={2}
                              >
                                {st.student.fullName}
                              </Text>
                              <Text
                                style={[
                                  styles.tableDataCell,
                                  styles.colNum,
                                  styles.cellStrong,
                                  { color: Colors.primary },
                                ]}
                              >
                                {st.attendance.percentage}%
                              </Text>
                              <Text
                                style={[
                                  styles.tableDataCell,
                                  styles.colNum,
                                  styles.cellStrong,
                                  { color },
                                ]}
                              >
                                {st.performance.learningPercentage !== null
                                  ? `${st.performance.learningPercentage}%`
                                  : '—'}
                              </Text>
                              <View style={[styles.colGrade, styles.gradeCell]}>
                                <View
                                  style={[styles.gradeTag, { backgroundColor: tint(color, '1A') }]}
                                >
                                  <Text style={[styles.gradeTagText, { color }]} numberOfLines={1}>
                                    {st.performance.grade || 'Not rated'}
                                  </Text>
                                </View>
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    </FadeInView>
                  </View>
                ) : null}

                {/* Footer: date and signature */}
                <View style={styles.docFooter}>
                  <View>
                    <Text style={styles.footerOverline}>Report Generated</Text>
                    <Text style={styles.footerDate}>{new Date().toLocaleDateString()}</Text>
                  </View>
                  <View style={styles.signBlock}>
                    <View style={styles.signLine} />
                    <Text style={styles.footerSign}>Teacher Signature</Text>
                  </View>
                </View>
              </View>
            </View>
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
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxxl * 2,
  },
  exportBar: {
    flexDirection: 'row',
    marginBottom: Spacing.lg,
  },
  exportBtn: {
    flex: 1,
  },

  // Document
  documentCard: {
    padding: 0,
  },
  documentClip: {
    borderRadius: BorderRadius.lg - 1,
    overflow: 'hidden',
  },
  docHeader: {
    alignItems: 'center',
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.xl,
  },
  crest: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    borderColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  instTitle: {
    ...Typography.titleLarge,
    fontSize: 22,
    lineHeight: 29,
    color: Colors.textInverse,
    textAlign: 'center',
  },
  goldRuleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginVertical: Spacing.md,
  },
  goldRule: {
    width: 36,
    height: 1,
    backgroundColor: Colors.accent,
  },
  goldDiamond: {
    width: 6,
    height: 6,
    backgroundColor: Colors.accent,
    transform: [{ rotate: '45deg' }],
  },
  docKind: {
    ...Typography.overline,
    color: Colors.accentLight,
    textAlign: 'center',
  },
  docPeriod: {
    ...Typography.titleSmall,
    color: Colors.textInverse,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  goldBar: {
    height: 3,
    backgroundColor: Colors.accent,
  },
  docBody: {
    padding: Spacing.xl,
  },

  // Metadata
  metaBox: {
    backgroundColor: Colors.surfaceRaised,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md - 2,
  },
  metaRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  metaLabel: {
    ...Typography.caption,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  metaVal: {
    ...Typography.bodyMedium,
    fontFamily: Fonts.bold,
    fontSize: 13,
    flexShrink: 1,
    textAlign: 'right',
  },

  // Section titles
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
  },
  sectionNumber: {
    width: 22,
    height: 22,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionNumberText: {
    fontFamily: Fonts.bold,
    fontSize: 11,
    color: Colors.accentDark,
  },
  sectionTitle: {
    ...Typography.titleSmall,
    fontFamily: Fonts.bold,
    color: Colors.primaryDark,
  },
  sectionRule: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },

  // Stat tiles
  statsGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  statBox: {
    flex: 1,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    alignItems: 'center',
    gap: 2,
  },
  statNum: {
    ...Typography.titleMedium,
    fontFamily: Fonts.extrabold,
    fontSize: 21,
    marginTop: 2,
  },
  statLabel: {
    ...Typography.overline,
    fontSize: 9.5,
    letterSpacing: 0.7,
    color: Colors.textSecondary,
  },

  // Performance
  performanceBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingVertical: Spacing.lg,
    paddingLeft: Spacing.xl,
    paddingRight: Spacing.lg,
    overflow: 'hidden',
  },
  performanceStripe: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  performanceMain: {
    alignItems: 'center',
    minWidth: 84,
  },
  performancePct: {
    ...Typography.display,
    fontSize: 34,
    lineHeight: 40,
  },
  performanceSide: {
    flex: 1,
    gap: Spacing.xs,
  },
  performanceOverline: {
    ...Typography.overline,
  },
  performanceMeta: {
    ...Typography.bodySmall,
  },
  gradePill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
  },
  gradePillText: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    color: Colors.textInverse,
  },

  // Remarks
  remarksBox: {
    flexDirection: 'row',
    gap: Spacing.sm,
    backgroundColor: Colors.accentLight,
    borderLeftWidth: 3,
    borderLeftColor: Colors.accent,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
  },
  remarksIcon: {
    marginTop: 2,
  },
  remarksText: {
    ...Typography.bodyMedium,
    lineHeight: 22,
    flex: 1,
  },

  // Table
  table: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
  },
  tableHeaderCell: {
    ...Typography.overline,
    fontSize: 9.5,
    letterSpacing: 0.6,
    color: Colors.textInverse,
  },
  tableDataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  tableDataRowZebra: {
    backgroundColor: Colors.surfaceRaised,
  },
  tableDataCell: {
    ...Typography.caption,
    fontSize: 12,
    color: Colors.text,
  },
  colName: {
    flex: 2,
  },
  colNum: {
    flex: 1,
    textAlign: 'center',
  },
  colGrade: {
    flex: 1.5,
    textAlign: 'center',
  },
  cellName: {
    fontFamily: Fonts.semibold,
  },
  cellStrong: {
    fontFamily: Fonts.bold,
  },
  gradeCell: {
    alignItems: 'center',
  },
  gradeTag: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    maxWidth: '100%',
  },
  gradeTagText: {
    fontFamily: Fonts.semibold,
    fontSize: 10.5,
  },

  // Footer
  docFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.borderDark,
    paddingTop: Spacing.lg,
    marginTop: Spacing.xxl,
  },
  footerOverline: {
    ...Typography.overline,
    fontSize: 9.5,
  },
  footerDate: {
    ...Typography.bodySmall,
    fontFamily: Fonts.semibold,
    marginTop: 2,
  },
  signBlock: {
    alignItems: 'center',
  },
  signLine: {
    width: 120,
    height: 1,
    backgroundColor: Colors.textMuted,
    marginBottom: Spacing.xs,
  },
  footerSign: {
    ...Typography.caption,
    fontFamily: Fonts.semibold,
    color: Colors.textSecondary,
  },
});
