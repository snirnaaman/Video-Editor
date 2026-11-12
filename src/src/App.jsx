import React, { useState, useRef } from 'react';
import { 
  Play, Pause, Scissors, FlipHorizontal, 
  Download, ZoomIn, ZoomOut, Plus, Music, Video, Image as ImageIcon, Move
} from 'lucide-react';

export default function App() {
  const videoRef = useRef(null);
  const [videoSrc, setVideoSrc] = useState(null);
  const [videoName, setVideoName] = useState('לא נבחר סרטון');
  const [pipSrc, setPipSrc] = useState(null);
  const [audioName, setAudioName] = useState(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(60);
  const [isMirrored, setIsMirrored] = useState(true);
  const [activeTab, setActiveTab] = useState('media');

  // הגדרות חיתוך ומיקום חלון (PiP)
  const [cutStart, setCutStart] = useState(0);
  const [cutEnd, setCutEnd] = useState(0);
  const [pipPos, setPipPos] = useState({ top: 20, right: 20, width: 200 });
  const [zoom, setZoom] = useState(50);

  const handleMainVideoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setVideoSrc(URL.createObjectURL(file));
      setVideoName(file.name);
    }
  };

  const handlePipUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPipSrc(URL.createObjectURL(file));
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const dur = videoRef.current.duration;
      setDuration(dur);
      setCutEnd(Number(dur.toFixed(2)));
    }
  };

  const handleTimelineClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    const newTime = ratio * duration;
    setCurrentTime(newTime);
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
    }
  };

  const handleExportInstructions = () => {
    const projectData = {
      mirror: isMirrored,
      trim: { start: cutStart, end: cutEnd },
      pipOverlay: pipSrc ? pipPos : null,
      externalAudio: audioName
    };
    alert("הוראות העריכה מוכנות לשליחה לשרת:\n" + JSON.stringify(projectData, null, 2));
  };

  return (
    <div style={styles.container}>
      <div style={styles.topArea}>
        
        {/* פאנל שמאלי - מדיה והגדרות */}
        <div style={styles.leftPanel}>
          <div style={styles.tabHeader}>
            <button 
              style={{ ...styles.tabBtn, ...(activeTab === 'media' ? styles.activeTabBtn : {}) }}
              onClick={() => setActiveTab('media')}
            >
              קבצים ושכבות
            </button>
            <button 
              style={{ ...styles.tabBtn, ...(activeTab === 'pip' ? styles.activeTabBtn : {}) }}
              onClick={() => setActiveTab('pip')}
            >
              מראה וחלון PiP
            </button>
          </div>

          <div style={styles.panelContent}>
            {activeTab === 'media' ? (
              <div>
                <label style={styles.uploadBox}>
                  <Plus size={22} color="#3b82f6" />
                  <span style={{ fontSize: 13, color: '#e4e4e7', marginTop: 6 }}>בחר וידאו ראשי (גיטרה)</span>
                  <input type="file" accept="video/*" onChange={handleMainVideoUpload} style={{ display: 'none' }} />
                </label>

                <label style={{ ...styles.uploadBox, padding: 14 }}>
                  <ImageIcon size={18} color="#8b5cf6" />
                  <span style={{ fontSize: 12, color: '#a1a1aa', marginTop: 4 }}>הוסף תמונה/וידאו לחלון צד (PiP)</span>
                  <input type="file" accept="image/*,video/*" onChange={handlePipUpload} style={{ display: 'none' }} />
                </label>

                <label style={{ ...styles.uploadBox, padding: 14 }}>
                  <Music size={18} color="#10b981" />
                  <span style={{ fontSize: 12, color: '#a1a1aa', marginTop: 4 }}>הוסף רצועת סאונד חיצונית</span>
                  <input type="file" accept="audio/*" onChange={(e) => setAudioName(e.target.files[0]?.name)} style={{ display: 'none' }} />
                </label>

                <div style={styles.sectionTitle}>שכבות בפרויקט</div>
                <div style={styles.mediaItem}>
                  <Video size={15} color="#3b82f6" />
                  <span style={styles.mediaText}>{videoName}</span>
                </div>
                {pipSrc && (
                  <div style={styles.mediaItem}>
                    <ImageIcon size={15} color="#8b5cf6" />
                    <span style={styles.mediaText}>שכבת חלון פעילה</span>
                  </div>
                )}
                {audioName && (
                  <div style={styles.mediaItem}>
                    <Music size={15} color="#10b981" />
                    <span style={styles.mediaText}>{audioName}</span>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div style={styles.sectionTitle}>כיוון צילום</div>
                <button 
                  style={{ ...styles.actionBtn, backgroundColor: isMirrored ? '#2563eb' : '#27272a' }}
                  onClick={() => setIsMirrored(!isMirrored)}
                >
                  <FlipHorizontal size={16} />
                  <span>{isMirrored ? 'היפוך מראה: פעיל' : 'היפוך מראה: כבוי'}</span>
                </button>

                <div style={{ ...styles.sectionTitle, marginTop: 20 }}>מיקום וגודל חלון (PiP)</div>
                <div style={styles.sliderGroup}>
                  <label>מרחק מלמעלה: {pipPos.top}px</label>
                  <input type="range" min="0" max="300" value={pipPos.top} onChange={(e) => setPipPos({ ...pipPos, top: Number(e.target.value) })} />
                </div>
                <div style={styles.sliderGroup}>
                  <label>מרחק מימין: {pipPos.right}px</label>
                  <input type="range" min="0" max="500" value={pipPos.right} onChange={(e) => setPipPos({ ...pipPos, right: Number(e.target.value) })} />
                </div>
                <div style={styles.sliderGroup}>
                  <label>רוחב החלון: {pipPos.width}px</label>
                  <input type="range" min="100" max="450" value={pipPos.width} onChange={(e) => setPipPos({ ...pipPos, width: Number(e.target.value) })} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* פאנל ימני - נגן תצוגה מקדימה */}
        <div style={styles.playerPanel}>
          <div style={styles.canvasContainer}>
            {videoSrc ? (
              <video
                ref={videoRef}
                src={videoSrc}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={() => setIsPlaying(false)}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  transform: isMirrored ? 'scaleX(-1)' : 'none'
                }}
              />
            ) : (
              <span style={{ color: '#52525b', fontSize: 15 }}>בחר סרטון מהתפריט מימין כדי להתחיל לערוך</span>
            )}

            {pipSrc && (
              <img
                src={pipSrc}
                alt="PiP"
                style={{
                  position: 'absolute',
                  top: pipPos.top,
                  right: pipPos.right,
                  width: pipPos.width,
                  borderRadius: 6,
                  border: '2px solid #8b5cf6',
                  boxShadow: '0 6px 20px rgba(0,0,0,0.6)'
                }}
              />
            )}
          </div>

          <div style={styles.playerControls}>
            <div style={{ color: '#a1a1aa', fontSize: 13, fontFamily: 'monospace', direction: 'ltr' }}>
              {currentTime.toFixed(2)}s / {duration.toFixed(2)}s
            </div>
            
            <button style={styles.iconBtn} onClick={togglePlay}>
              {isPlaying ? <Pause size={18} /> : <Play size={18} />}
            </button>

            <button style={styles.exportBtn} onClick={handleExportInstructions}>
              <Download size={16} />
              <span>ייצוא סרטון (Export)</span>
            </button>
          </div>
        </div>
      </div>

      {/* ציר זמן תחתון רב-שכבתי */}
      <div style={styles.timelineArea}>
        <div style={styles.timelineToolbar}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button style={styles.toolBtn} onClick={() => setCutStart(Number(currentTime.toFixed(2)))}>
              <Scissors size={14} />
              <span>קבע התחלת חיתוך ({cutStart}s)</span>
            </button>
            <button style={styles.toolBtn} onClick={() => setCutEnd(Number(currentTime.toFixed(2)))}>
              <Scissors size={14} />
              <span>קבע סיום חיתוך ({cutEnd}s)</span>
            </button>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <ZoomOut size={15} color="#71717a" />
            <input type="range" min="10" max="100" value={zoom} onChange={(e) => setZoom(e.target.value)} />
            <ZoomIn size={15} color="#71717a" />
          </div>
        </div>

        <div style={styles.tracksContainer} onClick={handleTimelineClick}>
          <div style={{ ...styles.playhead, left: `${(currentTime / (duration || 1)) * 100}%` }}>
            <div style={styles.playheadHandle} />
          </div>

          <div style={styles.trackRow}>
            <div style={styles.trackLabel}>שכבת חלון (PiP)</div>
            <div style={styles.trackContent}>
              {pipSrc && (
                <div style={{ ...styles.clip, left: '10%', width: '50%', backgroundColor: '#7c3aed' }}>
                  תקריב שריגים / אקורד
                </div>
              )}
            </div>
          </div>

          <div style={styles.trackRow}>
            <div style={styles.trackLabel}>וידאו ראשי</div>
            <div style={styles.trackContent}>
              <div style={{ ...styles.clip, left: '0%', width: '100%', backgroundColor: '#2563eb' }}>
                {videoName}
              </div>
            </div>
          </div>

          <div style={styles.trackRow}>
            <div style={styles.trackLabel}>רצועת סאונד</div>
            <div style={styles.trackContent}>
              {audioName && (
                <div style={{ ...styles.clip, left: '0%', width: '100%', backgroundColor: '#059669' }}>
                  {audioName}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', backgroundColor: '#09090b', color: '#f4f4f5', fontFamily: 'system-ui, sans-serif', overflow: 'hidden', direction: 'rtl' },
  topArea: { display: 'flex', flex: '1 1 62%', borderBottom: '1px solid #27272a' },
  leftPanel: { width: '310px', borderLeft: '1px solid #27272a', display: 'flex', flexDirection: 'column', backgroundColor: '#121215' },
  tabHeader: { display: 'flex', borderBottom: '1px solid #27272a' },
  tabBtn: { flex: 1, padding: '12px 0', backgroundColor: 'transparent', border: 'none', color: '#71717a', cursor: 'pointer', fontSize: 13, fontWeight: 500 },
  activeTabBtn: { color: '#fff', borderBottom: '2px solid #3b82f6', backgroundColor: '#18181b' },
  panelContent: { padding: 16, overflowY: 'auto', flex: 1 },
  uploadBox: { border: '1px dashed #3f3f46', borderRadius: 8, padding: 18, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', marginBottom: 12, backgroundColor: '#18181b' },
  sectionTitle: { fontSize: 11, color: '#71717a', marginBottom: 8, fontWeight: 600 },
  mediaItem: { display: 'flex', alignItems: 'center', gap: 8, backgroundColor: '#18181b', padding: '8px 10px', borderRadius: 6, marginBottom: 6, border: '1px solid #27272a' },
  mediaText: { fontSize: 12, color: '#e4e4e7', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  actionBtn: { display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 12px', borderRadius: 6, border: 'none', color: '#fff', cursor: 'pointer', fontSize: 13 },
  sliderGroup: { display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12, fontSize: 12, color: '#a1a1aa' },
  playerPanel: { flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#09090b', padding: 16 },
  canvasContainer: { flex: 1, backgroundColor: '#000', borderRadius: 8, position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #27272a' },
  playerControls: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12 },
  iconBtn: { backgroundColor: '#27272a', border: 'none', color: '#fff', width: 38, height: 38, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  exportBtn: { display: 'flex', alignItems: 'center', gap: 6, backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  timelineArea: { flex: '1 1 38%', backgroundColor: '#121215', display: 'flex', flexDirection: 'column' },
  timelineToolbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 16px', borderBottom: '1px solid #27272a' },
  toolBtn: { display: 'flex', alignItems: 'center', gap: 6, backgroundColor: '#18181b', border: '1px solid #27272a', color: '#e4e4e7', padding: '6px 10px', borderRadius: 6, fontSize: 12, cursor: 'pointer' },
  tracksContainer: { flex: 1, position: 'relative', cursor: 'pointer', direction: 'ltr' },
  playhead: { position: 'absolute', top: 0, bottom: 0, width: 2, backgroundColor: '#ef4444', zIndex: 10, pointerEvents: 'none' },
  playheadHandle: { width: 10, height: 10, backgroundColor: '#ef4444', borderRadius: '50%', marginLeft: -4 },
  trackRow: { display: 'flex', height: 46, borderBottom: '1px solid #1f1f23', alignItems: 'center', direction: 'rtl' },
  trackLabel: { width: 120, fontSize: 12, color: '#71717a', paddingRight: 14, flexShrink: 0 },
  trackContent: { flex: 1, height: '100%', position: 'relative', backgroundColor: '#18181b', direction: 'ltr' },
  clip: { position: 'absolute', top: 6, bottom: 6, borderRadius: 4, display: 'flex', alignItems: 'center', padding: '0 10px', fontSize: 12, color: '#fff', overflow: 'hidden', whiteSpace: 'nowrap' }
};
