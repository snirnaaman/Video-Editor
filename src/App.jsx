import React, { useState, useRef } from 'react';
import {
  Play, Pause, Scissors, FlipHorizontal, Download, ZoomIn, ZoomOut,
  Music, Video, Image as ImageIcon, ChevronLeft, ChevronRight,
  Sliders, Trash2, Volume2, Layers, Maximize2
} from 'lucide-react';

export default function App() {
  const videoRef = useRef(null);
  const canvasBoxRef = useRef(null);

  // מאגר מדיה (Media Pool)
  const [mediaPool, setMediaPool] = useState([]);
  const [activeMainVideo, setActiveMainVideo] = useState(null);
  const [activePip, setActivePip] = useState(null);
  const [activeAudio, setActiveAudio] = useState(null);

  // מצב נגן וציר זמן
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(30);
  const [zoom, setZoom] = useState(100);

  // הגדרות עריכה (Inspector)
  const [isMirrored, setIsMirrored] = useState(true);
  const [pipRect, setPipRect] = useState({ x: 20, y: 20, width: 180 });
  const [isDraggingPip, setIsDraggingPip] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [transitionType, setTransitionType] = useState('none');
  const [mainVolume, setMainVolume] = useState(100);
  const [extVolume, setExtVolume] = useState(100);

  // מקטעי חיתוך בציר הזמן
  const [cuts, setCuts] = useState([]);

  const handleFileUpload = (e, type) => {
    const files = Array.from(e.target.files);
    const newItems = files.map((file) => ({
      id: Math.random().toString(36).substring(2, 9),
      name: file.name,
      type,
      url: URL.createObjectURL(file)
    }));

    setMediaPool((prev) => [...prev, ...newItems]);

    newItems.forEach((item) => {
      if (item.type === 'video' && !activeMainVideo) setActiveMainVideo(item);
      if (item.type === 'pip' && !activePip) setActivePip(item);
      if (item.type === 'audio' && !activeAudio) setActiveAudio(item);
    });
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) videoRef.current.pause();
    else videoRef.current.play();
    setIsPlaying(!isPlaying);
  };

  const stepFrame = (frames) => {
    if (!videoRef.current) return;
    videoRef.current.pause();
    setIsPlaying(false);
    const nextTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + frames * (1 / 30)));
    videoRef.current.currentTime = nextTime;
    setCurrentTime(nextTime);
  };

  const formatTimecode = (sec) => {
    const mins = Math.floor(sec / 60).toString().padStart(2, '0');
    const secs = Math.floor(sec % 60).toString().padStart(2, '0');
    const frames = Math.floor((sec % 1) * 30).toString().padStart(2, '0');
    return `00:${mins}:${secs}:${frames}`;
  };

  const startDragPip = (e) => {
    e.stopPropagation();
    setIsDraggingPip(true);
    setDragOffset({ x: e.clientX - pipRect.x, y: e.clientY - pipRect.y });
  };

  const onMouseMoveCanvas = (e) => {
    if (!isDraggingPip || !canvasBoxRef.current) return;
    const bounds = canvasBoxRef.current.getBoundingClientRect();
    const newX = Math.max(0, Math.min(bounds.width - pipRect.width, e.clientX - dragOffset.x));
    const newY = Math.max(0, Math.min(bounds.height - 80, e.clientY - dragOffset.y));
    setPipRect((prev) => ({ ...prev, x: newX, y: newY }));
  };

  const stopDragPip = () => setIsDraggingPip(false);

  const handleSplitAtPlayhead = () => {
    const cutPoint = Number(currentTime.toFixed(2));
    if (!cuts.includes(cutPoint) && cutPoint > 0 && cutPoint < duration) {
      setCuts((prev) => [...prev, cutPoint].sort((a, b) => a - b));
    }
  };

  const handleTimelineScrub = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const target = ratio * duration;
    setCurrentTime(target);
    if (videoRef.current) videoRef.current.currentTime = target;
  };

  const handleExport = () => {
    const payload = {
      mainVideo: activeMainVideo?.name || null,
      mirror: isMirrored,
      cuts,
      transition: transitionType,
      pip: activePip ? { file: activePip.name, ...pipRect } : null,
      audio: { mainVolume, extFile: activeAudio?.name || null, extVolume }
    };
    alert('נתוני הפרויקט מוכנים לייצוא בשרת:\n' + JSON.stringify(payload, null, 2));
  };

  return (
    <div style={styles.appShell} onMouseMove={onMouseMoveCanvas} onMouseUp={stopDragPip}>
      {/* סרגל עליון ראשי */}
      <header style={styles.topHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={styles.brandBadge}>STUDIO NLE</span>
          <span style={{ fontSize: 13, color: '#a1a1aa' }}>פרויקט: קורס גיטרה — שיעור 1</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            style={{ ...styles.headerToolBtn, backgroundColor: isMirrored ? '#1d4ed8' : '#27272a' }}
            onClick={() => setIsMirrored(!isMirrored)}
          >
            <FlipHorizontal size={15} />
            <span>היפוך מראה: {isMirrored ? 'פעיל' : 'כבוי'}</span>
          </button>

          <button style={styles.exportPrimaryBtn} onClick={handleExport}>
            <Download size={15} />
            <span>Quick Export</span>
          </button>
        </div>
      </header>

      {/* אזור עבודה עליון מחולק ל-3 פאנלים קבועים */}
      <div style={styles.workspaceGrid}>
        
        {/* פאנל 1: Media Pool */}
        <aside style={styles.mediaPoolPanel}>
          <div style={styles.panelTitleBar}>
            <span>Media Pool (מאגר קבצים)</span>
            <span style={{ fontSize: 11, color: '#71717a' }}>{mediaPool.length} פריטים</span>
          </div>

          <div style={styles.uploadRow}>
            <label style={styles.miniUploadBtn}>
              <Video size={14} color="#3b82f6" />
              <span>+ וידאו</span>
              <input type="file" accept="video/*" onChange={(e) => handleFileUpload(e, 'video')} hidden />
            </label>
            <label style={styles.miniUploadBtn}>
              <ImageIcon size={14} color="#a855f7" />
              <span>+ חלון PiP</span>
              <input type="file" accept="image/*,video/*" onChange={(e) => handleFileUpload(e, 'pip')} hidden />
            </label>
            <label style={styles.miniUploadBtn}>
              <Music size={14} color="#10b981" />
              <span>+ סאונד</span>
              <input type="file" accept="audio/*" onChange={(e) => handleFileUpload(e, 'audio')} hidden />
            </label>
          </div>

          <div style={styles.mediaGrid}>
            {mediaPool.length === 0 && (
              <div style={styles.emptyPoolMsg}>העלה סרטון גיטרה, תמונת אקורדים או שמע כדי שיופיעו כאן</div>
            )}
            {mediaPool.map((item) => (
              <div
                key={item.id}
                style={styles.mediaCard}
                onClick={() => {
                  if (item.type === 'video') setActiveMainVideo(item);
                  if (item.type === 'pip') setActivePip(item);
                  if (item.type === 'audio') setActiveAudio(item);
                }}
              >
                <div style={styles.thumbBox}>
                  {item.type === 'video' && <video src={item.url} style={styles.thumbMedia} />}
                  {item.type === 'pip' && <img src={item.url} alt="" style={styles.thumbMedia} />}
                  {item.type === 'audio' && <Music size={24} color="#10b981" />}
                </div>
                <div style={styles.thumbLabel}>{item.name}</div>
              </div>
            ))}
          </div>
        </aside>

        {/* פאנל 2: מוניטור תצוגה מקדימה נעול */}
        <main style={styles.monitorPanel}>
          <div style={styles.panelTitleBar}>
            <span>Timeline Preview</span>
            <span style={{ fontFamily: 'monospace', color: '#38bdf8', direction: 'ltr' }}>
              {formatTimecode(currentTime)}
            </span>
          </div>

          {/* תיבת המסך הנעולה לחלוטין */}
          <div style={styles.monitorViewport} ref={canvasBoxRef}>
            {activeMainVideo ? (
              <video
                ref={videoRef}
                src={activeMainVideo.url}
                onTimeUpdate={() => videoRef.current && setCurrentTime(videoRef.current.currentTime)}
                onLoadedMetadata={() => videoRef.current && setDuration(videoRef.current.duration)}
                onEnded={() => setIsPlaying(false)}
                style={{
                  ...styles.lockedVideoElement,
                  transform: isMirrored ? 'scaleX(-1)' : 'none'
                }}
              />
            ) : (
              <span style={{ color: '#52525b', fontSize: 13 }}>בחר קובץ מ-Media Pool להצגה</span>
            )}

            {/* חלון PiP הניתן לגרירה חופשית על המסך */}
            {activePip && (
              <div
                onMouseDown={startDragPip}
                style={{
                  position: 'absolute',
                  left: pipRect.x,
                  top: pipRect.y,
                  width: pipRect.width,
                  border: '2px solid #a855f7',
                  borderRadius: 4,
                  overflow: 'hidden',
                  cursor: 'grab',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.7)',
                  zIndex: 20
                }}
              >
                <img src={activePip.url} alt="PiP" style={{ width: '100%', display: 'block', pointerEvents: 'none' }} />
              </div>
            )}
          </div>

          {/* פקדי נגן מתחת למוניטור */}
          <div style={styles.transportBar}>
            <button style={styles.transportBtn} onClick={() => stepFrame(-1)} title="פריים אחורה">
              <ChevronRight size={16} />
            </button>
            <button style={{ ...styles.transportBtn, backgroundColor: '#2563eb' }} onClick={togglePlay}>
              {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <button style={styles.transportBtn} onClick={() => stepFrame(1)} title="פריים קדימה">
              <ChevronLeft size={16} />
            </button>
          </div>
        </main>

        {/* פאנל 3: Inspector (הגדרות שכבה, מעברים ושמע) */}
        <aside style={styles.inspectorPanel}>
          <div style={styles.panelTitleBar}>
            <span>Inspector (הגדרות)</span>
            <Sliders size={14} color="#71717a" />
          </div>

          <div style={styles.inspectorBody}>
            <div style={styles.inspectorGroup}>
              <div style={styles.groupTitle}>חלון שכבה (PiP)</div>
              <label style={styles.controlLabel}>גודל חלון: {pipRect.width}px</label>
              <input
                type="range" min="80" max="420" value={pipRect.width}
                onChange={(e) => setPipRect({ ...pipRect, width: Number(e.target.value) })}
              />
              <span style={{ fontSize: 11, color: '#71717a' }}>גרור את החלון ישירות על גבי הווידאו</span>
            </div>

            <div style={styles.inspectorGroup}>
              <div style={styles.groupTitle}>מעברים (Transitions)</div>
              <select
                value={transitionType}
                onChange={(e) => setTransitionType(e.target.value)}
                style={styles.darkSelect}
              >
                <option value="none">ללא מעבר (Cut)</option>
                <option value="fade">עמעום (Cross Dissolve)</option>
                <option value="dip">החשכה (Dip to Black)</option>
              </select>
            </div>

            <div style={styles.inspectorGroup}>
              <div style={styles.groupTitle}>מיקסר שמע (Audio)</div>
              <label style={styles.controlLabel}>עוצמת וידאו ראשי: {mainVolume}%</label>
              <input type="range" min="0" max="150" value={mainVolume} onChange={(e) => setMainVolume(e.target.value)} />

              <label style={styles.controlLabel}>עוצמת רצועת שמע: {extVolume}%</label>
              <input type="range" min="0" max="150" value={extVolume} onChange={(e) => setExtVolume(e.target.value)} />
            </div>
          </div>
        </aside>
      </div>

      {/* פאנל 4: ציר זמן רב-ערוצי (Timeline) */}
      <section style={styles.timelineDock}>
        <div style={styles.timelineTools}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button style={styles.bladeBtn} onClick={handleSplitAtPlayhead}>
              <Scissors size={14} color="#f87171" />
              <span>חתוך בנקודת הסמן (Blade)</span>
            </button>
            {cuts.length > 0 && (
              <button style={styles.bladeBtn} onClick={() => setCuts([])}>
                <Trash2 size={13} />
                <span>נקה חיתוכים ({cuts.length})</span>
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <ZoomOut size={14} color="#71717a" />
            <input type="range" min="50" max="200" value={zoom} onChange={(e) => setZoom(e.target.value)} />
            <ZoomIn size={14} color="#71717a" />
          </div>
        </div>

        <div style={styles.tracksWrapper} onClick={handleTimelineScrub}>
          <div style={{ ...styles.playheadLine, left: `${(currentTime / (duration || 1)) * 100}%` }}>
            <div style={styles.playheadCap} />
          </div>

          {cuts.map((cutSec, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: `${(cutSec / (duration || 1)) * 100}%`,
                width: 2,
                backgroundColor: '#facc15',
                zIndex: 8
              }}
            />
          ))}

          <div style={styles.trackLane}>
            <div style={styles.trackHeader}>V2 | PiP</div>
            <div style={styles.trackBody}>
              {activePip && (
                <div style={{ ...styles.timelineClip, width: '40%', left: '15%', backgroundColor: '#7e22ce' }}>
                  {activePip.name}
                </div>
              )}
            </div>
          </div>

          <div style={styles.trackLane}>
            <div style={styles.trackHeader}>V1 | Main</div>
            <div style={styles.trackBody}>
              {activeMainVideo && (
                <div style={{ ...styles.timelineClip, width: '100%', left: '0%', backgroundColor: '#1d4ed8' }}>
                  {activeMainVideo.name}
                </div>
              )}
            </div>
          </div>

          <div style={styles.trackLane}>
            <div style={styles.trackHeader}>A1 | Audio</div>
            <div style={styles.trackBody}>
              {(activeAudio || activeMainVideo) && (
                <div style={{ ...styles.timelineClip, width: '100%', left: '0%', backgroundColor: '#047857' }}>
                  {activeAudio ? activeAudio.name : 'ערוץ שמע מקורי (Waveform)'}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

const styles = {
  appShell: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    width: '100vw',
    backgroundColor: '#18181b',
    color: '#e4e4e7',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    overflow: 'hidden',
    userSelect: 'none',
    direction: 'rtl'
  },
  topHeader: {
    height: 44,
    backgroundColor: '#121214',
    borderBottom: '1px solid #27272a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 16px',
    flexShrink: 0
  },
  brandBadge: {
    backgroundColor: '#2563eb',
    color: '#fff',
    fontSize: 11,
    fontWeight: 700,
    padding: '3px 8px',
    borderRadius: 4,
    letterSpacing: 0.5
  },
  headerToolBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    border: '1px solid #3f3f46',
    color: '#fff',
    padding: '5px 10px',
    borderRadius: 4,
    fontSize: 12,
    cursor: 'pointer'
  },
  exportPrimaryBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2563eb',
    border: 'none',
    color: '#fff',
    padding: '6px 14px',
    borderRadius: 4,
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer'
  },
  workspaceGrid: {
    display: 'flex',
    flex: 1,
    minHeight: 0,
    borderBottom: '1px solid #27272a',
    overflow: 'hidden'
  },
  mediaPoolPanel: {
    width: 280,
    backgroundColor: '#1c1c1f',
    borderLeft: '1px solid #27272a',
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
    flexShrink: 0
  },
  panelTitleBar: {
    height: 32,
    backgroundColor: '#141416',
    borderBottom: '1px solid #27272a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 12px',
    fontSize: 12,
    fontWeight: 600,
    color: '#a1a1aa',
    flexShrink: 0
  },
  uploadRow: {
    display: 'flex',
    gap: 6,
    padding: 8,
    borderBottom: '1px solid #27272a',
    flexShrink: 0
  },
  miniUploadBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#27272a',
    padding: '6px 4px',
    borderRadius: 4,
    fontSize: 11,
    cursor: 'pointer',
    border: '1px solid #3f3f46'
  },
  mediaGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 8,
    padding: 10,
    overflowY: 'auto',
    flex: 1
  },
  emptyPoolMsg: {
    gridColumn: '1 / -1',
    textAlign: 'center',
    fontSize: 12,
    color: '#52525b',
    marginTop: 24
  },
  mediaCard: {
    backgroundColor: '#27272a',
    borderRadius: 4,
    overflow: 'hidden',
    border: '1px solid #3f3f46',
    cursor: 'pointer',
    height: 92,
    display: 'flex',
    flexDirection: 'column'
  },
  thumbBox: {
    flex: 1,
    backgroundColor: '#09090b',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden'
  },
  thumbMedia: {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  },
  thumbLabel: {
    fontSize: 10,
    padding: '3px 6px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    backgroundColor: '#18181b'
  },
  monitorPanel: {
    flex: 1,
    backgroundColor: '#121214',
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    minHeight: 0,
    overflow: 'hidden'
  },
  monitorViewport: {
    flex: 1,
    backgroundColor: '#000',
    margin: 10,
    borderRadius: 4,
    border: '1px solid #27272a',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    minHeight: 0
  },
  lockedVideoElement: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    objectFit: 'contain'
  },
  transportBar: {
    height: 40,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderTop: '1px solid #27272a',
    backgroundColor: '#18181b',
    flexShrink: 0
  },
  transportBtn: {
    backgroundColor: '#27272a',
    border: 'none',
    color: '#fff',
    width: 30,
    height: 30,
    borderRadius: 4,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer'
  },
  inspectorPanel: {
    width: 260,
    backgroundColor: '#1c1c1f',
    borderRight: '1px solid #27272a',
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
    flexShrink: 0
  },
  inspectorBody: {
    padding: 12,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 16
  },
  inspectorGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    paddingBottom: 12,
    borderBottom: '1px solid #27272a'
  },
  groupTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: '#38bdf8'
  },
  controlLabel: {
    fontSize: 11,
    color: '#a1a1aa'
  },
  darkSelect: {
    backgroundColor: '#27272a',
    color: '#fff',
    border: '1px solid #3f3f46',
    padding: '6px 8px',
    borderRadius: 4,
    fontSize: 12
  },
  timelineDock: {
    height: 210,
    backgroundColor: '#141416',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0
  },
  timelineTools: {
    height: 36,
    backgroundColor: '#1c1c1f',
    borderBottom: '1px solid #27272a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 14px',
    flexShrink: 0
  },
  bladeBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#27272a',
    border: '1px solid #3f3f46',
    color: '#e4e4e7',
    padding: '4px 10px',
    borderRadius: 4,
    fontSize: 11,
    cursor: 'pointer'
  },
  tracksWrapper: {
    flex: 1,
    position: 'relative',
    cursor: 'pointer',
    direction: 'ltr',
    overflow: 'hidden'
  },
  playheadLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: '#ef4444',
    zIndex: 15,
    pointerEvents: 'none'
  },
  playheadCap: {
    width: 10,
    height: 10,
    backgroundColor: '#ef4444',
    borderRadius: '50%',
    marginLeft: -4
  },
  trackLane: {
    display: 'flex',
    height: 46,
    borderBottom: '1px solid #27272a',
    direction: 'rtl'
  },
  trackHeader: {
    width: 90,
    backgroundColor: '#18181b',
    borderLeft: '1px solid #27272a',
    display: 'flex',
    alignItems: 'center',
    paddingRight: 10,
    fontSize: 11,
    fontWeight: 600,
    color: '#71717a',
    flexShrink: 0
  },
  trackBody: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#121214',
    direction: 'ltr'
  },
  timelineClip: {
    position: 'absolute',
    top: 5,
    bottom: 5,
    borderRadius: 4,
    display: 'flex',
    alignItems: 'center',
    padding: '0 10px',
    fontSize: 11,
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.2)',
    overflow: 'hidden',
    whiteSpace: 'nowrap'
  }
};
