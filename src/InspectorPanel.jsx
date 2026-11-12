import React, { useState } from 'react';
import { Sun, Move, Layers, Clock, Image as ImageIcon, Type, RotateCcw, Trash2, Plus, X, Music } from 'lucide-react';
import { LUT_PRESETS, DEFAULT_CLIP_SETTINGS, DEFAULT_TEXT_OBJECT, DEFAULT_CHORD_OVERLAY } from './defaultState';

export default function InspectorPanel({
  selectedClip, onUpdateClip, onDeleteClip, pipSettings, onUpdatePip,
  hasPip, texts, onUpdateTexts, chords, onUpdateChords, videoDuration
}) {
  const [activeTab, setActiveTab] = useState('color');
  const [selectedTextId, setSelectedTextId] = useState(null);

  const s = selectedClip?.settings || DEFAULT_CLIP_SETTINGS;
  const setVal = (key, val) => { if (selectedClip) onUpdateClip(selectedClip.id, { ...s, [key]: val }); };

  const resetTabSettings = () => {
    if (!selectedClip) return;
    let newS = { ...s };
    if (activeTab === 'color') {
      newS.brightness = 100; newS.contrast = 100; newS.saturate = 100; newS.temperature = 0; newS.hueRotate = 0; newS.shadows = 0; newS.highlights = 0; newS.lutPreset = 'none';
    } else if (activeTab === 'transform') {
      newS.fitMode = 'contain'; newS.scale = 100; newS.posX = 0; newS.posY = 0; newS.rotation = 0; newS.mirrorH = false; newS.mirrorV = false; newS.cropTop = 0; newS.cropBottom = 0; newS.cropLeft = 0; newS.cropRight = 0;
    } else if (activeTab === 'fx') {
      newS.opacity = 100; newS.blendMode = 'normal'; newS.blur = 0; newS.vignette = 0; newS.fadeIn = 0; newS.fadeOut = 0; newS.blurMasks = [];
    } else if (activeTab === 'time') {
      newS.speed = 1.0; newS.volume = 100;
    }
    onUpdateClip(selectedClip.id, newS);
  };

  const handleAddText = () => {
    const newText = { ...DEFAULT_TEXT_OBJECT, id: 'txt-' + Date.now() };
    onUpdateTexts([...(texts || []), newText]);
    setSelectedTextId(newText.id);
  };
  
  const handleAddChord = () => {
    const newChord = { ...DEFAULT_CHORD_OVERLAY, id: 'chord-' + Date.now() };
    onUpdateChords([...(chords || []), newChord]);
  };

  return (
    <aside style={styles.panel}>
      <div style={styles.header}>
        <span>Inspector</span>
        {selectedClip && (
          <button style={styles.resetBtn} onClick={resetTabSettings} title="איפוס קטגוריה"><RotateCcw size={10} /> איפוס</button>
        )}
      </div>

      <div style={styles.tabsRow}>
        <Tab btnTab="color" current={activeTab} set={setActiveTab} icon={<Sun size={13} />} label="צבע" />
        <Tab btnTab="transform" current={activeTab} set={setActiveTab} icon={<Move size={13} />} label="מסגור" />
        <Tab btnTab="fx" current={activeTab} set={setActiveTab} icon={<Layers size={13} />} label="אפקטים" />
        <Tab btnTab="time" current={activeTab} set={setActiveTab} icon={<Clock size={13} />} label="זמן/שמע" />
        <Tab btnTab="pip" current={activeTab} set={setActiveTab} icon={<ImageIcon size={13} />} label="PiP/אקורד" />
        <Tab btnTab="text" current={activeTab} set={setActiveTab} icon={<Type size={13} />} label="טקסט" />
      </div>

      <div style={styles.body}>
        {!['pip','text'].includes(activeTab) && !selectedClip && <div style={styles.emptyNotice}>בחר מקטע וידאו על ציר הזמן.</div>}

        {activeTab === 'color' && selectedClip && (
          <div>
            <div style={styles.sectionTitle}>לוחות צבע (LUTs)</div>
            <select style={styles.select} value={s.lutPreset} onChange={(e) => setVal('lutPreset', e.target.value)}>
              {Object.entries(LUT_PRESETS).map(([key, item]) => (<option key={key} value={key}>{item.label}</option>))}
            </select>
            <div style={styles.sectionTitle}>חשיפה וצבע</div>
            <SliderRow label="חשיפה" val={s.brightness} min={20} max={200} unit="%" onChange={(v) => setVal('brightness', v)} />
            <SliderRow label="ניגודיות" val={s.contrast} min={20} max={200} unit="%" onChange={(v) => setVal('contrast', v)} />
            <SliderRow label="רוויה" val={s.saturate} min={0} max={300} unit="%" onChange={(v) => setVal('saturate', v)} />
            <SliderRow label="טמפרטורה" val={s.temperature} min={-100} max={100} onChange={(v) => setVal('temperature', v)} />
          </div>
        )}

        {activeTab === 'transform' && selectedClip && (
          <div>
             <div style={styles.sectionTitle}>התאמה למסגרת וידאו</div>
            <select style={styles.select} value={s.fitMode} onChange={(e) => setVal('fitMode', e.target.value)}>
              <option value="contain">התאמה מלאה (Contain)</option>
              <option value="cover">מילוי מסך (Fill / Crop)</option>
              <option value="blurBg">רקע מטושטש חכם (Blur Background)</option>
            </select>
            <div style={styles.sectionTitle}>היפוך צילום</div>
            <label style={styles.checkboxRow}><input type="checkbox" checked={s.mirrorH} onChange={(e) => setVal('mirrorH', e.target.checked)} /> אופקי (מראה לגיטרה)</label>
            <SliderRow label="זום" val={s.scale} min={20} max={300} unit="%" onChange={(v) => setVal('scale', v)} />
            <SliderRow label="סיבוב" val={s.rotation} min={-180} max={180} unit="°" onChange={(v) => setVal('rotation', v)} />
          </div>
        )}

        {activeTab === 'fx' && selectedClip && (
          <div>
            <SliderRow label="טשטוש מסך" val={s.blur} min={0} max={5} step={0.1} unit="px" onChange={(v) => setVal('blur', v)} />
            <SliderRow label="אטימות" val={s.opacity} min={0} max={100} unit="%" onChange={(v) => setVal('opacity', v)} />
          </div>
        )}

        {activeTab === 'time' && selectedClip && (
          <div>
            <SliderRow label="מהירות" val={s.speed} min={0.25} max={3.0} step={0.05} unit="x" onChange={(v) => setVal('speed', v)} />
            <SliderRow label="ווליום" val={s.volume} min={0} max={150} unit="%" onChange={(v) => setVal('volume', v)} />
            <button style={styles.deleteBtn} onClick={() => onDeleteClip(selectedClip.id)}><Trash2 size={14} /> מחק מקטע זה</button>
          </div>
        )}

        {activeTab === 'pip' && (
          <div>
             <div style={styles.sectionTitle}>אקורדים (Chords Overlay)</div>
             <button style={styles.actionBtn} onClick={handleAddChord}><Plus size={14} /> הוסף תרשים אקורד</button>
             
             <div style={styles.sectionTitle}>חלון וידאו (PiP)</div>
             {!hasPip ? <div style={styles.emptyNotice}>העלה PiP במאגר.</div> : (
              <div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  <div style={{ flex: 1 }}><label style={styles.label}>התחלה(s)</label><input type="number" step="0.1" min="0" value={pipSettings.startTime} onChange={(e) => onUpdatePip({...pipSettings, startTime: Number(e.target.value)})} style={styles.numInput} /></div>
                  <div style={{ flex: 1 }}><label style={styles.label}>סיום(s)</label><input type="number" step="0.1" min="0" value={pipSettings.endTime} onChange={(e) => onUpdatePip({...pipSettings, endTime: Number(e.target.value)})} style={styles.numInput} /></div>
                </div>
                <SliderRow label="שקיפות" val={pipSettings.opacity} min={10} max={100} unit="%" onChange={(v) => onUpdatePip({...pipSettings, opacity: v})} />
              </div>
            )}
          </div>
        )}

        {activeTab === 'text' && (
          <div>
             <button style={styles.actionBtn} onClick={handleAddText}><Plus size={14} /> הוסף טקסט</button>
             {texts?.map(t => (
               <div key={t.id} style={styles.subCard}>
                  <div style={{display:'flex', justifyContent:'space-between', marginBottom: 6}}>
                    <input type="text" value={t.content} onChange={(e) => onUpdateTexts(texts.map(tx => tx.id === t.id ? {...tx, content: e.target.value} : tx))} style={{...styles.numInput, width:'80%'}} />
                    <button onClick={() => onUpdateTexts(texts.filter(tx => tx.id !== t.id))} style={{background:'none', border:'none', color:'#ef4444', cursor:'pointer'}}><Trash2 size={14}/></button>
                  </div>
               </div>
             ))}
          </div>
        )}
      </div>
    </aside>
  );
}

const Tab = ({ btnTab, current, set, icon, label }) => (
  <button style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '7px 1px', backgroundColor: current === btnTab ? '#1c1c1f' : 'transparent', border: 'none', borderBottom: `2px solid ${current === btnTab ? '#38bdf8' : 'transparent'}`, color: current === btnTab ? '#38bdf8' : '#71717a', fontSize: 10, cursor: 'pointer' }} onClick={() => set(btnTab)}>
    {icon} <span>{label}</span>
  </button>
);

function SliderRow({ label, val, min, max, step = 1, unit='', onChange }) {
  return (
    <div style={styles.sliderWrap}>
      <div style={styles.sliderTop}><span>{label}</span><span style={{fontFamily:'monospace', color:'#a1a1aa'}}>{val}{unit}</span></div>
      <input type="range" min={min} max={max} step={step} value={val} onChange={(e) => onChange(Number(e.target.value))} style={{width:'100%', cursor:'pointer'}} />
    </div>
  );
}

const styles = { panel: { width: 300, backgroundColor: '#18181b', borderRight: '1px solid #27272a', display: 'flex', flexDirection: 'column', minHeight: 0, flexShrink: 0, direction: 'rtl' }, header: { height: 34, backgroundColor: '#121214', borderBottom: '1px solid #27272a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px', fontSize: 12, fontWeight: 600, color: '#d4d4d8' }, resetBtn: { display: 'flex', alignItems: 'center', gap: 4, backgroundColor: '#27272a', border: '1px solid #3f3f46', color: '#e4e4e7', fontSize: 10, padding: '3px 6px', borderRadius: 4, cursor: 'pointer' }, tabsRow: { display: 'flex', backgroundColor: '#141416', borderBottom: '1px solid #27272a' }, body: { padding: 12, overflowY: 'auto', flex: 1 }, sectionTitle: { fontSize: 11, fontWeight: 700, color: '#38bdf8', marginTop: 10, marginBottom: 8, paddingBottom: 4, borderBottom: '1px solid #27272a' }, sliderWrap: { marginBottom: 9 }, sliderTop: { display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#d4d4d8', marginBottom: 3 }, select: { width: '100%', backgroundColor: '#27272a', color: '#fff', border: '1px solid #3f3f46', padding: '6px 8px', borderRadius: 4, fontSize: 12, marginBottom: 10 }, checkboxRow: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#e4e4e7', marginBottom: 12, cursor: 'pointer' }, actionBtn: { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#2563eb', border: 'none', color: '#fff', padding: '8px', borderRadius: 4, fontSize: 12, cursor: 'pointer', marginBottom: 10 }, subCard: { backgroundColor: '#121214', border: '1px solid #27272a', borderRadius: 6, padding: 10, marginTop: 10, marginBottom: 10 }, label: { display: 'block', fontSize: 11, color: '#a1a1aa', marginBottom: 4 }, numInput: { width: '100%', backgroundColor: '#27272a', border: '1px solid #3f3f46', color: '#fff', padding: '5px 6px', borderRadius: 4, fontSize: 12, boxSizing: 'border-box' }, deleteBtn: { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#dc2626', border: 'none', color: '#fff', padding: '8px 12px', borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: 'pointer', marginTop: 14 }, emptyNotice: { fontSize: 12, color: '#71717a', textAlign: 'center', marginTop: 30, lineHeight: 1.5 } };
