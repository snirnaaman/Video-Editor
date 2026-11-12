import React from 'react';

export default function ChordDiagram({ chord, size = 110 }) {
  if (!chord) return null;
  const { chordName = 'Am', frets = [-1, 0, 2, 2, 1, 0], fingers = [0, 0, 2, 3, 1, 0], baseFret = 1, themeColor = '#38bdf8' } = chord;
  const width = size;
  const height = size * 1.25;
  const padX = width * 0.18;
  const padTop = height * 0.26;
  const gridW = width - padX * 2;
  const gridH = height * 0.62;
  const stringSpacing = gridW / 5;
  const fretSpacing = gridH / 4;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ backgroundColor: 'rgba(15, 15, 18, 0.9)', borderRadius: 8, border: `1.5px solid ${themeColor}`, boxShadow: '0 6px 18px rgba(0,0,0,0.6)', direction: 'ltr' }}>
      <text x={width / 2} y={height * 0.15} textAnchor="middle" fill={themeColor} fontSize={width * 0.16} fontWeight="bold" fontFamily="system-ui, sans-serif">
        {chordName}
      </text>
      {baseFret > 1 && (
        <text x={padX - 6} y={padTop + fretSpacing * 0.7} textAnchor="end" fill="#a1a1aa" fontSize={width * 0.1} fontWeight="bold">
          {baseFret}fr
        </text>
      )}
      {/* סריגים (Frets) */}
      {[0, 1, 2, 3, 4].map((f) => (
        <line
          key={`f-${f}`}
          x1={padX}
          y1={padTop + f * fretSpacing}
          x2={padX + gridW}
          y2={padTop + f * fretSpacing}
          stroke={f === 0 && baseFret === 1 ? '#ffffff' : '#71717a'}
          strokeWidth={f === 0 && baseFret === 1 ? 3 : 1.2}
        />
      ))}
      {/* מיתרים (Strings) */}
      {[0, 1, 2, 3, 4, 5].map((s) => (
        <line
          key={`s-${s}`}
          x1={padX + s * stringSpacing}
          y1={padTop}
          x2={padX + s * stringSpacing}
          y2={padTop + gridH}
          stroke="#d4d4d8"
          strokeWidth={1 + (5 - s) * 0.15}
        />
      ))}
      {/* נקודות אצבעות וסימני X / O */}
      {frets.map((fret, sIdx) => {
        const cx = padX + sIdx * stringSpacing;
        if (fret === -1) {
          return <text key={sIdx} x={cx} y={padTop - 5} textAnchor="middle" fill="#ef4444" fontSize={width * 0.11} fontWeight="bold">×</text>;
        }
        if (fret === 0) {
          return <circle key={sIdx} cx={cx} cy={padTop - 8} r={width * 0.035} fill="none" stroke="#10b981" strokeWidth={1.5} />;
        }
        const relFret = Math.max(1, Math.min(4, fret - baseFret + 1));
        const cy = padTop + (relFret - 0.5) * fretSpacing;
        const fingerNum = fingers?.[sIdx] || '';
        return (
          <g key={sIdx}>
            <circle cx={cx} cy={cy} r={width * 0.065} fill={themeColor} />
            {fingerNum > 0 && (
              <text x={cx} y={cy + width * 0.035} textAnchor="middle" fill="#09090b" fontSize={width * 0.09} fontWeight="bold">
                {fingerNum}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// פונקציית עזר לציור האקורד על הקנבס בעת ייצוא וידאו (MP4/WebM)
export function drawChordOnCanvas(ctx, chord, scaleRatio = 1) {
  const size = 110 * ((chord.scale || 100) / 100) * scaleRatio;
  const w = size;
  const h = size * 1.25;
  const x = (chord.x || 60) * scaleRatio;
  const y = (chord.y || 60) * scaleRatio;
  const color = chord.themeColor || '#38bdf8';

  ctx.save();
  ctx.fillStyle = 'rgba(15, 15, 18, 0.9)';
  ctx.strokeStyle = color;
  ctx.lineWidth = 2 * scaleRatio;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8 * scaleRatio);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = color;
  ctx.font = `bold ${Math.round(w * 0.16)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.direction = 'ltr';
  ctx.fillText(chord.chordName || 'Am', x + w / 2, y + h * 0.16);

  const padX = w * 0.18;
  const padTop = h * 0.26;
  const gridW = w - padX * 2;
  const gridH = h * 0.62;
  const sStep = gridW / 5;
  const fStep = gridH / 4;

  for (let f = 0; f <= 4; f++) {
    ctx.strokeStyle = f === 0 && (chord.baseFret || 1) === 1 ? '#fff' : '#71717a';
    ctx.lineWidth = (f === 0 ? 3 : 1.2) * scaleRatio;
    ctx.beginPath();
    ctx.moveTo(x + padX, y + padTop + f * fStep);
    ctx.lineTo(x + padX + gridW, y + padTop + f * fStep);
    ctx.stroke();
  }

  for (let s = 0; s <= 5; s++) {
    ctx.strokeStyle = '#d4d4d8';
    ctx.lineWidth = 1.2 * scaleRatio;
    ctx.beginPath();
    ctx.moveTo(x + padX + s * sStep, y + padTop);
    ctx.lineTo(x + padX + s * sStep, y + padTop + gridH);
    ctx.stroke();
  }

  (chord.frets || [-1, 0, 2, 2, 1, 0]).forEach((fret, sIdx) => {
    const cx = x + padX + sIdx * sStep;
    if (fret === -1) {
      ctx.fillStyle = '#ef4444';
      ctx.font = `bold ${Math.round(w * 0.11)}px sans-serif`;
      ctx.fillText('×', cx, y + padTop - 4 * scaleRatio);
    } else if (fret === 0) {
      ctx.strokeStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(cx, y + padTop - 7 * scaleRatio, w * 0.035, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      const rel = Math.max(1, Math.min(4, fret - (chord.baseFret || 1) + 1));
      const cy = y + padTop + (rel - 0.5) * fStep;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(cx, cy, w * 0.065, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  ctx.restore();
}
