import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { StudentMonthlyReport, GroupMonthlyReport } from '../types';
import { formatMonthYearDisplay } from './dateUtils';
import { csvRow, escapeHtml as esc } from './exportFormat';
import { gradeColor } from './performance';
import { SettingsService } from '../services/settingsService';

const SAF = FileSystem.StorageAccessFramework;
const EXPORT_DIR_SETTING = 'export_directory_uri';

/** 'download' saves into a folder on the device; 'share' opens the share sheet. */
export type ExportMode = 'download' | 'share';

export type ExportResult =
  | { status: 'saved'; fileName: string }
  | { status: 'shared' }
  | { status: 'cancelled' };

interface ExportFile {
  /** Local file in the app cache. */
  uri: string;
  /** File name without extension. */
  name: string;
  extension: 'pdf' | 'csv';
  mimeType: string;
  UTI: string;
}

const CELL = 'padding: 8px; border: 1px solid #ddd;';
const CELL_C = `${CELL} text-align: center;`;

const BASE_CSS = `
  body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 24px; color: #1e293b; }
  .header { text-align: center; border-bottom: 2px solid #0F5132; padding-bottom: 12px; margin-bottom: 20px; }
  .institution { font-size: 24px; font-weight: bold; color: #0F5132; margin-bottom: 4px; }
  .report-title { font-size: 16px; color: #475569; }
  .section-title { font-size: 15px; font-weight: bold; color: #0F5132; margin-top: 18px; margin-bottom: 8px; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; }
  .table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 12px; }
  .table th { background: #0F5132; color: #ffffff; padding: 8px; border: 1px solid #0F5132; text-align: left; }
  .grid { display: flex; gap: 10px; margin-bottom: 16px; }
  .stat { flex: 1; background: #f1f5f9; border-radius: 6px; padding: 10px; text-align: center; }
  .stat-num { font-size: 18px; font-weight: bold; color: #0f172a; margin-bottom: 2px; }
  .stat-lbl { font-size: 11px; color: #64748b; }
  .performance { display: flex; align-items: center; gap: 16px; background: #f1f5f9; border-radius: 8px; padding: 12px 16px; margin-bottom: 12px; }
  .pct { font-size: 34px; font-weight: 800; }
  .grade { display: inline-block; color: #fff; font-weight: 700; font-size: 13px; padding: 4px 12px; border-radius: 12px; }
  .muted { font-size: 12px; color: #64748b; }
  .remarks { font-size: 13px; line-height: 1.6; border-left: 3px solid #0F5132; padding: 8px 12px; background: #f8fafc; }
  .footer { margin-top: 30px; border-top: 1px dashed #cbd5e1; padding-top: 12px; display: flex; justify-content: space-between; font-size: 12px; color: #64748b; }
`;

/** Safe file-name fragment from user data. */
function fileSafe(value: string): string {
  return value.trim().replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '') || 'report';
}

const pctText = (p: number | null) => (p === null ? '—' : `${p}%`);

/**
 * Android: asks for a folder once (starting at Download) and remembers it.
 * Returns null if the user cancels the folder picker.
 */
async function getExportDirectory(forceAsk: boolean): Promise<string | null> {
  if (!forceAsk) {
    const saved = await SettingsService.getSetting(EXPORT_DIR_SETTING, '');
    if (saved) return saved;
  }
  const permission = await SAF.requestDirectoryPermissionsAsync(
    SAF.getUriForDirectoryInRoot('Download')
  );
  if (!permission.granted) return null;
  await SettingsService.setSetting(EXPORT_DIR_SETTING, permission.directoryUri);
  return permission.directoryUri;
}

async function writeToDirectory(directoryUri: string, file: ExportFile): Promise<void> {
  const target = await SAF.createFileAsync(directoryUri, file.name, file.mimeType);
  const base64 = await FileSystem.readAsStringAsync(file.uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  await FileSystem.writeAsStringAsync(target, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });
}

/**
 * Delivers a generated file: saved into a device folder (Android download) or via the share sheet.
 * iOS has no shared Downloads folder, so "download" uses the share sheet ("Save to Files").
 */
async function deliver(file: ExportFile, mode: ExportMode, dialogTitle: string): Promise<ExportResult> {
  if (mode === 'download' && Platform.OS === 'android') {
    let directory = await getExportDirectory(false);
    if (!directory) return { status: 'cancelled' };
    try {
      await writeToDirectory(directory, file);
    } catch {
      // Saved folder no longer accessible (moved, deleted or permission revoked): ask again
      directory = await getExportDirectory(true);
      if (!directory) return { status: 'cancelled' };
      await writeToDirectory(directory, file);
    }
    return { status: 'saved', fileName: `${file.name}.${file.extension}` };
  }

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Sharing is not available on this device.');
  }
  await Sharing.shareAsync(file.uri, { mimeType: file.mimeType, dialogTitle, UTI: file.UTI });
  return { status: 'shared' };
}

/**
 * Renders HTML to a PDF in the cache, named after the report (the share sheet shows this name).
 * The PDF bytes are written to the named file directly; moving expo-print's output file is
 * rejected on some Android devices.
 */
async function renderPdf(html: string, name: string): Promise<ExportFile> {
  const { uri: printUri, base64 } = await Print.printToFileAsync({ html, base64: true });
  if (!base64) throw new Error('The PDF could not be generated.');

  const uri = `${FileSystem.cacheDirectory}${name}.pdf`;
  await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 });
  // Best-effort cleanup of expo-print's temporary file
  FileSystem.deleteAsync(printUri, { idempotent: true }).catch(() => undefined);

  return { uri, name, extension: 'pdf', mimeType: 'application/pdf', UTI: 'com.adobe.pdf' };
}

async function writeCsv(lines: string[], name: string): Promise<ExportFile> {
  const uri = `${FileSystem.cacheDirectory}${name}.csv`;
  // BOM so Excel opens Urdu/Arabic names correctly
  await FileSystem.writeAsStringAsync(uri, '﻿' + lines.join('\n'));
  return {
    uri,
    name,
    extension: 'csv',
    mimeType: 'text/csv',
    UTI: 'public.comma-separated-values-text',
  };
}

export const ExportUtils = {
  /**
   * PDF report for one student: attendance and learning performance.
   */
  async exportStudentReportToPdf(
    report: StudentMonthlyReport,
    institutionName: string,
    mode: ExportMode = 'download'
  ): Promise<ExportResult> {
    const monthDisplay = esc(formatMonthYearDisplay(report.monthYear));
    const st = report.student;
    const att = report.attendance;
    const perf = report.performance;
    const color = gradeColor(perf.grade);

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Student Monthly Report - ${esc(st.fullName)}</title>
        <style>${BASE_CSS}</style>
      </head>
      <body>
        <div class="header">
          <div class="institution">${esc(institutionName)}</div>
          <div class="report-title">Monthly Student Report • ${monthDisplay}</div>
        </div>

        <table class="table">
          <tr><td style="${CELL}"><b>Student:</b> ${esc(st.fullName)}</td><td style="${CELL}"><b>Roll No:</b> ${esc(st.admissionNumber || 'N/A')}</td></tr>
          <tr><td style="${CELL}"><b>Group:</b> ${esc(st.groupName || 'Unassigned')}</td><td style="${CELL}"><b>Guardian:</b> ${esc(st.guardianName || 'N/A')}</td></tr>
        </table>

        <div class="section-title">1. Attendance</div>
        <div class="grid">
          <div class="stat"><div class="stat-num" style="color: #0F5132;">${att.percentage}%</div><div class="stat-lbl">Attendance</div></div>
          <div class="stat"><div class="stat-num" style="color: #16A34A;">${att.present}</div><div class="stat-lbl">Present</div></div>
          <div class="stat"><div class="stat-num" style="color: #DC2626;">${att.absent}</div><div class="stat-lbl">Absent</div></div>
          <div class="stat"><div class="stat-num" style="color: #F59E0B;">${att.late}</div><div class="stat-lbl">Late</div></div>
          <div class="stat"><div class="stat-num" style="color: #6366F1;">${att.excused}</div><div class="stat-lbl">Excused</div></div>
        </div>

        <div class="section-title">2. Learning Performance</div>
        <div class="performance">
          <div style="text-align: center;">
            <div class="pct" style="color: ${color};">${pctText(perf.learningPercentage)}</div>
            <div class="muted">Learning</div>
          </div>
          <div>
            ${
              perf.grade
                ? `<div class="grade" style="background: ${color};">${esc(perf.grade)}</div>`
                : '<div class="muted">No lessons rated this month</div>'
            }
          </div>
        </div>

        <div class="section-title">3. Teacher's Remarks</div>
        <div class="remarks">${esc(perf.remarks)}</div>

        <div class="footer">
          <div>Report Generated on: ${esc(new Date().toLocaleDateString())}</div>
          <div>Teacher Signature: _____________________</div>
        </div>
      </body>
      </html>
    `;

    const file = await renderPdf(html, `Report_${fileSafe(st.fullName)}_${report.monthYear}`);
    return deliver(file, mode, `Report - ${st.fullName}`);
  },

  /**
   * PDF report for a whole group.
   */
  async exportGroupReportToPdf(
    report: GroupMonthlyReport,
    institutionName: string,
    mode: ExportMode = 'download'
  ): Promise<ExportResult> {
    const monthDisplay = esc(formatMonthYearDisplay(report.monthYear));

    const rows = report.studentSummaries
      .map((s) => {
        const color = gradeColor(s.performance.grade);
        return `
        <tr>
          <td style="${CELL}">${esc(s.student.fullName)}</td>
          <td style="${CELL_C}">${esc(s.student.admissionNumber || '—')}</td>
          <td style="${CELL_C} font-weight: bold; color: #0F5132;">${s.attendance.percentage}%</td>
          <td style="${CELL_C} font-weight: bold; color: ${color};">${pctText(s.performance.learningPercentage)}</td>
          <td style="${CELL_C} color: ${color};">${esc(s.performance.grade || 'Not rated')}</td>
        </tr>`;
      })
      .join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Group Monthly Report - ${esc(report.group.name)}</title>
        <style>${BASE_CSS}</style>
      </head>
      <body>
        <div class="header">
          <div class="institution">${esc(institutionName)}</div>
          <div class="report-title">Group Monthly Report: ${esc(report.group.name)} • ${monthDisplay}</div>
        </div>

        <div class="grid">
          <div class="stat"><div class="stat-num">${report.studentCount}</div><div class="stat-lbl">Active Students</div></div>
          <div class="stat"><div class="stat-num">${report.averageAttendancePercentage}%</div><div class="stat-lbl">Average Attendance</div></div>
          <div class="stat"><div class="stat-num">${pctText(report.averageLearningPercentage)}</div><div class="stat-lbl">Average Learning</div></div>
        </div>

        <table class="table">
          <thead>
            <tr>
              <th>Student</th>
              <th style="text-align: center;">Roll No</th>
              <th style="text-align: center;">Attendance</th>
              <th style="text-align: center;">Learning</th>
              <th style="text-align: center;">Status</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>

        <div class="footer">
          <div>Generated on: ${esc(new Date().toLocaleDateString())}</div>
          <div>Principal / Head Teacher Signature: _____________________</div>
        </div>
      </body>
      </html>
    `;

    const file = await renderPdf(html, `Group_Report_${fileSafe(report.group.name)}_${report.monthYear}`);
    return deliver(file, mode, `Group Report - ${report.group.name}`);
  },

  /**
   * CSV export of one student's month.
   */
  async exportStudentReportToCsv(
    report: StudentMonthlyReport,
    mode: ExportMode = 'download'
  ): Promise<ExportResult> {
    const st = report.student;
    const att = report.attendance;
    const perf = report.performance;
    const lines: string[] = [
      csvRow(['Student Name', st.fullName]),
      csvRow(['Admission No', st.admissionNumber || '']),
      csvRow(['Group', st.groupName || '']),
      csvRow(['Month', report.monthYear]),
      '',
      csvRow(['ATTENDANCE']),
      csvRow(['Attendance %', 'Present', 'Absent', 'Late', 'Excused']),
      csvRow([`${att.percentage}%`, att.present, att.absent, att.late, att.excused]),
      '',
      csvRow(['LEARNING PERFORMANCE']),
      csvRow(['Learning %', 'Status']),
      csvRow([pctText(perf.learningPercentage), perf.grade || 'Not rated']),
      '',
      csvRow(["TEACHER'S REMARKS"]),
      csvRow([perf.remarks]),
    ];

    const file = await writeCsv(lines, `Report_${fileSafe(st.fullName)}_${report.monthYear}`);
    return deliver(file, mode, `CSV - ${st.fullName}`);
  },

  /**
   * CSV export of a group's month.
   */
  async exportGroupReportToCsv(
    report: GroupMonthlyReport,
    mode: ExportMode = 'download'
  ): Promise<ExportResult> {
    const lines: string[] = [
      csvRow(['Group Name', report.group.name]),
      csvRow(['Month', report.monthYear]),
      csvRow(['Student Count', report.studentCount]),
      csvRow(['Average Attendance', `${report.averageAttendancePercentage}%`]),
      csvRow(['Average Learning', pctText(report.averageLearningPercentage)]),
      '',
      csvRow([
        'Student Name',
        'Roll No',
        'Attendance %',
        'Present',
        'Absent',
        'Learning %',
        'Status',
        "Teacher's Remarks",
      ]),
      ...report.studentSummaries.map((s) =>
        csvRow([
          s.student.fullName,
          s.student.admissionNumber || '',
          `${s.attendance.percentage}%`,
          s.attendance.present,
          s.attendance.absent,
          pctText(s.performance.learningPercentage),
          s.performance.grade || 'Not rated',
          s.performance.remarks,
        ])
      ),
    ];

    const file = await writeCsv(lines, `Group_Report_${fileSafe(report.group.name)}_${report.monthYear}`);
    return deliver(file, mode, `CSV - ${report.group.name}`);
  },
};
