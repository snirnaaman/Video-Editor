import React, { useState, useRef } from 'react';
import { X, Video, Cpu, DownloadCloud, Terminal, RefreshCw } from 'lucide-react';
import { exportProjectOffline, drawCompositeFrameToCanvas } from './exportEngine';
import { generateFFmpegCommand, generateSubtitlesFile, generateFcpXml } from './ffmpegCompiler';

export default function ExportModal({ isOpen, onClose, projectData }) {
  const [activeTab, setActiveTab] = useState('direct');
  const [format, setFormat] = useState('mp4');
  const [resolutionScale, setResolutionScale] = useState(1.0);
  const [fps, setFps] = useState(30);
  const [bitrate, setBitrate] = useState(8);
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [hwAccel, setHwAccel] = useState('auto');
  const abortControllerRef = useRef(null);

  if (!isOpen) return null;

  const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleStartExport = async () => {
    if (format === 'srt' || format === 'vtt') {
      const content = generateSubtitlesFile(projectData.texts, format);
      downloadBlob(new Blob([content], { type: 'text/plain;charset=utf-8' }), `subtitles.${format}`);
      return;
    }

    if (format === 'png_frame') {
      const w = projectData.config?.format?.width || 1280;
      const h = projectData.config?.format?.height || 720;
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      drawCompositeFrameToCanvas({
        ctx,
        width: w,
        height: h,
        timelineTime: projectData.currentTime || 0,
        activeClip: projectData.activeClip,
        mainMediaEl: projectData.mainVideoElement,
        pipClips: projectData.pipClips,
        texts: projectData.texts,
        chords: projectData.chords
      });
      canvas.toBlob((b) => { if (b) downloadBlob(b, `Frame_${Date.now()}.png`); }, 'image/png');
      return;
    }

    setIsExporting(true);
    setProgress(1);
    abortControllerRef.current = new AbortController();

    try {
      const blob = await exportProjectOffline({
        format,
        resolutionScale,
        fps,
        bitrateMbps: bitrate,
        projectState: projectData,
        onProgress: (p) => setProgress(p),
        abortSignal: abortControllerRef.current.signal
      });
      downloadBlob(blob, `GuitarStudio_${Date.now()}.${format === 'mov' ? 'mov' : format}`);
    } catch (err) {
      if (err.message !== 'Export aborted') {
        alert('שגיאה בייצוא: ' + err.message);
      }
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <DownloadCloud size={18} color="#38bdf8" />
            <span style={{ fontWeight: 700, fontSize: 15 }}>ייצוא והורדת סרטון</span>
          </div>
          <button style={styles.closeBtn} onClick={onClose} disabled={isExporting}><X size={18} /></button>
        </div>

        <div style={styles.tabsRow}>
          <button style={{ ...styles.tabBtn, borderBottomColor: activeTab === 'direct' ? '#38bdf8' : 'transparent', color: activeTab === 'direct' ? '#38bdf8' : '#a1a1aa' }} onClick={() => setActiveTab('direct')}>
            <Video size={14} /> ייצוא ישיר למחשב
          </button>
          <button style={{ ...styles.tabBtn, borderBottomColor: activeTab === 'dev' ? '#38bdf8' : 'transparent', color: activeTab === 'dev' ? '#38bdf8' : '#a1a1aa' }} onClick={() => setActiveTab('dev')}>
            <Cpu size={14} /> FFmpeg / Premiere XML
          </button>
        </div>

        <div style={styles.body}>
          {activeTab === 'direct' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={styles.grid2}>
                <div>
                  <label style={styles.label}>פורמט קובץ</label>
                  <select style={styles.select} value={format} onChange={(e) => setFormat(e.target.value)}>
                    <option value="mp4">MP4 (H.264) - מומלץ ליוטיוב וניידים</option>
                    <option value="webm">WebM (VP9) - מהיר וחד</option>
                    <option value="mov">MOV (QuickTime)</option>
                    <option value="wav">WAV (קובץ שמע בלבד באיכות אולפן)</option>
                    <option value="srt">SRT (קובץ כתוביות)</option>
                    <option value="png_frame">PNG (צילום הפריים הנוכחי כתמונה)</option>
                  </select>
                </div>
                <div>
                  <label style={styles.label}>רזולוציה</label>
                  <select style={styles.select} value={resolutionScale} onChange={(e) => setResolutionScale(Number(e.target.value))}>
                    <option value={1.0}>100% (רזולוציה מלאה)</option>
                    <option value={0.66}>720p (ייצוא מהיר)</option>
                  </select>
                </div>
              </div>

              <div style={styles.grid2}>
                <div>
                  <label style={styles.label}>קצב פריימים (FPS)</label>
                  <select style={styles.select} value={fps} onChange={(e) => setFps(Number(e.target.value))}>
                    <option value={30}>30 FPS (סטנדרט)</option>
                    <option value={60}>60 FPS (חלק לנגינה)</option>
                    <option value={24}>24 FPS (קולנועי)</option>
                  </select>
                </div>
                <div>
                  <label style={styles.label}>איכות (Bitrate)</label>
                  <select style={styles.select} value={bitrate} onChange={(e) => setBitrate(Number(e.target.value))}>
                    <option value={8}>8 Mbps (גבוהה)</option>
                    <option value={16}>16 Mbps (אולפן מאסטר)</option>
                    <option value={4}>4 Mbps (קלה לשיתוף)</option>
                  </select>
                </div>
              </div>

              {isExporting ? (
                <div style={{ marginTop: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13, fontWeight: 600 }}>
                    <span style={{ color: '#38bdf8' }}>מייצא פריימים ברקע... {progress}%</span>
                  </div>
                  <div style={styles.progressBarBg}>
                    <div style={{ ...styles.progressBarFill, width: `${progress}%` }} />
                  </div>
                  <button style={styles.cancelBtn} onClick={() => abortControllerRef.current?.abort()}>ביטול ייצוא</button>
                </div>
              ) : (
                <button style={styles.primaryBtn} onClick={handleStartExport}>
                  התחל רינדור והורד קובץ
                </button>
              )}
            </div>
          )}

          {activeTab === 'dev' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={styles.card}>
                <div style={{ fontWeight: 600, marginBottom: 8, color: '#e4e4e7' }}><Terminal size={14} color="#10b981" /> הורדת סקריפט FFmpeg למחשב</div>
                <select style={styles.select} value={hwAccel} onChange={(e) => setHwAccel(e.target.value)}>
                  <option value="auto">CPU (libx264)</option>
                  <option value="qsv">Intel QSV (מומלץ ל-ThinkPad)</option>
                  <option value="nvenc">Nvidia NVENC</option>
                </select>
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <button style={styles.secondaryBtn} onClick={() => {
                    const cmd = generateFFmpegCommand(projectData, { hardwareAccel: hwAccel, outputFormat: 'mp4', crf: 18 });
                    downloadBlob(new Blob([cmd.windowsBatScript], { type: 'text/plain' }), 'render.bat');
                  }}>הורד .bat (Windows)</button>
                  <button style={styles.secondaryBtn} onClick={() => {
                    const xml = generateFcpXml(projectData);
                    downloadBlob(new Blob([xml], { type: 'application/xml' }), 'project.fcpxml');
                  }}>הורד .fcpxml (Resolve / Premiere)</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', direction: 'rtl', backdropFilter: 'blur(4px)' },
  modal: { width: 520, backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: 10, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', backgroundColor: '#121214', borderBottom: '1px solid #27272a' },
  closeBtn: { background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer' },
  tabsRow: { display: 'flex', backgroundColor: '#141416', borderBottom: '1px solid #27272a' },
  tabBtn: { flex: 1, padding: '10px 0', border: 'none', backgroundColor: 'transparent', borderBottom: '2px solid transparent', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 },
  body: { padding: 20 },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  label: { display: 'block', fontSize: 11, color: '#a1a1aa', marginBottom: 5 },
  select: { width: '100%', backgroundColor: '#27272a', color: '#fff', border: '1px solid #3f3f46', padding: '8px 10px', borderRadius: 6, fontSize: 12 },
  card: { backgroundColor: '#121214', border: '1px solid #27272a', padding: 14, borderRadius: 8 },
  primaryBtn: { width: '100%', backgroundColor: '#2563eb', border: 'none', color: '#fff', padding: '11px', borderRadius: 6, fontSize: 14, fontWeight: 700, cursor: 'pointer', marginTop: 6 },
  secondaryBtn: { flex: 1, backgroundColor: '#27272a', border: '1px solid #3f3f46', color: '#e4e4e7', padding: '8px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  cancelBtn: { width: '100%', backgroundColor: 'transparent', border: '1px solid #ef4444', color: '#ef4444', padding: '8px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', marginTop: 10 },
  progressBarBg: { width: '100%', height: 12, backgroundColor: '#27272a', borderRadius: 6, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#38bdf8', transition: 'width 0.15s linear' }
};
