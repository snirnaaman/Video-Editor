import React, { useState, useRef, useEffect } from 'react';
import {
  Play, Pause, FlipHorizontal, Download, Video, Image as ImageIcon,
  Music, ChevronLeft, ChevronRight, Loader2
} from 'lucide-react';
import { DEFAULT_CLIP_SETTINGS, DEFAULT_PIP_SETTINGS, LUT_PRESETS } from './defaultState';
import InspectorPanel from './InspectorPanel';
import TimelinePanel from './TimelinePanel';

export default function App() {
  const videoRef = useRef(null);
  const extAudioRef = useRef(null);
  const pipMediaRef = useRef(null);
  const viewportRef = useRef(null);

  // מאגר מדיה (Media Pool)
  const [mediaPool, setMediaPool] = useState([]);
  const [mainVideoFile, setMainVideoFile] = useState(null);
  const [pipFile, setPipFile] = useState(null);
  const [extAudioFile, setExtAudioFile] = useState(null);

  // מקטעי וידאו אמיתיים על ציר הזמן (Clips)
  const [clips, setClips] = useState([]);
  const [selectedClipId, setSelectedClipId] = useState(null);

  // הגדרות שכבת PiP
  const [pipSettings, setPipSettings] = useState({ ...DEFAULT_PIP_SETTINGS });

  // מצב נגן וזמן
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0); // זמן על ציר הזמן הערוך

  // גרירה ושינוי גודל של PiP ישירות על המסך
  const [pipInteraction, setPipInteraction] = useState(null); // { mode: 'drag'|'resize', startX, startY, initRect }

  // מצב ייצוא והורדה למחשב
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  // חישוב אורך כולל של ציר הזמן הערוך
  const totalDuration = clips.reduce((acc, c) => acc + (c.trimEnd - c.trimStart), 0);

  // מציאת המקטע הפעיל בנקודת הזמן הנוכחית
  const getActiveClipAtTime = (t) => {
    if (clips.length === 0) return null;
    for (let i = 0; i < clips.length; i++) {
      const c = clips[i];
      const clipLen = c.trimEnd - c.trimStart;
      if (t >= c.timelineStart && t <= c.timelineStart + clipLen + 0.02) {
        return c;
      }
    }
    return clips[clips.length - 1];
  };

  const activeClip = getActiveClipAtTime(currentTime);
  const selectedClip = clips.find((c) => c.id === selectedClipId) || activeClip;

  // חישוב מחדש של מיקומי המקטעים על ציר הזמן (ללא רווחים אחרי מחיקה)
  const recalculateTimelinePositions = (clipList) => {
    let cursor = 0;
    return clipList.map((c) => {
      const updated = { ...c, timelineStart: Number(cursor.toFixed(3)) };
      cursor += (c.trimEnd - c.trimStart);
      return updated;
    });
  };

  // העלאת קבצים למאגר
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
  };

  const selectPipMedia = (item) => {
    setPipFile(item);
    setPipSettings((prev) => ({
      ...prev,
      startTime: 0,
      endTime: Math.min(10, totalDuration || 10)
    }));
  };

  // אתחול מקטע ראשון כשהווידאו נטען
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
  };

  // פיצול מקטע בנקודת הסמן (Split)
  const handleSplitClip = () => {
    if (!activeClip) return;
    const offsetInClip = currentTime - activeClip.timelineStart;
    const clipDuration = activeClip.trimEnd - activeClip.trimStart;

    if (offsetInClip <= 0.1 || offsetInClip >= clipDuration - 0.1) return;

    const splitSourceTime = Number((activeClip.trimStart + offsetInClip).toFixed(3));

    const firstHalf = {
      ...activeClip,
      id: 'clip-' + Math.random().toString(36).substring(2, 7),
      trimEnd: splitSourceTime,
      settings: { ...activeClip.settings }
    };

    const secondHalf = {
      ...activeClip,
      id: 'clip-' + Math.random().toString(36).substring(2, 7),
      trimStart: splitSourceTime,
      settings: { ...activeClip.settings }
    };

    const idx = clips.findIndex((c) => c.id === activeClip.id);
    const nextList = [...clips];
    nextList.splice(idx, 1, firstHalf, secondHalf);

    const recalculated = recalculateTimelinePositions(nextList);
    setClips(recalculated);
    setSelectedClipId(secondHalf.id);
  };

  // מחיקת מקטע וחיבור אוטומטי של שאר הסרטון
  const handleDeleteClip = (clipId) => {
    if (clips.length <= 1) return;
    const filtered = clips.filter((c) => c.id !== clipId);
    const recalculated = recalculateTimelinePositions(filtered);
    setClips(recalculated);
    setSelectedClipId(recalculated[0]?.id || null);
    setCurrentTime(0);
    if (videoRef.current && recalculated[0]) {
      videoRef.current.currentTime = recalculated[0].trimStart;
    }
  };

  // עדכון הגדרות צבע/חיתוך/מהירות של מקטע ספציפי
  const handleUpdateClip = (clipId, newSettings) => {
    setClips((prev) =>
      prev.map((c) => (c.id === clipId ? { ...c, settings: newSettings } : c))
    );
  };

  // סנכרון ניגון רציף בין המקטעים שנשארו
  const handleTimeUpdate = () => {
    const vid = videoRef.current;
    if (!vid || !activeClip) return;

    const s = activeClip.settings;
    vid.playbackRate = s.speed;
    vid.volume = Math.min(1, s.volume / 100);

    // חישוב הזמן הערוך הנוכחי
    const elapsedInClip = vid.currentTime - activeClip.trimStart;
    const timelineNow = activeClip.timelineStart + Math.max(0, elapsedInClip);
    setCurrentTime(timelineNow);

    // אם הגענו לסוף המקטע הנוכחי, קפוץ למקטע הבא (דילוג על חלקים שנמחקו)
    if (vid.currentTime >= activeClip.trimEnd - 0.04) {
      const currentIndex = clips.findIndex((c) => c.id === activeClip.id);
      const nextClip = clips[currentIndex + 1];
      if (nextClip) {
        vid.currentTime = nextClip.trimStart;
      } else {
        vid.pause();
        if (extAudioRef.current) extAudioRef.current.pause();
        setIsPlaying(false);
        setCurrentTime(0);
        vid.currentTime = clips[0].trimStart;
      }
    }
  };

  // קפיצה לנקודה בציר הזמן
  const handleSeek = (targetTimelineSec) => {
    const clamped = Math.max(0, Math.min(totalDuration, targetTimelineSec));
    setCurrentTime(clamped);
    const targetClip = getActiveClipAtTime(clamped);
    if (targetClip && videoRef.current) {
      const offset = clamped - targetClip.timelineStart;
      videoRef.current.currentTime = targetClip.trimStart + offset;
      setSelectedClipId(targetClip.id);
    }
    if (extAudioRef.current) {
      extAudioRef.current.currentTime = clamped;
    }
  };

  const togglePlay = () => {
    const vid = videoRef.current;
    if (!vid || clips.length === 0) return;

    if (isPlaying) {
      vid.pause();
      if (extAudioRef.current) extAudioRef.current.pause();
      setIsPlaying(false);
    } else {
      if (currentTime >= totalDuration - 0.05) {
        handleSeek(0);
      }
      vid.play();
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

  // בניית מחרוזת פילטרים של צבע ו-LUT לתצוגה ולייצוא
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

  // גרירה ושינוי גודל של חלון ה-PiP ישירות על גבי הווידאו
  const onPipMouseDown = (e, mode) => {
    e.stopPropagation();
    setPipInteraction({
      mode,
      startX: e.clientX,
      startY: e.clientY,
      initRect: { ...pipSettings }
    });
  };

  const onViewportMouseMove = (e) => {
    if (!pipInteraction || !viewportRef.current) return;
    const dx = e.clientX - pipInteraction.startX;
    const dy = e.clientY - pipInteraction.startY;
    const bounds = viewportRef.current.getBoundingClientRect();

    if (pipInteraction.mode === 'drag') {
      const nextX = Math.max(0, Math.min(bounds.width - pipInteraction.initRect.width, pipInteraction.initRect.x + dx));
      const nextY = Math.max(0, Math.min(bounds.height - pipInteraction.initRect.height, pipInteraction.initRect.y + dy));
      setPipSettings((prev) => ({ ...prev, x: Math.round(nextX), y: Math.round(nextY) }));
    } else if (pipInteraction.mode === 'resize') {
      const nextW = Math.max(60, Math.min(bounds.width - pipInteraction.initRect.x, pipInteraction.initRect.width + dx));
      const nextH = Math.max(45, Math.min(bounds.height - pipInteraction.initRect.y, pipInteraction.initRect.height + dy));
      setPipSettings((prev) => ({ ...prev, width: Math.round(nextW), height: Math.round(nextH) }));
    }
  };

  const onViewportMouseUp = () => {
    if (pipInteraction) setPipInteraction(null);
  };

  // ייצוא אמיתי והורדה ישירה של הווידאו הערוך למחשב
  const handleExportAndDownload = async () => {
    if (!videoRef.current || clips.length === 0 || isExporting) return;

    setIsExporting(true);
    setExportProgress(0);
    setIsPlaying(false);
    videoRef.current.pause();

    const vid = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = vid.videoWidth || 1280;
    canvas.height = vid.videoHeight || 720;
    const ctx = canvas.getContext('2d');

    // חיבור זרם וידאו + שמע להקלטה
    const canvasStream = canvas.captureStream(30);
    try {
      const vidStream = vid.captureStream ? vid.captureStream() : vid.mozCaptureStream();
      const audioTracks = vidStream.getAudioTracks();
      if (audioTracks.length > 0) {
        canvasStream.addTrack(audioTracks[0]);
      }
    } catch (_) {}

    const chunks = [];
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
      ? 'video/webm;codecs=vp9,opus'
      : 'video/webm';

    const recorder = new MediaRecorder(canvasStream, { mimeType, videoBitsPerSecond: 5000000 });
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `guitar-lesson-edited-${Date.now()}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setIsExporting(false);
      setExportProgress(100);
      handleSeek(0);
    };

    recorder.start();

    // הרצת כל המקטעים שנשארו וציורם לקנבס עם כל הפילטרים וה-PiP
    let processedDuration = 0;
    for (let i = 0; i < clips.length; i++) {
      const clip = clips[i];
      const s = clip.settings;
      vid.currentTime = clip.trimStart;
      vid.playbackRate = s.speed;
      vid.volume = Math.min(1, s.volume / 100);

      await new Promise((resolve) => {
        vid.onseeked = () => resolve();
      });

      await vid.play();

      await new Promise((resolve) => {
        const drawStep = () => {
          if (vid.currentTime >= clip.trimEnd - 0.03 || vid.paused || vid.ended) {
            vid.pause();
            resolve();
            return;
          }

          const timelinePos = clip.timelineStart + (vid.currentTime - clip.trimStart);
          setExportProgress(Math.min(99, Math.round((timelinePos / totalDuration) * 100)));

          ctx.save();
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = '#000';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // פילטרים, שקיפות, היפוך, סיבוב וזום
          ctx.filter = buildCssFilterString(s);
          ctx.globalAlpha = s.opacity / 100;
          ctx.translate(canvas.width / 2 + s.posX, canvas.height / 2 + s.posY);
          ctx.rotate((s.rotation * Math.PI) / 180);
          ctx.scale(
            (s.mirrorH ? -1 : 1) * (s.scale / 100),
            (s.mirrorV ? -1 : 1) * (s.scale / 100)
          );

          // חיתוך שוליים (Crop)
          const sx = (s.cropLeft / 100) * canvas.width;
          const sy = (s.cropTop / 100) * canvas.height;
          const sw = canvas.width * (1 - (s.cropLeft + s.cropRight) / 100);
          const sh = canvas.height * (1 - (s.cropTop + s.cropBottom) / 100);

          ctx.drawImage(
            vid,
            sx, sy, Math.max(1, sw), Math.max(1, sh),
            -canvas.width / 2 + sx, -canvas.height / 2 + sy, Math.max(1, sw), Math.max(1, sh)
          );
          ctx.restore();

          // ציור חלון ה-PiP אם הוא בטווח הזמן שהוגדר
          if (
            pipFile &&
            pipMediaRef.current &&
            timelinePos >= pipSettings.startTime &&
            timelinePos <= pipSettings.endTime
          ) {
            const pEl = pipMediaRef.current;
            const vpW = viewportRef.current?.clientWidth || 800;
            const ratio = canvas.width / vpW;

            const px = pipSettings.x * ratio;
            const py = pipSettings.y * ratio;
            const pw = pipSettings.width * ratio;
            const ph = pipSettings.height * ratio;

            ctx.save();
            ctx.globalAlpha = pipSettings.opacity / 100;
            ctx.translate(px + pw / 2, py + ph / 2);
            ctx.rotate((pipSettings.rotation * Math.PI) / 180);

            const natW = pEl.videoWidth || pEl.naturalWidth || 300;
            const natH = pEl.videoHeight || pEl.naturalHeight || 200;
            const psx = (pipSettings.cropLeft / 100) * natW;
            const psy = (pipSettings.cropTop / 100) * natH;
            const psw = natW * (1 - (pipSettings.cropLeft + pipSettings.cropRight) / 100);
            const psh = natH * (1 - (pipSettings.cropTop + pipSettings.cropBottom) / 100);

            ctx.drawImage(
              pEl,
              psx, psy, Math.max(1, psw), Math.max(1, psh),
              -pw / 2, -ph / 2, pw, ph
            );
            ctx.restore();
          }

          requestAnimationFrame(drawStep);
        };
        requestAnimationFrame(drawStep);
      });

      processedDuration += (clip.trimEnd - clip.trimStart);
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
  const isPipVisibleNow =
    pipFile && currentTime >= pipSettings.startTime && currentTime <= pipSettings.endTime;

  return (
    <div style={styles.appShell} onMouseMove={onViewportMouseMove} onMouseUp={onViewportMouseUp}>
      {/* סרגל עליון */}
      <header style={styles.topHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={styles.brandBadge}>GUITAR STUDIO PRO</span>
          <span style={{ fontSize: 12, color: '#a1a1aa' }}>
            {clips.length > 0 ? `${clips.length} מקטעים בציר הזמן` : 'מוכן לעריכה'}
          </span>
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
              <span>היפוך מראה: {curSettings.mirrorH ? 'פעיל' : 'כבוי'}</span>
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
              {isExporting ? `מייצא סרטון... ${exportProgress}%` : 'ייצא והורד למחשב'}
            </span>
          </button>
        </div>
      </header>

      {/* אזור עבודה עליון מחולק ל-3 עמודות קבועות */}
      <div style={styles.workspaceGrid}>
        {/* 1. מאגר קבצים (Media Pool) */}
        <aside style={styles.mediaPoolPanel}>
          <div style={styles.panelTitleBar}>
            <span>Media Pool (מאגר קבצים)</span>
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
              <div style={styles.emptyPoolMsg}>
                העלה וידאו ראשי, תמונה/תקריב לחלון צד (PiP) או רצועת סאונד
              </div>
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

        {/* 2. מוניטור תצוגה מקדימה נעול עם אפקטים בזמן אמת */}
        <main style={styles.monitorPanel}>
          <div style={styles.panelTitleBar}>
            <span>Timeline Preview (תצוגה חיה)</span>
            <span style={{ fontFamily: 'monospace', color: '#38bdf8', direction: 'ltr' }}>
              {formatTimecode(currentTime)} / {formatTimecode(totalDuration)}
            </span>
          </div>

          <div style={styles.monitorViewport} ref={viewportRef}>
            {mainVideoFile ? (
              <video
                ref={videoRef}
                src={mainVideoFile.url}
                onLoadedMetadata={handleVideoMetadata}
                onTimeUpdate={handleTimeUpdate}
                style={{
                  ...styles.lockedVideoElement,
                  filter: buildCssFilterString(curSettings),
                  opacity: curSettings.opacity / 100,
                  mixBlendMode: curSettings.blendMode,
                  clipPath: `inset(${curSettings.cropTop}% ${curSettings.cropRight}% ${curSettings.cropBottom}% ${curSettings.cropLeft}%)`,
                  transform: `translate(${curSettings.posX}px, ${curSettings.posY}px) rotate(${curSettings.rotation}deg) scale(${
                    (curSettings.mirrorH ? -1 : 1) * (curSettings.scale / 100)
                  }, ${(curSettings.mirrorV ? -1 : 1) * (curSettings.scale / 100)})`
                }}
              />
            ) : (
              <span style={{ color: '#52525b', fontSize: 13 }}>
                העלה סרטון ב-Media Pool כדי להתחיל לערוך
              </span>
            )}

            {/* אפקט האפלת פינות (Vignette) */}
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

            {/* חלון תמונה/וידאו PiP — מופיע רק בזמנים שהוגדרו, ניתן לגרירה ושינוי גודל */}
            {isPipVisibleNow && (
              <div
                onMouseDown={(e) => onPipMouseDown(e, 'drag')}
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

                {/* ידית שינוי גודל בפינה הימנית התחתונה */}
                <div
                  onMouseDown={(e) => onPipMouseDown(e, 'resize')}
                  style={styles.resizeCornerHandle}
                  title="גרור לשינוי גודל התמונה"
                />
              </div>
            )}

            {extAudioFile && <audio ref={extAudioRef} src={extAudioFile.url} hidden />}
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

        {/* 3. פאנל שליטה מלא (Inspector) */}
        <InspectorPanel
          selectedClip={selectedClip}
          onUpdateClip={handleUpdateClip}
          onDeleteClip={handleDeleteClip}
          pipSettings={pipSettings}
          onUpdatePip={setPipSettings}
          hasPip={Boolean(pipFile)}
          videoDuration={totalDuration}
        />
      </div>

      {/* 4. ציר זמן תחתון (Timeline) */}
      <TimelinePanel
        duration={totalDuration}
        currentTime={currentTime}
        onSeek={handleSeek}
        clips={clips}
        selectedClipId={selectedClip?.id}
        onSelectClip={setSelectedClipId}
        onSplitClip={handleSplitClip}
        onDeleteClip={handleDeleteClip}
        pipSettings={pipSettings}
        onUpdatePip={setPipSettings}
        hasPip={Boolean(pipFile)}
        pipName={pipFile?.name}
        audioName={extAudioFile?.name}
      />
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
  headerBtn: {
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
  exportBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
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
    width: 260,
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
    gap: 5,
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
    marginTop: 24,
    lineHeight: 1.5
  },
  mediaCard: {
    backgroundColor: '#27272a',
    borderRadius: 4,
    overflow: 'hidden',
    border: '1px solid #3f3f46',
    cursor: 'pointer',
    height: 88,
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
  resizeCornerHandle: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 14,
    height: 14,
    backgroundColor: '#a855f7',
    cursor: 'nwse-resize',
    borderTopLeftRadius: 4
  },
  transportBar: {
    height: 38,
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
  }
};
