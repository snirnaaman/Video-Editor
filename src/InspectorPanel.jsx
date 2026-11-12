import React, { useState } from 'react';
import {
  Sun, Move, Layers, Clock, Image as ImageIcon, Type,
  RotateCcw, Trash2, Plus, X, Activity, Clipboard, Copy
} from 'lucide-react';
import { LUT_PRESETS, DEFAULT_CLIP_SETTINGS, DEFAULT_TEXT_OBJECT, DEFAULT_CHORD_OVERLAY } from './defaultState';

const InspectorPanel = React.memo(function InspectorPanel({
  selectedClip, allClips, onUpdateClip, onUpdateClipsBulk, onDeleteClip,
  pipSettings, onUpdatePip, hasPip, texts, onUpdateTexts, chords, onUpdateChords, videoDuration, currentTime
}) {
  const [activeTab, setActiveTab] = useState('color');
  const [colorSubTab, setColorSubTab] = useState('basic');
  const [audioSubTab, setAudioSubTab] = useState('volume');
  const [selectedTextId, setSelectedTextId] = useState(null);
  
  // הזיכרון המקומי להעתקת הגדרות
  const [clipboardSettings, setClipboardSettings] = useState(null);

  const s = selectedClip?.settings || DEFAULT_CLIP_SETTINGS;

  const setVal = (key, val) => { if (selectedClip) onUpdateClip(selectedClip.id, { ...s, [key]: val }); };
  const setNestedVal = (parentKey, childKey, val) => {
    if (selectedClip) onUpdateClip(selectedClip.id, { ...s, [parentKey]: { ...s[parentKey], [childKey]: val } });
  };

  const getActiveTabKeys = () => {
    switch(activeTab) {
      case 'color': return ['brightness', 'contrast', 'saturate', 'temperature', 'hueRotate', 'shadows', 'highlights', 'lutPreset', 'colorWheels', 'hslQualifier', 'curves', 'pivot', 'vibrance', 'midtoneDetail'];
      case 'transform': return ['fitMode', 'scale', 'posX', 'posY', 'rotation', 'mirrorH', 'mirrorV', 'cropTop', 'cropBottom', 'cropLeft', 'cropRight'];
      case 'fx': return ['opacity', 'blendMode', 'blur', 'vignette', 'fadeIn', 'fadeOut', 'blurMasks'];
      case 'audio': return ['volume', 'pan', 'audioFadeIn', 'audioFadeOut', 'audioEq'];
      case 'time': return ['speed', 'reverse'];
      default: return [];
    }
  };

  const resetTabSettings = () => {
    if (!selectedClip) return;
    let newS = { ...s };
    const keys = getActiveTabKeys();
    keys.forEach(k => newS[k] = DEFAULT_CLIP_SETTINGS[k]);
    onUpdateClip(selectedClip.id, newS);
  };

  const handleApplyToAll = () => {
    if (!selectedClip || !allClips) return;
    const keys = getActiveTabKeys();
    const newClips = allClips.map(c => {
      if (c.id === selectedClip.id) return c;
      const updatedS = { ...c.settings };
      keys.forEach(k => updatedS[k] = s[k]);
      return { ...c, settings: updatedS };
    });
    onUpdateClipsBulk(newClips);
  };

  const handleCopyPaste = () => {
    if (!selectedClip) return;
    if (clipboardSettings) {
      // Paste
      onUpdateClip(selectedClip.id, clipboardSettings);
      setClipboardSettings(null); // איפוס אחרי הדבקה
    } else {
      // Copy
      setClipboardSettings(structuredClone(s));
      alert('הגדרות המקטע הועתקו.');
    }
  };

  const handleAddText = () => {
    const newText = { ...DEFAULT_TEXT_OBJECT, id: 'txt-' + Date.now(), startTime: currentTime, endTime: currentTime + 5 };
    onUpdateTexts([...(texts || []), newText]);
    setSelectedTextId(newText.id);
  };
  
  const handleAddChord = () => {
    onUpdateChords([...(chords || []), { ...DEFAULT_CHORD_OVERLAY, id: 'chord-' + Date.now(), startTime: currentTime, endTime: currentTime + 5 }]);
  };

  const handleAddBlurMask = () => {
    const newMask = { id: 'mask-' + Date.now(), x: 100, y: 100, width: 150, height: 150, amount: 5, shape: 'rect' };
    setVal('blurMasks', [...(s.blurMasks || []), newMask]);
  };

  return (
    <aside style={styles.panel}>
      <div style={styles.header}>
        <span>Inspector</span>
        {selectedClip && (
          <div style={{ display: 'flex', gap: 4 }}>
            <button style={styles.resetBtn} onClick={handleCopyPaste} title="העתק / הדבק הגדרות">
              {clipboardSettings ? <Clipboard size={10} color="#38bdf8" /> : <Copy size={10} />}
            </button>
            <button style={styles.resetBtn} onClick={handleApplyToAll} title="החל קטגוריה זו על כל המקטעים">
              <Layers size={10} /> הכל
            </button>
            <button style={styles.resetBtn} onClick={resetTabSettings} title="איפוס קטגוריה">
              <RotateCcw size={10} /> איפוס
            </button>
          </div>
        )}
      </div>

      <div style={styles.tabsRow}>
        <Tab btnTab="color" current={activeTab} set={setActiveTab} icon={<Sun size={13} />} label="צבע" />
        <Tab btnTab="transform" current={activeTab} set={setActiveTab} icon={<Move size={13} />} label="מסגור" />
        <Tab btnTab="fx" current={activeTab} set={setActiveTab} icon={<Layers size={13} />} label="אפקטים" />
        <Tab btnTab="audio" current={activeTab} set={setActiveTab} icon={<Activity size={13} />} label="מיקסר" />
        <Tab btnTab="pip" current={activeTab} set={setActiveTab} icon={<ImageIcon size={13} />} label="PiP" />
        <Tab btnTab="text" current={activeTab} set={setActiveTab} icon={<Type size={13} />} label="טקסט" />
      </div>

      <div style={styles.body}>
        {!['pip','text'].includes(activeTab) && !selectedClip && <div style={styles.emptyNotice}>בחר מקטע וידאו על ציר הזמן.</div>}

        {activeTab === 'color' && selectedClip && (
          <div>
            <div style={styles.subTabsRow}>
              <button style={{...styles.subTabBtn, color: colorSubTab === 'basic' ? '#38bdf8' : '#71717a'}} onClick={() => setColorSubTab('basic')}>בסיסי</button>
              <button style={{...styles.subTabBtn, color: colorSubTab === 'wheels' ? '#38bdf8' : '#71717a'}} onClick={() => setColorSubTab('wheels')}>Wheels</button>
            </div>
            {colorSubTab === 'basic' && (
              <div>
                <select style={styles.select} value={s.lutPreset} onChange={(e) => setVal('lutPreset', e.target.value)}>
                  {Object.entries(LUT_PRESETS).map(([k, item]) => (<option key={k} value={k}>{item.label}</option>))}
                </select>
                <SliderRow label="חשיפה" val={s.brightness} min={20} max={200} unit="%" onChange={(v) => setVal('brightness', v)} />
                <SliderRow label="ניגודיות" val={s.contrast} min={20} max={200} unit="%" onChange={(v) => setVal('contrast', v)} />
                <SliderRow label="רוויה" val={s.saturate} min={0} max={300} unit="%" onChange={(v) => setVal('saturate', v)} />
                <SliderRow label="טמפרטורה" val={s.temperature} min={-100} max={100} onChange={(v) => setVal('temperature', v)} />
              </div>
            )}
            {colorSubTab === 'wheels' && (
              <div style={{ textAlign: 'center', marginTop: 10 }}>
                <SliderRow label="כהים (Lift Y)" val={s.colorWheels?.lift?.y || 0} min={-100} max={100} onChange={(v) => setNestedVal('colorWheels', 'lift', { r:0, g:0, b:0, y: v })} />
                <SliderRow label="ביניים (Gamma Y)" val={s.colorWheels?.gamma?.y || 0} min={-100} max={100} onChange={(v) => setNestedVal('colorWheels', 'gamma', { r:0, g:0, b:0, y: v })} />
                <SliderRow label="בהירים (Gain Y)" val={s.colorWheels?.gain?.y || 0} min={-100} max={100} onChange={(v) => setNestedVal('colorWheels', 'gain', { r:0, g:0, b:0, y: v })} />
              </div>
            )}
          </div>
        )}

        {activeTab === 'transform' && selectedClip && (
          <div>
            <select style={styles.select} value={s.fitMode} onChange={(e) => setVal('fitMode', e.target.value)}>
              <option value="contain">התאמה מלאה (Contain)</option>
              <option value="cover">מילוי מסך (Fill / Crop)</option>
              <option value="blurBg">רקע מטושטש חכם (Blur Background)</option>
            </select>
            <label style={styles.checkboxRow}><input type="checkbox" checked={s.mirrorH} onChange={(e) => setVal('mirrorH', e.target.checked)} /> אופקי (מראה לגיטרה)</label>
            <SliderRow label="זום (Scale)" val={s.scale} min={20} max={300} unit="%" onChange={(v) => setVal('scale', v)} />
            <SliderRow label="הזזה (X)" val={s.posX} min={-400} max={400} unit="px" onChange={(v) => setVal('posX', v)} />
            <SliderRow label="הזזה (Y)" val={s.posY} min={-300} max={300} unit="px" onChange={(v) => setVal('posY', v)} />
            <SliderRow label="סיבוב (Rotation)" val={s.rotation} min={-180} max={180} unit="°" onChange={(v) => setVal('rotation', v)} />
            <SliderRow label="חיתוך עליון" val={s.cropTop} min={0} max={45} unit="%" onChange={(v) => setVal('cropTop', v)} />
            <SliderRow label="חיתוך תחתון" val={s.cropBottom} min={0} max={45} unit="%" onChange={(v) => setVal('cropBottom', v)} />
            <SliderRow label="חיתוך ימין/שמאל" val={s.cropLeft} min={0} max={45} unit="%" onChange={(v) => { setVal('cropLeft', v); setVal('cropRight', v); }} />
          </div>
        )}

        {activeTab === 'fx' && selectedClip && (
          <div>
            <SliderRow label="עמעום כניסה (Fade In)" val={s.fadeIn} min={0} max={3} step={0.1} unit="s" onChange={(v) => setVal('fadeIn', v)} />
            <SliderRow label="עמעום יציאה (Fade Out)" val={s.fadeOut} min={0} max={3} step={0.1} unit="s" onChange={(v) => setVal('fadeOut', v)} />
            <SliderRow label="טשטוש מסך" val={s.blur} min={0} max={5} step={0.1} unit="px" onChange={(v) => setVal('blur', v)} />
            <SliderRow label="אטימות" val={s.opacity} min={0} max={100} unit="%" onChange={(v) => setVal('opacity', v)} />

            <button style={styles.actionBtn} onClick={handleAddBlurMask}><Plus size={14} /> הוסף מסכת טשטוש</button>
            {(s.blurMasks || []).map((mask, i) => (
              <div key={mask.id} style={styles.subCard}>
                <div style={{display:'flex', justifyContent:'space-between', marginBottom: 6}}>
                  <strong style={{fontSize:11, color:'#e4e4e7'}}>מסכה {i+1}</strong>
                  <button onClick={() => setVal('blurMasks', s.blurMasks.filter(m => m.id !== mask.id))} style={{background:'none', border:'none', color:'#ef4444', cursor:'pointer'}}><X size={14}/></button>
                </div>
                <SliderRow label="עוצמת טשטוש" val={mask.amount} min={1} max={20} unit="px" onChange={(v) => setVal('blurMasks', s.blurMasks.map(m => m.id === mask.id ? { ...m, amount: v } : m))} />
              </div>
            ))}
          </div>
        )}

        {activeTab === 'audio' && selectedClip && (
          <div>
            <div style={styles.subTabsRow}>
              <button style={{...styles.subTabBtn, color: audioSubTab === 'volume' ? '#10b981' : '#71717a'}} onClick={() => setAudioSubTab('volume')}>כללי</button>
              <button style={{...styles.subTabBtn, color: audioSubTab === 'eq' ? '#10b981' : '#71717a'}} onClick={() => setAudioSubTab('eq')}>EQ</button>
            </div>
            {audioSubTab === 'volume' && (
              <div>
                <SliderRow label="ווליום ראשי" val={s.volume} min={0} max={200} unit="%" onChange={(v) => setVal('volume', v)} />
                <SliderRow label="איזון שמאל/ימין" val={s.pan || 0} min={-100} max={100} onChange={(v) => setVal('pan', v)} />
              </div>
            )}
            {audioSubTab === 'eq' && (
              <div>
                <SliderRow label="חיתוך בס (HPF)" val={s.audioEq?.lowCutHz || 20} min={20} max={200} unit="Hz" onChange={(v) => setNestedVal('audioEq', 'lowCutHz', v)} />
                <SliderRow label="נמוכים (Bass)" val={s.audioEq?.lowGainDb || 0} min={-12} max={12} unit="dB" onChange={(v) => setNestedVal('audioEq', 'lowGainDb', v)} />
                <SliderRow label="ביניים (Mid)" val={s.audioEq?.midGainDb || 0} min={-12} max={12} unit="dB" onChange={(v) => setNestedVal('audioEq', 'midGainDb', v)} />
                <SliderRow label="גבוהים (Treble)" val={s.audioEq?.highGainDb || 0} min={-12} max={12} unit="dB" onChange={(v) => setNestedVal('audioEq', 'highGainDb', v)} />
              </div>
            )}
          </div>
        )}

        {activeTab === 'time' && selectedClip && (
          <div>
            <SliderRow label="מהירות (Speed)" val={s.speed} min={0.25} max={4.0} step={0.05} unit="x" onChange={(v) => setVal('speed', v)} />
            <button style={{...styles.deleteBtn, marginTop: 30}} onClick={() => onDeleteClip(selectedClip.id)}><Trash2 size={14} /> מחק מקטע</button>
          </div>
        )}

        {activeTab === 'pip' && (
          <div>
             <button style={{...styles.actionBtn, backgroundColor: '#0ea5e9'}} onClick={handleAddChord}><Plus size={14} /> הוסף תרשים אקורד</button>
             {!hasPip ? <div style={styles.emptyNotice}>העלה תמונה/וידאו בלשונית מדיה.</div> : (
              <div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 12, marginTop: 12 }}>
                  <div style={{ flex: 1 }}><label style={styles.label}>התחלה</label><input type="number" step="0.1" min="0" value={pipSettings.startTime} onChange={(e) => onUpdatePip({...pipSettings, startTime: Number(e.target.value)})} style={styles.numInput} /></div>
                  <div style={{ flex: 1 }}><label style={styles.label}>סיום</label><input type="number" step="0.1" min="0" value={pipSettings.endTime} onChange={(e) => onUpdatePip({...pipSettings, endTime: Number(e.target.value)})} style={styles.numInput} /></div>
                </div>
                <SliderRow label="שקיפות (Opacity)" val={pipSettings.opacity} min={10} max={100} unit="%" onChange={(v) => onUpdatePip({...pipSettings, opacity: v})} />
              </div>
            )}
          </div>
        )}

        {activeTab === 'text' && (
          <div>
             <button style={styles.actionBtn} onClick={handleAddText}><Plus size={14} /> הוסף כותרת טקסט</button>
             {texts?.map(t => (
               <div key={t.id} style={styles.subCard}>
                  <div style={{display:'flex', justifyContent:'space-between', marginBottom: 8}}>
                    <input type="text" value={t.content} onChange={(e) => onUpdateTexts(texts.map(tx => tx.id === t.id ? {...tx, content: e.target.value} : tx))} style={{...styles.numInput, width:'80%'}} />
                    <button onClick={() => onUpdateTexts(texts.filter(tx => tx.id !== t.id))} style={{background:'none', border:'none', color:'#ef4444', cursor:'pointer'}}><Trash2 size={14}/></button>
                  </div>
                  <SliderRow label="גודל" val={t.fontSize} min={12} max={120} unit="px" onChange={(v) => onUpdateTexts(texts.map(tx => tx.id === t.id ? {...tx, fontSize: v} : tx))} />
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 4 }}>
                    <label style={styles.label}>צבע:</label>
                    <input type="color" value={t.color} onChange={(e) => onUpdateTexts(texts.map(tx => tx.id === t.id ? {...tx, color: e.target.value} : tx))} style={{ background:'none', border:'none', cursor:'pointer' }} />
                  </div>
               </div>
             ))}
          </div>
        )}
      </div>
    </aside>
  );
});

export default InspectorPanel;

const Tab = ({ btnTab, current, set, icon, label }) => (
  <button style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '7px 1px', backgroundColor: current === btnTab ? '#1c1c1f' : 'transparent', border: 'none', borderBottom: `2px solid ${current === btnTab ? '#38bdf8' : 'transparent'}`, color: current === btnTab ? '#38bdf8' : '#71717a', fontSize: 10, cursor: 'pointer', outline: 'none' }} onClick={() => set(btnTab)}>
    {icon} <span>{label}</span>
  </button>
);

function SliderRow({ label, val, min, max, step = 1, unit='', onChange }) {
  return (
    <div style={styles.sliderWrap}>
      <div style={styles.sliderTop}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><div style={styles.keyframeDot}/><span>{label}</span></div>
        <span style={{fontFamily:'monospace', color:'#a1a1aa'}}>{val}{unit}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={val} onChange={(e) => onChange(Number(e.target.value))} style={{width:'100%', cursor:'pointer'}} />
    </div>
  );
}

const styles = { 
  panel: { width: 310, backgroundColor: '#18181b', borderRight: '1px solid #27272a', display: 'flex', flexDirection: 'column', minHeight: 0, flexShrink: 0, direction: 'rtl' }, 
  header: { height: 34, backgroundColor: '#121214', borderBottom: '1px solid #27272a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px', fontSize: 12, fontWeight: 600, color: '#d4d4d8' }, 
  resetBtn: { display: 'flex', alignItems: 'center', gap: 4, backgroundColor: '#27272a', border: '1px solid #3f3f46', color: '#e4e4e7', fontSize: 10, padding: '3px 8px', borderRadius: 4, cursor: 'pointer' }, 
  tabsRow: { display: 'flex', backgroundColor: '#141416', borderBottom: '1px solid #27272a' }, 
  subTabsRow: { display: 'flex', borderBottom: '1px solid #27272a', marginBottom: 12, paddingBottom: 4, marginTop: 4, justifyContent: 'center', gap: 15 },
  subTabBtn: { background: 'none', border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer', padding: '4px 6px' },
  body: { padding: 12, overflowY: 'auto', flex: 1 }, 
  sectionTitle: { fontSize: 11, fontWeight: 700, color: '#38bdf8', marginTop: 14, marginBottom: 8, paddingBottom: 4, borderBottom: '1px solid #27272a' }, 
  sliderWrap: { marginBottom: 10 }, 
  sliderTop: { display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#d4d4d8', marginBottom: 4 }, 
  keyframeDot: { width: 6, height: 6, backgroundColor: '#52525b', transform: 'rotate(45deg)', cursor: 'pointer' },
  select: { width: '100%', backgroundColor: '#27272a', color: '#fff', border: '1px solid #3f3f46', padding: '6px 8px', borderRadius: 4, fontSize: 12, marginBottom: 10, outline: 'none' }, 
  checkboxRow: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: '#e4e4e7', marginBottom: 12, cursor: 'pointer' }, 
  actionBtn: { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#2563eb', border: 'none', color: '#fff', padding: '8px', borderRadius: 4, fontSize: 12, cursor: 'pointer', marginBottom: 10 }, 
  subCard: { backgroundColor: '#121214', border: '1px solid #27272a', borderRadius: 6, padding: 10, marginTop: 10, marginBottom: 10 }, 
  label: { display: 'block', fontSize: 10, color: '#a1a1aa', marginBottom: 4 }, 
  numInput: { width: '100%', backgroundColor: '#27272a', border: '1px solid #3f3f46', color: '#fff', padding: '5px 6px', borderRadius: 4, fontSize: 11, boxSizing: 'border-box', outline: 'none' }, 
  deleteBtn: { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#dc2626', border: 'none', color: '#fff', padding: '8px 12px', borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: 'pointer' }, 
  emptyNotice: { fontSize: 12, color: '#71717a', textAlign: 'center', marginTop: 30, lineHeight: 1.5 } 
};
