import React, { useState } from 'react';
import {
  Sun, Move, Layers, Activity, Image as ImageIcon, Type,
  RotateCcw, Trash2, Plus, X, Clipboard, Copy, Music, Sparkles
} from 'lucide-react';
import { LUT_PRESETS, TRANSITION_TYPES, DEFAULT_CLIP_SETTINGS, CHORD_LIBRARY } from './defaultState';
import ChordDiagram from './ChordDiagram';

const InspectorPanel = React.memo(function InspectorPanel({
  selectedItem, // { type: 'video'|'pip'|'audio'|'text'|'chord', id }
  selectedClip,
  allClips,
  onUpdateClip,
  onUpdateClipsBulk,
  onDeleteSelected,
  onDuplicateSelected,
  pipClips,
  onUpdatePipClip,
  audioClips,
  onUpdateAudioClip,
  texts,
  onUpdateTexts,
  chords,
  onUpdateChords,
  currentTime
}) {
  const [activeTab, setActiveTab] = useState('color');
  const [clipboardSettings, setClipboardSettings] = useState(null);

  const itemType = selectedItem?.type || 'video';
  const activePip = pipClips?.find(p => p.id === selectedItem?.id);
  const activeAudio = audioClips?.find(a => a.id === selectedItem?.id);
  const activeText = texts?.find(t => t.id === selectedItem?.id);
  const activeChord = chords?.find(c => c.id === selectedItem?.id);

  const s = selectedClip?.settings || DEFAULT_CLIP_SETTINGS;
  const setVal = (key, val) => { if (selectedClip) onUpdateClip(selectedClip.id, { ...s, [key]: val }); };
  const setNestedVal = (parentKey, childKey, val) => {
    if (selectedClip) onUpdateClip(selectedClip.id, { ...s, [parentKey]: { ...s[parentKey], [childKey]: val } });
  };

  const handleCopyPaste = () => {
    if (!selectedClip) return;
    if (clipboardSettings) {
      onUpdateClip(selectedClip.id, structuredClone(clipboardSettings));
      setClipboardSettings(null);
    } else {
      setClipboardSettings(structuredClone(s));
    }
  };

  const handleApplyToAll = () => {
    if (!selectedClip || !allClips) return;
    const next = allClips.map(c => c.id === selectedClip.id ? c : { ...c, settings: structuredClone(s) });
    onUpdateClipsBulk(next);
  };

  return (
    <div style={styles.panel}>
      {/* סרגל זיהוי האלמנט שנבחר בציר הזמן */}
      <div style={styles.selectedBanner}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#38bdf8' }}>
          {itemType === 'video' && `וידאו נבחר: ${selectedClip?.label || 'ללא'}`}
          {itemType === 'pip' && `שכבת PiP: ${activePip?.name || ''}`}
          {itemType === 'audio' && `ערוץ שמע: ${activeAudio?.name || ''}`}
          {itemType === 'text' && `כתובית טקסט`}
          {itemType === 'chord' && `אקורד: ${activeChord?.chordName || ''}`}
        </span>
        <div style={{ display: 'flex', gap: 4 }}>
          {selectedClip && itemType === 'video' && (
            <>
              <button style={styles.miniTopBtn} onClick={handleCopyPaste} title={clipboardSettings ? 'הדבק הגדרות' : 'העתק הגדרות'}>
                {clipboardSettings ? <Clipboard size={11} color="#38bdf8" /> : <Copy size={11} />}
              </button>
              <button style={styles.miniTopBtn} onClick={handleApplyToAll} title="החל הגדרות אלו על כל הסרטונים">
                הכל
              </button>
              <button style={styles.miniTopBtn} onClick={() => onUpdateClip(selectedClip.id, structuredClone(DEFAULT_CLIP_SETTINGS))} title="אפס הגדרות קליפ">
                <RotateCcw size={11} />
              </button>
            </>
          )}
          <button style={{ ...styles.miniTopBtn, color: '#fca5a5', borderColor: '#7f1d1d' }} onClick={onDeleteSelected} title="מחק אלמנט נבחר (Delete)">
            <Trash2 size={11} />
          </button>
        </div>
      </div>

      {/* אם נבחר אלמנט מסוג PiP בציר הזמן - מציג מיד את עורך ה-PiP הספציפי שלו */}
      {itemType === 'pip' && activePip && (
        <div style={styles.body}>
          <div style={styles.sectionTitle}>עריכת שכבת תמונה / PiP נבחרת</div>
          <div style={styles.grid2}>
            <div><label style={styles.label}>התחלה (שנ')</label><input type="number" step="0.1" value={activePip.startTime} onChange={(e) => onUpdatePipClip(activePip.id, { startTime: Number(e.target.value) })} style={styles.numInput} /></div>
            <div><label style={styles.label}>סיום (שנ')</label><input type="number" step="0.1" value={activePip.endTime} onChange={(e) => onUpdatePipClip(activePip.id, { endTime: Number(e.target.value) })} style={styles.numInput} /></div>
          </div>
          <SliderRow label="רוחב (Width)" val={activePip.width} min={40} max={900} unit="px" onChange={(v) => onUpdatePipClip(activePip.id, { width: v })} />
          <SliderRow label="גובה (Height)" val={activePip.height} min={40} max={900} unit="px" onChange={(v) => onUpdatePipClip(activePip.id, { height: v })} />
          <SliderRow label="מיקום אופקי (X)" val={activePip.x} min={0} max={1000} unit="px" onChange={(v) => onUpdatePipClip(activePip.id, { x: v })} />
          <SliderRow label="מיקום אנכי (Y)" val={activePip.y} min={0} max={800} unit="px" onChange={(v) => onUpdatePipClip(activePip.id, { y: v })} />
          <SliderRow label="סיבוב" val={activePip.rotation || 0} min={-180} max={180} unit="°" onChange={(v) => onUpdatePipClip(activePip.id, { rotation: v })} />
          <SliderRow label="שקיפות (Opacity)" val={activePip.opacity} min={5} max={100} unit="%" onChange={(v) => onUpdatePipClip(activePip.id, { opacity: v })} />
          <SliderRow label="עמעום כניסה (Fade In)" val={activePip.fadeIn || 0} min={0} max={3} step={0.1} unit="s" onChange={(v) => onUpdatePipClip(activePip.id, { fadeIn: v })} />
          <SliderRow label="עמעום יציאה (Fade Out)" val={activePip.fadeOut || 0} min={0} max={3} step={0.1} unit="s" onChange={(v) => onUpdatePipClip(activePip.id, { fadeOut: v })} />
          <SliderRow label="עיגול פינות" val={activePip.borderRadius || 0} min={0} max={100} unit="px" onChange={(v) => onUpdatePipClip(activePip.id, { borderRadius: v })} />
          <SliderRow label="עובי מסגרת" val={activePip.borderWidth || 0} min={0} max={12} unit="px" onChange={(v) => onUpdatePipClip(activePip.id, { borderWidth: v })} />
        </div>
      )}

      {/* אם נבחר קליפ שמע (A1) בציר הזמן */}
      {itemType === 'audio' && activeAudio && (
        <div style={styles.body}>
          <div style={styles.sectionTitle}>עריכת קליפ שמע ומעברי סאונד</div>
          <div style={styles.grid2}>
            <div><label style={styles.label}>התחלה בציר</label><input type="number" step="0.1" value={activeAudio.timelineStart} onChange={(e) => onUpdateAudioClip(activeAudio.id, { timelineStart: Number(e.target.value) })} style={styles.numInput} /></div>
            <div><label style={styles.label}>חיתוך סיום</label><input type="number" step="0.1" value={activeAudio.trimEnd} onChange={(e) => onUpdateAudioClip(activeAudio.id, { trimEnd: Number(e.target.value) })} style={styles.numInput} /></div>
          </div>
          <SliderRow label="עוצמת שמע (Volume)" val={activeAudio.volume} min={0} max={200} unit="%" onChange={(v) => onUpdateAudioClip(activeAudio.id, { volume: v })} />
          <SliderRow label="עמעום כניסה מדויק (Audio Fade In)" val={activeAudio.fadeIn || 0} min={0} max={5} step={0.1} unit="s" onChange={(v) => onUpdateAudioClip(activeAudio.id, { fadeIn: v })} />
          <SliderRow label="עמעום יציאה מדויק (Audio Fade Out)" val={activeAudio.fadeOut || 0} min={0} max={5} step={0.1} unit="s" onChange={(v) => onUpdateAudioClip(activeAudio.id, { fadeOut: v })} />
          <SliderRow label="איזון סטריאו (Pan L/R)" val={activeAudio.pan || 0} min={-100} max={100} onChange={(v) => onUpdateAudioClip(activeAudio.id, { pan: v })} />
          <SliderRow label="מהירות ניגון" val={activeAudio.speed || 1} min={0.5} max={2.0} step={0.05} unit="x" onChange={(v) => onUpdateAudioClip(activeAudio.id, { speed: v })} />
          <div style={styles.sectionTitle}>איקוולייזר לערוץ זה (EQ)</div>
          <SliderRow label="ניקוי רעשי בס (Low Cut)" val={activeAudio.lowCutHz || 20} min={20} max={250} unit="Hz" onChange={(v) => onUpdateAudioClip(activeAudio.id, { lowCutHz: v })} />
          <SliderRow label="הדגשת בס (Bass)" val={activeAudio.lowGainDb || 0} min={-12} max={12} unit="dB" onChange={(v) => onUpdateAudioClip(activeAudio.id, { lowGainDb: v })} />
          <SliderRow label="נוכחות קול/גיטרה (Mid)" val={activeAudio.midGainDb || 0} min={-12} max={12} unit="dB" onChange={(v) => onUpdateAudioClip(activeAudio.id, { midGainDb: v })} />
          <SliderRow label="בהירות פריטה (Treble)" val={activeAudio.highGainDb || 0} min={-12} max={12} unit="dB" onChange={(v) => onUpdateAudioClip(activeAudio.id, { highGainDb: v })} />
        </div>
      )}

      {/* אם נבחרה כתובית טקסט (T1) */}
      {itemType === 'text' && activeText && (
        <div style={styles.body}>
          <div style={styles.sectionTitle}>עריכת שכבת טקסט נבחרת</div>
          <label style={styles.label}>תוכן הטקסט</label>
          <input type="text" value={activeText.content} onChange={(e) => onUpdateTexts(texts.map(t => t.id === activeText.id ? { ...t, content: e.target.value } : t))} style={{ ...styles.numInput, marginBottom: 10 }} />
          <div style={styles.grid2}>
            <div><label style={styles.label}>התחלה (שנ')</label><input type="number" step="0.1" value={activeText.startTime} onChange={(e) => onUpdateTexts(texts.map(t => t.id === activeText.id ? { ...t, startTime: Number(e.target.value) } : t))} style={styles.numInput} /></div>
            <div><label style={styles.label}>סיום (שנ')</label><input type="number" step="0.1" value={activeText.endTime} onChange={(e) => onUpdateTexts(texts.map(t => t.id === activeText.id ? { ...t, endTime: Number(e.target.value) } : t))} style={styles.numInput} /></div>
          </div>
          <SliderRow label="גודל גופן" val={activeText.fontSize} min={14} max={120} unit="px" onChange={(v) => onUpdateTexts(texts.map(t => t.id === activeText.id ? { ...t, fontSize: v } : t))} />
          <SliderRow label="מיקום X" val={activeText.x} min={0} max={1100} unit="px" onChange={(v) => onUpdateTexts(texts.map(t => t.id === activeText.id ? { ...t, x: v } : t))} />
          <SliderRow label="מיקום Y" val={activeText.y} min={0} max={700} unit="px" onChange={(v) => onUpdateTexts(texts.map(t => t.id === activeText.id ? { ...t, y: v } : t))} />
          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <label style={styles.label}>צבע אותיות: <input type="color" value={activeText.color} onChange={(e) => onUpdateTexts(texts.map(t => t.id === activeText.id ? { ...t, color: e.target.value } : t))} /></label>
          </div>
        </div>
      )}

      {/* אם נבחר אקורד (C1) */}
      {itemType === 'chord' && activeChord && (
        <div style={styles.body}>
          <div style={styles.sectionTitle}>עריכת אקורד גיטרה נבחר</div>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
            <ChordDiagram chord={activeChord} size={110} />
          </div>
          <label style={styles.label}>החלף לאקורד מהספרייה:</label>
          <select
            style={styles.select}
            value={activeChord.chordName}
            onChange={(e) => {
              const preset = CHORD_LIBRARY[e.target.value];
              if (preset) onUpdateChords(chords.map(c => c.id === activeChord.id ? { ...c, ...preset } : c));
            }}
          >
            {Object.keys(CHORD_LIBRARY).map(k => <option key={k} value={k}>{k}</option>)}
          </select>
          <div style={styles.grid2}>
            <div><label style={styles.label}>התחלה (שנ')</label><input type="number" step="0.1" value={activeChord.startTime} onChange={(e) => onUpdateChords(chords.map(c => c.id === activeChord.id ? { ...c, startTime: Number(e.target.value) } : c))} style={styles.numInput} /></div>
            <div><label style={styles.label}>סיום (שנ')</label><input type="number" step="0.1" value={activeChord.endTime} onChange={(e) => onUpdateChords(chords.map(c => c.id === activeChord.id ? { ...c, endTime: Number(e.target.value) } : c))} style={styles.numInput} /></div>
          </div>
          <SliderRow label="גודל תצוגה (Scale)" val={activeChord.scale || 100} min={50} max={250} unit="%" onChange={(v) => onUpdateChords(chords.map(c => c.id === activeChord.id ? { ...c, scale: v } : c))} />
        </div>
      )}

      {/* ברירת מחדל: כאשר נבחר קליפ וידאו במסילה הראשית (V1) */}
      {itemType === 'video' && (
        <>
          <div style={styles.tabsRow}>
            <Tab btnTab="color" current={activeTab} set={setActiveTab} icon={<Sun size={13} />} label="צבע" />
            <Tab btnTab="transform" current={activeTab} set={setActiveTab} icon={<Move size={13} />} label="מסגור" />
            <Tab btnTab="transitions" current={activeTab} set={setActiveTab} icon={<Sparkles size={13} />} label="מעברים" />
            <Tab btnTab="audio" current={activeTab} set={setActiveTab} icon={<Activity size={13} />} label="שמע ו-EQ" />
          </div>

          <div style={styles.body}>
            {!selectedClip ? (
              <div style={styles.emptyNotice}>בחר מקטע על ציר הזמן למטה כדי לערוך את ההגדרות שלו.</div>
            ) : (
              <>
                {activeTab === 'color' && (
                  <div>
                    <div style={styles.sectionTitle}>פילטר קולנועי מהיר (LUT)</div>
                    <select style={styles.select} value={s.lutPreset} onChange={(e) => setVal('lutPreset', e.target.value)}>
                      {Object.entries(LUT_PRESETS).map(([k, item]) => (<option key={k} value={k}>{item.label}</option>))}
                    </select>
                    <SliderRow label="חשיפה ובהירות" val={s.brightness} min={20} max={200} unit="%" onChange={(v) => setVal('brightness', v)} />
                    <SliderRow label="ניגודיות (Contrast)" val={s.contrast} min={20} max={200} unit="%" onChange={(v) => setVal('contrast', v)} />
                    <SliderRow label="רוויה (Saturation)" val={s.saturate} min={0} max={300} unit="%" onChange={(v) => setVal('saturate', v)} />
                    <SliderRow label="טמפרטורה (חם/קר)" val={s.temperature} min={-100} max={100} onChange={(v) => setVal('temperature', v)} />
                    <SliderRow label="האפלת פינות (Vignette)" val={s.vignette} min={0} max={100} unit="%" onChange={(v) => setVal('vignette', v)} />
                  </div>
                )}

                {activeTab === 'transform' && (
                  <div>
                    <select style={styles.select} value={s.fitMode} onChange={(e) => setVal('fitMode', e.target.value)}>
                      <option value="contain">התאמה מלאה (Contain)</option>
                      <option value="cover">מילוי מסך (Fill / Crop)</option>
                      <option value="blurBg">רקע מטושטש חכם (Blur Background)</option>
                    </select>
                    <label style={styles.checkboxRow}><input type="checkbox" checked={s.mirrorH} onChange={(e) => setVal('mirrorH', e.target.checked)} /> היפוך מראה (לגיטרה)</label>
                    <SliderRow label="זום (Scale)" val={s.scale} min={20} max={300} unit="%" onChange={(v) => setVal('scale', v)} />
                    <SliderRow label="הזזה אופקית (X)" val={s.posX} min={-500} max={500} unit="px" onChange={(v) => setVal('posX', v)} />
                    <SliderRow label="הזזה אנכית (Y)" val={s.posY} min={-400} max={400} unit="px" onChange={(v) => setVal('posY', v)} />
                    <SliderRow label="סיבוב" val={s.rotation} min={-180} max={180} unit="°" onChange={(v) => setVal('rotation', v)} />
                    <SliderRow label="חיתוך עליון/תחתון" val={s.cropTop} min={0} max={45} unit="%" onChange={(v) => { setVal('cropTop', v); setVal('cropBottom', v); }} />
                    <SliderRow label="חיתוך שמאל/ימין" val={s.cropLeft} min={0} max={45} unit="%" onChange={(v) => { setVal('cropLeft', v); setVal('cropRight', v); }} />
                  </div>
                )}

                {activeTab === 'transitions' && (
                  <div>
                    <div style={styles.sectionTitle}>מעברי וידאו מדויקים בין קליפים</div>
                    <label style={styles.label}>מעבר כניסה לקליפ (Transition In)</label>
                    <select style={styles.select} value={s.transitionIn || 'none'} onChange={(e) => setVal('transitionIn', e.target.value)}>
                      {Object.entries(TRANSITION_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                    <label style={styles.label}>מעבר יציאה מהקליפ (Transition Out)</label>
                    <select style={styles.select} value={s.transitionOut || 'none'} onChange={(e) => setVal('transitionOut', e.target.value)}>
                      {Object.entries(TRANSITION_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                    <SliderRow label="משך עמעום כניסה (Fade In)" val={s.fadeIn} min={0} max={4} step={0.1} unit="s" onChange={(v) => setVal('fadeIn', v)} />
                    <SliderRow label="משך עמעום יציאה (Fade Out)" val={s.fadeOut} min={0} max={4} step={0.1} unit="s" onChange={(v) => setVal('fadeOut', v)} />
                    <SliderRow label="מהירות ניגון קליפ (Speed)" val={s.speed} min={0.25} max={3.0} step={0.05} unit="x" onChange={(v) => setVal('speed', v)} />
                    <SliderRow label="טשטוש מסך (Blur)" val={s.blur} min={0} max={10} step={0.5} unit="px" onChange={(v) => setVal('blur', v)} />
                  </div>
                )}

                {activeTab === 'audio' && (
                  <div>
                    <div style={styles.sectionTitle}>עוצמה ומעברי שמע (Audio Fades)</div>
                    <SliderRow label="ווליום קליפ" val={s.volume} min={0} max={200} unit="%" onChange={(v) => setVal('volume', v)} />
                    <SliderRow label="כניסת סאונד רכה (Audio Fade In)" val={s.audioFadeIn || 0} min={0} max={5} step={0.1} unit="s" onChange={(v) => setVal('audioFadeIn', v)} />
                    <SliderRow label="יציאת סאונד רכה (Audio Fade Out)" val={s.audioFadeOut || 0} min={0} max={5} step={0.1} unit="s" onChange={(v) => setVal('audioFadeOut', v)} />
                    <SliderRow label="איזון שמאל/ימין (Pan)" val={s.pan || 0} min={-100} max={100} onChange={(v) => setVal('pan', v)} />
                    <div style={styles.sectionTitle}>איקוולייזר וניקוי רעשים (EQ)</div>
                    <SliderRow label="חיתוך רעשי בס (Low Cut)" val={s.audioEq?.lowCutHz || 20} min={20} max={250} unit="Hz" onChange={(v) => setNestedVal('audioEq', 'lowCutHz', v)} />
                    <SliderRow label="תדרים נמוכים (Bass)" val={s.audioEq?.lowGainDb || 0} min={-12} max={12} unit="dB" onChange={(v) => setNestedVal('audioEq', 'lowGainDb', v)} />
                    <SliderRow label="תדרי ביניים (Mid)" val={s.audioEq?.midGainDb || 0} min={-12} max={12} unit="dB" onChange={(v) => setNestedVal('audioEq', 'midGainDb', v)} />
                    <SliderRow label="תדרים גבוהים (Treble)" val={s.audioEq?.highGainDb || 0} min={-12} max={12} unit="dB" onChange={(v) => setNestedVal('audioEq', 'highGainDb', v)} />
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
});

export default InspectorPanel;

const Tab = ({ btnTab, current, set, icon, label }) => (
  <button style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '7px 2px', backgroundColor: current === btnTab ? '#1c1c1f' : 'transparent', border: 'none', borderBottom: `2px solid ${current === btnTab ? '#38bdf8' : 'transparent'}`, color: current === btnTab ? '#38bdf8' : '#71717a', fontSize: 10, fontWeight: 600, cursor: 'pointer' }} onClick={() => set(btnTab)}>
    {icon} <span>{label}</span>
  </button>
);

function SliderRow({ label, val, min, max, step = 1, unit = '', onChange }) {
  return (
    <div style={styles.sliderWrap}>
      <div style={styles.sliderTop}>
        <span>{label}</span>
        <span style={{ fontFamily: 'monospace', color: '#38bdf8' }}>{val}{unit}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={val ?? 0} onChange={(e) => onChange(Number(e.target.value))} style={{ width: '100%', accentColor: '#3b82f6', cursor: 'pointer' }} />
    </div>
  );
}

const styles = {
  panel: { display: 'flex', flexDirection: 'column', height: '100%', direction: 'rtl' },
  selectedBanner: { padding: '8px 10px', backgroundColor: '#141416', borderBottom: '1px solid #27272a', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 },
  miniTopBtn: { backgroundColor: '#27272a', border: '1px solid #3f3f46', color: '#e4e4e7', fontSize: 10, padding: '3px 6px', borderRadius: 4, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 },
  tabsRow: { display: 'flex', backgroundColor: '#141416', borderBottom: '1px solid #27272a', flexShrink: 0 },
  body: { padding: 12, overflowY: 'auto', flex: 1 },
  sectionTitle: { fontSize: 11, fontWeight: 700, color: '#38bdf8', marginTop: 10, marginBottom: 8, paddingBottom: 4, borderBottom: '1px solid #27272a' },
  sliderWrap: { marginBottom: 10 },
  sliderTop: { display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#d4d4d8', marginBottom: 3 },
  select: { width: '100%', backgroundColor: '#27272a', color: '#fff', border: '1px solid #3f3f46', padding: '6px 8px', borderRadius: 4, fontSize: 12, marginBottom: 10 },
  checkboxRow: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: '#e4e4e7', marginBottom: 12, cursor: 'pointer' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 },
  label: { display: 'block', fontSize: 10, color: '#a1a1aa', marginBottom: 4 },
  numInput: { width: '100%', backgroundColor: '#27272a', border: '1px solid #3f3f46', color: '#fff', padding: '5px 6px', borderRadius: 4, fontSize: 11, boxSizing: 'border-box' },
  emptyNotice: { fontSize: 12, color: '#71717a', textAlign: 'center', marginTop: 30, lineHeight: 1.5 }
};
