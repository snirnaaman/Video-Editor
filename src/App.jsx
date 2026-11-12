import React, { useState, useRef, useEffect } from 'react';
import {
  Play, Pause, SkipBack, DownloadCloud, ChevronLeft, ChevronRight,
  Monitor, ZoomIn, ZoomOut, Bot, Upload, Keyboard, PanelLeft, PanelRight, PanelBottom, Grid3x3, Columns, Sliders, Film
} from 'lucide-react';
import {
  ASPECT_RATIOS, DEFAULT_CLIP_SETTINGS, DEFAULT_PIP_SETTINGS,
  DEFAULT_AUDIO_CLIP, LUT_PRESETS, DEFAULT_CHORD_OVERLAY, DEFAULT_TEXT_OBJECT
} from './defaultState';
import MediaPoolPanel from './MediaPoolPanel';
import InspectorPanel from './InspectorPanel';
import TimelinePanel from './TimelinePanel';
import WindowContainer from './WindowContainer';
import ShortcutsModal from './ShortcutsModal';
import AiCopilotPanel from './AiCopilotPanel';
import ExportModal from './ExportModal';
import ChordDiagram from './ChordDiagram';

const generateThumbnail = (url) => new Promise((resolve) => {
  const vid = document.createElement('video');
  vid.src = url;
  vid.muted = true;
  vid.currentTime = 0.5;
  vid.onloadeddata = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 160; canvas.height = 90;
    canvas.getContext('2d').drawImage(vid, 0, 0, 160, 90);
    resolve({ thumb: canvas.toDataURL('image/jpeg', 0.65), duration: vid.duration || 10 });
  };
  vid.onerror = () => resolve({ thumb: null, duration: 10 });
});

export default function App() {
  const videoRef = useRef(null);
  const bgCanvasRef = useRef(null);
  const viewportRef = useRef(null);
  const importFileRef = useRef(null);
  const dragRaf = useRef(null);
  const handlersRef = useRef({});

  // מאגר מדיה ומסילות מרובות
  const [mediaPool, setMediaPool] = useState([]);
  const [clips, setClips] = useState([]); // V1: מספר סרטונים/תמונות
  const [pipClips, setPipClips] = useState([]); // V2: מספר שכבות תמונה/וידאו
  const [audioClips, setAudioClips] = useState([]); // A1: מספר קובצי שמע
  const [texts, setTexts] = useState([]); // T1: כתוביות
  const [chords, setChords] = useState([]); // C1: אקורדים
  const [transcript, setTranscript] = useState([]);

  // בחירה פעילה בציר הזמן ({ type: 'video'|'pip'|'audio'|'text'|'chord', id })
  const [selectedItem, setSelectedItem] = useState(null);
  const [history, setHistory] = useState([]);
  const [redoHistory, setRedoHistory] = useState([]);

  // הגדרות מוניטור וחלונות (פתיחה/סגירה ופיצול לחלון צף)
  const [aspectKey, setAspectKey] = useState('16:9');
  const [previewZoom, setPreviewZoom] = useState(100);
  const [showSafeZones, setShowSafeZones] = useState(false);

  const [isPoolOpen, setIsPoolOpen] = useState(true);
  const [isPoolDetached, setIsPoolDetached] = useState(false);
  const [isInspectorOpen, setIsInspectorOpen] = useState(true);
  const [isInspectorDetached, setIsInspectorDetached] = useState(false);
  const [isTimelineOpen, setIsTimelineOpen] = useState(true);
  const [isTimelineDetached, setIsTimelineDetached] = useState(false);

  const [isAiOpen, setIsAiOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [canvasDrag, setCanvasDrag] = useState(null);

  const recalculateTimelinePositions = (clipList) => {
    let cursor = 0;
    return clipList.map((c) => {
      const len = (c.trimEnd - c.trimStart) / (c.settings?.speed || 1);
      const updated = { ...c, timelineStart: Number(cursor.toFixed(3)) };
      cursor += len;
      return updated;
    });
  };

  const v1Duration = clips.reduce((acc, c) => acc + (c.trimEnd - c.trimStart) / (c.settings?.speed || 1), 0);
  const maxPipEnd = pipClips.reduce((m, p) => Math.max(m, p.endTime), 0);
  const maxAudioEnd = audioClips.reduce((m, a) => Math.max(m, a.timelineStart + (a.trimEnd - a.trimStart)), 0);
  const totalDuration = Math.max(v1Duration, maxPipEnd, maxAudioEnd, 5);

  const activeClip = (() => {
    if (clips.length === 0) return null;
    for (let i = 0; i < clips.length; i++) {
      const len = (clips[i].trimEnd - clips[i].trimStart) / (clips[i].settings?.speed || 1);
      if (currentTime >= clips[i].timelineStart && currentTime <= clips[i].timelineStart + len + 0.03) return clips[i];
    }
    return clips[clips.length - 1];
  })();

  const selectedClip = (selectedItem?.type === 'video' && clips.find(c => c.id === selectedItem.id)) || activeClip;

  // שמירה להיסטוריה (Undo / Redo)
  const saveHistory = () => {
    const snap = structuredClone({ clips, pipClips, audioClips, texts, chords });
    setHistory(prev => [...prev.slice(-15), snap]);
    setRedoHistory([]);
  };

  const applySnapshot = (snap) => {
    setClips(snap.clips || []);
    setPipClips(snap.pipClips || []);
    setAudioClips(snap.audioClips || []);
    setTexts(snap.texts || []);
    setChords(snap.chords || []);
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setRedoHistory(r => [structuredClone({ clips, pipClips, audioClips, texts, chords }), ...r]);
    setHistory(h => h.slice(0, -1));
    applySnapshot(prev);
  };

  const handleRedo = () => {
    if (redoHistory.length === 0) return;
    const next = redoHistory[0];
    setHistory(h => [...h, structuredClone({ clips, pipClips, audioClips, texts, chords })]);
    setRedoHistory(r => r.slice(1));
    applySnapshot(next);
  };

  // סנכרון מקור הווידאו הראשי כשעוברים בין מספר סרטונים ב-V1
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid || !activeClip || activeClip.isImage) return;
    if (vid.dataset.clipUrl !== activeClip.url) {
      vid.dataset.clipUrl = activeClip.url;
      vid.src = activeClip.url;
      const offset = (currentTime - activeClip.timelineStart) * (activeClip.settings?.speed || 1);
      vid.currentTime = activeClip.trimStart + Math.max(0, offset);
      if (isPlaying) vid.play().catch(() => {});
    }
  }, [activeClip?.id, activeClip?.url]);

  const handleSeek = (targetSec) => {
    const clamped = Math.max(0, Math.min(totalDuration, targetSec));
    setCurrentTime(clamped);
    const tClip = clips.find(c => {
      const len = (c.trimEnd - c.trimStart) / (c.settings?.speed || 1);
      return clamped >= c.timelineStart && clamped <= c.timelineStart + len + 0.02;
    });
    if (tClip && videoRef.current && !tClip.isImage) {
      if (videoRef.current.dataset.clipUrl !== tClip.url) {
        videoRef.current.dataset.clipUrl = tClip.url;
        videoRef.current.src = tClip.url;
      }
      const srcTime = tClip.trimStart + (clamped - tClip.timelineStart) * (tClip.settings?.speed || 1);
      videoRef.current.currentTime = srcTime;
    }
  };

  // לחצן חזרה להתחלה 00:00:00
  const handleResetToZero = () => {
    if (videoRef.current) videoRef.current.pause();
    setIsPlaying(false);
    handleSeek(0);
  };

  const togglePlay = () => {
    const vid = videoRef.current;
    if (!vid || clips.length === 0) return;
    if (isPlaying) {
      vid.pause();
      setIsPlaying(false);
    } else {
      if (currentTime >= totalDuration - 0.05) handleSeek(0);
      vid.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    const vid = videoRef.current;
    if (!vid || !activeClip || !isPlaying) return;
    const spd = activeClip.settings?.speed || 1;
    vid.playbackRate = spd;
    vid.volume = Math.min(1, Math.max(0, (activeClip.settings?.volume ?? 100) / 100));

    const elapsed = (vid.currentTime - activeClip.trimStart) / spd;
    const nowTime = activeClip.timelineStart + Math.max(0, elapsed);
    setCurrentTime(nowTime);

    if (vid.currentTime >= activeClip.trimEnd - 0.04) {
      const idx = clips.findIndex(c => c.id === activeClip.id);
      const nextClip = clips[idx + 1];
      if (nextClip) {
        setCurrentTime(nextClip.timelineStart + 0.01);
      } else {
        vid.pause();
        setIsPlaying(false);
        handleSeek(0);
      }
    }
  };

  // הוספת קבצים מרובים למאגר ולמסילות
  const handleUploadFiles = async (e, defaultTrack) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const newItems = await Promise.all(files.map(async (file) => {
      const url = URL.createObjectURL(file);
      const isVideo = file.type.startsWith('video/');
      const isImage = file.type.startsWith('image/');
      let thumbUrl = isImage ? url : null;
      let duration = 8;
      if (isVideo) {
        const meta = await generateThumbnail(url);
        thumbUrl = meta.thumb;
        duration = Number(meta.duration.toFixed(2));
      }
      return {
        id: 'media-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
        name: file.name,
        type: defaultTrack,
        isVideo,
        isImage,
        duration,
        url,
        thumbUrl
      };
    }));

    setMediaPool(prev => [...prev, ...newItems]);
    newItems.forEach((item) => {
      if (defaultTrack === 'video') handleAddVideoToTimeline(item);
      else if (defaultTrack === 'pip') handleAddPipToTimeline(item);
      else if (defaultTrack === 'audio') handleAddAudioToTimeline(item);
    });
    e.target.value = null;
  };

  const handleAddVideoToTimeline = (mediaItem) => {
    saveHistory();
    const newClip = {
      id: 'clip-' + Date.now() + '-' + Math.random().toString(36).slice(2, 5),
      mediaId: mediaItem.id,
      label: mediaItem.name,
      url: mediaItem.url,
      isImage: mediaItem.isImage,
      trimStart: 0,
      trimEnd: mediaItem.duration || 8,
      timelineStart: 0,
      settings: structuredClone(DEFAULT_CLIP_SETTINGS)
    };
    setClips(prev => {
      const updated = recalculateTimelinePositions([...prev, newClip]);
      return updated;
    });
    setSelectedItem({ type: 'video', id: newClip.id });
  };

  const handleAddPipToTimeline = (mediaItem) => {
    saveHistory();
    const newPip = {
      ...DEFAULT_PIP_SETTINGS,
      id: 'pip-' + Date.now() + '-' + Math.random().toString(36).slice(2, 5),
      name: mediaItem.name,
      url: mediaItem.url,
      isVideo: mediaItem.isVideo,
      startTime: Number(currentTime.toFixed(1)),
      endTime: Number((currentTime + Math.min(8, mediaItem.duration || 8)).toFixed(1))
    };
    setPipClips(prev => [...prev, newPip]);
    setSelectedItem({ type: 'pip', id: newPip.id });
  };

  const handleAddAudioToTimeline = (mediaItem) => {
    saveHistory();
    const newAud = {
      ...DEFAULT_AUDIO_CLIP,
      id: 'aud-' + Date.now() + '-' + Math.random().toString(36).slice(2, 5),
      name: mediaItem.name,
      url: mediaItem.url,
      timelineStart: Number(currentTime.toFixed(1)),
      trimStart: 0,
      trimEnd: mediaItem.duration || 10
    };
    setAudioClips(prev => [...prev, newAud]);
    setSelectedItem({ type: 'audio', id: newAud.id });
  };

  // פיצול, שכפול ומחיקה של האלמנט הנבחר בציר הזמן
  const handleSplitSelected = (splitTime = currentTime, targetOverride = null) => {
    const target = targetOverride || selectedItem || (activeClip ? { type: 'video', id: activeClip.id } : null);
    if (!target) return;
    saveHistory();

    if (target.type === 'video') {
      const clip = clips.find(c => c.id === target.id) || activeClip;
      if (!clip) return;
      const spd = clip.settings?.speed || 1;
      const offset = (splitTime - clip.timelineStart) * spd;
      if (offset <= 0.15 || offset >= (clip.trimEnd - clip.trimStart) - 0.15) return;
      const splitPt = Number((clip.trimStart + offset).toFixed(3));
      const c1 = { ...clip, id: 'clip-' + Date.now() + 'a', trimEnd: splitPt, settings: structuredClone(clip.settings) };
      const c2 = { ...clip, id: 'clip-' + Date.now() + 'b', trimStart: splitPt, settings: structuredClone(clip.settings) };
      const next = [...clips];
      next.splice(clips.findIndex(c => c.id === clip.id), 1, c1, c2);
      setClips(recalculateTimelinePositions(next));
      setSelectedItem({ type: 'video', id: c2.id });
    } else if (target.type === 'pip') {
      const p = pipClips.find(x => x.id === target.id);
      if (!p || splitTime <= p.startTime + 0.2 || splitTime >= p.endTime - 0.2) return;
      const p1 = { ...p, id: 'pip-' + Date.now() + 'a', endTime: Number(splitTime.toFixed(2)) };
      const p2 = { ...p, id: 'pip-' + Date.now() + 'b', startTime: Number(splitTime.toFixed(2)) };
      setPipClips(pipClips.flatMap(x => x.id === p.id ? [p1, p2] : [x]));
    }
  };

  const handleDuplicateSelected = () => {
    const target = selectedItem || (activeClip ? { type: 'video', id: activeClip.id } : null);
    if (!target) return;
    saveHistory();
    if (target.type === 'video') {
      const c = clips.find(x => x.id === target.id);
      if (!c) return;
      const copy = { ...structuredClone(c), id: 'clip-' + Date.now() };
      const idx = clips.findIndex(x => x.id === c.id);
      const next = [...clips];
      next.splice(idx + 1, 0, copy);
      setClips(recalculateTimelinePositions(next));
    } else if (target.type === 'pip') {
      const p = pipClips.find(x => x.id === target.id);
      if (p) setPipClips([...pipClips, { ...structuredClone(p), id: 'pip-' + Date.now(), startTime: p.endTime, endTime: p.endTime + (p.endTime - p.startTime) }]);
    } else if (target.type === 'text') {
      const t = texts.find(x => x.id === target.id);
      if (t) setTexts([...texts, { ...structuredClone(t), id: 'txt-' + Date.now(), startTime: t.endTime, endTime: t.endTime + (t.endTime - t.startTime) }]);
    } else if (target.type === 'chord') {
      const ch = chords.find(x => x.id === target.id);
      if (ch) setChords([...chords, { ...structuredClone(ch), id: 'ch-' + Date.now(), startTime: ch.endTime, endTime: ch.endTime + (ch.endTime - ch.startTime) }]);
    }
  };

  const handleDeleteSelected = () => {
    const target = selectedItem || (activeClip ? { type: 'video', id: activeClip.id } : null);
    if (!target) return;
    saveHistory();
    if (target.type === 'video') {
      const filtered = clips.filter(c => c.id !== target.id);
      const recalc = recalculateTimelinePositions(filtered);
      setClips(recalc);
      setSelectedItem(recalc[0] ? { type: 'video', id: recalc[0].id } : null);
    } else if (target.type === 'pip') {
      setPipClips(pipClips.filter(p => p.id !== target.id));
      setSelectedItem(null);
    } else if (target.type === 'audio') {
      setAudioClips(audioClips.filter(a => a.id !== target.id));
      setSelectedItem(null);
    } else if (target.type === 'text') {
      setTexts(texts.filter(t => t.id !== target.id));
      setSelectedItem(null);
    } else if (target.type === 'chord') {
      setChords(chords.filter(c => c.id !== target.id));
      setSelectedItem(null);
    }
  };

  const handleUpdateClipTiming = (clipId, mode, deltaSec, initTrimStart, initLen) => {
    setClips(prev => {
      const updated = prev.map(c => {
        if (c.id !== clipId) return c;
        if (mode === 'start') {
          const nextTrimStart = Math.max(0, Math.min(c.trimEnd - 0.2, Number((initTrimStart + deltaSec).toFixed(2))));
          return { ...c, trimStart: nextTrimStart };
        }
        if (mode === 'end') {
          const nextLen = Math.max(0.2, Number((initLen + deltaSec).toFixed(2)));
          return { ...c, trimEnd: Number((initTrimStart + nextLen).toFixed(2)) };
        }
        return c;
      });
      return recalculateTimelinePositions(updated);
    });
  };

  // קיצורי מקלדת גלובליים
  handlersRef.current = {
    togglePlay,
    handleResetToZero,
    handleSplitSelected,
    handleDuplicateSelected,
    handleDeleteSelected,
    handleUndo,
    handleRedo,
    stepFrame: (dir) => { if (isPlaying) togglePlay(); handleSeek(currentTime + dir * (1 / 30)); },
    setIsAiOpen,
    setIsShortcutsOpen
  };

  useEffect(() => {
    const onKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      const h = handlersRef.current;
      if (e.code === 'Space') { e.preventDefault(); h.togglePlay(); }
      else if (e.code === 'Home' || e.key === '0') { e.preventDefault(); h.handleResetToZero(); }
      else if (e.code === 'ArrowLeft') { e.preventDefault(); h.stepFrame(1); }
      else if (e.code === 'ArrowRight') { e.preventDefault(); h.stepFrame(-1); }
      else if (e.key.toLowerCase() === 's' || e.key.toLowerCase() === 'b') { e.preventDefault(); h.handleSplitSelected(); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') { e.preventDefault(); h.handleDuplicateSelected(); }
      else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); h.handleDeleteSelected(); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); h.handleUndo(); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); h.handleRedo(); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); h.setIsAiOpen(p => !p); }
      else if (e.key === '?' || e.key === '/') { e.preventDefault(); h.setIsShortcutsOpen(p => !p); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // גרירת אלמנטים על מסך הקנבס
  const onLayerMouseDown = (e, type, mode, id) => {
    e.stopPropagation();
    setSelectedItem({ type, id });
    let init = null;
    if (type === 'pip') init = pipClips.find(p => p.id === id);
    else if (type === 'text') init = texts.find(t => t.id === id);
    else if (type === 'chord') init = chords.find(c => c.id === id);
    if (init) setCanvasDrag({ type, mode, id, startX: e.clientX, startY: e.clientY, init: { ...init } });
  };

  const onViewportMouseMove = (e) => {
    if (!canvasDrag || !viewportRef.current) return;
    if (dragRaf.current) cancelAnimationFrame(dragRaf.current);
    dragRaf.current = requestAnimationFrame(() => {
      const dx = (e.clientX - canvasDrag.startX) / (previewZoom / 100);
      const dy = (e.clientY - canvasDrag.startY) / (previewZoom / 100);
      const nextX = Math.round(canvasDrag.init.x + dx);
      const nextY = Math.round(canvasDrag.init.y + dy);

      if (canvasDrag.type === 'pip') {
        if (canvasDrag.mode === 'drag') setPipClips(prev => prev.map(p => p.id === canvasDrag.id ? { ...p, x: nextX, y: nextY } : p));
        else setPipClips(prev => prev.map(p => p.id === canvasDrag.id ? { ...p, width: Math.max(40, Math.round(canvasDrag.init.width + dx)), height: Math.max(40, Math.round(canvasDrag.init.height + dy)) } : p));
      } else if (canvasDrag.type === 'text') {
        setTexts(prev => prev.map(t => t.id === canvasDrag.id ? { ...t, x: nextX, y: nextY } : t));
      } else if (canvasDrag.type === 'chord') {
        setChords(prev => prev.map(c => c.id === canvasDrag.id ? { ...c, x: nextX, y: nextY } : c));
      }
    });
  };

  const formatTimecode = (sec) => {
    const mins = Math.floor(sec / 60).toString().padStart(2, '0');
    const secs = Math.floor(sec % 60).toString().padStart(2, '0');
    const frames = Math.floor((sec % 1) * 30).toString().padStart(2, '0');
    return `00:${mins}:${secs}:${frames}`;
  };

  const cSettings = activeClip?.settings || DEFAULT_CLIP_SETTINGS;
  const lutFilter = LUT_PRESETS[cSettings.lutPreset]?.filter || '';
  const videoFilter = `brightness(${cSettings.brightness}%) contrast(${cSettings.contrast}%) saturate(${cSettings.saturate}%) hue-rotate(${cSettings.hueRotate}deg) ${cSettings.blur > 0 ? `blur(${cSettings.blur}px)` : ''} ${lutFilter}`;

  const currentProjectData = {
    config: { aspectRatio: aspectKey, format: ASPECT_RATIOS[aspectKey], totalDuration },
    clips, pipClips, audioClips, texts, chords,
    activeClip, mainVideoElement: videoRef.current, currentTime
  };

  return (
    <div style={styles.appShell} onMouseMove={onViewportMouseMove} onMouseUp={() => setCanvasDrag(null)}>
      {/* סרגל עליון מתקדם */}
      <header style={styles.topHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={styles.brandBadge}>GUITAR STUDIO PRO</span>
          <div style={styles.aspectSwitcher}>
            <Monitor size={13} color="#38bdf8" />
            {Object.keys(ASPECT_RATIOS).map((key) => (
              <button key={key} onClick={() => setAspectKey(key)} style={{ ...styles.aspectBtn, backgroundColor: aspectKey === key ? '#2563eb' : 'transparent', color: aspectKey === key ? '#fff' : '#a1a1aa' }}>{key}</button>
            ))}
          </div>

          {/* לחצני פתיחה/סגירה של הפאנלים כדי להגדיל את מסך ה-Preview */}
          <div style={styles.aspectSwitcher}>
            <button style={{ ...styles.panelToggleBtn, color: isPoolOpen ? '#38bdf8' : '#71717a' }} onClick={() => setIsPoolOpen(!isPoolOpen)} title="הצג/הסתר מאגר מדיה">
              <PanelRight size={14} /> מדיה
            </button>
            <button style={{ ...styles.panelToggleBtn, color: isInspectorOpen ? '#38bdf8' : '#71717a' }} onClick={() => setIsInspectorOpen(!isInspectorOpen)} title="הצג/הסתר פאנל עריכה (Inspector)">
              <PanelLeft size={14} /> עריכה
            </button>
            <button style={{ ...styles.panelToggleBtn, color: isTimelineOpen ? '#38bdf8' : '#71717a' }} onClick={() => setIsTimelineOpen(!isTimelineOpen)} title="הצג/הסתר ציר זמן תחתון">
              <PanelBottom size={14} /> ציר זמן
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button style={styles.secondaryBtn} onClick={() => setIsShortcutsOpen(true)} title="קיצורי מקלדת (?)">
            <Keyboard size={14} color="#38bdf8" /> קיצורי דרך
          </button>
          <button style={styles.exportBtn} onClick={() => setIsExportModalOpen(true)} disabled={clips.length === 0 && pipClips.length === 0}>
            <DownloadCloud size={15} /> ייצוא והורדת סרטון
          </button>
          <button style={styles.aiBtn} onClick={() => setIsAiOpen(true)}>
            <Bot size={14} /> AI
          </button>
        </div>
      </header>

      {/* אזור העבודה המרכזי - מתרחב אוטומטית כשפאנלים נסגרים */}
      <div style={styles.workspaceGrid}>
        <WindowContainer
          title="מאגר מדיה, תמלול ואקורדים"
          icon={<Columns size={13} color="#38bdf8" />}
          isOpen={isPoolOpen}
          onClose={() => setIsPoolOpen(false)}
          isDetached={isPoolDetached}
          onToggleDetach={() => setIsPoolDetached(!isPoolDetached)}
          defaultPos={{ x: window.innerWidth - 340, y: 60 }}
          defaultSize={{ width: 290, height: 520 }}
          dockStyle={{ width: 280, borderLeft: '1px solid #27272a', flexShrink: 0 }}
        >
          <MediaPoolPanel
            mediaPool={mediaPool}
            onUploadFiles={handleUploadFiles}
            onDeleteMedia={(e, id, url) => { e.stopPropagation(); setMediaPool(p => p.filter(m => m.id !== id)); URL.revokeObjectURL(url); }}
            onAddVideoToTimeline={handleAddVideoToTimeline}
            onAddPipToTimeline={handleAddPipToTimeline}
            onAddAudioToTimeline={handleAddAudioToTimeline}
            transcript={transcript}
            onUpdateTranscript={setTranscript}
            onConvertTranscriptToText={(line) => {
              const nt = { ...DEFAULT_TEXT_OBJECT, id: 'txt-' + Date.now(), content: line.text, startTime: line.startTime, endTime: line.endTime };
              setTexts(prev => [...prev, nt]);
              setSelectedItem({ type: 'text', id: nt.id });
            }}
            onRippleCutRange={(start, end) => {
              handleSplitSelected(start);
              setTimeout(() => handleSplitSelected(end), 30);
            }}
            onAddChord={(ch) => { setChords(prev => [...prev, ch]); setSelectedItem({ type: 'chord', id: ch.id }); }}
            currentTime={currentTime}
            onSeek={handleSeek}
          />
        </WindowContainer>

        {/* מוניטור ה-Preview המרכזי */}
        <main style={styles.monitorPanel}>
          <div style={styles.panelTitleBar}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span>תצוגה מקדימה</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, backgroundColor: '#18181b', padding: '2px 8px', borderRadius: 4 }}>
                <ZoomOut size={12} style={{ cursor: 'pointer' }} onClick={() => setPreviewZoom(Math.max(40, previewZoom - 15))} />
                <span style={{ fontSize: 10, color: '#38bdf8' }}>{previewZoom}%</span>
                <ZoomIn size={12} style={{ cursor: 'pointer' }} onClick={() => setPreviewZoom(Math.min(300, previewZoom + 15))} />
                <button onClick={() => setPreviewZoom(100)} style={{ background: 'none', border: 'none', color: '#a1a1aa', fontSize: 10, cursor: 'pointer' }}>100%</button>
              </div>
              <button onClick={() => setShowSafeZones(!showSafeZones)} style={{ background: showSafeZones ? '#2563eb' : 'transparent', border: 'none', color: '#fff', padding: 4, borderRadius: 4, cursor: 'pointer' }} title="רשת עזר (Safe Zones)">
                <Grid3x3 size={13} />
              </button>
            </div>
            <span style={{ fontFamily: 'monospace', color: '#38bdf8', fontSize: 13, direction: 'ltr' }}>
              {formatTimecode(currentTime)} / {formatTimecode(totalDuration)}
            </span>
          </div>

          <div style={styles.monitorOuterStage}>
            <div
              ref={viewportRef}
              style={{
                ...styles.aspectCanvasBox,
                aspectRatio: `${ASPECT_RATIOS[aspectKey].width} / ${ASPECT_RATIOS[aspectKey].height}`,
                transform: `scale(${previewZoom / 100})`
              }}
            >
              {activeClip ? (
                activeClip.isImage ? (
                  <img
                    src={activeClip.url}
                    alt=""
                    style={{
                      position: 'absolute', inset: 0, width: '100%', height: '100%',
                      objectFit: cSettings.fitMode === 'cover' ? 'cover' : 'contain',
                      filter: videoFilter,
                      opacity: cSettings.opacity / 100
                    }}
                  />
                ) : (
                  <video
                    ref={videoRef}
                    onTimeUpdate={handleTimeUpdate}
                    playsInline
                    style={{
                      position: 'absolute', inset: 0, width: '100%', height: '100%',
                      objectFit: cSettings.fitMode === 'cover' ? 'cover' : 'contain',
                      filter: videoFilter,
                      opacity: cSettings.opacity / 100,
                      clipPath: `inset(${cSettings.cropTop}% ${cSettings.cropRight}% ${cSettings.cropBottom}% ${cSettings.cropLeft}%)`,
                      transform: `translate(${cSettings.posX}px, ${cSettings.posY}px) rotate(${cSettings.rotation}deg) scale(${(cSettings.mirrorH ? -1 : 1) * (cSettings.scale / 100)}, ${(cSettings.mirrorV ? -1 : 1) * (cSettings.scale / 100)})`
                    }}
                  />
                )
              ) : (
                <video ref={videoRef} hidden />
              )}

              {clips.length === 0 && pipClips.length === 0 && (
                <span style={{ color: '#52525b', fontSize: 13 }}>העלה סרטונים או תמונות ממאגר המדיה כדי להתחיל</span>
              )}

              {showSafeZones && (
                <div style={{ position: 'absolute', inset: '8%', border: '1px dashed rgba(56,189,248,0.45)', pointerEvents: 'none', zIndex: 40 }} />
              )}

              {/* שכבות תמונה ו-PiP מרובות */}
              {pipClips.map((pip) => {
                if (currentTime < pip.startTime || currentTime > pip.endTime) return null;
                const isSel = selectedItem?.type === 'pip' && selectedItem?.id === pip.id;
                return (
                  <div
                    key={pip.id}
                    onMouseDown={(e) => onLayerMouseDown(e, 'pip', 'drag', pip.id)}
                    style={{
                      position: 'absolute', left: pip.x, top: pip.y, width: pip.width, height: pip.height,
                      opacity: (pip.opacity ?? 100) / 100,
                      transform: `rotate(${pip.rotation || 0}deg)`,
                      borderRadius: pip.borderRadius || 0,
                      border: isSel ? '2px solid #38bdf8' : `${pip.borderWidth || 0}px solid ${pip.borderColor || '#a855f7'}`,
                      overflow: 'hidden', cursor: 'grab', zIndex: 20
                    }}
                  >
                    {pip.isVideo ? (
                      <video src={pip.url} muted autoPlay loop style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }} />
                    ) : (
                      <img src={pip.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }} />
                    )}
                    <div onMouseDown={(e) => onLayerMouseDown(e, 'pip', 'resize', pip.id)} style={styles.resizeHandle} />
                  </div>
                );
              })}

              {/* שכבות אקורדים */}
              {chords.map((c) => {
                if (currentTime < c.startTime || currentTime > c.endTime) return null;
                return (
                  <div
                    key={c.id}
                    onMouseDown={(e) => onLayerMouseDown(e, 'chord', 'drag', c.id)}
                    style={{ position: 'absolute', left: c.x, top: c.y, transform: `scale(${(c.scale || 100) / 100})`, transformOrigin: 'top left', cursor: 'grab', zIndex: 26 }}
                  >
                    <ChordDiagram chord={c} size={105} />
                  </div>
                );
              })}

              {/* שכבות כתוביות */}
              {texts.map((txt) => {
                if (currentTime < txt.startTime || currentTime > txt.endTime) return null;
                const isSel = selectedItem?.type === 'text' && selectedItem?.id === txt.id;
                return (
                  <div
                    key={txt.id}
                    onMouseDown={(e) => onLayerMouseDown(e, 'text', 'drag', txt.id)}
                    style={{
                      position: 'absolute', left: txt.x, top: txt.y, fontSize: txt.fontSize,
                      color: txt.color, backgroundColor: txt.bgColor, fontWeight: txt.bold ? 700 : 400,
                      padding: '6px 12px', borderRadius: 6, cursor: 'grab', zIndex: 30,
                      border: isSel ? '2px solid #38bdf8' : '1px dashed rgba(255,255,255,0.3)'
                    }}
                  >
                    {txt.content}
                  </div>
                );
              })}
            </div>
          </div>

          {/* סרגל ניגון כולל לחצן חזרה להתחלה 00:00:00 */}
          <div style={styles.transportBar}>
            <button style={styles.transportBtn} onClick={handleResetToZero} title="חזור להתחלה 00:00:00 (Home)">
              <SkipBack size={15} color="#38bdf8" />
            </button>
            <button style={styles.transportBtn} onClick={() => handlersRef.current.stepFrame(-1)} title="פריים אחורה">
              <ChevronRight size={16} />
            </button>
            <button style={{ ...styles.transportBtn, backgroundColor: '#2563eb', width: 38 }} onClick={togglePlay} title="נגן / השהה (Space)">
              {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <button style={styles.transportBtn} onClick={() => handlersRef.current.stepFrame(1)} title="פריים קדימה">
              <ChevronLeft size={16} />
            </button>
          </div>
        </main>

        {/* פאנל ה-Inspector הניתן לסגירה או לפיצול לחלון צף */}
        <WindowContainer
          title="הגדרות אלמנט נבחר (Inspector)"
          icon={<Sliders size={13} color="#38bdf8" />}
          isOpen={isInspectorOpen}
          onClose={() => setIsInspectorOpen(false)}
          isDetached={isInspectorDetached}
          onToggleDetach={() => setIsInspectorDetached(!isInspectorDetached)}
          defaultPos={{ x: 40, y: 60 }}
          defaultSize={{ width: 320, height: 520 }}
          dockStyle={{ width: 310, borderRight: '1px solid #27272a', flexShrink: 0 }}
        >
          <InspectorPanel
            selectedItem={selectedItem}
            selectedClip={selectedClip}
            allClips={clips}
            onUpdateClip={(id, newSet) => setClips(clips.map(c => c.id === id ? { ...c, settings: newSet } : c))}
            onUpdateClipsBulk={(newClips) => { saveHistory(); setClips(newClips); }}
            onDeleteSelected={handleDeleteSelected}
            onDuplicateSelected={handleDuplicateSelected}
            pipClips={pipClips}
            onUpdatePipClip={(id, patch) => setPipClips(pipClips.map(p => p.id === id ? { ...p, ...patch } : p))}
            audioClips={audioClips}
            onUpdateAudioClip={(id, patch) => setAudioClips(audioClips.map(a => a.id === id ? { ...a, ...patch } : a))}
            texts={texts}
            onUpdateTexts={setTexts}
            chords={chords}
            onUpdateChords={setChords}
            currentTime={currentTime}
          />
        </WindowContainer>
      </div>

      {/* ציר הזמן התחתון - ניתן לסגירה או לפיצול לחלון צף */}
      <WindowContainer
        title="ציר זמן מרובה ערוצים (Multi-Track Timeline)"
        icon={<Film size={13} color="#38bdf8" />}
        isOpen={isTimelineOpen}
        onClose={() => setIsTimelineOpen(false)}
        isDetached={isTimelineDetached}
        onToggleDetach={() => setIsTimelineDetached(!isTimelineDetached)}
        defaultPos={{ x: 60, y: window.innerHeight - 310 }}
        defaultSize={{ width: window.innerWidth - 120, height: 280 }}
        dockStyle={{ height: 270, flexShrink: 0 }}
      >
        <TimelinePanel
          duration={totalDuration}
          currentTime={currentTime}
          onSeek={handleSeek}
          clips={clips}
          pipClips={pipClips}
          audioClips={audioClips}
          texts={texts}
          chords={chords}
          selectedItem={selectedItem}
          onSelectItem={setSelectedItem}
          onUpdateClipTiming={handleUpdateClipTiming}
          onUpdatePipClip={(id, patch) => setPipClips(pipClips.map(p => p.id === id ? { ...p, ...patch } : p))}
          onUpdateAudioClip={(id, patch) => setAudioClips(audioClips.map(a => a.id === id ? { ...a, ...patch } : a))}
          onUpdateTexts={setTexts}
          onUpdateChords={setChords}
          onSplitSelected={handleSplitSelected}
          onDuplicateSelected={handleDuplicateSelected}
          onDeleteSelected={handleDeleteSelected}
          onAddQuickText={() => {
            const nt = { ...DEFAULT_TEXT_OBJECT, id: 'txt-' + Date.now(), startTime: Number(currentTime.toFixed(1)), endTime: Number((currentTime + 4).toFixed(1)) };
            setTexts(prev => [...prev, nt]);
            setSelectedItem({ type: 'text', id: nt.id });
          }}
          onUndo={handleUndo}
          onRedo={handleRedo}
          canUndo={history.length > 0}
          canRedo={redoHistory.length > 0}
        />
      </WindowContainer>

      <ShortcutsModal isOpen={isShortcutsOpen} onClose={() => setIsShortcutsOpen(false)} />
      <AiCopilotPanel isOpen={isAiOpen} onClose={() => setIsAiOpen(false)} currentTime={currentTime} selectedClip={selectedClip} hasPip={pipClips.length > 0} />
      <ExportModal isOpen={isExportModalOpen} onClose={() => setIsExportModalOpen(false)} projectData={currentProjectData} />
    </div>
  );
}

const styles = {
  appShell: { display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', backgroundColor: '#18181b', color: '#e4e4e7', fontFamily: 'system-ui, sans-serif', overflow: 'hidden', userSelect: 'none', direction: 'rtl' },
  topHeader: { height: 44, backgroundColor: '#121214', borderBottom: '1px solid #27272a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 14px', flexShrink: 0 },
  brandBadge: { backgroundColor: '#2563eb', color: '#fff', fontSize: 11, fontWeight: 700, padding: '4px 8px', borderRadius: 4 },
  aspectSwitcher: { display: 'flex', alignItems: 'center', gap: 4, backgroundColor: '#1c1c1f', padding: '3px 6px', borderRadius: 6, border: '1px solid #27272a' },
  aspectBtn: { border: 'none', padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: 'pointer' },
  panelToggleBtn: { background: 'none', border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, padding: '3px 6px' },
  secondaryBtn: { display: 'flex', alignItems: 'center', gap: 5, backgroundColor: '#27272a', border: '1px solid #3f3f46', color: '#fff', padding: '6px 10px', borderRadius: 6, fontSize: 12, cursor: 'pointer' },
  exportBtn: { display: 'flex', alignItems: 'center', gap: 6, backgroundColor: '#2563eb', border: '1px solid #1d4ed8', color: '#fff', padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' },
  aiBtn: { display: 'flex', alignItems: 'center', gap: 5, backgroundColor: '#8b5cf6', border: 'none', color: '#fff', padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  workspaceGrid: { display: 'flex', flex: 1, minHeight: 0, borderBottom: '1px solid #27272a', overflow: 'hidden' },
  monitorPanel: { flex: 1, backgroundColor: '#09090b', display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0, overflow: 'hidden' },
  panelTitleBar: { height: 32, backgroundColor: '#141416', borderBottom: '1px solid #27272a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px', fontSize: 12, fontWeight: 600, color: '#a1a1aa', flexShrink: 0 },
  monitorOuterStage: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 14, minHeight: 0, overflow: 'hidden' },
  aspectCanvasBox: { height: '100%', maxWidth: '100%', backgroundColor: '#000', border: '1px solid #3f3f46', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 12px 35px rgba(0,0,0,0.85)' },
  resizeHandle: { position: 'absolute', right: 0, bottom: 0, width: 12, height: 12, backgroundColor: '#38bdf8', cursor: 'nwse-resize' },
  transportBar: { height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, borderTop: '1px solid #27272a', backgroundColor: '#141416', flexShrink: 0 },
  transportBtn: { backgroundColor: '#27272a', border: '1px solid #3f3f46', color: '#fff', width: 32, height: 30, borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }
};
