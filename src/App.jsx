import React, { useState, useRef, useEffect } from 'react';
import {
  Play, Pause, FlipHorizontal, Download, Video, Image as ImageIcon,
  Music, ChevronLeft, ChevronRight, Loader2, Monitor
} from 'lucide-react';
import {
  ASPECT_RATIOS,
  DEFAULT_CLIP_SETTINGS,
  DEFAULT_PIP_SETTINGS,
  DEFAULT_TEXT_SETTINGS,
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

  // פורמט מסך (16:9, 9:16, 1:1)
  const [aspectKey, setAspectKey] = useState('16:9');

  // מקטעים והיסטוריה (Undo)
  const [clips, setClips] = useState([]);
  const [history, setHistory] = useState([]);
  const [selectedClipId, setSelectedClipId] = useState(null);

  // שכבות PiP וטקסט
  const [pipSettings, setPipSettings] = useState({ ...DEFAULT_PIP_SETTINGS });
  const [textSettings, setTextSettings] = useState({ ...DEFAULT_TEXT_SETTINGS });

  // נגן וזמן
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  // גרירה/שינוי גודל על המסך: { target: 'pip'|'text', mode: 'drag'|'resize', startX, startY, init }
  const [canvasDrag, setCanvasDrag] = useState(null);

  // ייצוא
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

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

  // קיצורי מקלדת מקצועיים
  useEffect(() => {
    const onKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        stepFrame(1);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        stepFrame(-1);
      } else if (e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSplitClip();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedClip && clips.length > 1) {
          e.preventDefault();
          handleDeleteClip(selectedClip.id);
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleUndo();
      }
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
    setPipSettings((prev) => ({
      ...prev,
      startTime: 0,
      endTime: Math.min(10, totalDuration || 10)
    }));
  };

  const handleVideoMetadata = () => {
    if (!videoRef.current || !mainVideoFile) return;
    const dur = videoRef.current.duration || 10;
    const firstClip = {
      id: 'clip-' + Date.now(),
      label: mainVideoFile.name,
      trimStart: 0,
      trimEnd: Number(dur.toFixed(3)),
      timelineStart: 0,
      settings: { ...DEFAULT_CLIP_SETTINGS }
    };
    setClips([firstClip]);
    setSelectedClipId(firstClip.id);
    setPipSettings((prev) => ({ ...prev, endTime: Number(Math.min(10, dur).toFixed(1)) }));
    setTextSettings((prev) => ({ ...prev, endTime: Number(Math.min(8, dur).toFixed(1)) }));
  };

  const handleSplitClip = () => {
    if (!activeClip) return;
    const offset = currentTime - activeClip.timelineStart;
    const len = activeClip.trimEnd - activeClip.trimStart;
    if (offset <= 0.1 || offset >= len - 0.1) return;

    saveHistory(clips);
    const splitPoint = Number((activeClip.trimStart + offset).toFixed(3));

    const firstHalf = {
      ...activeClip,
      id: 'clip-' + Math.random().toString(36).substring(2, 7),
      trimEnd: splitPoint,
      settings: { ...activeClip.settings }
    };
    const secondHalf = {
      ...activeClip,
      id: 'clip-' + Math.random().toString(36).substring(2, 7),
      trimStart: splitPoint,
      settings: { ...activeClip.settings }
    };

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
    if (videoRef.current && recalculated[0]) {
      videoRef.current.currentTime = recalculated[0].trimStart;
    }
  };

  const handleUpdateClip = (clipId, newSettings) => {
    setClips((prev) =>
      prev.map((c) => (c.id === clipId ? { ...c, settings: newSettings } : c))
    );
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

  // חישוב שקיפות כולל Fade In / Fade Out של המקטע
  const computeEffectiveOpacity = (clip, timelinePos) => {
    if (!clip) return 1;
    const s = clip.settings;
    let alpha = s.opacity / 100;
    const localTime = timelinePos - clip.timelineStart;
    const clipLen = clip.trimEnd - clip.trimStart;

    if (s.fadeIn > 0 && localTime < s.fadeIn) {
      alpha *= Math.max(0, localTime / s.fadeIn);
    }
    if (s.fadeOut > 0 && localTime > clipLen - s.fadeOut) {
      alpha *= Math.max(0, (clipLen - localTime) / s.fadeOut);
    }
    return alpha;
  };

  const buildCssFilterString = (s) => {
    if (!s) return 'none';
    const lutFilter = LUT_PRESETS[s.lutPreset]?.filter || '';
    const tempSepia = s.temperature > 0 ? `sepia(${s.temperature / 200})` : '';
    const tempCool = s.temperature < 0 ? `hue-rotate(${s.temperature * 0.4}deg)` : '';
    const shadowContrast = s.shadows !== 0 || s.highlights !== 0
      ? `contrast(${100 + (s.highlights - s.shadows) * 0.3}%)`
      : '';

    return [
      `brightness(${s.brightness}%)`,
      `contrast(${s.contrast}%)`,
      `saturate(${s.saturate}%)`,
      `hue-rotate(${s.hueRotate}deg)`,
      s.blur > 0 ? `blur(${s.blur}px)` : '',
      tempSepia,
      tempCool,
      shadowContrast,
      lutFilter
    ].filter(Boolean).join(' ');
  };

  // גרירת שכבות PiP וטקסט על המוניטור
  const onLayerMouseDown = (e, target, mode) => {
    e.stopPropagation();
    setCanvasDrag({
      target,
      mode,
      startX: e.clientX,
      startY: e.clientY,
      init: target === 'pip' ? { ...pipSettings } : { ...textSettings }
    });
  };

  const onViewportMouseMove = (e) => {
    if (!canvasDrag || !viewportRef.current) return;
    const dx = e.clientX - canvasDrag.startX;
    const dy = e.clientY - canvasDrag.startY;
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
    } else if (canvasDrag.target === 'text') {
      const nextX = Math.max(0, Math.min(bounds.width - 80, canvasDrag.init.x + dx));
      const nextY = Math.max(0, Math.min(bounds.height - 40, canvasDrag.init.y + dy));
      setTextSettings((prev) => ({ ...prev, x: Math.round(nextX), y: Math.round(nextY) }));
    }
  };

  const onViewportMouseUp = () => {
    if (canvasDrag) setCanvasDrag(null);
  };

  // ייצוא והורדה ישירה למחשב בהתאם ליחס המסך שנבחר
  const handleExportAndDownload = async () => {
    if (!videoRef.current || clips.length === 0 || isExporting) return;

    setIsExporting(true);
    setExportProgress(0);
    setIsPlaying(false);
    videoRef.current.pause();

    const vid = videoRef.current;
    const targetFormat = ASPECT_RATIOS[aspectKey];
    const canvas = document.createElement('canvas');
    canvas.width = targetFormat.width;
    canvas.height = targetFormat.height;
    const ctx = canvas.getContext('2d');

    const canvasStream = canvas.captureStream(30);
    try {
      const vidStream = vid.captureStream ? vid.captureStream() : vid.mozCaptureStream();
      const audioTracks = vidStream.getAudioTracks();
      if (audioTracks.length > 0) canvasStream.addTrack(audioTracks[0]);
    } catch (_) {}

    const chunks = [];
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
      ? 'video/webm;codecs=vp9,opus'
      : 'video/webm';

    const recorder = new MediaRecorder(canvasStream, { mimeType, videoBitsPerSecond: 6000000 });
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `guitar-studio-${aspectKey.replace(':', 'x')}-${Date.now()}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setIsExporting(false);
      setExportProgress(100);
      handleSeek(0);
    };

    recorder.start();

    for (let i = 0; i < clips.length; i++) {
      const clip = clips[i];
      const s = clip.settings;
      vid.currentTime = clip.trimStart;
      vid.playbackRate = s.speed;
      vid.volume = Math.min(1, s.volume / 100);

      await new Promise((res) => { vid.onseeked = () => res(); });
      await vid.play();

      await new Promise((res) => {
        const renderLoop = () => {
          if (vid.currentTime >= clip.trimEnd - 0.03 || vid.paused || vid.ended) {
            vid.pause();
            res();
            return;
          }

          const timelinePos = clip.timelineStart + (vid.currentTime - clip.trimStart);
          setExportProgress(Math.min(99, Math.round((timelinePos / totalDuration) * 100)));

          ctx.save();
          ctx.fillStyle = '#000';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          const vw = vid.videoWidth || 1280;
          const vh = vid.videoHeight || 720;

          // אם נבחר רקע מטושטש חכם (Blur Background)
          if (s.fitMode === 'blurBg') {
            ctx.save();
            ctx.filter = 'blur(24px) brightness(0.55)';
            const bgScale = Math.max(canvas.width / vw, canvas.height / vh);
            const bw = vw * bgScale;
            const bh = vh * bgScale;
            ctx.drawImage(vid, (canvas.width - bw) / 2, (canvas.height - bh) / 2, bw, bh);
            ctx.restore();
          }

          // חישוב התאמה למסך (Contain מול Fill)
          const fitScale = s.fitMode === 'cover'
            ? Math.max(canvas.width / vw, canvas.height / vh)
            : Math.min(canvas.width / vw, canvas.height / vh);

          const drawW = vw * fitScale;
          const drawH = vh * fitScale;

          ctx.filter = buildCssFilterString(s);
          ctx.globalAlpha = computeEffectiveOpacity(clip, timelinePos);
          ctx.translate(canvas.width / 2 + s.posX, canvas.height / 2 + s.posY);
          ctx.rotate((s.rotation * Math.PI) / 180);
          ctx.scale(
            (s.mirrorH ? -1 : 1) * (s.scale / 100),
            (s.mirrorV ? -1 : 1) * (s.scale / 100)
          );

          const sx = (s.cropLeft / 100) * vw;
          const sy = (s.cropTop / 100) * vh;
          const sw = vw * (1 - (s.cropLeft + s.cropRight) / 100);
          const sh = vh * (1 - (s.cropTop + s.cropBottom) / 100);

          ctx.drawImage(
            vid,
            sx, sy, Math.max(1, sw), Math.max(1, sh),
            -drawW / 2, -drawH / 2, drawW, drawH
          );
          ctx.restore();

          const vpW = viewportRef.current?.clientWidth || canvas.width;
          const ratio = canvas.width / vpW;

          // ציור שכבת PiP
          if (pipFile && pipMediaRef.current && timelinePos >= pipSettings.startTime && timelinePos <= pipSettings.endTime) {
            const pEl = pipMediaRef.current;
            const px = pipSettings.x * ratio;
            const py = pipSettings.y * ratio;
            const pw = pipSettings.width * ratio;
            const ph = pipSettings.height * ratio;

            ctx.save();
            ctx.globalAlpha = pipSettings.opacity / 100;
            ctx.translate(px + pw / 2, py + ph / 2);
            ctx.rotate((pipSettings.rotation * Math.PI) / 180);
            ctx.drawImage(pEl, -pw / 2, -ph / 2, pw, ph);
            ctx.restore();
          }

          // ציור שכבת טקסט / כותרת
          if (textSettings.enabled && timelinePos >= textSettings.startTime && timelinePos <= textSettings.endTime) {
            const tx = textSettings.x * ratio;
            const ty = textSettings.y * ratio;
            const fSize = Math.round(textSettings.fontSize * ratio);
            ctx.save();
            ctx.font = `${textSettings.bold ? 'bold ' : ''}${fSize}px system-ui, sans-serif`;
            const metrics = ctx.measureText(textSettings.content);
            ctx.fillStyle = textSettings.bgColor;
            ctx.fillRect(tx - 10, ty - fSize, metrics.width + 20, fSize + 14);
            ctx.fillStyle = textSettings.color;
            ctx.fillText(textSettings.content, tx, ty);
            ctx.restore();
          }

          requestAnimationFrame(renderLoop);
        };
        requestAnimationFrame(renderLoop);
      });
    }

    recorder.stop();
  };

  const formatTimecode = (sec) => {
    const mins = Math.floor(sec / 60).toString().padStart(2, '0');
    const secs = Math.floor(sec % 60).toString().padStart(2, '0');
    const frames = Math.floor((sec % 1) * 30).toString().padStart(2, '0');
    return `00:${mins}:${secs}:${frames}`;
  };

  const curSettings = activeClip?.settings || DEFAULT_CLIP_SETTINGS;
  const isPipVisibleNow = pipFile && currentTime >= pipSettings.startTime && currentTime <= pipSettings.endTime;
  const isTextVisibleNow = textSettings.enabled && currentTime >= textSettings.startTime && currentTime <= textSettings.endTime;

  return (
    <div style={styles.appShell} onMouseMove={onViewportMouseMove} onMouseUp={onViewportMouseUp}>
      {/* סרגל עליון */}
      <header style={styles.topHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={styles.brandBadge}>GUITAR STUDIO PRO</span>

          {/* בורר פורמט מסך: 16:9 רוחב / 9:16 אורך / 1:1 ריבוע */}
          <div style={styles.aspectSwitcher}>
            <Monitor size={13} color="#38bdf8" />
            {Object.keys(ASPECT_RATIOS).map((key) => (
              <button
                key={key}
                onClick={() => setAspectKey(key)}
                style={{
                  ...styles.aspectBtn,
                  backgroundColor: aspectKey === key ? '#2563eb' : 'transparent',
                  color: aspectKey === key ? '#fff' : '#a1a1aa'
                }}
              >
                {key}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {activeClip && (
            <button
              style={{
                ...styles.headerBtn,
                backgroundColor: curSettings.mirrorH ? '#1d4ed8' : '#27272a'
              }}
              onClick={() =>
                handleUpdateClip(activeClip.id, { ...curSettings, mirrorH: !curSettings.mirrorH })
              }
            >
              <FlipHorizontal size={15} />
              <span>מראה: {curSettings.mirrorH ? 'פעיל' : 'כבוי'}</span>
            </button>
          )}

          <button
            style={{
              ...styles.exportBtn,
              backgroundColor: isExporting ? '#059669' : '#2563eb'
            }}
            onClick={handleExportAndDownload}
            disabled={isExporting || clips.length === 0}
          >
            {isExporting ? <Loader2 size={15} /> : <Download size={15} />}
            <span>
              {isExporting ? `מייצא... ${exportProgress}%` : 'ייצא והורד'}
            </span>
          </button>
        </div>
      </header>

      {/* אזור עבודה מרכזי */}
      <div style={styles.workspaceGrid}>
        {/* 1. מאגר מדיה */}
        <aside style={styles.mediaPoolPanel}>
          <div style={styles.panelTitleBar}>
            <span>Media Pool</span>
            <span style={{ fontSize: 11, color: '#71717a' }}>{mediaPool.length}</span>
          </div>

          <div style={styles.uploadRow}>
            <label style={styles.miniUploadBtn}>
              <Video size={14} color="#3b82f6" />
              <span>+ וידאו</span>
              <input type="file" accept="video/*" onChange={(e) => handleFileUpload(e, 'video')} hidden />
            </label>
            <label style={styles.miniUploadBtn}>
              <ImageIcon size={14} color="#a855f7" />
              <span>+ PiP</span>
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
              <div style={styles.emptyPoolMsg}>העלה וידאו, תמונת אקורדים או סאונד</div>
            )}
            {mediaPool.map((item) => (
              <div
                key={item.id}
                style={styles.mediaCard}
                onClick={() => {
                  if (item.type === 'video') selectMainVideo(item);
                  if (item.type === 'pip') selectPipMedia(item);
                  if (item.type === 'audio') setExtAudioFile(item);
                }}
              >
                <div style={styles.thumbBox}>
                  {item.type === 'video' && <video src={item.url} style={styles.thumbMedia} />}
                  {item.type === 'pip' &&
                    (item.isVideo ? (
                      <video src={item.url} style={styles.thumbMedia} />
                    ) : (
                      <img src={item.url} alt="" style={styles.thumbMedia} />
                    ))}
                  {item.type === 'audio' && <Music size={24} color="#10b981" />}
                </div>
                <div style={styles.thumbLabel}>{item.name}</div>
              </div>
            ))}
          </div>
        </aside>

        {/* 2. מוניטור תצוגה מקדימה מותאם ליחס המסך (16:9 / 9:16 / 1:1) */}
        <main style={styles.monitorPanel}>
          <div style={styles.panelTitleBar}>
            <span>Preview ({ASPECT_RATIOS[aspectKey].label})</span>
            <span style={{ fontFamily: 'monospace', color: '#38bdf8', direction: 'ltr' }}>
              {formatTimecode(currentTime)} / {formatTimecode(totalDuration)}
            </span>
          </div>

          <div style={styles.monitorOuterStage}>
            <div
              ref={viewportRef}
              style={{
                ...styles.aspectCanvasBox,
                aspectRatio: `${ASPECT_RATIOS[aspectKey].width} / ${ASPECT_RATIOS[aspectKey].height}`
              }}
            >
              {/* שכבת רקע מטושטש חכם (Blur Background) */}
              {mainVideoFile && curSettings.fitMode === 'blurBg' && (
                <video
                  ref={bgVideoRef}
                  src={mainVideoFile.url}
                  muted
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    filter: 'blur(22px) brightness(0.55)',
                    transform: 'scale(1.1)'
                  }}
                />
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
                    transform: `translate(${curSettings.posX}px, ${curSettings.posY}px) rotate(${curSettings.rotation}deg) scale(${
                      (curSettings.mirrorH ? -1 : 1) * (curSettings.scale / 100)
                    }, ${(curSettings.mirrorV ? -1 : 1) * (curSettings.scale / 100)})`
                  }}
                />
              ) : (
                <span style={{ color: '#52525b', fontSize: 13, zIndex: 2 }}>
                  בחר סרטון להתחלה
                </span>
              )}

              {curSettings.vignette > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    pointerEvents: 'none',
                    boxShadow: `inset 0 0 ${curSettings.vignette * 1.8}px rgba(0,0,0,${curSettings.vignette / 100})`
                  }}
                />
              )}

              {/* שכבת חלון PiP */}
              {isPipVisibleNow && (
                <div
                  onMouseDown={(e) => onLayerMouseDown(e, 'pip', 'drag')}
                  style={{
                    position: 'absolute',
                    left: pipSettings.x,
                    top: pipSettings.y,
                    width: pipSettings.width,
                    height: pipSettings.height,
                    opacity: pipSettings.opacity / 100,
                    transform: `rotate(${pipSettings.rotation}deg)`,
                    borderRadius: pipSettings.borderRadius,
                    border: `${pipSettings.borderWidth}px solid ${pipSettings.borderColor}`,
                    overflow: 'hidden',
                    cursor: 'grab',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.75)',
                    zIndex: 20
                  }}
                >
                  {pipFile.isVideo ? (
                    <video
                      ref={pipMediaRef}
                      src={pipFile.url}
                      autoPlay
                      loop
                      muted
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        clipPath: `inset(${pipSettings.cropTop}% ${pipSettings.cropRight}% ${pipSettings.cropBottom}% ${pipSettings.cropLeft}%)`,
                        pointerEvents: 'none'
                      }}
                    />
                  ) : (
                    <img
                      ref={pipMediaRef}
                      src={pipFile.url}
                      alt="PiP"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'fill',
                        clipPath: `inset(${pipSettings.cropTop}% ${pipSettings.cropRight}% ${pipSettings.cropBottom}% ${pipSettings.cropLeft}%)`,
                        pointerEvents: 'none'
                      }}
                    />
                  )}
                  <div
                    onMouseDown={(e) => onLayerMouseDown(e, 'pip', 'resize')}
                    style={styles.resizeCornerHandle}
                  />
                </div>
              )}

              {/* שכבת כותרת טקסט נגררת */}
              {isTextVisibleNow && (
                <div
                  onMouseDown={(e) => onLayerMouseDown(e, 'text', 'drag')}
                  style={{
                    position: 'absolute',
                    left: textSettings.x,
                    top: textSettings.y,
                    fontSize: textSettings.fontSize,
                    color: textSettings.color,
                    backgroundColor: textSettings.bgColor,
                    fontWeight: textSettings.bold ? 700 : 400,
                    padding: '6px 12px',
                    borderRadius: 6,
                    cursor: 'grab',
                    zIndex: 25,
                    whiteSpace: 'nowrap',
                    border: '1px dashed rgba(255,255,255,0.35)'
                  }}
                >
                  {textSettings.content}
                </div>
              )}

              {extAudioFile && <audio ref={extAudioRef} src={extAudioFile.url} hidden />}
            </div>
          </div>

          <div style={styles.transportBar}>
            <button style={styles.transportBtn} onClick={() => stepFrame(-1)} title="פריים אחורה (חץ ימינה)">
              <ChevronRight size={16} />
            </button>
            <button style={{ ...styles.transportBtn, backgroundColor: '#2563eb' }} onClick={togglePlay} title="נגן/עצור (רווח)">
              {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <button style={styles.transportBtn} onClick={() => stepFrame(1)} title="פריים קדימה (חץ שמאלה)">
              <ChevronLeft size={16} />
            </button>
          </div>
        </main>

        {/* 3. פאנל בקרה מלא */}
        <InspectorPanel
          selectedClip={selectedClip}
          onUpdateClip={handleUpdateClip}
          onDeleteClip={handleDeleteClip}
          pipSettings={pipSettings}
          onUpdatePip={setPipSettings}
          hasPip={Boolean(pipFile)}
          textSettings={textSettings}
          onUpdateText={setTextSettings}
          videoDuration={totalDuration}
        />
      </div>

      {/* 4. ציר זמן תחתון */}
      <TimelinePanel
        duration={totalDuration}
        currentTime={currentTime}
        onSeek={handleSeek}
        clips={clips}
        selectedClipId={selectedClip?.id}
        onSelectClip={setSelectedClipId}
        onSplitClip={handleSplitClip}
        onDeleteClip={handleDeleteClip}
        onUndo={handleUndo}
        canUndo={history.length > 0}
        pipSettings={pipSettings}
        onUpdatePip={setPipSettings}
        hasPip={Boolean(pipFile)}
        pipName={pipFile?.name}
        textSettings={textSettings}
        onUpdateText={setTextSettings}
        audioName={extAudioFile?.name}
      />
    </div>
  );
}

const styles = {
  appShell: { display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', backgroundColor: '#18181b', color: '#e4e4e7', fontFamily: 'system-ui, -apple-system, sans-serif', overflow: 'hidden', userSelect: 'none', direction: 'rtl' },
  topHeader: { height: 44, backgroundColor: '#121214', borderBottom: '1px solid #27272a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 14px', flexShrink: 0 },
  brandBadge: { backgroundColor: '#2563eb', color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 4 },
  aspectSwitcher: { display: 'flex', alignItems: 'center', gap: 4, backgroundColor: '#1c1c1f', padding: '3px 6px', borderRadius: 6, border: '1px solid #27272a' },
  aspectBtn: { border: 'none', padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: 'pointer' },
  headerBtn: { display: 'flex', alignItems: 'center', gap: 6, border: '1px solid #3f3f46', color: '#fff', padding: '5px 10px', borderRadius: 4, fontSize: 12, cursor: 'pointer' },
  exportBtn: { display: 'flex', alignItems: 'center', gap: 6, border: 'none', color: '#fff', padding: '6px 14px', borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  workspaceGrid: { display: 'flex', flex: 1, minHeight: 0, borderBottom: '1px solid #27272a', overflow: 'hidden' },
  mediaPoolPanel: { width: 250, backgroundColor: '#1c1c1f', borderLeft: '1px solid #27272a', display: 'flex', flexDirection: 'column', minHeight: 0, flexShrink: 0 },
  panelTitleBar: { height: 32, backgroundColor: '#141416', borderBottom: '1px solid #27272a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px', fontSize: 12, fontWeight: 600, color: '#a1a1aa', flexShrink: 0 },
  uploadRow: { display: 'flex', gap: 5, padding: 8, borderBottom: '1px solid #27272a', flexShrink: 0 },
  miniUploadBtn: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: '#27272a', padding: '6px 4px', borderRadius: 4, fontSize: 11, cursor: 'pointer', border: '1px solid #3f3f46' },
  mediaGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, padding: 10, overflowY: 'auto', flex: 1 },
  emptyPoolMsg: { gridColumn: '1 / -1', textAlign: 'center', fontSize: 12, color: '#52525b', marginTop: 24 },
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
