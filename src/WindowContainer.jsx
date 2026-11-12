import React, { useState, useRef } from 'react';
import { ExternalLink, Minimize2, X } from 'lucide-react';

export default function WindowContainer({
  title,
  icon,
  isOpen,
  onClose,
  isDetached,
  onToggleDetach,
  defaultPos = { x: 80, y: 80 },
  defaultSize = { width: 340, height: 500 },
  dockStyle = {},
  headerExtra = null,
  children
}) {
  const [pos, setPos] = useState(defaultPos);
  const [size, setSize] = useState(defaultSize);
  const dragRef = useRef(null);

  if (!isOpen) return null;

  const startDrag = (e, mode) => {
    if (!isDetached) return;
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const initPos = { ...pos };
    const initSize = { ...size };

    const onMove = (moveEv) => {
      const dx = moveEv.clientX - startX;
      const dy = moveEv.clientY - startY;
      if (mode === 'move') {
        setPos({ x: Math.max(0, initPos.x + dx), y: Math.max(0, initPos.y + dy) });
      } else if (mode === 'resize') {
        setSize({
          width: Math.max(260, initSize.width + dx),
          height: Math.max(200, initSize.height + dy)
        });
      }
    };

    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const containerStyle = isDetached
    ? {
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        width: size.width,
        height: size.height,
        zIndex: 250,
        backgroundColor: '#18181b',
        border: '1px solid #38bdf8',
        borderRadius: 8,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 50px rgba(0,0,0,0.85)',
        overflow: 'hidden',
        direction: 'rtl'
      }
    : {
        ...dockStyle,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#18181b',
        overflow: 'hidden',
        direction: 'rtl'
      };

  return (
    <div ref={dragRef} style={containerStyle}>
      <div
        onMouseDown={(e) => startDrag(e, 'move')}
        style={{
          height: 32,
          backgroundColor: isDetached ? '#0f172a' : '#121214',
          borderBottom: '1px solid #27272a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 10px',
          cursor: isDetached ? 'move' : 'default',
          flexShrink: 0,
          userSelect: 'none'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#e4e4e7' }}>
          {icon}
          <span>{title}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {headerExtra}
          <button
            onClick={onToggleDetach}
            title={isDetached ? 'החזר לעגינה במסך' : 'פצל לחלון צף ניתן להגדלה'}
            style={styles.winBtn}
          >
            {isDetached ? <Minimize2 size={12} /> : <ExternalLink size={12} />}
          </button>
          <button onClick={onClose} title="סגור פאנל (הגדל מסך תצוגה)" style={{ ...styles.winBtn, color: '#fca5a5' }}>
            <X size={13} />
          </button>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {children}
      </div>

      {isDetached && (
        <div
          onMouseDown={(e) => startDrag(e, 'resize')}
          title="גרור לשינוי גודל החלון"
          style={{
            position: 'absolute',
            right: 0,
            bottom: 0,
            width: 14,
            height: 14,
            backgroundColor: '#38bdf8',
            cursor: 'nwse-resize',
            borderTopLeftRadius: 4,
            zIndex: 10
          }}
        />
      )}
    </div>
  );
}

const styles = {
  winBtn: {
    background: 'transparent',
    border: 'none',
    color: '#a1a1aa',
    cursor: 'pointer',
    padding: '3px 5px',
    borderRadius: 4,
    display: 'flex',
    alignItems: 'center'
  }
};
