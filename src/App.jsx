import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Download, Video, Image as ImageIcon, Music, ChevronLeft, ChevronRight, Monitor, ZoomIn, ZoomOut, FileJson, Columns, List, MessageSquare, Bot, Upload } from 'lucide-react';
import { ASPECT_RATIOS, DEFAULT_CLIP_SETTINGS, DEFAULT_PIP_SETTINGS, LUT_PRESETS, DEFAULT_CHORD_OVERLAY, DEFAULT_TEXT_OBJECT } from './defaultState';
import InspectorPanel from './InspectorPanel';
import TimelinePanel from './TimelinePanel';
import AiCopilotPanel from './AiCopilotPanel';

export default function App() {
  const videoRef = useRef(null); const bgVideoRef = useRef(null); const extAudioRef = useRef(null);
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
  const [isAiOpen, setIsAiOpen] = useState(false); // פתיחת חלונית AI

  const [clips, setClips] = useState([]);
  const [history, setHistory] = useState([]);
  const [selectedClipId, setSelectedClipId] = useState(null);
  const [pipSettings, setPipSettings] = useState({ ...DEFAULT_PIP_SETTINGS });
  const [texts, setTexts] = useState([]);
  const [chords, setChords] = useState([]);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [canvasDrag, setCanvasDrag] = useState(null);

  const totalDuration = clips.reduce((acc, c) => acc + (c.trimEnd - c.trimStart), 0);
  const activeClip = (() => {
    if (clips.length === 0) return null;
    for (let i = 0; i < clips.length; i++) {
      if (currentTime >= clips[i].timelineStart && currentTime <= clips[i].timelineStart + (clips[i].trimEnd - clips[i].trimStart) + 0.02) return clips[i];
    }
    return clips[clips.length - 1];
  })();
  const selectedClip = clips.find((c) => c.id === selectedClipId) || activeClip;

  const saveHistory = (currentClips = clips) => setHistory((prev) => [...prev.slice(-15), JSON.parse(JSON.stringify(currentClips))]);
  const handleUndo = () => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));
    setClips(previous);
    setSelectedClipId(previous[0]?.id || null);
  };

  const recalculateTimelinePositions = (clipList) => {
    let cursor = 0;
    return clipList.map((c) => { const updated = { ...c, timelineStart: Number(cursor.toFixed(3)) }; cursor += (c.trimEnd - c.trimStart); return updated; });
  };

  useEffect(() => {
    const onKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
      if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
      else if (e.key === 'Delete' || e.key === 'Backspace') { if (selectedClip && clips.length > 1) { e.preventDefault(); handleDeleteClip(selectedClip.id); } }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); handleUndo(); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setIsAiOpen(prev => !prev); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  // -------------------------------------------------------------
  // אדריכלות AI Co-Pilot & Webhook Dispatcher
  // -------------------------------------------------------------
  const dispatchAiActions = (actionsArray) => {
    saveHistory(clips); // שומר מצב ל-Undo לפני הרצת פקודות ה-AI
    let nextClips = [...clips];
    let nextTexts = [...texts];
    let nextChords = [...chords];

    actionsArray.forEach(action => {
      if (action.type === 'UPDATE_CLIP_SETTINGS') {
        nextClips = nextClips.map(c => c.id === action.clipId ? { ...c, settings: { ...c.settings, ...action.patch } } : c);
      } 
      else if (action.type === 'ADD_KEYFRAMES') {
        nextClips = nextClips.map(c => {
          if (c.id === action.clipId) {
            const kf = c.settings.keyframes || {};
            return { ...c, settings: { ...c.settings, keyframes: { ...kf, [action.property]: action.points } } };
          } return c;
        });
      }
      else if (action.type === 'ADD_CHORD_OVERLAY') {
        nextChords.push({ ...DEFAULT_CHORD_OVERLAY, id: 'ai-chord-' + Date.now() + Math.random(), ...action.chord });
      }
      else if (action.type === 'ADD_TEXT_LAYER') {
        nextTexts.push({ ...DEFAULT_TEXT_OBJECT, id: 'ai-txt-' + Date.now() + Math.random(), ...action.text });
      }
    });

    setClips(nextClips);
    setTexts(nextTexts);
    setChords(nextChords);
  };

  const handleSendAiPrompt = async (userPrompt, webhookUrl) => {
    const payload = {
      userPrompt,
      selectionContext: { currentTime, selectedClipId: selectedClip?.id, aspectRatio: aspectKey, totalDuration },
      projectState: { timelineClips: clips, pipSettings, textLayers: texts, chordOverlays: chords }
    };

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error('שגיאת שרת: ' + res.status);
    const data = await res.json();
    
    // מפעיל את הפקודות שה-AI בחר
    if (data.actions && Array.isArray(data.actions)) {
      dispatchAiActions(data.actions);
    }
    return data.assistantMessage;
  };

  // -------------------------------------------------------------
  // פונקציות ייבוא וייצוא JSON רגילות
  // -------------------------------------------------------------
  const handleExportJSON = () => {
    const data = { config: { aspectRatio: aspectKey, totalDuration }, clips, pipSettings, texts, chords };
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    a.download = `project-${Date.now()}.json`;
    a.click();
  };

  const handleImportJSON = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (data.clips) setClips(data.clips);
        if (data.texts) setTexts(data.texts);
        if (data.chords) setChords(data.chords);
        if (data.pipSettings) setPipSettings(data.pipSettings);
        if (data.config?.aspectRatio) setAspectKey(data.config.aspectRatio);
        alert('הפרויקט נטען בהצלחה!');
      } catch (err) { alert('שגיאה בקריאת הקובץ.'); }
    };
    reader.readAsText(file);
    e.target.value = null; // איפוס 
  };

  // --- שאר הפונקציות הקיימות ---
  const handleFileUpload = (e, type) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    const items = files.map((file) => ({ id: 'f-' + Date.now() + Math.random(), name: file.name, type, isVideo: file.type.startsWith('video/'), url: URL.createObjectURL(file) }));
    setMediaPool((prev) => [...prev, ...items]);
    items.forEach((item) => {
      if (item.type === 'video' && !mainVideoFile) selectMainVideo(item);
      if (item.type === 'pip' && !pipFile) { setPipFile(item); setPipSettings({ ...DEFAULT_PIP_SETTINGS, endTime: Math.min(10, totalDuration || 10) }); }
      if (item.type === 'audio' && !extAudioFile) setExtAudioFile(item);
    });
  };

  const selectMainVideo = (item) => { setMainVideoFile(item); setCurrentTime(0); setIsPlaying(false); setHistory([]); };

  const handleVideoMetadata = () => {
    if (!videoRef.current || !mainVideoFile || clips.length > 0) return;
    const dur = videoRef.current.duration || 10;
    const firstClip = { id: 'clip-' + Date.now(), label: mainVideoFile.name, trimStart: 0, trimEnd: Number(dur.toFixed(3)), timelineStart: 0, settings: { ...DEFAULT_CLIP_SETTINGS } };
    setClips([firstClip]); setSelectedClipId(firstClip.id);
  };

  const handleSplitClip = (splitTimelineTime = currentTime) => {
    const target = (() => {
       for (let i = 0; i < clips.length; i++) {
         if (splitTimelineTime >= clips[i].timelineStart && splitTimelineTime <= clips[i].timelineStart + (clips[i].trimEnd - clips[i].trimStart)) return clips[i];
       } return null;
    })();
    if (!target) return;
    const offset = splitTimelineTime - target.timelineStart;
    const len = target.trimEnd - target.trimStart;
    if (offset <= 0.1 || offset >= len - 0.1) return;
    saveHistory(clips);
    const splitPoint = Number((target.trimStart + offset).toFixed(3));
    const firstHalf = { ...target, id: 'clip-' + Math.random().toString(36).substring(2, 7), trimEnd: splitPoint, settings: JSON.parse(JSON.stringify(target.settings)) };
    const secondHalf = { ...target, id: 'clip-' + Math.random().toString(36).substring(2, 7), trimStart: splitPoint, settings: JSON.parse(JSON.stringify(target.settings)) };
    const nextList = [...clips];
    nextList.splice(clips.findIndex(c => c.id === target.id), 1, firstHalf, secondHalf);
    setClips(recalculateTimelinePositions(nextList));
    setSelectedClipId(secondHalf.id);
  };

  const handleDeleteClip = (clipId) => {
    if (clips.length <= 1) return;
    saveHistory(clips);
    const recalculated = recalculateTimelinePositions(clips.filter((c) => c.id !== clipId));
    setClips(recalculated); setSelectedClipId(recalculated[0]?.id || null); setCurrentTime(0);
    if (videoRef.current && recalculated[0]) videoRef.current.currentTime = recalculated[0].trimStart;
  };

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

  const togglePlay = () => {
    if (!videoRef.current || clips.length === 0) return;
    if (isPlaying) { videoRef.current.pause(); setIsPlaying(false); } 
    else { if (currentTime >= totalDuration - 0.05) handleSeek(0); videoRef.current.play(); setIsPlaying(true); }
  };

  const handleTimeUpdate = () => {
    const vid = videoRef.current;
    if (!vid || !activeClip) return;
    const elapsed = vid.currentTime - activeClip.trimStart;
    setCurrentTime(activeClip.timelineStart + Math.max(0, elapsed));
    if (vid.currentTime >= activeClip.trimEnd - 0.04) {
      const idx = clips.findIndex((c) => c.id === activeClip.id);
      if (clips[idx + 1]) vid.currentTime = clips[idx + 1].trimStart;
      else { vid.pause(); setIsPlaying(false); setCurrentTime(0); vid.currentTime = clips[0].trimStart; }
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

  const onViewportMouseMove = (e) => {
    if (!canvasDrag || !viewportRef.current) return;
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
  };

  const buildFilter = (s) => `brightness(${s.brightness}%) contrast(${s.contrast}%) saturate(${s.saturate}%) hue-rotate(${s.hueRotate}deg) ${s.blur > 0 ? `blur(${s.blur}px)` : ''}`;
  const fmtTime = (s) => `${Math.floor(s/60).toString().padStart(2,'0')}:${Math.floor(s%60).toString().padStart(2,'0')}`;
  const cSettings = activeClip?.settings || DEFAULT_CLIP_SETTINGS;

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
          {/* ייבוא פרויקט JSON */}
          <input type="file" accept=".json" ref={importFileRef} onChange={handleImportJSON} style={{ display: 'none' }} />
          <button style={styles.secondaryBtn} onClick={() => importFileRef.current?.click()} title="יבוא מ-JSON">
            <Upload size={14} /> ייבוא מ-AI
          </button>
          
          <button style={styles.exportBtn} onClick={handleExportJSON} disabled={clips.length === 0}>
            <FileJson size={14} /> ייצוא ל-AI
          </button>
          
          {/* כפתור פתיחת ה-AI Co-Pilot */}
          <button style={styles.aiBtn} onClick={() => setIsAiOpen(true)} title="סוכן AI (Ctrl+K)">
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
                          {item.type === 'video' && <video src={item.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                          {item.type === 'pip' && (item.isVideo ? <video src={item.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <img src={item.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />)}
                        </div>
                        <div style={{ fontSize: 10, padding: '3px 6px', overflow: 'hidden', whiteSpace: 'nowrap' }}>{item.name}</div>
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
              {mainVideoFile && (
                <video ref={videoRef} src={mainVideoFile.url} onLoadedMetadata={handleVideoMetadata} onTimeUpdate={handleTimeUpdate} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: cSettings.fitMode === 'cover' ? 'cover' : 'contain', filter: buildFilter(cSettings), opacity: cSettings.opacity / 100, transform: `translate(${cSettings.posX}px, ${cSettings.posY}px) rotate(${cSettings.rotation}deg) scale(${ (cSettings.mirrorH ? -1 : 1) * (cSettings.scale / 100) })` }} />
              )}
              {pipFile && currentTime >= pipSettings.startTime && currentTime <= pipSettings.endTime && (
                <div onMouseDown={(e) => onLayerMouseDown(e, 'pip', 'drag')} style={{ position: 'absolute', left: pipSettings.x, top: pipSettings.y, width: pipSettings.width, height: pipSettings.height, opacity: pipSettings.opacity / 100, transform: `rotate(${pipSettings.rotation}deg)`, borderRadius: pipSettings.borderRadius, border: `2px solid ${canvasDrag?.target==='pip'?'#38bdf8':pipSettings.borderColor}`, cursor: 'grab', zIndex: 20 }}>
                  {pipFile.isVideo ? <video src={pipFile.url} autoPlay loop muted style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }} /> : <img src={pipFile.url} alt="PiP" style={{ width: '100%', height: '100%', objectFit: 'fill', pointerEvents: 'none' }} />}
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
            <button style={{ ...styles.transportBtn, backgroundColor: '#2563eb' }} onClick={togglePlay}>{isPlaying ? <Pause size={16} /> : <Play size={16} />}</button>
          </div>
        </main>

        <InspectorPanel selectedClip={selectedClip} onUpdateClip={(id, newSet) => handleUpdateClip(id, newSet)} onDeleteClip={handleDeleteClip} pipSettings={pipSettings} onUpdatePip={setPipSettings} hasPip={Boolean(pipFile)} texts={texts} onUpdateTexts={setTexts} chords={chords} onUpdateChords={setChords} videoDuration={totalDuration} currentTime={currentTime} />
      </div>

      <TimelinePanel duration={totalDuration} currentTime={currentTime} onSeek={handleSeek} clips={clips} selectedClipId={selectedClip?.id} onSelectClip={setSelectedClipId} onSplitClip={handleSplitClip} onDeleteClip={handleDeleteClip} onUndo={handleUndo} canUndo={history.length > 0} pipSettings={pipSettings} onUpdatePip={setPipSettings} hasPip={Boolean(pipFile)} pipName={pipFile?.name} texts={texts} onUpdateTexts={setTexts} chords={chords} onUpdateChords={setChords} audioName={extAudioFile?.name} />
      
      {/* פאנל הסוכן המחובר ל-n8n */}
      <AiCopilotPanel 
        isOpen={isAiOpen} 
        onClose={() => setIsAiOpen(false)} 
        currentTime={currentTime} 
        selectedClip={selectedClip} 
        hasPip={Boolean(pipFile)} 
        onSendPrompt={handleSendAiPrompt} 
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
  secondaryBtn: { display: 'flex', alignItems: 'center', gap: 6, backgroundColor: '#27272a', border: '1px solid #3f3f46', color: '#fff', padding: '6px 10px', borderRadius: 4, fontSize: 12, cursor: 'pointer' },
  exportBtn: { display: 'flex', alignItems: 'center', gap: 6, backgroundColor: '#059669', border: 'none', color: '#fff', padding: '6px 14px', borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  aiBtn: { display: 'flex', alignItems: 'center', gap: 6, backgroundColor: '#8b5cf6', border: 'none', color: '#fff', padding: '6px 14px', borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: 'pointer', boxShadow: '0 0 10px rgba(139, 92, 246, 0.4)' },
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
