import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, DownloadCloud, Video, Image as ImageIcon, Music, ChevronLeft, ChevronRight, Monitor, ZoomIn, ZoomOut, FileJson, Columns, List, MessageSquare, Bot, Upload, X } from 'lucide-react';
import { ASPECT_RATIOS, DEFAULT_CLIP_SETTINGS, DEFAULT_PIP_SETTINGS, LUT_PRESETS, DEFAULT_CHORD_OVERLAY, DEFAULT_TEXT_OBJECT } from './defaultState';
import InspectorPanel from './InspectorPanel';
import TimelinePanel from './TimelinePanel';
import AiCopilotPanel from './AiCopilotPanel';
import ExportModal from './ExportModal';

// פונקציית עזר לייצור Thumbnail קל ברקע
const generateThumbnail = (url) => new Promise((resolve) => {
  const vid = document.createElement('video');
  vid.src = url;
  vid.muted = true;
  vid.crossOrigin = 'anonymous';
  vid.currentTime = 1.0; // פריים בשנייה ה-1
  vid.onloadeddata = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 160; canvas.height = 90;
    canvas.getContext('2d').drawImage(vid, 0, 0, 160, 90);
    resolve(canvas.toDataURL('image/jpeg', 0.6));
  };
  vid.onerror = () => resolve(null);
});

export default function App() {
  const videoRef = useRef(null); 
  const extAudioRef = useRef(null);
  const bgCanvasRef = useRef(null); // חסכוני יותר מ-VideoRef נוסף
  const viewportRef = useRef(null);
  const importFileRef = useRef(null);

  const [mediaPool, setMediaPool] = useState([]);
  const [mainVideoFile, setMainVideoFile] = useState(null);
  const [pipFile, setPipFile] = useState(null);
  const [extAudioFile, setExtAudioFile] = useState(null);

  const [poolTab, setPoolTab] = useState('files');
  const [aspectKey, setAspectKey] = useState('16:9');
  const [previewZoom, setPreviewZoom] = useState(100);
  const [showSafeZones, setShowSafeZones] = useState(false);
  const [showSplitWipe, setShowSplitWipe] = useState(false);
  
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const [clips, setClips] = useState([]);
  const [history, setHistory] = useState([]);
  const [redoHistory, setRedoHistory] = useState([]);
  const [selectedClipId, setSelectedClipId] = useState(null);
  const [pipSettings, setPipSettings] = useState({ ...DEFAULT_PIP_SETTINGS });
  const [texts, setTexts] = useState([]);
  const [chords, setChords] = useState([]);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [canvasDrag, setCanvasDrag] = useState(null);

  const dragRaf = useRef(null);
  const shuttleSpeedRef = useRef(1);
  const handlersRef = useRef({});

  const totalDuration = clips.reduce((acc, c) => acc + (c.trimEnd - c.trimStart), 0);
  const activeClip = (() => {
    if (clips.length === 0) return null;
    for (let i = 0; i < clips.length; i++) {
      if (currentTime >= clips[i].timelineStart && currentTime <= clips[i].timelineStart + (clips[i].trimEnd - clips[i].trimStart) + 0.02) return clips[i];
    }
    return clips[clips.length - 1];
  })();
  const selectedClip = clips.find((c) => c.id === selectedClipId) || activeClip;

  // -------------------------------------------------------------
  // אופטימיזציית Undo / Redo
  // -------------------------------------------------------------
  const saveHistory = (currentClips = clips) => {
    setHistory((prev) => [...prev.slice(-15), structuredClone(currentClips)]);
    setRedoHistory([]);
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setRedoHistory((prev) => [structuredClone(clips), ...prev]);
    setHistory((prev) => prev.slice(0, -1));
    setClips(previous);
    setSelectedClipId(previous[0]?.id || null);
  };

  const handleRedo = () => {
    if (redoHistory.length === 0) return;
    const next = redoHistory[0];
    setHistory((prev) => [...prev, structuredClone(clips)]);
    setRedoHistory((prev) => prev.slice(1));
    setClips(next);
    setSelectedClipId(next[0]?.id || null);
  };

  const recalculateTimelinePositions = (clipList) => {
    let cursor = 0;
    return clipList.map((c) => { const updated = { ...c, timelineStart: Number(cursor.toFixed(3)) }; cursor += (c.trimEnd - c.trimStart); return updated; });
  };

  // -------------------------------------------------------------
  // אופטימיזציית אירועי מקלדת ו-Shuttle (J,K,L)
  // -------------------------------------------------------------
  handlersRef.current = {
    togglePlay: () => {
      if (!videoRef.current || clips.length === 0) return;
      if (isPlaying) { videoRef.current.pause(); setIsPlaying(false); shuttleSpeedRef.current = 1; videoRef.current.playbackRate = 1; }
      else { if (currentTime >= totalDuration - 0.05) handleSeek(0); videoRef.current.play(); setIsPlaying(true); }
    },
    stepFrame: (dir) => { if (isPlaying) handlersRef.current.togglePlay(); handleSeek(currentTime + dir * (1 / 30)); },
    handleSplitClip: () => {
      const target = activeClip;
      if (!target) return;
      const offset = currentTime - target.timelineStart;
      const len = target.trimEnd - target.trimStart;
      if (offset <= 0.1 || offset >= len - 0.1) return;
      saveHistory(clips);
      const splitPoint = Number((target.trimStart + offset).toFixed(3));
      const firstHalf = { ...target, id: 'clip-' + Math.random().toString(36).substring(2, 7), trimEnd: splitPoint, settings: structuredClone(target.settings) };
      const secondHalf = { ...target, id: 'clip-' + Math.random().toString(36).substring(2, 7), trimStart: splitPoint, settings: structuredClone(target.settings) };
      const nextList = [...clips];
      nextList.splice(clips.findIndex(c => c.id === target.id), 1, firstHalf, secondHalf);
      setClips(recalculateTimelinePositions(nextList));
      setSelectedClipId(secondHalf.id);
    },
    handleDeleteClip: (id) => {
      if (clips.length <= 1) return;
      saveHistory(clips);
      const recalculated = recalculateTimelinePositions(clips.filter((c) => c.id !== id));
      setClips(recalculated); setSelectedClipId(recalculated[0]?.id || null); setCurrentTime(0);
      if (videoRef.current && recalculated[0]) videoRef.current.currentTime = recalculated[0].trimStart;
    },
    handleShuttleL: () => {
      const vid = videoRef.current;
      if (!vid) return;
      if (!isPlaying) { shuttleSpeedRef.current = 1; handlersRef.current.togglePlay(); }
      else {
        const speeds = [1, 1.5, 2, 3];
        const nextSpd = speeds[(speeds.indexOf(shuttleSpeedRef.current) + 1) % speeds.length];
        shuttleSpeedRef.current = nextSpd;
        vid.playbackRate = nextSpd;
      }
    },
    handleShuttleK: () => {
      shuttleSpeedRef.current = 1;
      if (videoRef.current) { videoRef.current.playbackRate = 1; videoRef.current.pause(); }
      setIsPlaying(false);
    },
    handleShuttleJ: () => { handleSeek(currentTime - 3); },
    handleUndo, handleRedo, setIsAiOpen, selectedClipId, clips
  };

  useEffect(() => {
    const onKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
      const h = handlersRef.current;
      
      if (e.code === 'Space') { e.preventDefault(); h.togglePlay(); }
      else if (e.code === 'ArrowLeft') { e.preventDefault(); h.stepFrame(1); }
      else if (e.code === 'ArrowRight') { e.preventDefault(); h.stepFrame(-1); }
      else if (e.key.toLowerCase() === 's') { e.preventDefault(); h.handleSplitClip(); }
      else if (e.key === 'Delete' || e.key === 'Backspace') { if (h.selectedClipId && h.clips.length > 1) { e.preventDefault(); h.handleDeleteClip(h.selectedClipId); } }
      else if (e.key.toLowerCase() === 'l') { e.preventDefault(); h.handleShuttleL(); }
      else if (e.key.toLowerCase() === 'k') { e.preventDefault(); h.handleShuttleK(); }
      else if (e.key.toLowerCase() === 'j') { e.preventDefault(); h.handleShuttleJ(); }
      else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z') { e.preventDefault(); h.handleRedo(); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); h.handleRedo(); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); h.handleUndo(); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); h.setIsAiOpen(prev => !prev); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // -------------------------------------------------------------
  // אופטימיזציית טשטוש רקע (Canvas Blur במקום מפענח וידאו כפול)
  // -------------------------------------------------------------
  useEffect(() => {
    let lastDraw = 0;
    let rafId;
    const drawBg = (now) => {
      // מצייר רק 15 פעמים בשנייה לחיסכון במשאבים
      if (now - lastDraw > 66 && videoRef.current && bgCanvasRef.current && activeClip?.settings.fitMode === 'blurBg') {
         const ctx = bgCanvasRef.current.getContext('2d', { alpha: false });
         ctx.drawImage(videoRef.current, 0, 0, 64, 36);
         lastDraw = now;
      }
      rafId = requestAnimationFrame(drawBg);
    };
    rafId = requestAnimationFrame(drawBg);
    return () => cancelAnimationFrame(rafId);
  }, [activeClip?.settings.fitMode]);

  // -------------------------------------------------------------
  // אופטימיזציית Media Pool (Thumbnails וניקוי זיכרון)
  // -------------------------------------------------------------
  const handleFileUpload = async (e, type) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    
    const newItems = await Promise.all(files.map(async (file) => {
      const url = URL.createObjectURL(file);
      let thumbUrl = null;
      if (file.type.startsWith('video/')) thumbUrl = await generateThumbnail(url);
      
      return { id: 'f-' + Date.now() + Math.random(), name: file.name, type, isVideo: file.type.startsWith('video/'), url, thumbUrl };
    }));

    setMediaPool((prev) => [...prev, ...newItems]);
    newItems.forEach((item) => {
      if (item.type === 'video' && !mainVideoFile) { setMainVideoFile(item); setCurrentTime(0); setIsPlaying(false); setHistory([]); }
      if (item.type === 'pip' && !pipFile) { setPipFile(item); setPipSettings({ ...DEFAULT_PIP_SETTINGS, endTime: Math.min(10, totalDuration || 10) }); }
      if (item.type === 'audio' && !extAudioFile) setExtAudioFile(item);
    });
  };

  const handleDeleteMedia = (e, id, url) => {
    e.stopPropagation();
    setMediaPool(prev => prev.filter(m => m.id !== id));
    URL.revokeObjectURL(url); // שחרור זיכרון RAM מיידי
  };

  // --- המשך הלוגיקה הרגילה ---
  const handleSeek = (targetTimelineSec) => {
    const clamped = Math.max(0, Math.min(totalDuration, targetTimelineSec));
    setCurrentTime(clamped);
    const tClip = (() => {
      for (let i = 0; i < clips.length; i++) {
        if (clamped >= clips[i].timelineStart && clamped <= clips[i].timelineStart + (clips[i].trimEnd - clips[i].trimStart) + 0.02) return clips[i];
      } return null;
    })();
    if (tClip && videoRef.current) {
      videoRef.current.currentTime = tClip.trimStart + (clamped - tClip.timelineStart);
      setSelectedClipId(tClip.id);
    }
  };

  const handleTimeUpdate = () => {
    const vid = videoRef.current;
    if (!vid || !activeClip) return;
    const elapsed = vid.currentTime - activeClip.trimStart;
    setCurrentTime(activeClip.timelineStart + Math.max(0, elapsed));
    if (vid.currentTime >= activeClip.trimEnd - 0.04) {
      const idx = clips.findIndex((c) => c.id === activeClip.id);
      if (clips[idx + 1]) vid.currentTime = clips[idx + 1].trimStart;
      else { vid.pause(); setIsPlaying(false); shuttleSpeedRef.current = 1; vid.playbackRate = 1; setCurrentTime(0); vid.currentTime = clips[0].trimStart; }
    }
  };

  const onLayerMouseDown = (e, target, mode, id = null) => {
    e.stopPropagation();
    let init = null;
    if (target === 'pip') init = { ...pipSettings };
    else if (target === 'text') init = { ...texts.find(t => t.id === id) };
    else if (target === 'chord') init = { ...chords.find(c => c.id === id) };
    setCanvasDrag({ target, mode, id, startX: e.clientX, startY: e.clientY, init });
  };

  // אופטימיזציית תנועת עכבר: ויסות בעזרת RequestAnimationFrame
  const onViewportMouseMove = (e) => {
    if (!canvasDrag || !viewportRef.current) return;
    if (dragRaf.current) cancelAnimationFrame(dragRaf.current);
    
    dragRaf.current = requestAnimationFrame(() => {
      const dx = (e.clientX - canvasDrag.startX) / (previewZoom / 100);
      const dy = (e.clientY - canvasDrag.startY) / (previewZoom / 100);
      const bounds = viewportRef.current.getBoundingClientRect();
      let nextX = canvasDrag.init.x + dx;
      let nextY = canvasDrag.init.y + dy;
      if (Math.abs(nextX - (bounds.width/2)) < 15) nextX = bounds.width/2;
      if (Math.abs(nextY - (bounds.height/2)) < 15) nextY = bounds.height/2;

      if (canvasDrag.target === 'pip') {
        if (canvasDrag.mode === 'drag') setPipSettings(p => ({ ...p, x: Math.round(nextX), y: Math.round(nextY) }));
        else setPipSettings(p => ({ ...p, width: Math.max(50, p.width + dx), height: Math.max(40, p.height + dy) }));
      } 
      else if (canvasDrag.target === 'text') setTexts(texts.map(t => t.id === canvasDrag.id ? { ...t, x: Math.round(nextX), y: Math.round(nextY) } : t));
      else if (canvasDrag.target === 'chord') setChords(chords.map(c => c.id === canvasDrag.id ? { ...c, x: Math.round(nextX), y: Math.round(nextY) } : c));
    });
  };

  const buildFilter = (s) => `brightness(${s.brightness}%) contrast(${s.contrast}%) saturate(${s.saturate}%) hue-rotate(${s.hueRotate}deg) ${s.blur > 0 ? `blur(${s.blur}px)` : ''}`;
  const cSettings = activeClip?.settings || DEFAULT_CLIP_SETTINGS;
  const currentProjectData = { config: { aspectRatio: aspectKey, format: ASPECT_RATIOS[aspectKey], totalDuration }, clips, pipSettings, texts, chords, mainVideoFile, pipFile, audioFile: extAudioFile, currentTime };

  const handleUpdateClipsBulk = (newClips) => {
    saveHistory(clips);
    setClips(newClips);
  };

  return (
    <div style={styles.appShell} onMouseMove={onViewportMouseMove} onMouseUp={() => setCanvasDrag(null)}>
      <header style={styles.topHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={styles.brandBadge}>GUITAR STUDIO PRO</span>
          <div style={styles.aspectSwitcher}>
            <Monitor size={13} color="#38bdf8" />
            {Object.keys(ASPECT_RATIOS).map((key) => (
              <button key={key} onClick={() => setAspectKey(key)} style={{ ...styles.aspectBtn, backgroundColor: aspectKey === key ? '#2563eb' : 'transparent', color: aspectKey === key ? '#fff' : '#a1a1aa' }}>{key}</button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input type="file" accept=".json" ref={importFileRef} style={{ display: 'none' }} />
          <button style={styles.secondaryBtn} onClick={() => importFileRef.current?.click()} title="יבוא מ-JSON">
            <Upload size={14} /> ייבוא
          </button>
          <button style={styles.exportBtn} onClick={() => setIsExportModalOpen(true)} disabled={clips.length === 0}>
            <DownloadCloud size={14} /> ייצוא והורדת סרטון
          </button>
          <button style={styles.aiBtn} onClick={() => setIsAiOpen(true)}>
            <Bot size={14} /> AI Co-Pilot
          </button>
        </div>
      </header>

      <div style={styles.workspaceGrid}>
        <aside style={styles.mediaPoolPanel}>
          <div style={styles.tabsRow}>
            <button style={{...styles.poolTab, borderBottomColor: poolTab==='files'?'#38bdf8':'transparent'}} onClick={()=>setPoolTab('files')}><Columns size={12}/> מדיה</button>
            <button style={{...styles.poolTab, borderBottomColor: poolTab==='transcript'?'#38bdf8':'transparent'}} onClick={()=>setPoolTab('transcript')}><MessageSquare size={12}/> תמלול</button>
            <button style={{...styles.poolTab, borderBottomColor: poolTab==='chords'?'#38bdf8':'transparent'}} onClick={()=>setPoolTab('chords')}><List size={12}/> אקורדים</button>
          </div>
          <div style={styles.poolBody}>
             {poolTab === 'files' && (
               <>
                  <div style={{ display: 'flex', gap: 5, marginBottom: 10 }}>
                    <label style={styles.miniBtn}><Video size={12} color="#3b82f6" /> וידאו<input type="file" accept="video/*" onChange={(e) => handleFileUpload(e, 'video')} hidden /></label>
                    <label style={styles.miniBtn}><ImageIcon size={12} color="#a855f7" /> PiP<input type="file" accept="image/*,video/*" onChange={(e) => handleFileUpload(e, 'pip')} hidden /></label>
                    <label style={styles.miniBtn}><Music size={12} color="#10b981" /> סאונד<input type="file" accept="audio/*" onChange={(e) => handleFileUpload(e, 'audio')} hidden /></label>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                    {mediaPool.map((item) => (
                      <div key={item.id} style={styles.mediaCard} onClick={() => { if (item.type === 'video') selectMainVideo(item); if (item.type === 'pip') { setPipFile(item); setPipSettings({ ...DEFAULT_PIP_SETTINGS, endTime: Math.min(10, totalDuration || 10) }); } if (item.type === 'audio') setExtAudioFile(item); }}>
                        <div style={styles.thumbBox}>
                          {/* אופטימיזציית Thumbnail במקום <video> פתוח */}
                          {item.thumbUrl ? <img src={item.thumbUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" /> : <Music size={24} color="#10b981" />}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 6px', backgroundColor: '#18181b', alignItems: 'center' }}>
                          <span style={{ fontSize: 10, overflow: 'hidden', whiteSpace: 'nowrap' }}>{item.name}</span>
                          <X size={10} color="#ef4444" style={{ cursor: 'pointer' }} onClick={(e) => handleDeleteMedia(e, item.id, item.url)} />
                        </div>
                      </div>
                    ))}
                  </div>
               </>
             )}
          </div>
        </aside>

        <main style={styles.monitorPanel}>
          <div style={styles.monitorOuterStage}>
            <div ref={viewportRef} style={{ ...styles.aspectCanvasBox, aspectRatio: `${ASPECT_RATIOS[aspectKey].width} / ${ASPECT_RATIOS[aspectKey].height}`, transform: `scale(${previewZoom / 100})` }}>
              
              {/* אופטימיזציית טשטוש רקע */}
              {mainVideoFile && cSettings.fitMode === 'blurBg' && (
                <canvas ref={bgCanvasRef} width={64} height={36} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', filter: 'blur(18px) brightness(0.55)', transform: 'scale(1.1)', pointerEvents: 'none' }} />
              )}

              {mainVideoFile && (
                <video ref={videoRef} src={mainVideoFile.url} onLoadedMetadata={handleVideoMetadata} onTimeUpdate={handleTimeUpdate} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: cSettings.fitMode === 'cover' ? 'cover' : 'contain', filter: buildFilter(cSettings), opacity: cSettings.opacity / 100, transform: `translate(${cSettings.posX}px, ${cSettings.posY}px) rotate(${cSettings.rotation}deg) scale(${ (cSettings.mirrorH ? -1 : 1) * (cSettings.scale / 100) })` }} />
              )}
              {pipFile && currentTime >= pipSettings.startTime && currentTime <= pipSettings.endTime && (
                <div onMouseDown={(e) => onLayerMouseDown(e, 'pip', 'drag')} style={{ position: 'absolute', left: pipSettings.x, top: pipSettings.y, width: pipSettings.width, height: pipSettings.height, opacity: pipSettings.opacity / 100, transform: `rotate(${pipSettings.rotation}deg)`, borderRadius: pipSettings.borderRadius, border: `2px solid ${canvasDrag?.target==='pip'?'#38bdf8':pipSettings.borderColor}`, cursor: 'grab', zIndex: 20 }}>
                  <img src={pipFile.thumbUrl || pipFile.url} alt="PiP" style={{ width: '100%', height: '100%', objectFit: 'fill', pointerEvents: 'none' }} />
                  <div onMouseDown={(e) => onLayerMouseDown(e, 'pip', 'resize')} style={{ position: 'absolute', right: -4, bottom: -4, width: 12, height: 12, backgroundColor: '#38bdf8', cursor: 'nwse-resize' }} />
                </div>
              )}
              {chords.map((c) => currentTime >= c.startTime && currentTime <= c.endTime && (
                <div key={c.id} onMouseDown={(e) => onLayerMouseDown(e, 'chord', 'drag', c.id)} style={{ position: 'absolute', left: c.x, top: c.y, width: 80, height: 100, backgroundColor: 'rgba(0,0,0,0.6)', border: `1px solid ${canvasDrag?.id===c.id?'#38bdf8':'#0ea5e9'}`, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 24, fontWeight: 'bold', cursor: 'grab', zIndex: 24 }}>{c.chordName}</div>
              ))}
              {texts.map((txt) => currentTime >= txt.startTime && currentTime <= txt.endTime && (
                <div key={txt.id} onMouseDown={(e) => onLayerMouseDown(e, 'text', 'drag', txt.id)} style={{ position: 'absolute', left: txt.x, top: txt.y, fontSize: txt.fontSize, color: txt.color, backgroundColor: txt.bgColor, padding: '6px 12px', borderRadius: 6, cursor: 'grab', zIndex: 25, border: `1px dashed ${canvasDrag?.id===txt.id?'#38bdf8':'rgba(255,255,255,0.35)'}` }}>{txt.content}</div>
              ))}
            </div>
          </div>
          <div style={styles.transportBar}>
            <button style={{ ...styles.transportBtn, backgroundColor: '#2563eb' }} onClick={() => handlersRef.current.togglePlay()}>{isPlaying ? <Pause size={16} /> : <Play size={16} />}</button>
          </div>
        </main>

        <InspectorPanel 
          selectedClip={selectedClip} 
          allClips={clips}
          onUpdateClip={(id, newSet) => setClips(clips.map(c => c.id === id ? { ...c, settings: newSet } : c))} 
          onUpdateClipsBulk={handleUpdateClipsBulk}
          onDeleteClip={(id) => handlersRef.current.handleDeleteClip(id)} 
          pipSettings={pipSettings} onUpdatePip={setPipSettings} hasPip={Boolean(pipFile)} 
          texts={texts} onUpdateTexts={setTexts} chords={chords} onUpdateChords={setChords} 
          videoDuration={totalDuration} currentTime={currentTime} 
        />
      </div>

      <TimelinePanel duration={totalDuration} currentTime={currentTime} onSeek={handleSeek} clips={clips} selectedClipId={selectedClip?.id} onSelectClip={setSelectedClipId} onSplitClip={() => handlersRef.current.handleSplitClip()} onDeleteClip={(id) => handlersRef.current.handleDeleteClip(id)} onUndo={handleUndo} canUndo={history.length > 0} pipSettings={pipSettings} onUpdatePip={setPipSettings} hasPip={Boolean(pipFile)} pipName={pipFile?.name} texts={texts} onUpdateTexts={setTexts} chords={chords} onUpdateChords={setChords} audioName={extAudioFile?.name} />
      
      <AiCopilotPanel isOpen={isAiOpen} onClose={() => setIsAiOpen(false)} currentTime={currentTime} selectedClip={selectedClip} hasPip={Boolean(pipFile)} />
      <ExportModal isOpen={isExportModalOpen} onClose={() => setIsExportModalOpen(false)} projectData={currentProjectData} />
    </div>
  );
}

const styles = {
  appShell: { display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', backgroundColor: '#18181b', color: '#e4e4e7', fontFamily: 'system-ui, sans-serif', overflow: 'hidden', userSelect: 'none', direction: 'rtl' },
  topHeader: { height: 44, backgroundColor: '#121214', borderBottom: '1px solid #27272a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 14px', flexShrink: 0 },
  brandBadge: { backgroundColor: '#2563eb', color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 4 },
  aspectSwitcher: { display: 'flex', alignItems: 'center', gap: 4, backgroundColor: '#1c1c1f', padding: '3px 6px', borderRadius: 6, border: '1px solid #27272a' },
  aspectBtn: { border: 'none', padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: 'pointer' },
  secondaryBtn: { display: 'flex', alignItems: 'center', gap: 6, backgroundColor: '#27272a', border: '1px solid #3f3f46', color: '#fff', padding: '6px 10px', borderRadius: 6, fontSize: 12, cursor: 'pointer' },
  exportBtn: { display: 'flex', alignItems: 'center', gap: 6, backgroundColor: '#2563eb', border: '1px solid #1d4ed8', color: '#fff', padding: '6px 16px', borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)' },
  aiBtn: { display: 'flex', alignItems: 'center', gap: 6, backgroundColor: '#8b5cf6', border: 'none', color: '#fff', padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  workspaceGrid: { display: 'flex', flex: 1, minHeight: 0, borderBottom: '1px solid #27272a', overflow: 'hidden' },
  mediaPoolPanel: { width: 250, backgroundColor: '#1c1c1f', borderLeft: '1px solid #27272a', display: 'flex', flexDirection: 'column', minHeight: 0, flexShrink: 0 },
  tabsRow: { display: 'flex', backgroundColor: '#141416', borderBottom: '1px solid #27272a' },
  poolTab: { flex: 1, padding: '8px 0', border: 'none', backgroundColor: 'transparent', borderBottom: '2px solid transparent', color: '#a1a1aa', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 },
  poolBody: { padding: 12, overflowY: 'auto', flex: 1 },
  miniBtn: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: '#27272a', padding: '6px 4px', borderRadius: 4, fontSize: 11, cursor: 'pointer', border: '1px solid #3f3f46', color: '#fff' },
  mediaCard: { backgroundColor: '#27272a', borderRadius: 4, overflow: 'hidden', border: '1px solid #3f3f46', cursor: 'pointer', height: 84, display: 'flex', flexDirection: 'column' },
  thumbBox: { flex: 1, backgroundColor: '#09090b', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  monitorPanel: { flex: 1, backgroundColor: '#0c0c0e', display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0, overflow: 'hidden' },
  monitorOuterStage: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12, minHeight: 0, overflow: 'hidden' },
  aspectCanvasBox: { height: '100%', maxWidth: '100%', backgroundColor: '#000', border: '1px solid #3f3f46', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.8)' },
  transportBar: { height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, borderTop: '1px solid #27272a', backgroundColor: '#18181b', flexShrink: 0 },
  transportBtn: { backgroundColor: '#27272a', border: 'none', color: '#fff', width: 30, height: 30, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }
};
