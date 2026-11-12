import React, { useState, useRef } from 'react';
import {
  Scissors, Trash2, ZoomIn, ZoomOut, Maximize2, Undo2
} from 'lucide-react';

export default function TimelinePanel({
  duration,
  currentTime,
  onSeek,
  clips,
  selectedClipId,
  onSelectClip,
  onSplitClip,
  onDeleteClip,
  onUndo,
  canUndo,
  pipSettings,
  onUpdatePip,
  hasPip,
  pipName,
  textSettings,
  onUpdateText,
  audioName
}) {
  const [zoomPercent, setZoomPercent] = useState(100);
  // dragTarget: { track: 'pip'|'text', mode: 'start'|'end'|'move' }
  const [dragTarget, setDragTarget] = useState(null);
  const [dragStartX, setDragStartX] = useState(0);
  const [initialTimes, setInitialTimes] = useState({ start: 0, end: 10 });

  const scrollAreaRef = useRef(null);
  const safeDuration = Math.max(duration || 10, 1);

  const baseWidth = 900;
  const timelineWidth = (baseWidth * zoomPercent) / 100;

  const timeToPx = (t) => (t / safeDuration) * timelineWidth;
  const pxToTime = (px) => Math.max(0, Math.min(safeDuration, (px / timelineWidth) * safeDuration));

  const handleTrackAreaClick = (e) => {
    if (dragTarget) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    onSeek(pxToTime(clickX));
  };

  const handleDoubleClickZoom = () => {
    setZoomPercent((prev) => (prev < 400 ? 600 : 100));
  };

  const startBarDrag = (e, track, mode) => {
    e.stopPropagation();
    setDragTarget({ track, mode });
    setDragStartX(e.clientX);
    if (track === 'pip') {
      setInitialTimes({ start: pipSettings.startTime, end: pipSettings.endTime });
    } else if (track === 'text') {
      setInitialTimes({ start: textSettings.startTime, end: textSettings.endTime });
    }
  };

  const handleMouseMove = (e) => {
    if (!dragTarget) return;
    const deltaPx = e.clientX - dragStartX;
    const deltaSec = (deltaPx / timelineWidth) * safeDuration;

    let nextStart = initialTimes.start;
    let nextEnd = initialTimes.end;

    if (dragTarget.mode === 'start') {
      nextStart = Math.max(0, Math.min(initialTimes.end - 0.2, initialTimes.start + deltaSec));
    } else if (dragTarget.mode === 'end') {
      nextEnd = Math.min(safeDuration, Math.max(initialTimes.start + 0.2, initialTimes.end + deltaSec));
    } else if (dragTarget.mode === 'move') {
      const span = initialTimes.end - initialTimes.start;
      nextStart = initialTimes.start + deltaSec;
      if (nextStart < 0) nextStart = 0;
      if (nextStart + span > safeDuration) nextStart = safeDuration - span;
      nextEnd = nextStart + span;
    }

    const roundedStart = Number(nextStart.toFixed(2));
    const roundedEnd = Number(nextEnd.toFixed(2));

    if (dragTarget.track === 'pip') {
      onUpdatePip({ ...pipSettings, startTime: roundedStart, endTime: roundedEnd });
    } else if (dragTarget.track === 'text') {
      onUpdateText({ ...textSettings, startTime: roundedStart, endTime: roundedEnd });
    }
  };

  const stopBarDrag = () => {
    if (dragTarget) setDragTarget(null);
  };

  const renderRulerTicks = () => {
    const ticks = [];
    let step = 5;
    if (zoomPercent >= 800) step = 0.1;
    else if (zoomPercent >= 400) step = 0.5;
    else if (zoomPercent >= 200) step = 1;
    else step = Math.max(1, Math.round(safeDuration / 12));

    for (let t = 0; t <= safeDuration; t = Number((t + step).toFixed(2))) {
      const leftPx = timeToPx(t);
      const isMajor = zoomPercent >= 400 ? Number.isInteger(t) : true;
      ticks.push(
        <div
          key={t}
          style={{
            position: 'absolute',
            left: leftPx,
            top: 0,
            bottom: 0,
            borderLeft: isMajor ? '1px solid #52525b' : '1px solid #27272a',
            paddingLeft: 3,
            fontSize: 9,
            color: isMajor ? '#a1a1aa' : '#52525b',
            pointerEvents: 'none'
          }}
        >
          {isMajor ? `${t}s` : ''}
        </div>
      );
    }
    return ticks;
  };

  // יצירת דפוס ויזואלי של גלי קול (Waveform) לאורך מסילת האודיו
  const renderWaveformBars = () => {
    const barCount = Math.min(240, Math.floor(timelineWidth / 6));
    const bars = [];
    for (let i = 0; i < barCount; i++) {
      const h = 25 + Math.abs(Math.sin(i * 0.7) * 55 + Math.cos(i * 1.9) * 20);
      bars.push(
        <div
          key={i}
          style={{
            width: 2,
            height: `${Math.min(95, h)}%`,
            backgroundColor: 'rgba(110, 231, 183, 0.45)',
            borderRadius: 1
          }}
        />
      );
    }
    return bars;
  };

  return (
    <section
      style={styles.dock}
      onMouseMove={handleMouseMove}
      onMouseUp={stopBarDrag}
      onMouseLeave={stopBarDrag}
    >
      {/* סרגל כלים עליון */}
      <div style={styles.toolbar}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button style={styles.actionBtn} onClick={onSplitClip} title="קיצור מקלדת: S">
            <Scissors size={14} color="#f87171" />
            <span>פצל (S)</span>
          </button>

          {selectedClipId && clips.length > 1 && (
            <button
              style={{ ...styles.actionBtn, borderColor: '#7f1d1d', color: '#fca5a5' }}
              onClick={() => onDeleteClip(selectedClipId)}
              title="קיצור מקלדת: Delete"
            >
              <Trash2 size={14} />
              <span>מחק חלק</span>
            </button>
          )}

          {canUndo && (
            <button style={styles.actionBtn} onClick={onUndo} title="ביטול פעולה (Ctrl+Z)">
              <Undo2 size={14} color="#fbbf24" />
              <span>ביטול (Undo)</span>
            </button>
          )}

          <button style={styles.actionBtn} onClick={handleDoubleClickZoom}>
            <Maximize2 size={13} color="#38bdf8" />
            <span>{zoomPercent >= 400 ? 'תצוגה רגילה' : 'זום לפריימים'}</span>
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: '#71717a' }}>זום ({zoomPercent}%):</span>
          <ZoomOut size={14} color="#71717a" style={{ cursor: 'pointer' }} onClick={() => setZoomPercent(Math.max(100, zoomPercent - 100))} />
          <input
            type="range" min="100" max="1200" step="50" value={zoomPercent}
            onChange={(e) => setZoomPercent(Number(e.target.value))}
            style={{ accentColor: '#3b82f6', cursor: 'pointer' }}
          />
          <ZoomIn size={14} color="#71717a" style={{ cursor: 'pointer' }} onClick={() => setZoomPercent(Math.min(1200, zoomPercent + 100))} />
        </div>
      </div>

      {/* גוף ציר הזמן */}
      <div style={styles.bodyWrapper}>
        <div style={styles.labelsCol}>
          <div style={styles.rulerCorner}>זמן / פריימים</div>
          <div style={styles.laneLabel}>T1 | כותרות</div>
          <div style={styles.laneLabel}>V2 | חלון PiP</div>
          <div style={styles.laneLabel}>V1 | וידאו ראשי</div>
          <div style={styles.laneLabel}>A1 | שמע (Wave)</div>
        </div>

        <div style={styles.scrollArea} ref={scrollAreaRef}>
          <div
            style={{ width: timelineWidth, height: '100%', position: 'relative' }}
            onClick={handleTrackAreaClick}
            onDoubleClick={handleDoubleClickZoom}
          >
            <div style={styles.rulerBar}>{renderRulerTicks()}</div>

            <div style={{ ...styles.playhead, left: timeToPx(currentTime) }}>
              <div style={styles.playheadHead} />
            </div>

            {/* מסילה 1: שכבת טקסט וכותרות */}
            <div style={styles.trackLane}>
              {textSettings.enabled && (
                <div
                  onMouseDown={(e) => startBarDrag(e, 'text', 'move')}
                  style={{
                    ...styles.textClip,
                    left: timeToPx(textSettings.startTime),
                    width: Math.max(24, timeToPx(textSettings.endTime - textSettings.startTime))
                  }}
                >
                  <div onMouseDown={(e) => startBarDrag(e, 'text', 'start')} style={styles.textHandle} />
                  <span style={styles.clipText}>
                    {textSettings.content} ({textSettings.startTime}s - {textSettings.endTime}s)
                  </span>
                  <div onMouseDown={(e) => startBarDrag(e, 'text', 'end')} style={styles.textHandle} />
                </div>
              )}
            </div>

            {/* מסילה 2: חלון PiP */}
            <div style={styles.trackLane}>
              {hasPip && (
                <div
                  onMouseDown={(e) => startBarDrag(e, 'pip', 'move')}
                  style={{
                    ...styles.pipClip,
                    left: timeToPx(pipSettings.startTime),
                    width: Math.max(24, timeToPx(pipSettings.endTime - pipSettings.startTime))
                  }}
                >
                  <div onMouseDown={(e) => startBarDrag(e, 'pip', 'start')} style={styles.pipHandle} />
                  <span style={styles.clipText}>
                    {pipName || 'PiP'} ({pipSettings.startTime}s - {pipSettings.endTime}s)
                  </span>
                  <div onMouseDown={(e) => startBarDrag(e, 'pip', 'end')} style={styles.pipHandle} />
                </div>
              )}
            </div>

            {/* מסילה 3: מקטעי וידאו ראשי */}
            <div style={styles.trackLane}>
              {clips.map((clip, idx) => {
                const isSelected = clip.id === selectedClipId;
                const leftPx = timeToPx(clip.timelineStart);
                const widthPx = Math.max(12, timeToPx(clip.trimEnd - clip.trimStart));

                return (
                  <div
                    key={clip.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectClip(clip.id);
                    }}
                    style={{
                      ...styles.videoClip,
                      left: leftPx,
                      width: widthPx,
                      backgroundColor: isSelected ? '#2563eb' : '#1e3a8a',
                      border: isSelected ? '2px solid #93c5fd' : '1px solid #3b82f6'
                    }}
                  >
                    <span style={styles.clipText}>
                      חלק {idx + 1} ({(clip.trimEnd - clip.trimStart).toFixed(1)}s)
                    </span>
                  </div>
                );
              })}
            </div>

            {/* מסילה 4: רצועת שמע עם גלי קול (Waveform) */}
            <div style={styles.trackLane}>
              {(audioName || clips.length > 0) && (
                <div style={{ ...styles.audioClip, left: 0, width: timelineWidth }}>
                  <div style={styles.waveformContainer}>{renderWaveformBars()}</div>
                  <span style={{ ...styles.clipText, position: 'relative', zIndex: 2 }}>
                    {audioName ? `שמע חיצוני: ${audioName}` : 'אודיו מקורי'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const styles = {
  dock: { height: 240, backgroundColor: '#121214', display: 'flex', flexDirection: 'column', flexShrink: 0, userSelect: 'none' },
  toolbar: { height: 36, backgroundColor: '#1c1c1f', borderBottom: '1px solid #27272a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 14px', direction: 'rtl' },
  actionBtn: { display: 'flex', alignItems: 'center', gap: 5, backgroundColor: '#27272a', border: '1px solid #3f3f46', color: '#e4e4e7', padding: '4px 9px', borderRadius: 4, fontSize: 11, cursor: 'pointer' },
  bodyWrapper: { display: 'flex', flex: 1, minHeight: 0, direction: 'rtl' },
  labelsCol: { width: 115, backgroundColor: '#18181b', borderLeft: '1px solid #27272a', display: 'flex', flexDirection: 'column', flexShrink: 0 },
  rulerCorner: { height: 22, borderBottom: '1px solid #27272a', fontSize: 10, color: '#71717a', display: 'flex', alignItems: 'center', paddingRight: 8, backgroundColor: '#141416' },
  laneLabel: { flex: 1, borderBottom: '1px solid #27272a', fontSize: 11, fontWeight: 600, color: '#a1a1aa', display: 'flex', alignItems: 'center', paddingRight: 8 },
  scrollArea: { flex: 1, overflowX: 'auto', overflowY: 'hidden', position: 'relative', backgroundColor: '#0f0f11', direction: 'ltr' },
  rulerBar: { height: 22, backgroundColor: '#141416', borderBottom: '1px solid #27272a', position: 'relative' },
  playhead: { position: 'absolute', top: 0, bottom: 0, width: 2, backgroundColor: '#ef4444', zIndex: 25, pointerEvents: 'none' },
  playheadHead: { width: 10, height: 10, backgroundColor: '#ef4444', borderRadius: '50%', marginLeft: -4 },
  trackLane: { height: 45, borderBottom: '1px solid #27272a', position: 'relative' },
  textClip: { position: 'absolute', top: 5, bottom: 5, backgroundColor: '#b45309', border: '1px solid #f59e0b', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'grab', overflow: 'hidden' },
  textHandle: { width: 6, height: '100%', backgroundColor: '#fcd34d', cursor: 'ew-resize', flexShrink: 0 },
  pipClip: { position: 'absolute', top: 5, bottom: 5, backgroundColor: '#7e22ce', border: '1px solid #c084fc', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'grab', overflow: 'hidden' },
  pipHandle: { width: 6, height: '100%', backgroundColor: '#d8b4fe', cursor: 'ew-resize', flexShrink: 0 },
  videoClip: { position: 'absolute', top: 4, bottom: 4, borderRadius: 4, display: 'flex', alignItems: 'center', padding: '0 8px', cursor: 'pointer', overflow: 'hidden', boxSizing: 'border-box' },
  audioClip: { position: 'absolute', top: 5, bottom: 5, backgroundColor: '#064e3b', border: '1px solid #10b981', borderRadius: 4, display: 'flex', alignItems: 'center', padding: '0 8px', overflow: 'hidden' },
  waveformContainer: { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px', pointerEvents: 'none' },
  clipText: { fontSize: 10, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', padding: '0 4px' }
};
