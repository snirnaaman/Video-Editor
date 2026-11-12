import React, { useState, useRef, useEffect } from 'react';
import { 
  X, Video, Cpu, FileJson, CloudLightning, DownloadCloud, 
  Terminal, Image as ImageIcon, Music, RefreshCw 
} from 'lucide-react';

// ייבוא פונקציות המנוע (בהנחה שנוצרו בשלבים הקודמים)
import { exportProjectOffline, convertMediaFileInBrowser } from './exportEngine';
import { generateFFmpegCommand, generateSubtitlesFile, generateFcpXml } from './ffmpegCompiler';

export default function ExportModal({ isOpen, onClose, projectData }) {
  const [activeTab, setActiveTab] = useState('direct'); // direct | dev | convert
  
  // Tab 1: Direct Export
  const [format, setFormat] = useState('mp4');
  const [resolutionScale, setResolutionScale] = useState(1.0); // 1.0=1080p (base), 0.66=720p
  const [fps, setFps] = useState(30);
  const [bitrate, setBitrate] = useState(8);
  
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const abortControllerRef = useRef(null);

  // Tab 2: Dev / AI
  const [hwAccel, setHwAccel] = useState('auto');
  const [n8nUrl, setN8nUrl] = useState('');

  // Tab 3: Converter
  const [convertFile, setConvertFile] = useState(null);
  const [convertTarget, setConvertTarget] = useState('mp4');
  const [isConverting, setIsConverting] = useState(false);

  useEffect(() => {
    const savedUrl = localStorage.getItem('n8n_export_webhook');
    if (savedUrl) setN8nUrl(savedUrl);
  }, []);

  if (!isOpen) return null;

  // -------------------------------------------------------------
  // הנדלרים: ייצוא ישיר (Tab 1)
  // -------------------------------------------------------------
  const handleStartExport = async () => {
    if (format === 'srt' || format === 'vtt') {
      const content = generateSubtitlesFile(projectData.texts, format);
      downloadBlob(new Blob([content], { type: 'text/plain' }), `subtitles.${format}`);
      return;
    }

    if (format === 'png_frame') {
      alert('לכידת פריים תעבוד דרך Canvas חי (מיושם ב-App.jsx)');
      return;
    }

    setIsExporting(true);
    setProgress(0);
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

      downloadBlob(blob, `GuitarStudio_Export_${Date.now()}.${format}`);
    } catch (err) {
      if (err.message !== 'Export aborted') {
        alert('שגיאה בייצוא: ' + err.message);
      }
    } finally {
      setIsExporting(false);
      setProgress(0);
    }
  };

  const handleCancelExport = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  // -------------------------------------------------------------
  // הנדלרים: ייצוא AI / מפתחים (Tab 2)
  // -------------------------------------------------------------
  const handleDownloadFfmpeg = (os) => {
    const cmd = generateFFmpegCommand(projectData, { hardwareAccel: hwAccel, outputFormat: 'mp4', crf: 18 });
    const content = os === 'win' ? cmd.windowsBatScript : cmd.shellScript;
    const ext = os === 'win' ? 'bat' : 'sh';
    downloadBlob(new Blob([content], { type: 'text/plain' }), `render_script.${ext}`);
  };

  const handleDownloadFcpXml = () => {
    const xml = generateFcpXml(projectData);
    downloadBlob(new Blob([xml], { type: 'application/xml' }), `project_${Date.now()}.fcpxml`);
  };

  const handleSendToN8n = async () => {
    if (!n8nUrl) return alert('הזן כתובת Webhook');
    localStorage.setItem('n8n_export_webhook', n8nUrl);
    
    const payload = {
      projectConfig: projectData.config,
      clips: projectData.clips,
      texts: projectData.texts,
      ffmpegCommand: generateFFmpegCommand(projectData).rawCommand
    };

    try {
      const res = await fetch(n8nUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) alert('הפרויקט נשלח בהצלחה ל-n8n!');
      else alert('שגיאה בשליחה.');
    } catch (e) {
      alert('שגיאת תקשורת.');
    }
  };

  // -------------------------------------------------------------
  // הנדלרים: ממיר (Tab 3)
  // -------------------------------------------------------------
  const handleConvert = async () => {
    if (!convertFile) return alert('בחר קובץ להמרה');
    setIsConverting(true);
    try {
      const blob = await convertMediaFileInBrowser(convertFile, convertTarget, (p) => console.log('Converting:', p));
      downloadBlob(blob, `converted_${Date.now()}.${convertTarget}`);
    } catch (e) {
      alert('השירות בשלבי פיתוח (דרוש WebCodecs תואם לממיר).');
    } finally {
      setIsConverting(false);
    }
  };

  const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <DownloadCloud size={18} color="#38bdf8" />
            <span style={{ fontWeight: 600, fontSize: 16 }}>מרכז ייצוא והמרה</span>
          </div>
          <button style={styles.closeBtn} onClick={onClose} disabled={isExporting}><X size={18} /></button>
        </div>

        <div style={styles.tabsRow}>
          <Tab current={activeTab} val="direct" set={setActiveTab} label="ייצוא וידאו ישיר" icon={<Video size={14}/>} />
          <Tab current={activeTab} val="dev" set={setActiveTab} label="AI / n8n / Resolve" icon={<Cpu size={14}/>} />
          <Tab current={activeTab} val="convert" set={setActiveTab} label="ממיר קבצים מהיר" icon={<RefreshCw size={14}/>} />
        </div>

        <div style={styles.body}>
          {/* TAB 1: Direct Export */}
          {activeTab === 'direct' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              
              <div style={styles.grid2}>
                <div>
                  <label style={styles.label}>פורמט יעד</label>
                  <select style={styles.select} value={format} onChange={e => setFormat(e.target.value)}>
                    <option value="mp4">MP4 (H.264 + AAC) - מומלץ ליוטיוב</option>
                    <option value="mov">MOV (QuickTime) - איכות אולפן</option>
                    <option value="webm">WebM (VP9 + Opus) - אתרים מהירים</option>
                    <option value="wav">WAV (Lossless 48kHz) - שמע בלבד</option>
                    <option value="srt">SRT - קובץ כתוביות (מתוך טקסטים)</option>
                    <option value="png_frame">PNG - תמונת מסך (Thumbnail)</option>
                  </select>
                </div>
                <div>
                  <label style={styles.label}>איכות ורזולוציה</label>
                  <select style={styles.select} value={resolutionScale} onChange={e => setResolutionScale(Number(e.target.value))} disabled={['wav', 'srt', 'vtt'].includes(format)}>
                    <option value={1.0}>1080p (Full HD מותאם יחס)</option>
                    <option value={0.66}>720p (HD קל ומהיר)</option>
                  </select>
                </div>
              </div>

              <div style={styles.grid2}>
                <div>
                  <label style={styles.label}>קצב פריימים (FPS)</label>
                  <select style={styles.select} value={fps} onChange={e => setFps(Number(e.target.value))} disabled={['wav', 'srt', 'vtt', 'png_frame'].includes(format)}>
                    <option value={30}>30 fps (סטנדרט)</option>
                    <option value={60}>60 fps (חלק - מומלץ לנגינה)</option>
                    <option value={24}>24 fps (קולנועי)</option>
                  </select>
                </div>
                <div>
                  <label style={styles.label}>Bitrate (וידאו)</label>
                  <select style={styles.select} value={bitrate} onChange={e => setBitrate(Number(e.target.value))} disabled={['wav', 'srt', 'vtt', 'png_frame'].includes(format)}>
                    <option value={8}>8 Mbps (איכות גבוהה)</option>
                    <option value={16}>16 Mbps (אולפן / מאסטר)</option>
                    <option value={4}>4 Mbps (שיתוף מהיר / רשתות)</option>
                  </select>
                </div>
              </div>

              <div style={styles.infoBox}>
                <strong>שים לב:</strong> הרינדור מתבצע ברקע (Offline Frame-by-Frame). אינך צריך לצפות בסרטון תוך כדי, ואף פריים לא ילך לאיבוד. 
              </div>

              {isExporting ? (
                <div style={styles.progressContainer}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12 }}>
                    <span style={{ color: '#38bdf8' }}>מרנדר פרויקט... {progress}%</span>
                    <span style={{ color: '#a1a1aa' }}>זמן משוער: מספר שניות</span>
                  </div>
                  <div style={styles.progressBarBg}>
                    <div style={{...styles.progressBarFill, width: `${progress}%`}} />
                  </div>
                  <button style={styles.cancelBtn} onClick={handleCancelExport}>ביטול רינדור</button>
                </div>
              ) : (
                <button style={styles.primaryBtn} onClick={handleStartExport}>
                  התחל רינדור וייצוא
                </button>
              )}
            </div>
          )}

          {/* TAB 2: AI / Dev Tools */}
          {activeTab === 'dev' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={styles.card}>
                <div style={{ fontWeight: 600, marginBottom: 8, color: '#e4e4e7', display: 'flex', alignItems: 'center', gap: 6 }}><CloudLightning size={14} color="#f59e0b"/> חיבור אוטומטי ל-n8n</div>
                <label style={styles.label}>כתובת Webhook (URL)</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input type="text" value={n8nUrl} onChange={e => setN8nUrl(e.target.value)} placeholder="https://your-n8n.com/webhook/..." style={{...styles.input, flex: 1}} />
                  <button style={styles.secondaryBtn} onClick={handleSendToN8n}>שלח לרינדור</button>
                </div>
              </div>

              <div style={styles.card}>
                <div style={{ fontWeight: 600, marginBottom: 8, color: '#e4e4e7', display: 'flex', alignItems: 'center', gap: 6 }}><Terminal size={14} color="#10b981"/> ייצוא ל-FFmpeg מקומי (Batch / Bash)</div>
                <label style={styles.label}>האצת חומרה (Hardware Acceleration)</label>
                <select style={styles.select} value={hwAccel} onChange={e => setHwAccel(e.target.value)}>
                  <option value="auto">CPU (libx264) - אוניברסלי, איכות מקסימלית</option>
                  <option value="qsv">Intel QSV (למחשבי ThinkPad / Intel)</option>
                  <option value="nvenc">Nvidia NVENC (לכרטיסי מסך RTX/GTX)</option>
                </select>
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <button style={styles.secondaryBtn} onClick={() => handleDownloadFfmpeg('win')}>הורד .bat (Windows)</button>
                  <button style={styles.secondaryBtn} onClick={() => handleDownloadFfmpeg('mac')}>הורד .sh (Mac/Linux)</button>
                </div>
              </div>

              <div style={styles.card}>
                <div style={{ fontWeight: 600, marginBottom: 8, color: '#e4e4e7', display: 'flex', alignItems: 'center', gap: 6 }}><FileJson size={14} color="#a855f7"/> תוכנות עריכה שולחניות</div>
                <div style={{ fontSize: 12, color: '#a1a1aa', marginBottom: 10 }}>ייצא את כל ציר הזמן לפתיחה מהירה ב-DaVinci Resolve או Premiere.</div>
                <button style={styles.secondaryBtn} onClick={handleDownloadFcpXml}>הורד קובץ .fcpxml</button>
              </div>
            </div>
          )}

          {/* TAB 3: Converter */}
          {activeTab === 'convert' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={styles.dragZone}>
                <ImageIcon size={32} color="#52525b" style={{ marginBottom: 10 }} />
                <span style={{ color: '#d4d4d8', fontSize: 13 }}>לחץ או גרור לכאן קובץ וידאו/אודיו להמרה</span>
                <input type="file" onChange={e => setConvertFile(e.target.files[0])} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
              </div>
              {convertFile && <div style={{ fontSize: 12, color: '#38bdf8', textAlign: 'center' }}>קובץ נבחר: {convertFile.name}</div>}

              <div style={{ marginTop: 10 }}>
                <label style={styles.label}>המר לפורמט:</label>
                <select style={styles.select} value={convertTarget} onChange={e => setConvertTarget(e.target.value)}>
                  <option value="mp4">MP4 Video</option>
                  <option value="webm">WebM Video</option>
                  <option value="mov">MOV Video</option>
                  <option value="wav">WAV Audio (חלץ סאונד)</option>
                </select>
              </div>

              <button style={styles.primaryBtn} onClick={handleConvert} disabled={!convertFile || isConverting}>
                {isConverting ? 'ממיר קובץ...' : 'התחל המרה מהירה'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const Tab = ({ current, val, set, label, icon }) => (
  <button 
    style={{ ...styles.tabBtn, borderBottomColor: current === val ? '#38bdf8' : 'transparent', color: current === val ? '#38bdf8' : '#a1a1aa' }}
    onClick={() => set(val)}
  >
    {icon} {label}
  </button>
);

const styles = {
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', direction: 'rtl', backdropFilter: 'blur(4px)' },
  modal: { width: 550, maxHeight: '90vh', backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: 10, display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.75)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #27272a', backgroundColor: '#121214', borderTopLeftRadius: 10, borderTopRightRadius: 10 },
  closeBtn: { background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer', display: 'flex', padding: 4 },
  tabsRow: { display: 'flex', backgroundColor: '#141416', borderBottom: '1px solid #27272a' },
  tabBtn: { flex: 1, padding: '12px 0', border: 'none', backgroundColor: 'transparent', borderBottom: '2px solid transparent', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 },
  body: { padding: 24, overflowY: 'auto' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  label: { display: 'block', fontSize: 12, color: '#a1a1aa', marginBottom: 6, fontWeight: 500 },
  select: { width: '100%', backgroundColor: '#27272a', color: '#fff', border: '1px solid #3f3f46', padding: '10px 12px', borderRadius: 6, fontSize: 13, outline: 'none' },
  input: { backgroundColor: '#27272a', border: '1px solid #3f3f46', color: '#fff', padding: '10px 12px', borderRadius: 6, fontSize: 13, outline: 'none', fontFamily: 'monospace' },
  infoBox: { backgroundColor: '#1e3a8a20', border: '1px solid #1e3a8a50', color: '#93c5fd', padding: 12, borderRadius: 6, fontSize: 12, lineHeight: 1.5 },
  card: { backgroundColor: '#121214', border: '1px solid #27272a', padding: 16, borderRadius: 8 },
  primaryBtn: { width: '100%', backgroundColor: '#2563eb', border: 'none', color: '#fff', padding: '12px', borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: 'pointer', marginTop: 10 },
  secondaryBtn: { flex: 1, backgroundColor: '#27272a', border: '1px solid #3f3f46', color: '#e4e4e7', padding: '10px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  cancelBtn: { width: '100%', backgroundColor: 'transparent', border: '1px solid #ef4444', color: '#ef4444', padding: '10px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer', marginTop: 12 },
  dragZone: { border: '2px dashed #3f3f46', borderRadius: 8, padding: 30, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#141416', position: 'relative', transition: 'border-color 0.2s' },
  progressContainer: { marginTop: 16 },
  progressBarBg: { width: '100%', height: 12, backgroundColor: '#27272a', borderRadius: 6, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#38bdf8', transition: 'width 0.2s linear' }
};
