import React, { useState, useRef } from 'react';
import {
  Scissors, Trash2, ZoomIn, ZoomOut, Maximize2, MoveHorizontal
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
  pipSettings,
  onUpdatePip,
  hasPip,
  pipName,
  audioName
}) {
  // רמת זום באחוזים (100% = תצוגה רגילה, עד 1200% = פירוט פריימים)
  const [zoomPercent, setZoomPercent] = useState(100);
  const [draggingEdge, setDraggingEdge] = useState(null); // 'start' | 'end' | 'move'
  const [dragStartX, setDragStartX] = useState(0);
  const [initialPipTimes, setInitialPipTimes] = useState({ start: 0, end: 10 });

  const scrollAreaRef = useRef(null);
  const safeDuration = Math.max(duration || 10, 1);

  // חישוב רוחב ציר הזמן בפיקסלים בהתאם לזום
  const baseWidth = 900;
  const timelineWidth = (baseWidth * zoomPercent) / 100;

  const timeToPx = (t) => (t / safeDuration) * timelineWidth;
  const pxToTime = (px) => Math.max(0, Math.min(safeDuration, (px / timelineWidth) * safeDuration));

  // לחיצה על ציר הזמן להזזת סמן הניגון (Playhead)
  const handleTrackAreaClick = (e) => {
    if (draggingEdge) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    onSeek(pxToTime(clickX));
  };

  // לחיצה כפולה להגדלה מיידית לרמת פריימים
  const handleDoubleClickZoom = () => {
    setZoomPercent((prev) => (prev < 400 ? 600 : 100));
  };

  // התחלת גרירה של קצוות תמונת ה-PiP על ציר הזמן
  const startPipDrag = (e, mode) => {
    e.stopPropagation();
    setDraggingEdge(mode);
    setDragStartX(e.clientX);
    setInitialPipTimes({ start: pipSettings.startTime, end: pipSettings.endTime });
  };

  const handleMouseMove = (e) => {
    if (!draggingEdge) return;
    const deltaPx = e.clientX - dragStartX;
    const deltaSec = (deltaPx / timelineWidth) * safeDuration;

    if (draggingEdge === 'start') {
      const nextStart = Math.max(0, Math.min(initialPipTimes.end - 0.2, initialPipTimes.start + deltaSec));
      onUpdatePip({ ...pipSettings, startTime: Number(nextStart.toFixed(2)) });
    } else if (draggingEdge === 'end') {
      const nextEnd = Math.min(safeDuration, Math.max(initialPipTimes.start + 0.2, initialPipTimes.end + deltaSec));
      onUpdatePip({ ...pipSettings, endTime: Number(nextEnd.toFixed(2)) });
    } else if (draggingEdge === 'move') {
      const span = initialPipTimes.end - initialPipTimes.start;
      let nextStart = initialPipTimes.start + deltaSec;
      if (nextStart < 0) nextStart = 0;
      if (nextStart + span > safeDuration) nextStart = safeDuration - span;
      onUpdatePip({
        ...pipSettings,
        startTime: Number(nextStart.toFixed(2)),
        endTime: Number((nextStart + span).toFixed(2))
      });
    }
  };

  const stopPipDrag = () => {
    if (draggingEdge) setDraggingEdge(null);
  };

  // יצירת שנתות זמן דינמיות (שניות, עשיריות שנייה או פריימים לפי רמת הזום)
  const renderRulerTicks = () => {
    const ticks = [];
    let step = 5;
    if (zoomPercent >= 800) step = 0.1;       // רזולוציית פריימים / עשירית שנייה
    else if (zoomPercent >= 400) step = 0.5;  // חצי שנייה
    else if (zoomPercent >= 200) step = 1;    // שנייה בודדת
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

  return (
    <section
      style={styles.dock}
      onMouseMove={handleMouseMove}
      onMouseUp={stopPipDrag}
      onMouseLeave={stopPipDrag}
    >
      {/* סרגל כלים עליון של ציר הזמן */}
      <div style={styles.toolbar}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button style={styles.actionBtn} onClick={onSplitClip} title="פצל את המקטע בנקודת הסמן">
            <Scissors size={14} color="#f87171" />
            <span>פצל מקטע (Split)</span>
          </button>

          {selectedClipId && clips.length > 1 && (
            <button
              style={{ ...styles.actionBtn, borderColor: '#7f1d1d', color: '#fca5a5' }}
              onClick={() => onDeleteClip(selectedClipId)}
              title="מחק את המקטע הנבחר"
            >
              <Trash2 size={14} />
              <span>מחק מקטע נבחר</span>
            </button>
          )}

          <button
            style={styles.actionBtn}
            onClick={handleDoubleClickZoom}
            title="הגדל/כווץ לתצוגת פריימים מדויקת"
          >
            <Maximize2 size={13} color="#38bdf8" />
            <span>{zoomPercent >= 400 ? 'תצוגה רגילה' : 'זום לפריימים'}</span>
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: '#71717a' }}>זום ציר זמן ({zoomPercent}%):</span>
          <ZoomOut size={14} color="#71717a" style={{ cursor: 'pointer' }} onClick={() => setZoomPercent(Math.max(100, zoomPercent - 100))} />
          <input
            type="range"
            min="100"
            max="1200"
            step="50"
            value={zoomPercent}
            onChange={(e) => setZoomPercent(Number(e.target.value))}
            style={{ accentColor: '#3b82f6', cursor: 'pointer' }}
          />
          <ZoomIn size={14} color="#71717a" style={{ cursor: 'pointer' }} onClick={() => setZoomPercent(Math.min(1200, zoomPercent + 100))} />
        </div>
      </div>

      {/* גוף ציר הזמן עם גלילה אופקית */}
      <div style={styles.bodyWrapper}>
        {/* עמודת שמות הערוצים (קבועה מימין) */}
        <div style={styles.labelsCol}>
          <div style={styles.rulerCorner}>זמן / פריימים</div>
          <div style={styles.laneLabel}>V2 | תמונה/חלון</div>
          <div style={styles.laneLabel}>V1 | וידאו ראשי</div>
          <div style={styles.laneLabel}>A1 | ערוץ שמע</div>
        </div>

        {/* אזור המסילות הנגלל */}
        <div style={styles.scrollArea} ref={scrollAreaRef}>
          <div
            style={{ width: timelineWidth, height: '100%', position: 'relative' }}
            onClick={handleTrackAreaClick}
            onDoubleClick={handleDoubleClickZoom}
          >
            {/* סרגל שנתות עליון */}
            <div style={styles.rulerBar}>
              {renderRulerTicks()}
            </div>

            {/* סמן ניגון אדום (Playhead) */}
            <div style={{ ...styles.playhead, left: timeToPx(currentTime) }}>
              <div style={styles.playheadHead} />
            </div>

            {/* מסילה 1: שכבת חלון PiP (ניתנת להזזה ומתיחה) */}
            <div style={styles.trackLane}>
              {hasPip && (
                <div
                  onMouseDown={(e) => startPipDrag(e, 'move')}
                  style={{
                    ...styles.pipClip,
                    left: timeToPx(pipSettings.startTime),
                    width: Math.max(20, timeToPx(pipSettings.endTime - pipSettings.startTime))
                  }}
                >
                  {/* ידית שמאלית (התחלה) */}
                  <div
                    onMouseDown={(e) => startPipDrag(e, 'start')}
                    style={styles.trimHandleLeft}
                    title="גרור לשינוי זמן התחלה"
                  />
                  <span style={styles.clipText}>
                    {pipName || 'חלון PiP'} ({pipSettings.startTime}s - {pipSettings.endTime}s)
                  </span>
                  {/* ידית ימנית (סיום) */}
                  <div
                    onMouseDown={(e) => startPipDrag(e, 'end')}
                    style={styles.trimHandleRight}
                    title="גרור לשינוי זמן סיום"
                  />
                </div>
              )}
            </div>

            {/* מסילה 2: מקטעי הווידאו הראשי (ניתנים לפיצול, בחירה ומחיקה) */}
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
                      חלק {idx + 1}: {clip.label} ({(clip.trimEnd - clip.trimStart).toFixed(1)}s)
                    </span>
                  </div>
                );
              })}
            </div>

            {/* מסילה 3: רצועת שמע */}
            <div style={styles.trackLane}>
              {(audioName || clips.length > 0) && (
                <div style={{ ...styles.audioClip, left: 0, width: timelineWidth }}>
                  <span style={styles.clipText}>
                    {audioName ? `שמע חיצוני: ${audioName}` : 'ערוץ שמע מקורי (מסונכרן למקטעים)'}
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
  dock: {
    height: 225,
    backgroundColor: '#121214',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
    userSelect: 'none'
  },
  toolbar: {
    height: 36,
    backgroundColor: '#1c1c1f',
    borderBottom: '1px solid #27272a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 14px',
    direction: 'rtl'
  },
  actionBtn: {
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
  bodyWrapper: {
    display: 'flex',
    flex: 1,
    minHeight: 0,
    direction: 'rtl'
  },
  labelsCol: {
    width: 120,
    backgroundColor: '#18181b',
    borderLeft: '1px solid #27272a',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0
  },
  rulerCorner: {
    height: 24,
    borderBottom: '1px solid #27272a',
    fontSize: 10,
    color: '#71717a',
    display: 'flex',
    alignItems: 'center',
    paddingRight: 10,
    backgroundColor: '#141416'
  },
  laneLabel: {
    flex: 1,
    borderBottom: '1px solid #27272a',
    fontSize: 11,
    fontWeight: 600,
    color: '#a1a1aa',
    display: 'flex',
    alignItems: 'center',
    paddingRight: 10
  },
  scrollArea: {
    flex: 1,
    overflowX: 'auto',
    overflowY: 'hidden',
    position: 'relative',
    backgroundColor: '#0f0f11',
    direction: 'ltr'
  },
  rulerBar: {
    height: 24,
    backgroundColor: '#141416',
    borderBottom: '1px solid #27272a',
    position: 'relative'
  },
  playhead: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: '#ef4444',
    zIndex: 25,
    pointerEvents: 'none'
  },
  playheadHead: {
    width: 10,
    height: 10,
    backgroundColor: '#ef4444',
    borderRadius: '50%',
    marginLeft: -4
  },
  trackLane: {
    height: 54,
    borderBottom: '1px solid #27272a',
    position: 'relative'
  },
  pipClip: {
    position: 'absolute',
    top: 7,
    bottom: 7,
    backgroundColor: '#7e22ce',
    border: '1px solid #c084fc',
    borderRadius: 4,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: 'grab',
    overflow: 'hidden'
  },
  trimHandleLeft: {
    width: 7,
    height: '100%',
    backgroundColor: '#d8b4fe',
    cursor: 'ew-resize',
    flexShrink: 0
  },
  trimHandleRight: {
    width: 7,
    height: '100%',
    backgroundColor: '#d8b4fe',
    cursor: 'ew-resize',
    flexShrink: 0
  },
  videoClip: {
    position: 'absolute',
    top: 6,
    bottom: 6,
    borderRadius: 4,
    display: 'flex',
    alignItems: 'center',
    padding: '0 8px',
    cursor: 'pointer',
    overflow: 'hidden',
    boxSizing: 'border-box'
  },
  audioClip: {
    position: 'absolute',
    top: 8,
    bottom: 8,
    backgroundColor: '#065f46',
    border: '1px solid #10b981',
    borderRadius: 4,
    display: 'flex',
    alignItems: 'center',
    padding: '0 8px',
    overflow: 'hidden'
  },
  clipText: {
    fontSize: 11,
    color: '#fff',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    padding: '0 4px'
  }
};
