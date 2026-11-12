import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Scissors, Trash2, ZoomIn, ZoomOut, Maximize2, Undo2, MousePointer2 } from 'lucide-react';

const TimelinePanel = React.memo(function TimelinePanel({
  duration, currentTime, onSeek, clips, selectedClipId, onSelectClip,
  onSplitClip, onDeleteClip, onUndo, canUndo, pipSettings, onUpdatePip,
  hasPip, pipName, texts, onUpdateTexts, chords, onUpdateChords, audioName
}) {
  const [zoomPercent, setZoomPercent] = useState(100);
  const [activeTool, setActiveTool] = useState('select');
  const [dragTarget, setDragTarget] = useState(null); 
  const [dragStartX, setDragStartX] = useState(0);
  const [initialTimes, setInitialTimes] = useState({ start: 0, end: 10 });
  const [waveformBars, setWaveformBars] = useState([]);

  const safeDuration = Math.max(duration || 10, 1);
  const timelineWidth = (900 * zoomPercent) / 100;
  const timeToPx = (t) => (t / safeDuration) * timelineWidth;
  const pxToTime = (px) => Math.max(0, Math.min(safeDuration, (px / timelineWidth) * safeDuration));

  useEffect(() => {
    if (audioName || clips.length > 0) {
      // יצירת מדומה מהירה או שימוש בוורקר הקיים
      const barCount = Math.min(240, Math.floor(timelineWidth / 6));
      const heights = Array.from({length: barCount}, (_, i) => Math.min(95, 25 + Math.abs(Math.sin(i * 0.7) * 55 + Math.cos(i * 1.9) * 20)));
      setWaveformBars(heights);
    }
  }, [timelineWidth, audioName, clips.length]);

  const handleTrackAreaClick = (e) => {
    if (dragTarget) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickTime = pxToTime(e.clientX - rect.left);
    if (activeTool === 'blade') {
      onSeek(clickTime);
      onSplitClip(clickTime); 
    } else {
      onSeek(clickTime);
    }
  };

  const startBarDrag = (e, track, mode, id = null) => {
    if(activeTool !== 'select') return;
    e.stopPropagation();
    setDragTarget({ track, mode, id });
    setDragStartX(e.clientX);
    if (track === 'pip') setInitialTimes({ start: pipSettings.startTime, end: pipSettings.endTime });
    else if (track === 'text' && id) { const txt = texts.find(t=>t.id===id); if(txt) setInitialTimes({start: txt.startTime, end: txt.endTime}); }
    else if (track === 'chord' && id) { const ch = chords.find(c=>c.id===id); if(ch) setInitialTimes({start: ch.startTime, end: ch.endTime}); }
  };

  const handleMouseMove = (e) => {
    if (!dragTarget) return;
    const deltaSec = ((e.clientX - dragStartX) / timelineWidth) * safeDuration;
    let nextStart = initialTimes.start, nextEnd = initialTimes.end;

    if (dragTarget.mode === 'start') nextStart = Math.max(0, Math.min(initialTimes.end - 0.2, initialTimes.start + deltaSec));
    else if (dragTarget.mode === 'end') nextEnd = Math.min(safeDuration, Math.max(initialTimes.start + 0.2, initialTimes.end + deltaSec));
    else if (dragTarget.mode === 'move') {
      const span = initialTimes.end - initialTimes.start;
      nextStart = Math.max(0, Math.min(safeDuration - span, initialTimes.start + deltaSec));
      nextEnd = nextStart + span;
    }
    const [rStart, rEnd] = [Number(nextStart.toFixed(2)), Number(nextEnd.toFixed(2))];
    if (dragTarget.track === 'pip') onUpdatePip({ ...pipSettings, startTime: rStart, endTime: rEnd });
    else if (dragTarget.track === 'text' && dragTarget.id) onUpdateTexts(texts.map(t => t.id === dragTarget.id ? { ...t, startTime: rStart, endTime: rEnd } : t));
    else if (dragTarget.track === 'chord' && dragTarget.id) onUpdateChords(chords.map(c => c.id === dragTarget.id ? { ...c, startTime: rStart, endTime: rEnd } : c));
  };

  // אופטימיזציה: חישוב השנתות רק בשינוי זום או זמן כולל
  const memoizedRulerTicks = useMemo(() => {
    const ticks = [];
    const step = zoomPercent >= 800 ? 0.1 : zoomPercent >= 400 ? 0.5 : zoomPercent >= 200 ? 1 : Math.max(1, Math.round(safeDuration / 12));
    for (let t = 0; t <= safeDuration; t = Number((t + step).toFixed(2))) {
      const isMajor = zoomPercent >= 400 ? Number.isInteger(t) : true;
      ticks.push(<div key={t} style={{ position: 'absolute', left: 0, transform: `translateX(${timeToPx(t)}px)`, top: 0, bottom: 0, borderLeft: isMajor ? '1px solid #52525b' : '1px solid #27272a', paddingLeft: 3, fontSize: 9, color: isMajor ? '#a1a1aa' : '#52525b', pointerEvents: 'none' }}>{isMajor ? `${t}s` : ''}</div>);
    }
    return ticks;
  }, [zoomPercent, safeDuration, timelineWidth]);

  // אופטימיזציה: חישוב גלי קול רק בעדכון הרשימה
  const memoizedWaveform = useMemo(() => {
    return waveformBars.map((h, i) => <div key={i} style={{ width: 2, height: `${h}%`, backgroundColor: 'rgba(110, 231, 183, 0.45)', borderRadius: 1 }} />);
  }, [waveformBars]);

  return (
    <section style={styles.dock} onMouseMove={handleMouseMove} onMouseUp={() => setDragTarget(null)} onMouseLeave={() => setDragTarget(null)}>
      <div style={styles.toolbar}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ display: 'flex', backgroundColor: '#27272a', borderRadius: 4, overflow: 'hidden', border: '1px solid #3f3f46' }}>
            <button style={{...styles.toolBtn, backgroundColor: activeTool==='select'?'#3b82f6':'transparent'}} onClick={()=>setActiveTool('select')} title="בחירה (V)"><MousePointer2 size={13} color={activeTool==='select'?'#fff':'#a1a1aa'} /></button>
            <button style={{...styles.toolBtn, backgroundColor: activeTool==='blade'?'#ef4444':'transparent'}} onClick={()=>setActiveTool('blade')} title="חיתוך מתקדם (B)"><Scissors size={13} color={activeTool==='blade'?'#fff':'#a1a1aa'} /></button>
          </div>
          {selectedClipId && clips.length > 1 && <button style={{ ...styles.actionBtn, borderColor: '#7f1d1d', color: '#fca5a5' }} onClick={() => onDeleteClip(selectedClipId)}><Trash2 size={14} /><span>מחק</span></button>}
          {canUndo && <button style={styles.actionBtn} onClick={onUndo}><Undo2 size={14} color="#fbbf24" /></button>}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <ZoomOut size={14} color="#71717a" style={{ cursor: 'pointer' }} onClick={() => setZoomPercent(Math.max(100, zoomPercent - 50))} />
          <input type="range" min="100" max="1200" step="50" value={zoomPercent} onChange={(e) => setZoomPercent(Number(e.target.value))} style={{ accentColor: '#3b82f6', cursor: 'pointer' }} />
          <ZoomIn size={14} color="#71717a" style={{ cursor: 'pointer' }} onClick={() => setZoomPercent(Math.min(1200, zoomPercent + 50))} />
        </div>
      </div>

      <div style={styles.bodyWrapper}>
        <div style={styles.labelsCol}>
          <div style={styles.rulerCorner}>זמן</div>
          <div style={styles.laneLabel}>C1 | אקורדים</div>
          <div style={styles.laneLabel}>T1 | כותרות</div>
          <div style={styles.laneLabel}>V2 | חלון PiP</div>
          <div style={styles.laneLabel}>V1 | וידאו</div>
          <div style={styles.laneLabel}>A1 | סאונד</div>
        </div>

        <div style={{flex: 1, overflowX: 'auto', overflowY: 'hidden', position: 'relative', backgroundColor: '#0f0f11', cursor: activeTool==='blade'?'crosshair':'default'}}>
          <div style={{ width: timelineWidth, height: '100%', position: 'relative' }} onClick={handleTrackAreaClick}>
            <div style={{ height: 22, backgroundColor: '#141416', borderBottom: '1px solid #27272a', position: 'relative' }}>{memoizedRulerTicks}</div>
            
            {/* אופטימיזציה לסמן הזמן עם Translate לרינדור GPU נקי */}
            <div style={{ position: 'absolute', top: 0, bottom: 0, width: 2, backgroundColor: '#ef4444', zIndex: 25, left: 0, transform: `translateX(${timeToPx(currentTime)}px)`, willChange: 'transform', pointerEvents: 'none' }}>
              <div style={{ width: 10, height: 10, backgroundColor: '#ef4444', borderRadius: '50%', marginLeft: -4 }} />
            </div>

            <div style={styles.trackLane}>
              {(chords || []).map(c => (
                <div key={c.id} onMouseDown={(e) => startBarDrag(e, 'chord', 'move', c.id)} style={{ ...styles.clipBase, backgroundColor: '#0369a1', borderColor: '#38bdf8', transform: `translateX(${timeToPx(c.startTime)}px)`, width: Math.max(12, timeToPx(c.endTime - c.startTime)) }}>
                   <div onMouseDown={(e) => startBarDrag(e, 'chord', 'start', c.id)} style={styles.clipHandle} />
                   <span style={styles.clipText}>{c.chordName}</span>
                   <div onMouseDown={(e) => startBarDrag(e, 'chord', 'end', c.id)} style={styles.clipHandle} />
                </div>
              ))}
            </div>

            <div style={styles.trackLane}>
              {(texts || []).map((t, idx) => (
                <div key={t.id} onMouseDown={(e) => startBarDrag(e, 'text', 'move', t.id)} style={{ ...styles.clipBase, top: 5+(idx%2)*12, backgroundColor: '#b45309', borderColor: '#fcd34d', transform: `translateX(${timeToPx(t.startTime)}px)`, width: Math.max(12, timeToPx(t.endTime - t.startTime)) }}>
                   <div onMouseDown={(e) => startBarDrag(e, 'text', 'start', t.id)} style={styles.clipHandle} />
                   <span style={styles.clipText}>{t.content}</span>
                   <div onMouseDown={(e) => startBarDrag(e, 'text', 'end', t.id)} style={styles.clipHandle} />
                </div>
              ))}
            </div>

            <div style={styles.trackLane}>
               {hasPip && (
                <div onMouseDown={(e) => startBarDrag(e, 'pip', 'move')} style={{ ...styles.clipBase, backgroundColor: '#7e22ce', borderColor: '#c084fc', transform: `translateX(${timeToPx(pipSettings.startTime)}px)`, width: Math.max(12, timeToPx(pipSettings.endTime - pipSettings.startTime)) }}>
                   <div onMouseDown={(e) => startBarDrag(e, 'pip', 'start')} style={styles.clipHandle} />
                   <span style={styles.clipText}>{pipName || 'PiP'}</span>
                   <div onMouseDown={(e) => startBarDrag(e, 'pip', 'end')} style={styles.clipHandle} />
                </div>
              )}
            </div>

            <div style={styles.trackLane}>
              {clips.map((clip, idx) => {
                const isSelected = clip.id === selectedClipId;
                return (
                  <div key={clip.id} onClick={(e) => { e.stopPropagation(); if(activeTool==='select') onSelectClip(clip.id); }} style={{ ...styles.clipBase, backgroundColor: isSelected ? '#2563eb' : '#1e3a8a', border: isSelected ? '2px solid #93c5fd' : '1px solid #3b82f6', transform: `translateX(${timeToPx(clip.timelineStart)}px)`, width: Math.max(12, timeToPx(clip.trimEnd - clip.trimStart)) }}>
                    <span style={styles.clipText}>קליפ {idx + 1}</span>
                  </div>
                );
              })}
            </div>

            <div style={styles.trackLane}>
               {(audioName || clips.length > 0) && (
                <div style={{ ...styles.clipBase, backgroundColor: '#064e3b', borderColor: '#10b981', left: 0, width: timelineWidth, overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px', pointerEvents: 'none' }}>
                    {memoizedWaveform}
                  </div>
                  <span style={{ ...styles.clipText, position: 'relative', zIndex: 2 }}>{audioName || 'אודיו'}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
});

export default TimelinePanel;

const styles = { dock: { height: 260, backgroundColor: '#121214', display: 'flex', flexDirection: 'column', flexShrink: 0, userSelect: 'none' }, toolbar: { height: 36, backgroundColor: '#1c1c1f', borderBottom: '1px solid #27272a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 14px', direction: 'rtl' }, actionBtn: { display: 'flex', alignItems: 'center', gap: 5, backgroundColor: '#27272a', border: '1px solid #3f3f46', color: '#e4e4e7', padding: '4px 9px', borderRadius: 4, fontSize: 11, cursor: 'pointer' }, toolBtn: { padding: '6px 10px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }, bodyWrapper: { display: 'flex', flex: 1, minHeight: 0, direction: 'rtl' }, labelsCol: { width: 115, backgroundColor: '#18181b', borderLeft: '1px solid #27272a', display: 'flex', flexDirection: 'column', flexShrink: 0 }, rulerCorner: { height: 22, borderBottom: '1px solid #27272a', fontSize: 10, color: '#71717a', display: 'flex', alignItems: 'center', paddingRight: 8, backgroundColor: '#141416' }, laneLabel: { flex: 1, borderBottom: '1px solid #27272a', fontSize: 11, fontWeight: 600, color: '#a1a1aa', display: 'flex', alignItems: 'center', paddingRight: 8 }, trackLane: { height: 40, borderBottom: '1px solid #27272a', position: 'relative' }, clipBase: { position: 'absolute', top: 4, bottom: 4, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', overflow: 'hidden', boxSizing: 'border-box', left: 0 }, clipHandle: { width: 6, height: '100%', backgroundColor: 'rgba(255,255,255,0.4)', cursor: 'ew-resize', flexShrink: 0 }, clipText: { fontSize: 10, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', padding: '0 4px', pointerEvents:'none' } };
