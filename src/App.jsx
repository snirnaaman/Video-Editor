import React, { useState, useRef, useEffect } from 'react';
import {
  Play, Pause, Download, Video, Image as ImageIcon,
  Music, ChevronLeft, ChevronRight, Monitor, ZoomIn, ZoomOut, FileJson
} from 'lucide-react';
import {
  ASPECT_RATIOS,
  DEFAULT_CLIP_SETTINGS,
  DEFAULT_PIP_SETTINGS,
  LUT_PRESETS
} from './defaultState';
import InspectorPanel from './InspectorPanel';
import TimelinePanel from './TimelinePanel';

export default function App() {
  const videoRef = useRef(null);
  const bgVideoRef = useRef(null);
  const extAudioRef = useRef(null);
  const pipMediaRef = useRef(null);
  const viewportRef = useRef(null);

  // מאגר מדיה
  const [mediaPool, setMediaPool] = useState([]);
  const [mainVideoFile, setMainVideoFile] = useState(null);
  const [pipFile, setPipFile] = useState(null);
  const [extAudioFile, setExtAudioFile] = useState(null);

  // הגדרות כלליות
  const [aspectKey, setAspectKey] = useState('16:9');
  const [previewZoom, setPreviewZoom] = useState(100); // זום תצוגה מקדימה

  // נתוני העריכה (ה"מוח")
  const [clips, setClips] = useState([]);
  const [history, setHistory] = useState([]);
  const [selectedClipId, setSelectedClipId] = useState(null);
  const [pipSettings, setPipSettings] = useState({ ...DEFAULT_PIP_SETTINGS });
  const [texts, setTexts] = useState([]); // מערך הטקסטים המרובים

  // נגן וזמן
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  // גרירה על מסך התצוגה: { target: 'pip'|'text', id, mode: 'drag'|'resize', startX, startY, init }
  const [canvasDrag, setCanvasDrag] = useState(null);

  const totalDuration = clips.reduce((acc, c) => acc + (c.trimEnd - c.trimStart), 0);

  const getActiveClipAtTime = (t) => {
    if (clips.length === 0) return null;
    for (let i = 0; i < clips.length; i++) {
      const c = clips[i];
      const len = c.trimEnd - c.trimStart;
      if (t >= c.timelineStart && t <= c.timelineStart + len + 0.02) return c;
    }
    return clips[clips.length - 1];
  };

  const activeClip = getActiveClipAtTime(currentTime);
  const selectedClip = clips.find((c) => c.id === selectedClipId) || activeClip;

  const saveHistory = (currentClips) => {
    setHistory((prev) => [...prev.slice(-15), JSON.parse(JSON.stringify(currentClips))]);
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));
    setClips(previous);
    setSelectedClipId(previous[0]?.id || null);
  };

  const recalculateTimelinePositions = (clipList) => {
    let cursor = 0;
    return clipList.map((c) => {
      const updated = { ...c, timelineStart: Number(cursor.toFixed(3)) };
      cursor += (c.trimEnd - c.trimStart);
      return updated;
    });
  };

  useEffect(() => {
    const onKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
      else if (e.code === 'ArrowLeft') { e.preventDefault(); stepFrame(1); }
      else if (e.code === 'ArrowRight') { e.preventDefault(); stepFrame(-1); }
      else if (e.key.toLowerCase() === 's') { e.preventDefault(); handleSplitClip(); }
      else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedClip && clips.length > 1) { e.preventDefault(); handleDeleteClip(selectedClip.id); }
      }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); handleUndo(); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const handleFileUpload = (e, type) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    const items = files.map((file) => ({
      id: Math.random().toString(36).substring(2, 9),
      name: file.name,
      type,
      isVideo: file.type.startsWith('video/'),
      url: URL.createObjectURL(file)
    }));
    setMediaPool((prev) => [...prev, ...items]);
    items.forEach((item) => {
      if (item.type === 'video' && !mainVideoFile) selectMainVideo(item);
      if (item.type === 'pip' && !pipFile) selectPipMedia(item);
      if (item.type === 'audio' && !extAudioFile) setExtAudioFile(item);
    });
  };

  const selectMainVideo = (item) => {
    setMainVideoFile(item);
    setCurrentTime(0);
    setIsPlaying(false);
    setHistory([]);
  };

  const selectPipMedia = (item) => {
    setPipFile(item);
    setPipSettings((prev) => ({ ...prev, startTime: 0, endTime: Math.min(10, totalDuration || 10) }));
  };

  const handleVideoMetadata = () => {
    if (!videoRef.current || !mainVideoFile) return;
    const dur = videoRef.current.duration || 10;
    const firstClip = {
      id: 'clip-' + Date.now(), label: mainVideoFile.name, trimStart: 0, trimEnd: Number(dur.toFixed(3)),
      timelineStart: 0, settings: { ...DEFAULT_CLIP_SETTINGS }
    };
    setClips([firstClip]);
    setSelectedClipId(firstClip.id);
  };

  const handleSplitClip = () => {
    if (!activeClip) return;
    const offset = currentTime - activeClip.timelineStart;
    const len = activeClip.trimEnd - activeClip.trimStart;
    if (offset <= 0.1 || offset >= len - 0.1) return;
    saveHistory(clips);
    const splitPoint = Number((activeClip.trimStart + offset).toFixed(3));
    const firstHalf = { ...activeClip, id: 'clip-' + Math.random().toString(36).substring(2, 7), trimEnd: splitPoint, settings: JSON.parse(JSON.stringify(activeClip.settings)) };
    const secondHalf = { ...activeClip, id: 'clip-' + Math.random().toString(36).substring(2, 7), trimStart: splitPoint, settings: JSON.parse(JSON.stringify(activeClip.settings)) };
    const idx = clips.findIndex((c) => c.id === activeClip.id);
    const nextList = [...clips];
    nextList.splice(idx, 1, firstHalf, secondHalf);
    const recalculated = recalculateTimelinePositions(nextList);
    setClips(recalculated);
    setSelectedClipId(secondHalf.id);
  };

  const handleDeleteClip = (clipId) => {
    if (clips.length <= 1) return;
    saveHistory(clips);
    const filtered = clips.filter((c) => c.id !== clipId);
    const recalculated = recalculateTimelinePositions(filtered);
    setClips(recalculated);
    setSelectedClipId(recalculated[0]?.id || null);
    setCurrentTime(0);
    if (videoRef.current && recalculated[0]) videoRef.current.currentTime = recalculated[0].trimStart;
  };

  const handleUpdateClip = (clipId, newSettings) => {
    setClips((prev) => prev.map((c) => (c.id === clipId ? { ...c, settings: newSettings } : c)));
  };

  const handleTimeUpdate = () => {
    const vid = videoRef.current;
    if (!vid || !activeClip) return;
    const s = activeClip.settings;
    vid.playbackRate = s.speed;
    vid.volume = Math.min(1, s.volume / 100);

    if (bgVideoRef.current && Math.abs(bgVideoRef.current.currentTime - vid.currentTime) > 0.1) {
      bgVideoRef.current.currentTime = vid.currentTime;
    }

    const elapsedInClip = vid.currentTime - activeClip.trimStart;
    const timelineNow = activeClip.timelineStart + Math.max(0, elapsedInClip);
    setCurrentTime(timelineNow);

    if (vid.currentTime >= activeClip.trimEnd - 0.04) {
      const idx = clips.findIndex((c) => c.id === activeClip.id);
      const nextClip = clips[idx + 1];
      if (nextClip) {
        vid.currentTime = nextClip.trimStart;
      } else {
        vid.pause();
        if (bgVideoRef.current) bgVideoRef.current.pause();
        if (extAudioRef.current) extAudioRef.current.pause();
        setIsPlaying(false);
        setCurrentTime(0);
        vid.currentTime = clips[0].trimStart;
      }
    }
  };

  const handleSeek = (targetTimelineSec) => {
    const clamped = Math.max(0, Math.min(totalDuration, targetTimelineSec));
    setCurrentTime(clamped);
    const targetClip = getActiveClipAtTime(clamped);
    if (targetClip && videoRef.current) {
      const srcTime = targetClip.trimStart + (clamped - targetClip.timelineStart);
      videoRef.current.currentTime = srcTime;
      if (bgVideoRef.current) bgVideoRef.current.currentTime = srcTime;
      setSelectedClipId(targetClip.id);
    }
    if (extAudioRef.current) extAudioRef.current.currentTime = clamped;
  };

  const togglePlay = () => {
    const vid = videoRef.current;
    if (!vid || clips.length === 0) return;
    if (isPlaying) {
      vid.pause();
      if (bgVideoRef.current) bgVideoRef.current.pause();
      if (extAudioRef.current) extAudioRef.current.pause();
      setIsPlaying(false);
    } else {
      if (currentTime >= totalDuration - 0.05) handleSeek(0);
      vid.play();
      if (bgVideoRef.current) bgVideoRef.current.play().catch(() => {});
      if (extAudioRef.current) {
        extAudioRef.current.currentTime = currentTime;
        extAudioRef.current.play().catch(() => {});
      }
      setIsPlaying(true);
    }
  };

  const stepFrame = (dir) => {
    if (isPlaying) togglePlay();
    handleSeek(currentTime + dir * (1 / 30));
  };

  const computeEffectiveOpacity = (clip, timelinePos) => {
    if (!clip) return 1;
    const s = clip.settings;
    let alpha = s.opacity / 100;
    const localTime = timelinePos - clip.timelineStart;
    const clipLen = clip.trimEnd - clip.trimStart;
    if (s.fadeIn > 0 && localTime < s.fadeIn) alpha *= Math.max(0, localTime / s.fadeIn);
    if (s.fadeOut > 0 && localTime > clipLen - s.fadeOut) alpha *= Math.max(0, (clipLen - localTime) / s.fadeOut);
    return alpha;
  };

  const buildCssFilterString = (s) => {
    if (!s) return 'none';
    const lutFilter = LUT_PRESETS[s.lutPreset]?.filter || '';
    const tempSepia = s.temperature > 0 ? `sepia(${s.temperature / 200})` : '';
    const tempCool = s.temperature < 0 ? `hue-rotate(${s.temperature * 0.4}deg)` : '';
    const shadowContrast = s.shadows !== 0 || s.highlights !== 0 ? `contrast(${100 + (s.highlights - s.shadows) * 0.3}%)` : '';
    return [
      `brightness(${s.brightness}%)`, `contrast(${s.contrast}%)`, `saturate(${s.saturate}%)`,
      `hue-rotate(${s.hueRotate}deg)`, s.blur > 0 ? `blur(${s.blur}px)` : '',
      tempSepia, tempCool, shadowContrast, lutFilter
    ].filter(Boolean).join(' ');
  };

  // גרירת שכבות (טקסטים מרובים וחלון PiP)
  const onLayerMouseDown = (e, target, mode, id = null) => {
    e.stopPropagation();
    const initData = target === 'pip' ? { ...pipSettings } : { ...texts.find(t => t.id === id) };
    setCanvasDrag({ target, mode, id, startX: e.clientX, startY: e.clientY, init: initData });
  };

  const onViewportMouseMove = (e) => {
    if (!canvasDrag || !viewportRef.current) return;
    const dx = (e.clientX - canvasDrag.startX) / (previewZoom / 100);
    const dy = (e.clientY - canvasDrag.startY) / (previewZoom / 100);
    const bounds = viewportRef.current.getBoundingClientRect();

    if (canvasDrag.target === 'pip') {
      if (canvasDrag.mode === 'drag') {
        const nextX = Math.max(0, Math.min(bounds.width - canvasDrag.init.width, canvasDrag.init.x + dx));
        const nextY = Math.max(0, Math.min(bounds.height - canvasDrag.init.height, canvasDrag.init.y + dy));
        setPipSettings((prev) => ({ ...prev, x: Math.round(nextX), y: Math.round(nextY) }));
      } else {
        const nextW = Math.max(50, Math.min(bounds.width - canvasDrag.init.x, canvasDrag.init.width + dx));
        const nextH = Math.max(40, Math.min(bounds.height - canvasDrag.init.y, canvasDrag.init.height + dy));
        setPipSettings((prev) => ({ ...prev, width: Math.round(nextW), height: Math.round(nextH) }));
      }
    } else if (canvasDrag.target === 'text' && canvasDrag.id) {
      const nextX = Math.max(0, Math.min(bounds.width - 80, canvasDrag.init.x + dx));
      const nextY = Math.max(0, Math.min(bounds.height - 40, canvasDrag.init.y + dy));
      setTexts(texts.map(t => t.id === canvasDrag.id ? { ...t, x: Math.round(nextX), y: Math.round(nextY) } : t));
    }
  };

  const onViewportMouseUp = () => { if (canvasDrag) setCanvasDrag(null); };

  // ייצוא קובץ פקודות (JSON) עבור AI / FFmpeg בשרת Colab
  const handleExportJSON = () => {
    const projectData = {
      projectConfig: { aspectRatio: aspectKey, format: ASPECT_RATIOS[aspectKey], totalDuration },
      mediaFiles: mediaPool.map(m => ({ id: m.id, name: m.name, type: m.type })),
      timelineClips: clips,
      pipSettings: pipFile ? { file: pipFile.name, settings: pipSettings } : null,
      textLayers: texts,
      audioTrack: extAudioFile ? extAudioFile.name : null
    };

    const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `guitar-studio-project-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    alert('קובץ הפרויקט הוריד בהצלחה! הקובץ הזה משמש כהוראות מדויקות לסוכן ה-AI ול-FFmpeg לייצר את ה-MP4.');
  };

  const formatTimecode = (sec) => {
    const mins = Math.floor(sec / 60).toString().padStart(2, '0');
    const secs = Math.floor(sec % 60).toString().padStart(2, '0');
    const frames = Math.floor((sec % 1) * 30).toString().padStart(2, '0');
    return `00:${mins}:${secs}:${frames}`;
  };

  const curSettings = activeClip?.settings || DEFAULT_CLIP_SETTINGS;
  const isPipVisibleNow = pipFile && currentTime >= pipSettings.startTime && currentTime <= pipSettings.endTime;

  return (
    <div style={styles.appShell} onMouseMove={onViewportMouseMove} onMouseUp={onViewportMouseUp}>
      {/* סרגל עליון */}
      <header style={styles.topHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={styles.brandBadge}>GUITAR STUDIO PRO</span>
          <div style={styles.aspectSwitcher}>
            <Monitor size={13} color="#38bdf8" />
            {Object.keys(ASPECT_RATIOS).map((key) => (
              <button
                key={key} onClick={() => setAspectKey(key)}
                style={{ ...styles.aspectBtn, backgroundColor: aspectKey === key ? '#2563eb' : 'transparent', color: aspectKey === key ? '#fff' : '#a1a1aa' }}
              >
                {key}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button style={styles.exportBtn} onClick={handleExportJSON} disabled={clips.length === 0}>
            <FileJson size={15} />
            <span>ייצא פרויקט ל-AI (קובץ JSON)</span>
          </button>
        </div>
      </header>

      {/* אזור עבודה מרכזי */}
      <div style={styles.workspaceGrid}>
        {/* מאגר מדיה */}
        <aside style={styles.mediaPoolPanel}>
          <div style={styles.panelTitleBar}>
            <span>Media Pool</span>
          </div>
          <div style={styles.uploadRow}>
            <label style={styles.miniUploadBtn}><Video size={14} color="#3b82f6" /><span>וידאו</span><input type="file" accept="video/*" onChange={(e) => handleFileUpload(e, 'video')} hidden /></label>
            <label style={styles.miniUploadBtn}><ImageIcon size={14} color="#a855f7" /><span>PiP</span><input type="file" accept="image/*,video/*" onChange={(e) => handleFileUpload(e, 'pip')} hidden /></label>
            <label style={styles.miniUploadBtn}><Music size={14} color="#10b981" /><span>סאונד</span><input type="file" accept="audio/*" onChange={(e) => handleFileUpload(e, 'audio')} hidden /></label>
          </div>
          <div style={styles.mediaGrid}>
            {mediaPool.map((item) => (
              <div key={item.id} style={styles.mediaCard} onClick={() => { if (item.type === 'video') selectMainVideo(item); if (item.type === 'pip') selectPipMedia(item); if (item.type === 'audio') setExtAudioFile(item); }}>
                <div style={styles.thumbBox}>
                  {item.type === 'video' && <video src={item.url} style={styles.thumbMedia} />}
                  {item.type === 'pip' && (item.isVideo ? <video src={item.url} style={styles.thumbMedia} /> : <img src={item.url} alt="" style={styles.thumbMedia} />)}
                  {item.type === 'audio' && <Music size={24} color="#10b981" />}
                </div>
                <div style={styles.thumbLabel}>{item.name}</div>
              </div>
            ))}
          </div>
        </aside>

        {/* מוניטור תצוגה מקדימה + זום */}
        <main style={styles.monitorPanel}>
          <div style={styles.panelTitleBar}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span>Preview</span>
              {/* סרגל זום תצוגה */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, backgroundColor: '#18181b', padding: '2px 8px', borderRadius: 4 }}>
                <ZoomOut size={12} color="#a1a1aa" style={{cursor: 'pointer'}} onClick={() => setPreviewZoom(Math.max(50, previewZoom - 20))} />
                <span style={{ fontSize: 10, color: '#38bdf8' }}>זום מסך: {previewZoom}%</span>
                <ZoomIn size={12} color="#a1a1aa" style={{cursor: 'pointer'}} onClick={() => setPreviewZoom(Math.min(300, previewZoom + 20))} />
              </div>
            </div>
            <span style={{ fontFamily: 'monospace', color: '#38bdf8', direction: 'ltr' }}>
              {formatTimecode(currentTime)} / {formatTimecode(totalDuration)}
            </span>
          </div>

          <div style={styles.monitorOuterStage}>
            <div
              ref={viewportRef}
              style={{
                ...styles.aspectCanvasBox,
                aspectRatio: `${ASPECT_RATIOS[aspectKey].width} / ${ASPECT_RATIOS[aspectKey].height}`,
                transform: `scale(${previewZoom / 100})`, // הפעלת הזום על המסך
                transition: 'transform 0.2s ease-out'
              }}
            >
              {mainVideoFile && curSettings.fitMode === 'blurBg' && (
                <video ref={bgVideoRef} src={mainVideoFile.url} muted style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(22px) brightness(0.55)', transform: 'scale(1.1)' }} />
              )}

              {mainVideoFile ? (
                <video
                  ref={videoRef}
                  src={mainVideoFile.url}
                  onLoadedMetadata={handleVideoMetadata}
                  onTimeUpdate={handleTimeUpdate}
                  style={{
                    ...styles.lockedVideoElement,
                    objectFit: curSettings.fitMode === 'cover' ? 'cover' : 'contain',
                    filter: buildCssFilterString(curSettings),
                    opacity: computeEffectiveOpacity(activeClip, currentTime),
                    mixBlendMode: curSettings.blendMode,
                    clipPath: `inset(${curSettings.cropTop}% ${curSettings.cropRight}% ${curSettings.cropBottom}% ${curSettings.cropLeft}%)`,
                    transform: `translate(${curSettings.posX}px, ${curSettings.posY}px) rotate(${curSettings.rotation}deg) scale(${ (curSettings.mirrorH ? -1 : 1) * (curSettings.scale / 100) }, ${(curSettings.mirrorV ? -1 : 1) * (curSettings.scale / 100)})`
                  }}
                />
              ) : (
                <span style={{ color: '#52525b', fontSize: 13, zIndex: 2 }}>בחר סרטון להתחלה</span>
              )}

              {curSettings.vignette > 0 && (
                <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', boxShadow: `inset 0 0 ${curSettings.vignette * 1.8}px rgba(0,0,0,${curSettings.vignette / 100})` }} />
              )}

              {/* טשטוש נקודתי (Blur Masks) מרובים */}
              {(curSettings.blurMasks || []).map((mask) => (
                <div
                  key={mask.id}
                  style={{
                    position: 'absolute',
                    left: mask.x,
                    top: mask.y,
                    width: mask.width,
                    height: mask.height,
                    backdropFilter: `blur(${mask.amount}px)`,
                    borderRadius: 4,
                    border: '1px dashed rgba(255,255,255,0.2)',
                    pointerEvents: 'none',
                    zIndex: 10
                  }}
                />
              ))}

              {isPipVisibleNow && (
                <div
                  onMouseDown={(e) => onLayerMouseDown(e, 'pip', 'drag')}
                  style={{
                    position: 'absolute', left: pipSettings.x, top: pipSettings.y, width: pipSettings.width, height: pipSettings.height,
                    opacity: pipSettings.opacity / 100, transform: `rotate(${pipSettings.rotation}deg)`, borderRadius: pipSettings.borderRadius,
                    border: `${pipSettings.borderWidth}px solid ${pipSettings.borderColor}`, overflow: 'hidden', cursor: 'grab', boxShadow: '0 8px 24px rgba(0,0,0,0.75)', zIndex: 20
                  }}
                >
                  {pipFile.isVideo ? (
                    <video ref={pipMediaRef} src={pipFile.url} autoPlay loop muted style={{ width: '100%', height: '100%', objectFit: 'cover', clipPath: `inset(${pipSettings.cropTop}% ${pipSettings.cropRight}% ${pipSettings.cropBottom}% ${pipSettings.cropLeft}%)`, pointerEvents: 'none' }} />
                  ) : (
                    <img ref={pipMediaRef} src={pipFile.url} alt="PiP" style={{ width: '100%', height: '100%', objectFit: 'fill', clipPath: `inset(${pipSettings.cropTop}% ${pipSettings.cropRight}% ${pipSettings.cropBottom}% ${pipSettings.cropLeft}%)`, pointerEvents: 'none' }} />
                  )}
                  <div onMouseDown={(e) => onLayerMouseDown(e, 'pip', 'resize')} style={styles.resizeCornerHandle} />
                </div>
              )}

              {/* רינדור טקסטים מרובים על המסך */}
              {texts.map((txt) => {
                if (currentTime >= txt.startTime && currentTime <= txt.endTime) {
                  return (
                    <div
                      key={txt.id}
                      onMouseDown={(e) => onLayerMouseDown(e, 'text', 'drag', txt.id)}
                      style={{
                        position: 'absolute', left: txt.x, top: txt.y, fontSize: txt.fontSize,
                        color: txt.color, backgroundColor: txt.bgColor, fontWeight: txt.bold ? 700 : 400,
                        padding: '6px 12px', borderRadius: 6, cursor: 'grab', zIndex: 25, whiteSpace: 'nowrap',
                        border: '1px dashed rgba(255,255,255,0.35)'
                      }}
                    >
                      {txt.content}
                    </div>
                  );
                }
                return null;
              })}

              {extAudioFile && <audio ref={extAudioRef} src={extAudioFile.url} hidden />}
            </div>
          </div>

          <div style={styles.transportBar}>
            <button style={styles.transportBtn} onClick={() => stepFrame(-1)}><ChevronRight size={16} /></button>
            <button style={{ ...styles.transportBtn, backgroundColor: '#2563eb' }} onClick={togglePlay}>
              {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <button style={styles.transportBtn} onClick={() => stepFrame(1)}><ChevronLeft size={16} /></button>
          </div>
        </main>

        <InspectorPanel
          selectedClip={selectedClip} onUpdateClip={handleUpdateClip} onDeleteClip={handleDeleteClip}
          pipSettings={pipSettings} onUpdatePip={setPipSettings} hasPip={Boolean(pipFile)}
          texts={texts} onUpdateTexts={setTexts} videoDuration={totalDuration}
        />
      </div>

      <TimelinePanel
        duration={totalDuration} currentTime={currentTime} onSeek={handleSeek}
        clips={clips} selectedClipId={selectedClip?.id} onSelectClip={setSelectedClipId}
        onSplitClip={handleSplitClip} onDeleteClip={handleDeleteClip} onUndo={handleUndo} canUndo={history.length > 0}
        pipSettings={pipSettings} onUpdatePip={setPipSettings} hasPip={Boolean(pipFile)} pipName={pipFile?.name}
        texts={texts} onUpdateTexts={setTexts} audioName={extAudioFile?.name}
      />
    </div>
  );
}

const styles = {
  appShell: { display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', backgroundColor: '#18181b', color: '#e4e4e7', fontFamily: 'system-ui, sans-serif', overflow: 'hidden', userSelect: 'none', direction: 'rtl' },
  topHeader: { height: 44, backgroundColor: '#121214', borderBottom: '1px solid #27272a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 14px', flexShrink: 0 },
  brandBadge: { backgroundColor: '#2563eb', color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 4 },
  aspectSwitcher: { display: 'flex', alignItems: 'center', gap: 4, backgroundColor: '#1c1c1f', padding: '3px 6px', borderRadius: 6, border: '1px solid #27272a' },
  aspectBtn: { border: 'none', padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: 'pointer' },
  exportBtn: { display: 'flex', alignItems: 'center', gap: 6, backgroundColor: '#059669', border: 'none', color: '#fff', padding: '6px 14px', borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  workspaceGrid: { display: 'flex', flex: 1, minHeight: 0, borderBottom: '1px solid #27272a', overflow: 'hidden' },
  mediaPoolPanel: { width: 250, backgroundColor: '#1c1c1f', borderLeft: '1px solid #27272a', display: 'flex', flexDirection: 'column', minHeight: 0, flexShrink: 0 },
  panelTitleBar: { height: 32, backgroundColor: '#141416', borderBottom: '1px solid #27272a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px', fontSize: 12, fontWeight: 600, color: '#a1a1aa', flexShrink: 0 },
  uploadRow: { display: 'flex', gap: 5, padding: 8, borderBottom: '1px solid #27272a', flexShrink: 0 },
  miniUploadBtn: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: '#27272a', padding: '6px 4px', borderRadius: 4, fontSize: 11, cursor: 'pointer', border: '1px solid #3f3f46' },
  mediaGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, padding: 10, overflowY: 'auto', flex: 1 },
  mediaCard: { backgroundColor: '#27272a', borderRadius: 4, overflow: 'hidden', border: '1px solid #3f3f46', cursor: 'pointer', height: 84, display: 'flex', flexDirection: 'column' },
  thumbBox: { flex: 1, backgroundColor: '#09090b', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  thumbMedia: { width: '100%', height: '100%', objectFit: 'cover' },
  thumbLabel: { fontSize: 10, padding: '3px 6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', backgroundColor: '#18181b' },
  monitorPanel: { flex: 1, backgroundColor: '#0c0c0e', display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0, overflow: 'hidden' },
  monitorOuterStage: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12, minHeight: 0, overflow: 'hidden' },
  aspectCanvasBox: { height: '100%', maxWidth: '100%', backgroundColor: '#000', border: '1px solid #3f3f46', borderRadius: 4, position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.8)' },
  lockedVideoElement: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },
  resizeCornerHandle: { position: 'absolute', right: 0, bottom: 0, width: 14, height: 14, backgroundColor: '#a855f7', cursor: 'nwse-resize', borderTopLeftRadius: 4 },
  transportBar: { height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, borderTop: '1px solid #27272a', backgroundColor: '#18181b', flexShrink: 0 },
  transportBtn: { backgroundColor: '#27272a', border: 'none', color: '#fff', width: 30, height: 30, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }
};
