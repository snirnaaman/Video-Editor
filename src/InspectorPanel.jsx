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
  texts, // מערך הטקסטים
  onUpdateTexts, // פונקציה לעדכון מערך הטקסטים
  videoDuration
}) {
  const [activeTab, setActiveTab] = useState('color');
  const [selectedTextId, setSelectedTextId] = useState(null);

  const s = selectedClip?.settings || DEFAULT_CLIP_SETTINGS;

  const setVal = (key, val) => {
    if (!selectedClip) return;
    onUpdateClip(selectedClip.id, { ...s, [key]: val });
  };

  // איפוס כללי של כל הקליפ
  const resetAllSettings = () => {
    if (!selectedClip) return;
    if (window.confirm('האם אתה בטוח שברצונך לאפס את כל ההגדרות של מקטע זה?')) {
      onUpdateClip(selectedClip.id, { ...DEFAULT_CLIP_SETTINGS });
    }
  };

  // איפוס רק של הלשונית הנוכחית
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

  // ניהול טקסטים
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

  // ניהול מסכות טשטוש (Blur Masks)
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

      {/* סרגל לשוניות */}
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

        {/* 1. צבע */}
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

        {/* 2. מסגור ותנועה */}
        {activeTab === 'transform' && selectedClip && (
          <div>
            <div style={styles.sectionTitle}>התאמה למסגרת וידאו</div>
            <select style={styles.select} value={s.fitMode} onChange={(e) => setVal('fitMode', e.target.value)}>
              <option
