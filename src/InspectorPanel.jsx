import React, { useState } from 'react';
import {
  Sun, Move, Layers, Clock, Image as ImageIcon, Type,
  RotateCcw, Trash2, Plus, X
} from 'lucide-react';
import { LUT_PRESETS, DEFAULT_CLIP_SETTINGS, DEFAULT_TEXT_OBJECT } from './defaultState';

export default function InspectorPanel({
  selectedClip,
  onUpdateClip,
  onDeleteClip,
  pipSettings,
  onUpdatePip,
  hasPip,
  texts,
  onUpdateTexts,
  videoDuration
}) {
  const [activeTab, setActiveTab] = useState('color');
  const [selectedTextId, setSelectedTextId] = useState(null);

  const s = selectedClip?.settings || DEFAULT_CLIP_SETTINGS;

  const setVal = (key, val) => {
    if (!selectedClip) return;
    onUpdateClip(selectedClip.id, { ...s, [key]: val });
  };

  const resetAllSettings = () => {
    if (!selectedClip) return;
    if (window.confirm('האם אתה בטוח שברצונך לאפס את כל ההגדרות של מקטע זה?')) {
      onUpdateClip(selectedClip.id, { ...DEFAULT_CLIP_SETTINGS });
    }
  };

  const resetTabSettings = () => {
    if (!selectedClip) return;
    let newS = { ...s };
    if (activeTab === 'color') {
      newS.brightness = 100; newS.contrast = 100; newS.saturate = 100;
      newS.temperature = 0; newS.hueRotate = 0; newS.shadows = 0;
      newS.highlights = 0; newS.lutPreset = 'none';
    } else if (activeTab === 'transform') {
      newS.fitMode = 'contain'; newS.scale = 100; newS.posX = 0; newS.posY = 0;
      newS.rotation = 0; newS.mirrorH = false; newS.mirrorV = false;
      newS.cropTop = 0; newS.cropBottom = 0; newS.cropLeft = 0; newS.cropRight = 0;
    } else if (activeTab === 'fx') {
      newS.opacity = 100; newS.blendMode = 'normal'; newS.blur = 0;
      newS.vignette = 0; newS.fadeIn = 0; newS.fadeOut = 0; newS.blurMasks = [];
    } else if (activeTab === 'time') {
      newS.speed = 1.0; newS.volume = 100;
    }
    onUpdateClip(selectedClip.id, newS);
  };

  const setPipVal = (key, val) => {
    onUpdatePip({ ...pipSettings, [key]: val });
  };

  const handleAddText = () => {
    const newText = { ...DEFAULT_TEXT_OBJECT, id: 'txt-' + Date.now() };
    const nextTexts = [...(texts || []), newText];
    onUpdateTexts(nextTexts);
    setSelectedTextId(newText.id);
  };

  const handleEditText = (id, key, val) => {
    onUpdateTexts(texts.map(t => t.id === id ? { ...t, [key]: val } : t));
  };

  const handleDeleteText = (id) => {
    onUpdateTexts(texts.filter(t => t.id !== id));
    if (selectedTextId === id) setSelectedTextId(null);
  };

  const activeText = (texts || []).find(t => t.id === selectedTextId);

  const handleAddBlurMask = () => {
    const newMask = { id: 'mask-' + Date.now(), x: 200, y: 200, width: 150, height: 150, amount: 5 };
    setVal('blurMasks', [...(s.blurMasks || []), newMask]);
  };

  const handleEditBlurMask = (id, key, val) => {
    const masks = s.blurMasks || [];
    setVal('blurMasks', masks.map(m => m.id === id ? { ...m, [key]: val } : m));
  };

  const handleDeleteBlurMask = (id) => {
    const masks = s.blurMasks || [];
    setVal('blurMasks', masks.filter(m => m.id !== id));
  };

  return (
    <aside style={styles.panel}>
      <div style={styles.header}>
        <span>Inspector</span>
        {selectedClip && (
          <div style={{ display: 'flex', gap: 4 }}>
            <button style={styles.resetBtn} onClick={resetTabSettings} title="איפוס קטגוריה זו בלבד">
              <RotateCcw size={10} /> קטגוריה
            </button>
            <button style={{...styles.resetBtn, borderColor: '#ef4444', color: '#fca5a5'}} onClick={resetAllSettings} title="איפוס מלא של כל המקטע">
              <RotateCcw size={10} /> הכל
            </button>
          </div>
        )}
      </div>

      <div style={styles.tabsRow}>
        <button style={{ ...styles.tab, ...(activeTab === 'color' ? styles.activeTab : {}) }} onClick={() => setActiveTab('color')}>
          <Sun size={13} /> צבע
        </button>
        <button style={{ ...styles.tab, ...(activeTab === 'transform' ? styles.activeTab : {}) }} onClick={() => setActiveTab('transform')}>
          <Move size={13} /> מסגור
        </button>
        <button style={{ ...styles.tab, ...(activeTab === 'fx' ? styles.activeTab : {}) }} onClick={() => setActiveTab('fx')}>
          <Layers size={13} /> אפקטים
        </button>
        <button style={{ ...styles.tab, ...(activeTab === 'time' ? styles.activeTab : {}) }} onClick={() => setActiveTab('time')}>
          <Clock size={13} /> זמן
        </button>
        <button style={{ ...styles.tab, ...(activeTab === 'pip' ? styles.activeTab : {}) }} onClick={() => setActiveTab('pip')}>
          <ImageIcon size={13} /> PiP
        </button>
        <button style={{ ...styles.tab, ...(activeTab === 'text' ? styles.activeTab : {}) }} onClick={() => setActiveTab('text')}>
          <Type size={13} /> טקסט
        </button>
      </div>

      <div style={styles.body}>
        {activeTab !== 'pip' && activeTab !== 'text' && !selectedClip && (
          <div style={styles.emptyNotice}>בחר מקטע וידאו על ציר הזמן למטה כדי לערוך אותו.</div>
        )}

        {activeTab === 'color' && selectedClip && (
          <div>
            <div style={styles.sectionTitle}>לוחות צבע קולנועיים (LUTs)</div>
            <select style={styles.select} value={s.lutPreset} onChange={(e) => setVal('lutPreset', e.target.value)}>
              {Object.entries(LUT_PRESETS).map(([key, item]) => (
                <option key={key} value={key}>{item.label}</option>
              ))}
            </select>
            <div style={styles.sectionTitle}>אור וחשיפה</div>
            <SliderRow label="חשיפה ובהירות" val={s.brightness} min={20} max={200} unit="%" onChange={(v) => setVal('brightness', v)} />
            <SliderRow label="ניגודיות" val={s.contrast} min={20} max={200} unit="%" onChange={(v) => setVal('contrast', v)} />
            <SliderRow label="בהירים (Highlights)" val={s.highlights} min={-50} max={50} unit="" onChange={(v) => setVal('highlights', v)} />
            <SliderRow label="כהים (Shadows)" val={s.shadows} min={-50} max={50} unit="" onChange={(v) => setVal('shadows', v)} />
            <div style={styles.sectionTitle}>צבע וטמפרטורה</div>
            <SliderRow label="רוויה" val={s.saturate} min={0} max={300} unit="%" onChange={(v) => setVal('saturate', v)} />
            <SliderRow label="חם / קר" val={s.temperature} min={-100} max={100} unit="" onChange={(v) => setVal('temperature', v)} />
            <SliderRow label="גוון (Tint)" val={s.hueRotate} min={-180} max={180} unit="°" onChange={(v) => setVal('hueRotate', v)} />
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
            <label style={styles.checkboxRow}>
              <input type="checkbox" checked={s.mirrorH} onChange={(e) => setVal('mirrorH', e.target.checked)} />
              <span>אופקי (מראה לגיטרה)</span>
            </label>
            <div style={styles.sectionTitle}>גודל, מיקום וסיבוב</div>
            <SliderRow label="זום (Scale)" val={s.scale} min={20} max={300} unit="%" onChange={(v) => setVal('scale', v)} />
            <SliderRow label="הזזה (X)" val={s.posX} min={-400} max={400} unit="px" onChange={(v) => setVal('posX', v)} />
            <SliderRow label="הזזה (Y)" val={s.posY} min={-300} max={300} unit="px" onChange={(v) => setVal('posY', v)} />
            <SliderRow label="סיבוב" val={s.rotation} min={-180} max={180} unit="°" onChange={(v) => setVal('rotation', v)} />
            <div style={styles.sectionTitle}>חיתוך שוליים (Crop)</div>
            <SliderRow label="עליון" val={s.cropTop} min={0} max={45} unit="%" onChange={(v) => setVal('cropTop', v)} />
            <SliderRow label="תחתון" val={s.cropBottom} min={0} max={45} unit="%" onChange={(v) => setVal('cropBottom', v)} />
            <SliderRow label="שמאל" val={s.cropLeft} min={0} max={45} unit="%" onChange={(v) => setVal('cropLeft', v)} />
            <SliderRow label="ימין" val={s.cropRight} min={0} max={45} unit="%" onChange={(v) => setVal('cropRight', v)} />
          </div>
        )}

        {activeTab === 'fx' && selectedClip && (
          <div>
            <div style={styles.sectionTitle}>עמעום ומעברים (Fades)</div>
            <SliderRow label="כניסה (Fade In)" val={s.fadeIn} min={0} max={3} step={0.1} unit="s" onChange={(v) => setVal('fadeIn', v)} />
            <SliderRow label="יציאה (Fade Out)" val={s.fadeOut} min={0} max={3} step={0.1} unit="s" onChange={(v) => setVal('fadeOut', v)} />
            
            <div style={styles.sectionTitle}>טשטוש ואפקטים</div>
            <SliderRow label="טשטוש מסך מלא" val={s.blur} min={0} max={5} step={0.1} unit="px" onChange={(v) => setVal('blur', v)} />
            <SliderRow label="האפלת פינות" val={s.vignette} min={0} max={100} unit="%" onChange={(v) => setVal('vignette', v)} />
            <SliderRow label="אטימות (Opacity)" val={s.opacity} min={0} max={100} unit="%" onChange={(v) => setVal('opacity', v)} />

            <div style={styles.sectionTitle}>טשטוש נקודתי (צנזור / הסתרה)</div>
            <button style={styles.actionBtn} onClick={handleAddBlurMask}>
              <Plus size={14} /> הוסף אזור טשטוש
            </button>
            {(s.blurMasks || []).map((mask, i) => (
              <div key={mask.id} style={styles.subCard}>
                <div style={{display:'flex', justifyContent:'space-between', marginBottom: 6}}>
                  <strong style={{fontSize:11, color:'#e4e4e7'}}>אזור {i+1}</strong>
                  <button onClick={() => handleDeleteBlurMask(mask.id)} style={{background:'none', border:'none', color:'#ef4444', cursor:'pointer'}}><X size={14}/></button>
                </div>
                <SliderRow label="מיקום אופקי" val={mask.x} min={0} max={1000} unit="px" onChange={(v) => handleEditBlurMask(mask.id, 'x', v)} />
                <SliderRow label="מיקום אנכי" val={mask.y} min={0} max={1000} unit="px" onChange={(v) => handleEditBlurMask(mask.id, 'y', v)} />
                <SliderRow label="רוחב" val={mask.width} min={20} max={500} unit="px" onChange={(v) => handleEditBlurMask(mask.id, 'width', v)} />
                <SliderRow label="גובה" val={mask.height} min={20} max={500} unit="px" onChange={(v) => handleEditBlurMask(mask.id, 'height', v)} />
                <SliderRow label="עוצמת טשטוש" val={mask.amount} min={1} max={20} unit="px" onChange={(v) => handleEditBlurMask(mask.id, 'amount', v)} />
              </div>
            ))}
          </div>
        )}

        {activeTab === 'time' && selectedClip && (
          <div>
            <div style={styles.sectionTitle}>קצב וווליום</div>
            <SliderRow label="מהירות (Speed)" val={s.speed} min={0.25} max={3.0} step={0.05} unit="x" onChange={(v) => setVal('speed', v)} />
            <SliderRow label="ווליום" val={s.volume} min={0} max={150} unit="%" onChange={(v) => setVal('volume', v)} />
            <button style={styles.deleteBtn} onClick={() => onDeleteClip(selectedClip.id)}>
              <Trash2 size={14} /> מחק מקטע זה
            </button>
          </div>
        )}

        {activeTab === 'pip' && (
          <div>
            {!hasPip ? (
              <div style={styles.emptyNotice}>העלה תמונה/וידאו דרך חלון PiP במאגר.</div>
            ) : (
              <div>
                <div style={styles.sectionTitle}>זמנים ומיקום</div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  <div style={{ flex: 1 }}><label style={styles.label}>התחלה(s)</label><input type="number" step="0.1" min="0" max={pipSettings.endTime} value={pipSettings.startTime} onChange={(e) => setPipVal('startTime', Number(e.target.value))} style={styles.numInput} /></div>
                  <div style={{ flex: 1 }}><label style={styles.label}>סיום(s)</label><input type="number" step="0.1" min={pipSettings.startTime} max={videoDuration || 600} value={pipSettings.endTime} onChange={(e) => setPipVal('endTime', Number(e.target.value))} style={styles.numInput} /></div>
                </div>
                <SliderRow label="רוחב" val={pipSettings.width} min={50} max={600} unit="px" onChange={(v) => setPipVal('width', v)} />
                <SliderRow label="גובה" val={pipSettings.height} min={50} max={450} unit="px" onChange={(v) => setPipVal('height', v)} />
                <div style={styles.sectionTitle}>חיתוך תמונה פנימי</div>
                <SliderRow label="עליון" val={pipSettings.cropTop} min={0} max={45} unit="%" onChange={(v) => setPipVal('cropTop', v)} />
                <SliderRow label="תחתון" val={pipSettings.cropBottom} min={0} max={45} unit="%" onChange={(v) => setPipVal('cropBottom', v)} />
                <SliderRow label="שמאל" val={pipSettings.cropLeft} min={0} max={45} unit="%" onChange={(v) => setPipVal('cropLeft', v)} />
                <SliderRow label="ימין" val={pipSettings.cropRight} min={0} max={45} unit="%" onChange={(v) => setPipVal('cropRight', v)} />
              </div>
            )}
          </div>
        )}

        {activeTab === 'text' && (
          <div>
            <button style={styles.actionBtn} onClick={handleAddText}>
              <Plus size={14} /> הוסף כותרת חדשה
            </button>

            {(!texts || texts.length === 0) && (
              <div style={styles.emptyNotice}>אין טקסטים. לחץ על הוסף כדי להתחיל.</div>
            )}

            <div style={{marginTop: 10}}>
              {(texts || []).map(t => (
                <button
                  key={t.id}
                  style={{ ...styles.listBtn, borderColor: t.id === selectedTextId ? '#38bdf8' : '#27272a' }}
                  onClick={() => setSelectedTextId(t.id)}
                >
                  {t.content || 'טקסט ללא שם'} ({t.startTime}s - {t.endTime}s)
                </button>
              ))}
            </div>

            {activeText && (
              <div style={styles.subCard}>
                <div style={{display:'flex', justifyContent:'space-between', marginBottom: 6}}>
                  <strong style={{fontSize:11, color:'#38bdf8'}}>עריכת טקסט</strong>
                  <button onClick={() => handleDeleteText(activeText.id)} style={{background:'none', border:'none', color:'#ef4444', cursor:'pointer'}}><Trash2 size={14}/></button>
                </div>
                
                <label style={styles.label}>תוכן</label>
                <input type="text" value={activeText.content} onChange={(e) => handleEditText(activeText.id, 'content', e.target.value)} style={{ ...styles.numInput, marginBottom: 12 }} />

                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  <div style={{ flex: 1 }}><label style={styles.label}>התחלה</label><input type="number" step="0.1" min="0" value={activeText.startTime} onChange={(e) => handleEditText(activeText.id, 'startTime', Number(e.target.value))} style={styles.numInput} /></div>
                  <div style={{ flex: 1 }}><label style={styles.label}>סיום</label><input type="number" step="0.1" min="0" value={activeText.endTime} onChange={(e) => handleEditText(activeText.id, 'endTime', Number(e.target.value))} style={styles.numInput} /></div>
                </div>

                <SliderRow label="גודל גופן" val={activeText.fontSize} min={12} max={100} unit="px" onChange={(v) => handleEditText(activeText.id, 'fontSize', v)} />
                
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 8 }}>
                  <label style={styles.label}>צבע טקסט:</label>
                  <input type="color" value={activeText.color} onChange={(e) => handleEditText(activeText.id, 'color', e.target.value)} style={{ background: 'none', border: 'none', cursor: 'pointer' }} />
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 8 }}>
                  <label style={styles.label}>צבע רקע:</label>
                  <input type="color" value={activeText.bgColor.slice(0,7)} onChange={(e) => handleEditText(activeText.id, 'bgColor', e.target.value)} style={{ background: 'none', border: 'none', cursor: 'pointer' }} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}

function SliderRow({ label, val, min, max, step = 1, unit, onChange }) {
  return (
    <div style={styles.sliderWrap}>
      <div style={styles.sliderTop}><span>{label}</span><span style={styles.valBadge}>{val}{unit}</span></div>
      <input type="range" min={min} max={max} step={step} value={val} onChange={(e) => onChange(Number(e.target.value))} style={styles.slider} />
    </div>
  );
}

const styles = {
  panel: { width: 300, backgroundColor: '#18181b', borderRight: '1px solid #27272a', display: 'flex', flexDirection: 'column', minHeight: 0, flexShrink: 0, direction: 'rtl' },
  header: { height: 34, backgroundColor: '#121214', borderBottom: '1px solid #27272a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px', fontSize: 12, fontWeight: 600, color: '#d4d4d8' },
  resetBtn: { display: 'flex', alignItems: 'center', gap: 4, backgroundColor: '#27272a', border: '1px solid #3f3f46', color: '#e4e4e7', fontSize: 10, padding: '3px 6px', borderRadius: 4, cursor: 'pointer' },
  tabsRow: { display: 'flex', backgroundColor: '#141416', borderBottom: '1px solid #27272a' },
  tab: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '7px 1px', backgroundColor: 'transparent', border: 'none', color: '#71717a', fontSize: 10, cursor: 'pointer', borderBottom: '2px solid transparent' },
  activeTab: { color: '#38bdf8', borderBottom: '2px solid #38bdf8', backgroundColor: '#1c1c1f' },
  body: { padding: 12, overflowY: 'auto', flex: 1 },
  sectionTitle: { fontSize: 11, fontWeight: 700, color: '#38bdf8', marginTop: 10, marginBottom: 8, paddingBottom: 4, borderBottom: '1px solid #27272a' },
  sliderWrap: { marginBottom: 9 },
  sliderTop: { display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#d4d4d8', marginBottom: 3 },
  valBadge: { fontFamily: 'monospace', color: '#a1a1aa', direction: 'ltr' },
  slider: { width: '100%', accentColor: '#3b82f6', cursor: 'pointer', height: 5 },
  select: { width: '100%', backgroundColor: '#27272a', color: '#fff', border: '1px solid #3f3f46', padding: '6px 8px', borderRadius: 4, fontSize: 12, marginBottom: 10 },
  checkboxRow: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#e4e4e7', marginBottom: 12, cursor: 'pointer' },
  actionBtn: { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#2563eb', border: 'none', color: '#fff', padding: '8px', borderRadius: 4, fontSize: 12, cursor: 'pointer', marginBottom: 10 },
  listBtn: { width: '100%', textAlign: 'right', padding: '8px', backgroundColor: '#27272a', border: '1px solid #3f3f46', color: '#fff', borderRadius: 4, fontSize: 11, marginBottom: 6, cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  subCard: { backgroundColor: '#121214', border: '1px solid #27272a', borderRadius: 6, padding: 10, marginTop: 10, marginBottom: 10 },
  label: { display: 'block', fontSize: 11, color: '#a1a1aa', marginBottom: 4 },
  numInput: { width: '100%', backgroundColor: '#27272a', border: '1px solid #3f3f46', color: '#fff', padding: '5px 6px', borderRadius: 4, fontSize: 12, boxSizing: 'border-box' },
  deleteBtn: { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#dc2626', border: 'none', color: '#fff', padding: '8px 12px', borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: 'pointer', marginTop: 14 },
  emptyNotice: { fontSize: 12, color: '#71717a', textAlign: 'center', marginTop: 30, lineHeight: 1.5 }
};
