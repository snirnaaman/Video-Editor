import React from 'react';
import { Keyboard, X } from 'lucide-react';
import { KEYBOARD_SHORTCUTS } from './defaultState';

export default function ShortcutsModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Keyboard size={18} color="#38bdf8" />
            <span style={{ fontWeight: 700, fontSize: 15 }}>קיצורי מקלדת מהירים</span>
          </div>
          <button style={styles.closeBtn} onClick={onClose}><X size={18} /></button>
        </div>
        <div style={styles.body}>
          {KEYBOARD_SHORTCUTS.map((item, idx) => (
            <div key={idx} style={styles.row}>
              <span style={{ fontSize: 13, color: '#e4e4e7' }}>{item.action}</span>
              <kbd style={styles.kbd}>{item.keys}</kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', direction: 'rtl', backdropFilter: 'blur(3px)' },
  modal: { width: 440, maxHeight: '85vh', backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: 10, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px rgba(0,0,0,0.8)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', backgroundColor: '#121214', borderBottom: '1px solid #27272a' },
  closeBtn: { background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer' },
  body: { padding: '14px 18px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 },
  row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 10px', backgroundColor: '#121214', borderRadius: 6, border: '1px solid #27272a' },
  kbd: { backgroundColor: '#27272a', border: '1px solid #52525b', color: '#38bdf8', padding: '3px 8px', borderRadius: 4, fontSize: 12, fontFamily: 'monospace', direction: 'ltr' }
};
