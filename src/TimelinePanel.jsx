import React, { useState, useMemo } from 'react';
import { Scissors, Trash2, ZoomIn, ZoomOut, Undo2, Redo2, Copy, MousePointer2, Plus } from 'lucide-react';

const TimelinePanel = React.memo(function TimelinePanel({
  duration,
  currentTime,
  onSeek,
  clips,
  pipClips,
  audioClips,
  texts,
  chords,
  selectedItem,
  onSelectItem,
  onUpdateClipTiming,
  onUpdatePipClip,
  onUpdateAudioClip,
  onUpdateTexts,
  onUpdateChords,
  onSplitSelected,
  onDuplicateSelected,
  onDeleteSelected,
  onAddQuickText,
  onUndo,
  onRedo,
  canUndo,
  canRedo
}) {
  const [zoomPercent, setZoomPercent] = useState(120); // 50% עד 3000%
  const [activeTool, setActiveTool] = useState('select'); // select | blade
  const [dragState, setDragState] = useState(null);

  const safeDuration = Math.max(duration || 15, 5);
  const timelineWidth = Math.max(800, (950 * zoomPercent) / 100);
  const timeToPx = (t) => (t / safeDuration) * timelineWidth;
  const pxToTime = (px) => Math.max(0, Math.min(safeDuration + 30, (px / timelineWidth) * safeDuration));

  const handleTrackAreaClick = (e) => {
    if (dragState) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickTime = pxToTime(e.clientX - rect.left);
    onSeek(clickTime);
  };

  const startClipDrag = (e, type, id, mode, initStart, initEnd, initTrimStart = 0) => {
    e.stopPropagation();
    onSelectItem({ type, id });
    if (activeTool === 'blade') {
      const rect = e.currentTarget.parentElement.getBoundingClientRect();
      const clickTime = pxToTime(e.clientX - rect.left);
      onSeek(clickTime);
      setTimeout(() => onSplitSelected(clickTime, { type, id }), 10);
      return;
    }
    setDragState({
      type,
      id,
      mode, // 'move' | 'start' | 'end'
      startX: e.clientX,
      initStart,
      initEnd,
      initTrimStart
    });
  };

  const handleMouseMove = (e) => {
    if (!dragState) return;
    const deltaSec = ((e.clientX - dragState.startX) / timelineWidth) * safeDuration;
    const { type, id, mode, initStart, initEnd, initTrimStart } = dragState;
    const span = initEnd - initStart;

    let nextStart = initStart;
    let nextEnd = initEnd;

    if (mode === 'move') {
      nextStart = Math.max(0, Number((initStart + deltaSec).toFixed(2)));
      nextEnd = Number((nextStart + span).toFixed(2));
    } else if (mode === 'start') {
      nextStart = Math.max(0, Math.min(initEnd - 0.2, Number((initStart + deltaSec).toFixed(2))));
    } else if (mode === 'end') {
      nextEnd = Math.max(initStart + 0.2, Number((initEnd + deltaSec).toFixed(2)));
    }

    if (type === 'video') {
      onUpdateClipTiming(id, mode, deltaSec, initTrimStart, initEnd - initStart);
    } else if (type === 'pip') {
      onUpdatePipClip(id, { startTime: nextStart, endTime: nextEnd });
    } else if (type === 'audio') {
      if (mode === 'move') {
        onUpdateAudioClip(id, { timelineStart: nextStart });
      } else if (mode === 'end') {
        onUpdateAudioClip(id, { trimEnd: Math.max(0.3, Number((initTrimStart + (nextEnd - initStart)).toFixed(2))) });
      }
    } else if (type === 'text') {
      onUpdateTexts(texts.map(t => t.id === id ? { ...t, startTime: nextStart, endTime: nextEnd } : t));
    } else if (type === 'chord') {
      onUpdateChords(chords.map(c => c.id === id ? { ...c, startTime: nextStart, endTime: nextEnd } : c));
    }
  };

  const memoizedRulerTicks = useMemo(() => {
    const ticks = [];
    const step = zoomPercent >= 1500 ? 0.1 : zoomPercent >= 600 ? 0.5 : zoomPercent >= 200 ? 1 : Math.max(1, Math.round(safeDuration / 15));
    for (let t = 0; t <= safeDuration; t = Number((t + step).toFixed(2))) {
      const isMajor = zoomPercent >= 600 ? Number.isInteger(t) : true;
      ticks.push(
        <div key={t} style={{ position: 'absolute', left: 0, transform: `translateX(${timeToPx(t)}px)`, top: 0, bottom: 0, borderLeft: isMajor ? '1px solid #52525b' : '1px solid #27272a', paddingLeft: 3, fontSize: 9, color: isMajor ? '#d4d4d8' : '#52525b', pointerEvents: 'none' }}>
          {isMajor ? `${t}s` : ''}
        </div>
      );
    }
    return ticks;
  }, [zoomPercent, safeDuration, timelineWidth]);

  const isSelected = (type, id) => selectedItem?.type === type && selectedItem?.id === id;

  return (
    <section style={styles.dock} onMouseMove={handleMouseMove} onMouseUp={() => setDragState(null)} onMouseLeave={() => setDragState(null)}>
      {/* סרגל כלי עריכה של ציר הזמן */}
      <div style={styles.toolbar}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <div style={{ display: 'flex', backgroundColor: '#27272a', borderRadius: 4, overflow: 'hidden', border: '1px solid #3f3f46' }}>
            <button style={{ ...styles.toolBtn, backgroundColor: activeTool === 'select' ? '#2563eb' : 'transparent' }} onClick={() => setActiveTool('select')} title="כלי בחירה והזזה">
              <MousePointer2 size={13} color="#fff" />
            </button>
            <button style={{ ...styles.toolBtn, backgroundColor: activeTool === 'blade' ? '#dc2626' : 'transparent' }} onClick={() => setActiveTool('blade')} title="סכין חיתוך בלחיצה על קליפ">
              <Scissors size={13} color="#fff" />
            </button>
          </div>

          <button style={styles.actionBtn} onClick={() => onSplitSelected(currentTime)} title="פצל את האלמנט הנבחר בנקודת הזמן">
            <Scissors size={13} color="#38bdf8" /> <span>פצל כאן</span>
          </button>
          <button style={styles.actionBtn} onClick={onDuplicateSelected} title="שכפל אלמנט נבחר">
            <Copy size={13} color="#a855f7" /> <span>שכפל</span>
          </button>
          <button style={{ ...styles.actionBtn, borderColor: '#7f1d1d', color: '#fca5a5' }} onClick={onDeleteSelected} title="מחק אלמנט נבחר">
            <Trash2 size={13} /> <span>מחק</span>
          </button>
          <button style={styles.actionBtn} onClick={onAddQuickText} title="הוסף כתובית חדשה בנקודת הזמן">
            <Plus size={13} color="#f59e0b" /> <span>+ כתובית</span>
          </button>

          <div style={{ width: 1, height: 18, backgroundColor: '#27272a', margin: '0 4px' }} />
          <button style={{ ...styles.actionBtn, opacity: canUndo ? 1 : 0.4 }} onClick={onUndo} disabled={!canUndo} title="ביטול (Undo)"><Undo2 size={13} color="#fbbf24" /></button>
          <button style={{ ...styles.actionBtn, opacity: canRedo ? 1 : 0.4 }} onClick={onRedo} disabled={!canRedo} title="החזר (Redo)"><Redo2 size={13} color="#fbbf24" /></button>
        </div>

        {/* בקר זום מורחב עד 3000% עם סקאלה גדולה ונוחה */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button style={styles.zoomPresetBtn} onClick={() => setZoomPercent(100)}>התאם</button>
          <button style={styles.zoomPresetBtn} onClick={() => setZoomPercent(600)}>x6</button>
          <button style={styles.zoomPresetBtn} onClick={() => setZoomPercent(2000)}>x20</button>
          <ZoomOut size={15} color="#a1a1aa" style={{ cursor: 'pointer' }} onClick={() => setZoomPercent(Math.max(50, zoomPercent - 100))} />
          <input
            type="range"
            min="50"
            max="3000"
            step="25"
            value={zoomPercent}
            onChange={(e) => setZoomPercent(Number(e.target.value))}
            style={{ width: 190, accentColor: '#38bdf8', cursor: 'pointer' }}
          />
          <ZoomIn size={15} color="#a1a1aa" style={{ cursor: 'pointer' }} onClick={() => setZoomPercent(Math.min(3000, zoomPercent + 100))} />
          <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#38bdf8', minWidth: 46, direction: 'ltr' }}>{zoomPercent}%</span>
        </div>
      </div>

      {/* גוף ציר הזמן */}
      <div style={styles.bodyWrapper}>
        <div style={styles.labelsCol}>
          <div style={styles.rulerCorner}>שכבות עריכה</div>
          <div style={styles.laneLabel}>C1 | אקורדים ({chords.length})</div>
          <div style={styles.laneLabel}>T1 | כתוביות ({texts.length})</div>
          <div style={styles.laneLabel}>V2 | תמונות/PiP ({pipClips.length})</div>
          <div style={styles.laneLabel}>V1 | וידאו ראשי ({clips.length})</div>
          <div style={styles.laneLabel}>A1 | ערוצי שמע ({audioClips.length})</div>
        </div>

        <div style={{ flex: 1, overflowX: 'auto', overflowY: 'auto', position: 'relative', backgroundColor: '#0c0c0e', direction: 'ltr', cursor: activeTool === 'blade' ? 'crosshair' : 'default' }}>
          <div style={{ width: timelineWidth, minHeight: '100%', position: 'relative' }} onClick={handleTrackAreaClick}>
            <div style={{ height: 22, backgroundColor: '#141416', borderBottom: '1px solid #27272a', position: 'relative' }}>{memoizedRulerTicks}</div>

            {/* סמן ה-Playhead */}
            <div style={{ position: 'absolute', top: 0, bottom: 0, width: 2, backgroundColor: '#ef4444', zIndex: 40, left: 0, transform: `translateX(${timeToPx(currentTime)}px)`, pointerEvents: 'none' }}>
              <div style={{ width: 12, height: 12, backgroundColor: '#ef4444', borderRadius: '50%', marginLeft: -5 }} />
            </div>

            {/* מסילה 1: אקורדים (C1) */}
            <div style={styles.trackLane}>
              {chords.map((c) => {
                const sel = isSelected('chord', c.id);
                return (
                  <div
                    key={c.id}
                    onMouseDown={(e) => startClipDrag(e, 'chord', c.id, 'move', c.startTime, c.endTime)}
                    style={{ ...styles.clipBase, backgroundColor: '#0369a1', border: sel ? '2px solid #fff' : '1px solid #38bdf8', transform: `translateX(${timeToPx(c.startTime)}px)`, width: Math.max(24, timeToPx(c.endTime - c.startTime)) }}
                  >
                    <div onMouseDown={(e) => startClipDrag(e, 'chord', c.id, 'start', c.startTime, c.endTime)} style={styles.clipHandle} />
                    <span style={styles.clipText}>🎸 {c.chordName}</span>
                    <div onMouseDown={(e) => startClipDrag(e, 'chord', c.id, 'end', c.startTime, c.endTime)} style={styles.clipHandle} />
                  </div>
                );
              })}
            </div>

            {/* מסילה 2: כתוביות (T1) */}
            <div style={styles.trackLane}>
              {texts.map((t) => {
                const sel = isSelected('text', t.id);
                return (
                  <div
                    key={t.id}
                    onMouseDown={(e) => startClipDrag(e, 'text', t.id, 'move', t.startTime, t.endTime)}
                    style={{ ...styles.clipBase, backgroundColor: '#b45309', border: sel ? '2px solid #fff' : '1px solid #f59e0b', transform: `translateX(${timeToPx(t.startTime)}px)`, width: Math.max(24, timeToPx(t.endTime - t.startTime)) }}
                  >
                    <div onMouseDown={(e) => startClipDrag(e, 'text', t.id, 'start', t.startTime, t.endTime)} style={styles.clipHandle} />
                    <span style={styles.clipText}>{t.content}</span>
                    <div onMouseDown={(e) => startClipDrag(e, 'text', t.id, 'end', t.startTime, t.endTime)} style={styles.clipHandle} />
                  </div>
                );
              })}
            </div>

            {/* מסילה 3: שכבות תמונה ו-PiP מרובות (V2) */}
            <div style={styles.trackLane}>
              {pipClips.map((p) => {
                const sel = isSelected('pip', p.id);
                return (
                  <div
                    key={p.id}
                    onMouseDown={(e) => startClipDrag(e, 'pip', p.id, 'move', p.startTime, p.endTime)}
                    style={{ ...styles.clipBase, backgroundColor: '#6b21a8', border: sel ? '2px solid #fff' : '1px solid #c084fc', transform: `translateX(${timeToPx(p.startTime)}px)`, width: Math.max(24, timeToPx(p.endTime - p.startTime)) }}
                  >
                    <div onMouseDown={(e) => startClipDrag(e, 'pip', p.id, 'start', p.startTime, p.endTime)} style={styles.clipHandle} />
                    <span style={styles.clipText}>🖼️ {p.name}</span>
                    <div onMouseDown={(e) => startClipDrag(e, 'pip', p.id, 'end', p.startTime, p.endTime)} style={styles.clipHandle} />
                  </div>
                );
              })}
            </div>

            {/* מסילה 4: סרטונים ראשיים מרובים (V1) עם ידיות חיתוך ומעברים */}
            <div style={styles.trackLane}>
              {clips.map((clip, idx) => {
                const sel = isSelected('video', clip.id);
                const len = (clip.trimEnd - clip.trimStart) / (clip.settings?.speed || 1);
                return (
                  <div
                    key={clip.id}
                    onMouseDown={(e) => startClipDrag(e, 'video', clip.id, 'move', clip.timelineStart, clip.timelineStart + len, clip.trimStart)}
                    style={{
                      ...styles.clipBase,
                      backgroundColor: sel ? '#2563eb' : '#1e3a8a',
                      border: sel ? '2px solid #fff' : '1px solid #60a5fa',
                      transform: `translateX(${timeToPx(clip.timelineStart)}px)`,
                      width: Math.max(24, timeToPx(len))
                    }}
                  >
                    <div onMouseDown={(e) => startClipDrag(e, 'video', clip.id, 'start', clip.timelineStart, clip.timelineStart + len, clip.trimStart)} style={styles.clipHandle} title="גרור לקיצור תחילת הסרטון" />
                    <span style={styles.clipText}>
                      🎬 {idx + 1}. {clip.label} ({len.toFixed(1)}s) {clip.settings?.transitionOut !== 'none' ? '✨' : ''}
                    </span>
                    <div onMouseDown={(e) => startClipDrag(e, 'video', clip.id, 'end', clip.timelineStart, clip.timelineStart + len, clip.trimStart)} style={styles.clipHandle} title="גרור לקיצור/הארכת סוף הסרטון" />
                  </div>
                );
              })}
            </div>

            {/* מסילה 5: ערוצי שמע מרובים (A1) */}
            <div style={styles.trackLane}>
              {audioClips.map((a) => {
                const sel = isSelected('audio', a.id);
                const len = (a.trimEnd - a.trimStart) / (a.speed || 1);
                return (
                  <div
                    key={a.id}
                    onMouseDown={(e) => startClipDrag(e, 'audio', a.id, 'move', a.timelineStart, a.timelineStart + len, a.trimStart)}
                    style={{
                      ...styles.clipBase,
                      backgroundColor: '#065f46',
                      border: sel ? '2px solid #fff' : '1px solid #34d399',
                      transform: `translateX(${timeToPx(a.timelineStart)}px)`,
                      width: Math.max(24, timeToPx(len))
                    }}
                  >
                    <div onMouseDown={(e) => startClipDrag(e, 'audio', a.id, 'start', a.timelineStart, a.timelineStart + len, a.trimStart)} style={styles.clipHandle} />
                    <span style={styles.clipText}>🎵 {a.name} ({a.volume}%)</span>
                    <div onMouseDown={(e) => startClipDrag(e, 'audio', a.id, 'end', a.timelineStart, a.timelineStart + len, a.trimStart)} style={styles.clipHandle} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
});

export default TimelinePanel;

const styles = {
  dock: { height: '100%', backgroundColor: '#121214', display: 'flex', flexDirection: 'column', userSelect: 'none' },
  toolbar: { height: 38, backgroundColor: '#1c1c1f', borderBottom: '1px solid #27272a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px', direction: 'rtl', flexShrink: 0 },
  actionBtn: { display: 'flex', alignItems: 'center', gap: 4, backgroundColor: '#27272a', border: '1px solid #3f3f46', color: '#e4e4e7', padding: '4px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: 'pointer' },
  zoomPresetBtn: { backgroundColor: '#27272a', border: '1px solid #3f3f46', color: '#a1a1aa', padding: '2px 6px', borderRadius: 4, fontSize: 10, cursor: 'pointer' },
  toolBtn: { padding: '5px 9px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' },
  bodyWrapper: { display: 'flex', flex: 1, minHeight: 0, direction: 'rtl' },
  labelsCol: { width: 130, backgroundColor: '#18181b', borderLeft: '1px solid #27272a', display: 'flex', flexDirection: 'column', flexShrink: 0 },
  rulerCorner: { height: 22, borderBottom: '1px solid #27272a', fontSize: 10, color: '#71717a', display: 'flex', alignItems: 'center', paddingRight: 8, backgroundColor: '#141416' },
  laneLabel: { height: 42, borderBottom: '1px solid #27272a', fontSize: 11, fontWeight: 600, color: '#d4d4d8', display: 'flex', alignItems: 'center', paddingRight: 8 },
  trackLane: { height: 42, borderBottom: '1px solid #27272a', position: 'relative' },
  clipBase: { position: 'absolute', top: 4, bottom: 4, left: 0, borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'grab', overflow: 'hidden', boxSizing: 'border-box', boxShadow: '0 2px 6px rgba(0,0,0,0.4)' },
  clipHandle: { width: 7, height: '100%', backgroundColor: 'rgba(255,255,255,0.35)', cursor: 'ew-resize', flexShrink: 0 },
  clipText: { fontSize: 10, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', padding: '0 6px', pointerEvents: 'none' }
};
