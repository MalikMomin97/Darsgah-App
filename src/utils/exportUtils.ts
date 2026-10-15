import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { StudentMonthlyReport, GroupMonthlyReport } from '../types';
import { formatMonthYearDisplay } from './dateUtils';
import { escapeHtml as esc } from './exportFormat';
import { gradeColor } from './performance';
import { SettingsService } from '../services/settingsService';

const SAF = FileSystem.StorageAccessFramework;
const EXPORT_DIR_SETTING = 'export_directory_uri';

/** 'download' saves into a folder on the device; 'share' opens the share sheet. */
export type ExportMode = 'download' | 'share';

export type ExportResult =
  { status: 'saved'; fileName: string } | { status: 'shared' } | { status: 'cancelled' };

interface ExportFile {
  /** Local file in the app cache. */
  uri: string;
  /** File name without extension. */
  name: string;
  extension: 'pdf';
  mimeType: string;
  UTI: string;
}

const FONT_LINKS = `
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Amiri:wght@400;700&display=swap" rel="stylesheet">
`;

/** Shared <head> content: fonts (with system fallbacks for offline use) and styles. */
const head = (title: string) => `
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  ${FONT_LINKS}
  <style>${BASE_CSS}</style>
`;

const BASE_CSS = `
  @page { margin: 18mm 14mm; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Amiri', 'Noto Naskh Arabic', serif;
    color: #16211D; background: #FFFFFF; font-size: 12.5px; line-height: 1.5;
  }
  .page { max-width: 760px; margin: 0 auto; }

  /* Header band */
  .header { background: #0E5C4A; background: linear-gradient(135deg, #0E5C4A 0%, #083D31 100%); color: #FFFFFF; text-align: center; padding: 26px 24px 22px; border-radius: 14px 14px 0 0; }
  .crest { width: 40px; height: 40px; margin: 0 auto 10px; border: 1.5px solid #B8862B; border-radius: 50%; line-height: 37px; color: #B8862B; font-size: 18px; font-weight: 700; }
  .institution { font-size: 24px; font-weight: 800; letter-spacing: -0.3px; line-height: 1.25; }
  .ornament { display: flex; align-items: center; justify-content: center; gap: 8px; margin: 12px 0 10px; }
  .ornament span { display: inline-block; width: 44px; height: 1px; background: #B8862B; }
  .ornament i { display: inline-block; width: 6px; height: 6px; background: #B8862B; transform: rotate(45deg); }
  .report-kind { font-size: 10.5px; font-weight: 700; letter-spacing: 1.6px; text-transform: uppercase; color: #F8EFDB; }
  .report-title { font-size: 15px; font-weight: 600; margin-top: 3px; color: #FFFFFF; }
  .gold-bar { height: 4px; background: #B8862B; margin-bottom: 22px; }

  /* Metadata */
  .meta { width: 100%; border-collapse: separate; border-spacing: 0; background: #FBFAF7; border: 1px solid #EAE5DA; border-radius: 12px; margin-bottom: 6px; }
  .meta td { padding: 10px 16px; border-bottom: 1px solid #EAE5DA; width: 50%; vertical-align: top; }
  .meta tr:last-child td { border-bottom: none; }
  .meta td + td { border-left: 1px solid #EAE5DA; }
  .meta .lbl { display: block; font-size: 9.5px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: #9AA29E; margin-bottom: 2px; }
  .meta .val { font-size: 13.5px; font-weight: 700; color: #16211D; }

  /* Section titles */
  .section-title { display: flex; align-items: center; gap: 10px; font-size: 14.5px; font-weight: 700; color: #083D31; margin: 24px 0 12px; page-break-after: avoid; }
  .section-title .num { display: inline-block; width: 22px; height: 22px; line-height: 22px; text-align: center; border-radius: 50%; background: #F8EFDB; color: #8C6420; font-size: 11px; font-weight: 800; }
  .section-title .rule { flex: 1; height: 1px; background: #EAE5DA; }

  /* Stat cards */
  .grid { display: flex; gap: 10px; margin-bottom: 4px; }
  .stat { flex: 1; background: #FBFAF7; border: 1px solid #EAE5DA; border-top: 3px solid #0E5C4A; border-radius: 12px; padding: 14px 10px 12px; text-align: center; }
  .stat.present { background: #F3FAF6; border-top-color: #1F9D6B; }
  .stat.absent { background: #FDF5F5; border-top-color: #D64545; }
  .stat.gold { border-top-color: #B8862B; }
  .stat-num { font-size: 24px; font-weight: 800; letter-spacing: -0.4px; color: #16211D; line-height: 1.15; }
  .stat-lbl { font-size: 9.5px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: #5B6661; margin-top: 4px; }

  /* Performance */
  .performance { position: relative; display: flex; align-items: center; gap: 22px; background: #FBFAF7; border: 1px solid #EAE5DA; border-left-width: 5px; border-radius: 12px; padding: 16px 20px; }
  .pct { font-size: 38px; font-weight: 800; letter-spacing: -0.8px; line-height: 1.1; }
  .grade-lbl { font-size: 9.5px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: #9AA29E; margin-bottom: 5px; }
  .grade { display: inline-block; color: #FFFFFF; font-weight: 700; font-size: 13px; padding: 5px 14px; border-radius: 999px; }
  .muted { font-size: 11px; font-weight: 600; letter-spacing: 0.6px; text-transform: uppercase; color: #5B6661; margin-top: 2px; }
  .note { font-size: 12.5px; color: #5B6661; }
  .remarks { font-size: 13px; line-height: 1.7; border-left: 3px solid #B8862B; padding: 12px 16px; background: #F8EFDB; border-radius: 0 10px 10px 0; color: #16211D; }

  /* Tables */
  .table { width: 100%; border-collapse: separate; border-spacing: 0; margin-top: 16px; font-size: 12px; border: 1px solid #EAE5DA; border-radius: 12px; overflow: hidden; }
  .table th { background: #0E5C4A; color: #FFFFFF; padding: 10px 12px; text-align: left; font-size: 9.5px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; }
  .table td { padding: 10px 12px; border-top: 1px solid #EAE5DA; }
  .table tbody tr:nth-child(even) td { background: #FBFAF7; }
  .table tr { page-break-inside: avoid; }
  .table .c { text-align: center; }
  .table .name { font-weight: 600; }
  .table .strong { font-weight: 700; }
  .tag { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 600; }

  /* Footer */
  .footer { margin-top: 40px; border-top: 1px dashed #D9D1C2; padding-top: 16px; display: flex; justify-content: space-between; align-items: flex-end; font-size: 11.5px; color: #5B6661; page-break-inside: avoid; }
  .footer .lbl { font-size: 9.5px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: #9AA29E; }
  .footer .date { font-weight: 600; color: #16211D; margin-top: 2px; }
  .sign { text-align: center; min-width: 200px; }
  .sign .line { border-top: 1px solid #9AA29E; margin-bottom: 6px; height: 30px; }
`;

const ORNAMENT = '<div class="ornament"><span></span><i></i><span></span></div>';

/** First letter of the institution name for the header crest. */
const crestLetter = (name: string) => esc((name.trim()[0] || 'D').toUpperCase());

/** Safe file-name fragment from user data. */
function fileSafe(value: string): string {
  return (
    value
      .trim()
      .replace(/[^a-zA-Z0-9_-]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'report'
  );
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
async function deliver(
  file: ExportFile,
  mode: ExportMode,
  dialogTitle: string
): Promise<ExportResult> {
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
      <head>${head(`Student Monthly Report - ${esc(st.fullName)}`)}</head>
      <body>
        <div class="page">
          <div class="header">
            <div class="crest">${crestLetter(institutionName)}</div>
            <div class="institution">${esc(institutionName)}</div>
            ${ORNAMENT}
            <div class="report-kind">Monthly Student Report</div>
            <div class="report-title">${monthDisplay}</div>
          </div>
          <div class="gold-bar"></div>

          <table class="meta">
            <tr>
              <td><span class="lbl">Student</span><span class="val">${esc(st.fullName)}</span></td>
              <td><span class="lbl">Roll No</span><span class="val">${esc(st.admissionNumber || 'N/A')}</span></td>
            </tr>
            <tr>
              <td><span class="lbl">Group</span><span class="val">${esc(st.groupName || 'Unassigned')}</span></td>
              <td><span class="lbl">Guardian</span><span class="val">${esc(st.guardianName || 'N/A')}</span></td>
            </tr>
          </table>

          <div class="section-title"><span class="num">1</span>Attendance<span class="rule"></span></div>
          <div class="grid">
            <div class="stat"><div class="stat-num" style="color: #0E5C4A;">${att.percentage}%</div><div class="stat-lbl">Attendance</div></div>
            <div class="stat present"><div class="stat-num" style="color: #1F9D6B;">${att.present}</div><div class="stat-lbl">Present</div></div>
            <div class="stat absent"><div class="stat-num" style="color: #D64545;">${att.absent}</div><div class="stat-lbl">Absent</div></div>
          </div>

          <div class="section-title"><span class="num">2</span>Learning Performance<span class="rule"></span></div>
          <div class="performance" style="border-left-color: ${color};">
            <div style="text-align: center; min-width: 96px;">
              <div class="pct" style="color: ${color};">${pctText(perf.learningPercentage)}</div>
              <div class="muted">Learning</div>
            </div>
            <div>
              ${
                perf.grade
                  ? `<div class="grade-lbl">Grade</div><div class="grade" style="background: ${color};">${esc(perf.grade)}</div>`
                  : '<div class="note">No lessons rated this month</div>'
              }
            </div>
          </div>

          <div class="section-title"><span class="num">3</span>Teacher's Remarks<span class="rule"></span></div>
          <div class="remarks">${esc(perf.remarks)}</div>

          <div class="footer">
            <div><div class="lbl">Report Generated on</div><div class="date">${esc(new Date().toLocaleDateString())}</div></div>
            <div class="sign"><div class="line"></div>Teacher Signature</div>
          </div>
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
          <td class="name">${esc(s.student.fullName)}</td>
          <td class="c">${esc(s.student.admissionNumber || '—')}</td>
          <td class="c strong" style="color: #0E5C4A;">${s.attendance.percentage}%</td>
          <td class="c strong" style="color: ${color};">${pctText(s.performance.learningPercentage)}</td>
          <td class="c"><span class="tag" style="color: ${color}; background: ${color}1A;">${esc(s.performance.grade || 'Not rated')}</span></td>
        </tr>`;
      })
      .join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>${head(`Group Monthly Report - ${esc(report.group.name)}`)}</head>
      <body>
        <div class="page">
          <div class="header">
            <div class="crest">${crestLetter(institutionName)}</div>
            <div class="institution">${esc(institutionName)}</div>
            ${ORNAMENT}
            <div class="report-kind">Group Monthly Report</div>
            <div class="report-title">${esc(report.group.name)} • ${monthDisplay}</div>
          </div>
          <div class="gold-bar"></div>

          <div class="grid">
            <div class="stat gold"><div class="stat-num">${report.studentCount}</div><div class="stat-lbl">Active Students</div></div>
            <div class="stat"><div class="stat-num" style="color: #0E5C4A;">${report.averageAttendancePercentage}%</div><div class="stat-lbl">Average Attendance</div></div>
            <div class="stat"><div class="stat-num" style="color: #0E5C4A;">${pctText(report.averageLearningPercentage)}</div><div class="stat-lbl">Average Learning</div></div>
          </div>

          <table class="table">
            <thead>
              <tr>
                <th>Student</th>
                <th class="c">Roll No</th>
                <th class="c">Attendance</th>
                <th class="c">Learning</th>
                <th class="c">Status</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>

          <div class="footer">
            <div><div class="lbl">Generated on</div><div class="date">${esc(new Date().toLocaleDateString())}</div></div>
            <div class="sign"><div class="line"></div>Principal / Head Teacher Signature</div>
          </div>
        </div>
      </body>
      </html>
    `;

    const file = await renderPdf(
      html,
      `Group_Report_${fileSafe(report.group.name)}_${report.monthYear}`
    );
    return deliver(file, mode, `Group Report - ${report.group.name}`);
  },
};
