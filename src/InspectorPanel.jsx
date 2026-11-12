import React, { useState } from 'react';
import {
  Sun, Move, Layers, Clock, Image as ImageIcon,
  RotateCcw, FlipHorizontal, FlipVertical, Trash2
} from 'lucide-react';
import { LUT_PRESETS, DEFAULT_CLIP_SETTINGS } from './defaultState';

export default function InspectorPanel({
  selectedClip,
  onUpdateClip,
  onDeleteClip,
  pipSettings,
  onUpdatePip,
  hasPip,
  videoDuration
}) {
  const [activeTab, setActiveTab] = useState('color');

  const s = selectedClip?.settings || DEFAULT_CLIP_SETTINGS;

  const setVal = (key, val) => {
    if (!selectedClip) return;
    onUpdateClip(selectedClip.id, { ...s, [key]: val });
  };

  const resetClipSettings = () => {
    if (!selectedClip) return;
    onUpdateClip(selectedClip.id, { ...DEFAULT_CLIP_SETTINGS });
  };

  const setPipVal = (key, val) => {
    onUpdatePip({ ...pipSettings, [key]: val });
  };

  return (
    <aside style={styles.panel}>
      {/* כותרת עליונה */}
      <div style={styles.header}>
        <span>Inspector — בקרת עריכה</span>
        {selectedClip && (
          <button style={styles.resetBtn} onClick={resetClipSettings} title="אפס הגדרות מקטע">
            <RotateCcw size={12} />
            <span>איפוס</span>
          </button>
        )}
      </div>

      {/* סרגל לשוניות */}
      <div style={styles.tabsRow}>
        <button
          style={{ ...styles.tab, ...(activeTab === 'color' ? styles.activeTab : {}) }}
          onClick={() => setActiveTab('color')}
          title="תיקון ודירוג צבעים"
        >
          <Sun size={14} />
          <span>צבע</span>
        </button>
        <button
          style={{ ...styles.tab, ...(activeTab === 'transform' ? styles.activeTab : {}) }}
          onClick={() => setActiveTab('transform')}
          title="תנועה, גודל וחיתוך"
        >
          <Move size={14} />
          <span>תנועה/Crop</span>
        </button>
        <button
          style={{ ...styles.tab, ...(activeTab === 'fx' ? styles.activeTab : {}) }}
          onClick={() => setActiveTab('fx')}
          title="אפקטים ושקיפות"
        >
          <Layers size={14} />
          <span>אפקטים</span>
        </button>
        <button
          style={{ ...styles.tab, ...(activeTab === 'time' ? styles.activeTab : {}) }}
          onClick={() => setActiveTab('time')}
          title="מהירות, זמנים ושמע"
        >
          <Clock size={14} />
          <span>זמן/קליפ</span>
        </button>
        <button
          style={{ ...styles.tab, ...(activeTab === 'pip' ? styles.activeTab : {}) }}
          onClick={() => setActiveTab('pip')}
          title="חלון תמונה / שריגים (PiP)"
        >
          <ImageIcon size={14} />
          <span>חלון PiP</span>
        </button>
      </div>

      {/* תוכן הלשונית הפעילה */}
      <div style={styles.body}>
        {activeTab !== 'pip' && !selectedClip && (
          <div style={styles.emptyNotice}>
            בחר מקטע וידאו על ציר הזמן (Timeline) למטה כדי לערוך את הצבע, החיתוך והאפקטים שלו.
          </div>
        )}

        {/* 1. לשונית צבע (Color Grading) */}
        {activeTab === 'color' && selectedClip && (
          <div>
            <div style={styles.sectionTitle}>לוחות צבע קולנועיים (LUTs)</div>
            <select
              style={styles.select}
              value={s.lutPreset}
              onChange={(e) => setVal('lutPreset', e.target.value)}
            >
              {Object.entries(LUT_PRESETS).map(([key, item]) => (
                <option key={key} value={key}>{item.label}</option>
              ))}
            </select>

            <div style={styles.sectionTitle}>אור וחשיפה (Light & Exposure)</div>
            <SliderRow label="חשיפה ובהירות (Exposure)" val={s.brightness} min={20} max={200} unit="%" onChange={(v) => setVal('brightness', v)} />
            <SliderRow label="ניגודיות (Contrast)" val={s.contrast} min={20} max={200} unit="%" onChange={(v) => setVal('contrast', v)} />
            <SliderRow label="אזורים בהירים (Highlights)" val={s.highlights} min={-50} max={50} unit="" onChange={(v) => setVal('highlights', v)} />
            <SliderRow label="אזורים כהים (Shadows)" val={s.shadows} min={-50} max={50} unit="" onChange={(v) => setVal('shadows', v)} />

            <div style={styles.sectionTitle}>צבע וטמפרטורה (Color & Balance)</div>
            <SliderRow label="רוויה (Saturation)" val={s.saturate} min={0} max={300} unit="%" onChange={(v) => setVal('saturate', v)} />
            <SliderRow label="טמפרטורה (חם / קר)" val={s.temperature} min={-100} max={100} unit="" onChange={(v) => setVal('temperature', v)} />
            <SliderRow label="גוון צבע (Hue / Tint)" val={s.hueRotate} min={-180} max={180} unit="°" onChange={(v) => setVal('hueRotate', v)} />
          </div>
        )}

        {/* 2. לשונית תנועה וחיתוך (Transform & Crop) */}
        {activeTab === 'transform' && selectedClip && (
          <div>
            <div style={styles.sectionTitle}>היפוך מראה (Flip / Mirror)</div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
              <button
                style={{ ...styles.toggleBtn, backgroundColor: s.mirrorH ? '#2563eb' : '#27272a' }}
                onClick={() => setVal('mirrorH', !s.mirrorH)}
              >
                <FlipHorizontal size={14} />
                <span>מראה אופקי</span>
              </button>
              <button
                style={{ ...styles.toggleBtn, backgroundColor: s.mirrorV ? '#2563eb' : '#27272a' }}
                onClick={() => setVal('mirrorV', !s.mirrorV)}
              >
                <FlipVertical size={14} />
                <span>היפוך אנכי</span>
              </button>
            </div>

            <div style={styles.sectionTitle}>גודל, מיקום וסיבוב (Transform)</div>
            <SliderRow label="קנה מידה (Scale / Zoom)" val={s.scale} min={20} max={300} unit="%" onChange={(v) => setVal('scale', v)} />
            <SliderRow label="הזזה אופקית (Position X)" val={s.posX} min={-400} max={400} unit="px" onChange={(v) => setVal('posX', v)} />
            <SliderRow label="הזזה אנכית (Position Y)" val={s.posY} min={-300} max={300} unit="px" onChange={(v) => setVal('posY', v)} />
            <SliderRow label="סיבוב (Rotation)" val={s.rotation} min={-180} max={180} unit="°" onChange={(v) => setVal('rotation', v)} />

            <div style={styles.sectionTitle}>חיתוך שולי הווידאו (Crop)</div>
            <SliderRow label="חיתוך מלמעלה (Crop Top)" val={s.cropTop} min={0} max={45} unit="%" onChange={(v) => setVal('cropTop', v)} />
            <SliderRow label="חיתוך מלמטה (Crop Bottom)" val={s.cropBottom} min={0} max={45} unit="%" onChange={(v) => setVal('cropBottom', v)} />
            <SliderRow label="חיתוך משמאל (Crop Left)" val={s.cropLeft} min={0} max={45} unit="%" onChange={(v) => setVal('cropLeft', v)} />
            <SliderRow label="חיתוך מימין (Crop Right)" val={s.cropRight} min={0} max={45} unit="%" onChange={(v) => setVal('cropRight', v)} />
          </div>
        )}

        {/* 3. לשונית אפקטים ושקיפות (Compositing & FX) */}
        {activeTab === 'fx' && selectedClip && (
          <div>
            <div style={styles.sectionTitle}>שקיפות ומיזוג שכבות</div>
            <SliderRow label="אטימות (Opacity)" val={s.opacity} min={0} max={100} unit="%" onChange={(v) => setVal('opacity', v)} />

            <label style={styles.label}>שיטת שילוב (Blend Mode)</label>
            <select
              style={styles.select}
              value={s.blendMode}
              onChange={(e) => setVal('blendMode', e.target.value)}
            >
              <option value="normal">רגיל (Normal)</option>
              <option value="screen">הבהרה (Screen)</option>
              <option value="multiply">הכפלה כהה (Multiply)</option>
              <option value="overlay">שילוב ניגודי (Overlay)</option>
            </select>

            <div style={styles.sectionTitle}>אפקטים חזותיים (Visual FX)</div>
            <SliderRow label="טשטוש (Blur)" val={s.blur} min={0} max={20} unit="px" onChange={(v) => setVal('blur', v)} />
            <SliderRow label="האפלת פינות (Vignette)" val={s.vignette} min={0} max={100} unit="%" onChange={(v) => setVal('vignette', v)} />
            <SliderRow label="גרעיניות פילם (Film Grain)" val={s.grain} min={0} max={100} unit="%" onChange={(v) => setVal('grain', v)} />
          </div>
        )}

        {/* 4. לשונית זמן, מהירות ומחיקת מקטע */}
        {activeTab === 'time' && selectedClip && (
          <div>
            <div style={styles.sectionTitle}>פרטי המקטע הנבחר</div>
            <div style={styles.infoBox}>
              <div>שם: <strong>{selectedClip.label}</strong></div>
              <div>התחלה בסרטון: <strong>{selectedClip.trimStart.toFixed(2)}s</strong></div>
              <div>סיום בסרטון: <strong>{selectedClip.trimEnd.toFixed(2)}s</strong></div>
              <div>אורך נטו: <strong>{(selectedClip.trimEnd - selectedClip.trimStart).toFixed(2)}s</strong></div>
            </div>

            <div style={styles.sectionTitle}>שליטה בקצב ובשמע</div>
            <SliderRow label="מהירות ניגון (Speed)" val={s.speed} min={0.25} max={3.0} step={0.05} unit="x" onChange={(v) => setVal('speed', v)} />
            <SliderRow label="עוצמת שמע (Volume)" val={s.volume} min={0} max={150} unit="%" onChange={(v) => setVal('volume', v)} />

            <div style={{ marginTop: 20 }}>
              <button style={styles.deleteBtn} onClick={() => onDeleteClip(selectedClip.id)}>
                <Trash2 size={14} />
                <span>מחק את החלק הזה מהסרטון</span>
              </button>
            </div>
          </div>
        )}

        {/* 5. לשונית חלון תמונה / שריגים (PiP) */}
        {activeTab === 'pip' && (
          <div>
            {!hasPip ? (
              <div style={styles.emptyNotice}>
                העלה תמונה או סרטון תקריב דרך כפתור <strong>+ חלון PiP</strong> שבמאגר המדיה מימין כדי לערוך אותו כאן.
              </div>
            ) : (
              <div>
                <div style={styles.sectionTitle}>תזמון הופעת התמונה (Timing)</div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  <div style={{ flex: 1 }}>
                    <label style={styles.label}>זמן התחלה (שניות)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max={pipSettings.endTime}
                      value={pipSettings.startTime}
                      onChange={(e) => setPipVal('startTime', Number(e.target.value))}
                      style={styles.numInput}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={styles.label}>זמן סיום (שניות)</label>
                    <input
                      type="number"
                      step="0.1"
                      min={pipSettings.startTime}
                      max={videoDuration || 300}
                      value={pipSettings.endTime}
                      onChange={(e) => setPipVal('endTime', Number(e.target.value))}
                      style={styles.numInput}
                    />
                  </div>
                </div>

                <div style={styles.sectionTitle}>גודל וסיבוב התמונה</div>
                <SliderRow label="רוחב תמונה (Width)" val={pipSettings.width} min={60} max={600} unit="px" onChange={(v) => setPipVal('width', v)} />
                <SliderRow label="גובה תמונה (Height)" val={pipSettings.height} min={60} max={450} unit="px" onChange={(v) => setPipVal('height', v)} />
                <SliderRow label="סיבוב תמונה" val={pipSettings.rotation} min={-180} max={180} unit="°" onChange={(v) => setPipVal('rotation', v)} />
                <SliderRow label="שקיפות (Opacity)" val={pipSettings.opacity} min={10} max={100} unit="%" onChange={(v) => setPipVal('opacity', v)} />

                <div style={styles.sectionTitle}>חיתוך התמונה עצמה (Image Crop)</div>
                <SliderRow label="חיתוך עליון" val={pipSettings.cropTop} min={0} max={45} unit="%" onChange={(v) => setPipVal('cropTop', v)} />
                <SliderRow label="חיתוך תחתון" val={pipSettings.cropBottom} min={0} max={45} unit="%" onChange={(v) => setPipVal('cropBottom', v)} />
                <SliderRow label="חיתוך שמאל" val={pipSettings.cropLeft} min={0} max={45} unit="%" onChange={(v) => setPipVal('cropLeft', v)} />
                <SliderRow label="חיתוך ימין" val={pipSettings.cropRight} min={0} max={45} unit="%" onChange={(v) => setPipVal('cropRight', v)} />

                <div style={styles.sectionTitle}>עיצוב מסגרת</div>
                <SliderRow label="עיגול פינות" val={pipSettings.borderRadius} min={0} max={50} unit="px" onChange={(v) => setPipVal('borderRadius', v)} />
                <SliderRow label="עובי מסגרת" val={pipSettings.borderWidth} min={0} max={10} unit="px" onChange={(v) => setPipVal('borderWidth', v)} />
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
      <div style={styles.sliderTop}>
        <span>{label}</span>
        <span style={styles.valBadge}>{val}{unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={val}
        onChange={(e) => onChange(Number(e.target.value))}
        style={styles.slider}
      />
    </div>
  );
}

const styles = {
  panel: {
    width: 300,
    backgroundColor: '#18181b',
    borderRight: '1px solid #27272a',
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
    flexShrink: 0,
    direction: 'rtl'
  },
  header: {
    height: 34,
    backgroundColor: '#121214',
    borderBottom: '1px solid #27272a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 12px',
    fontSize: 12,
    fontWeight: 600,
    color: '#d4d4d8'
  },
  resetBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#27272a',
    border: '1px solid #3f3f46',
    color: '#e4e4e7',
    fontSize: 10,
    padding: '2px 6px',
    borderRadius: 4,
    cursor: 'pointer'
  },
  tabsRow: {
    display: 'flex',
    backgroundColor: '#141416',
    borderBottom: '1px solid #27272a'
  },
  tab: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 3,
    padding: '7px 2px',
    backgroundColor: 'transparent',
    border: 'none',
    color: '#71717a',
    fontSize: 10,
    cursor: 'pointer',
    borderBottom: '2px solid transparent'
  },
  activeTab: {
    color: '#38bdf8',
    borderBottom: '2px solid #38bdf8',
    backgroundColor: '#1c1c1f'
  },
  body: {
    padding: 12,
    overflowY: 'auto',
    flex: 1
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: '#38bdf8',
    marginTop: 10,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottom: '1px solid #27272a'
  },
  sliderWrap: {
    marginBottom: 10
  },
  sliderTop: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 11,
    color: '#d4d4d8',
    marginBottom: 3
  },
  valBadge: {
    fontFamily: 'monospace',
    color: '#a1a1aa',
    direction: 'ltr'
  },
  slider: {
    width: '100%',
    accentColor: '#3b82f6',
    cursor: 'pointer',
    height: 5
  },
  select: {
    width: '100%',
    backgroundColor: '#27272a',
    color: '#fff',
    border: '1px solid #3f3f46',
    padding: '6px 8px',
    borderRadius: 4,
    fontSize: 12,
    marginBottom: 10
  },
  toggleBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    border: '1px solid #3f3f46',
    color: '#fff',
    padding: '7px 6px',
    borderRadius: 4,
    fontSize: 11,
    cursor: 'pointer'
  },
  label: {
    display: 'block',
    fontSize: 11,
    color: '#a1a1aa',
    marginBottom: 4
  },
  numInput: {
    width: '100%',
    backgroundColor: '#27272a',
    border: '1px solid #3f3f46',
    color: '#fff',
    padding: '5px 6px',
    borderRadius: 4,
    fontSize: 12,
    boxSizing: 'border-box'
  },
  infoBox: {
    backgroundColor: '#121214',
    border: '1px solid #27272a',
    borderRadius: 4,
    padding: 8,
    fontSize: 11,
    lineHeight: 1.6,
    color: '#d4d4d8',
    marginBottom: 10
  },
  deleteBtn: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#dc2626',
    border: 'none',
    color: '#fff',
    padding: '8px 12px',
    borderRadius: 4,
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer'
  },
  emptyNotice: {
    fontSize: 12,
    color: '#71717a',
    textAlign: 'center',
    marginTop: 30,
    lineHeight: 1.5
  }
};
