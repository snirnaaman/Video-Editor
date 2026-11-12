export const ASPECT_RATIOS = {
  '16:9': { label: '16:9 רוחב (YouTube)', width: 1280, height: 720, ratio: 16 / 9 },
  '9:16': { label: '9:16 אורך (Reels / Shorts)', width: 720, height: 1280, ratio: 9 / 16 },
  '1:1':  { label: '1:1 ריבוע (Instagram)', width: 1080, height: 1080, ratio: 1 },
  '4:5':  { label: '4:5 פורטרט (Feed)', width: 1080, height: 1350, ratio: 4 / 5 }
};

export const TRANSITION_TYPES = {
  none:          { label: 'ללא מעבר (Cut)' },
  crossDissolve: { label: 'חפיפה רכה (Cross Dissolve)' },
  dipToBlack:    { label: 'עמעום לשחור (Dip to Black)' },
  zoomIn:        { label: 'זום דינמי (Zoom Transition)' },
  slideLeft:     { label: 'החלקה הצידה (Slide)' }
};

export const CHORD_LIBRARY = {
  Am:    { chordName: 'Am',    baseFret: 1, frets: [-1, 0, 2, 2, 1, 0], fingers: [0, 0, 2, 3, 1, 0], themeColor: '#38bdf8' },
  C:     { chordName: 'C',     baseFret: 1, frets: [-1, 3, 2, 0, 1, 0], fingers: [0, 3, 2, 0, 1, 0], themeColor: '#38bdf8' },
  G:     { chordName: 'G',     baseFret: 1, frets: [3, 2, 0, 0, 0, 3],  fingers: [2, 1, 0, 0, 0, 3], themeColor: '#38bdf8' },
  F:     { chordName: 'F',     baseFret: 1, frets: [1, 3, 3, 2, 1, 1],  fingers: [1, 3, 4, 2, 1, 1], themeColor: '#38bdf8' },
  Em:    { chordName: 'Em',    baseFret: 1, frets: [0, 2, 2, 0, 0, 0],  fingers: [0, 2, 3, 0, 0, 0], themeColor: '#38bdf8' },
  E:     { chordName: 'E',     baseFret: 1, frets: [0, 2, 2, 1, 0, 0],  fingers: [0, 2, 3, 1, 0, 0], themeColor: '#38bdf8' },
  D:     { chordName: 'D',     baseFret: 1, frets: [-1, -1, 0, 2, 3, 2],fingers: [0, 0, 0, 1, 3, 2], themeColor: '#38bdf8' },
  Dm:    { chordName: 'Dm',    baseFret: 1, frets: [-1, -1, 0, 2, 3, 1],fingers: [0, 0, 0, 2, 3, 1], themeColor: '#38bdf8' },
  A:     { chordName: 'A',     baseFret: 1, frets: [-1, 0, 2, 2, 2, 0], fingers: [0, 0, 1, 2, 3, 0], themeColor: '#38bdf8' },
  Bm:    { chordName: 'Bm',    baseFret: 2, frets: [-1, 2, 4, 4, 3, 2], fingers: [0, 1, 3, 4, 2, 1], themeColor: '#a855f7' },
  B7:    { chordName: 'B7',    baseFret: 1, frets: [-1, 2, 1, 2, 0, 2], fingers: [0, 2, 1, 3, 0, 4], themeColor: '#f59e0b' },
  E7:    { chordName: 'E7',    baseFret: 1, frets: [0, 2, 0, 1, 0, 0],  fingers: [0, 2, 0, 1, 0, 0], themeColor: '#f59e0b' },
  A7:    { chordName: 'A7',    baseFret: 1, frets: [-1, 0, 2, 0, 2, 0], fingers: [0, 0, 2, 0, 3, 0], themeColor: '#f59e0b' },
  D7:    { chordName: 'D7',    baseFret: 1, frets: [-1, -1, 0, 2, 1, 2],fingers: [0, 0, 0, 2, 1, 3], themeColor: '#f59e0b' },
  G7:    { chordName: 'G7',    baseFret: 1, frets: [3, 2, 0, 0, 0, 1],  fingers: [3, 2, 0, 0, 0, 1], themeColor: '#f59e0b' },
  Fmaj7: { chordName: 'Fmaj7', baseFret: 1, frets: [-1, -1, 3, 2, 1, 0],fingers: [0, 0, 3, 2, 1, 0], themeColor: '#10b981' },
  Cmaj7: { chordName: 'Cmaj7', baseFret: 1, frets: [-1, 3, 2, 0, 0, 0], fingers: [0, 3, 2, 0, 0, 0], themeColor: '#10b981' },
  Am7:   { chordName: 'Am7',   baseFret: 1, frets: [-1, 0, 2, 0, 1, 0], fingers: [0, 0, 2, 0, 1, 0], themeColor: '#10b981' },
  Dsus4: { chordName: 'Dsus4', baseFret: 1, frets: [-1, -1, 0, 2, 3, 3],fingers: [0, 0, 0, 1, 2, 3], themeColor: '#ec4899' },
  Cadd9: { chordName: 'Cadd9', baseFret: 1, frets: [-1, 3, 2, 0, 3, 3], fingers: [0, 2, 1, 0, 3, 4], themeColor: '#ec4899' }
};

export const KEYBOARD_SHORTCUTS = [
  { action: 'ניגון / השהיה', keys: 'Space' },
  { action: 'חזרה להתחלה (00:00:00)', keys: 'Home / 0' },
  { action: 'פיצול האלמנט הנבחר בנקודת הזמן', keys: 'S / B' },
  { action: 'שכפול האלמנט הנבחר', keys: 'Ctrl + D' },
  { action: 'מחיקת האלמנט הנבחר (וידאו/PiP/שמע/טקסט/אקורד)', keys: 'Delete / Backspace' },
  { action: 'ביטול פעולה (Undo)', keys: 'Ctrl + Z' },
  { action: 'חזרה על פעולה (Redo)', keys: 'Ctrl + Y / Ctrl+Shift+Z' },
  { action: 'צעד פריים קדימה / אחורה', keys: 'ArrowLeft / ArrowRight' },
  { action: 'סריקה מהירה (Shuttle Play / Stop / Back)', keys: 'L / K / J' },
  { action: 'הגדלת / הקטנת זום בציר הזמן', keys: '+ / -' },
  { action: 'פתיחת סוכן AI Co-Pilot', keys: 'Ctrl + K' },
  { action: 'פתיחת חלון קיצורי מקלדת זה', keys: '?' }
];

export const DEFAULT_CLIP_SETTINGS = {
  brightness: 100,
  contrast: 100,
  saturate: 100,
  temperature: 0,
  hueRotate: 0,
  shadows: 0,
  highlights: 0,
  lutPreset: 'none',
  colorWheels: {
    lift:   { r: 0, g: 0, b: 0, y: 0 },
    gamma:  { r: 0, g: 0, b: 0, y: 0 },
    gain:   { r: 0, g: 0, b: 0, y: 0 }
  },
  fitMode: 'contain',
  scale: 100,
  posX: 0,
  posY: 0,
  rotation: 0,
  mirrorH: false,
  mirrorV: false,
  cropTop: 0,
  cropBottom: 0,
  cropLeft: 0,
  cropRight: 0,
  opacity: 100,
  blendMode: 'source-over',
  blur: 0,
  vignette: 0,
  fadeIn: 0,
  fadeOut: 0,
  transitionIn: 'none',
  transitionOut: 'none',
  transitionDuration: 0.6,
  blurMasks: [],
  speed: 1.0,
  volume: 100,
  pan: 0,
  audioFadeIn: 0,
  audioFadeOut: 0,
  audioEq: {
    lowCutHz: 20,
    lowGainDb: 0,
    midGainDb: 0,
    highGainDb: 0,
    compressorEnabled: false
  },
  keyframes: {}
};

export const DEFAULT_PIP_SETTINGS = {
  id: '',
  name: 'PiP',
  url: '',
  isVideo: false,
  startTime: 0,
  endTime: 8,
  x: 35,
  y: 35,
  width: 220,
  height: 150,
  rotation: 0,
  opacity: 100,
  fadeIn: 0.3,
  fadeOut: 0.3,
  cropTop: 0,
  cropBottom: 0,
  cropLeft: 0,
  cropRight: 0,
  borderRadius: 8,
  borderWidth: 2,
  borderColor: '#a855f7'
};

export const DEFAULT_AUDIO_CLIP = {
  id: '',
  name: 'שמע',
  url: '',
  timelineStart: 0,
  trimStart: 0,
  trimEnd: 10,
  volume: 100,
  speed: 1.0,
  pan: 0,
  fadeIn: 0.5,
  fadeOut: 0.5,
  muted: false,
  lowCutHz: 20,
  lowGainDb: 0,
  midGainDb: 0,
  highGainDb: 0
};

export const DEFAULT_TEXT_OBJECT = {
  id: '',
  content: 'כותרת חדשה',
  startTime: 0,
  endTime: 5,
  x: 80,
  y: 80,
  fontSize: 28,
  color: '#ffffff',
  bgColor: 'rgba(0, 0, 0, 0.7)',
  bold: true,
  fadeIn: 0.2,
  fadeOut: 0.2
};

export const DEFAULT_CHORD_OVERLAY = {
  id: '',
  chordName: 'Am',
  startTime: 0,
  endTime: 5,
  x: 50,
  y: 50,
  scale: 100,
  baseFret: 1,
  frets: [-1, 0, 2, 2, 1, 0],
  fingers: [0, 0, 2, 3, 1, 0],
  themeColor: '#38bdf8'
};

export const LUT_PRESETS = {
  none:       { label: 'ללא פילטר (Original)', filter: '' },
  cinematic:  { label: 'קולנועי (Teal & Orange)', filter: 'contrast(1.15) saturate(1.2) sepia(0.15) hue-rotate(-10deg)' },
  warmStudio: { label: 'אולפן חם (Warm Acoustic)', filter: 'sepia(0.25) contrast(1.08) brightness(1.04) saturate(1.15)' },
  bwContrast: { label: 'שחור-לבן דרמטי (Noir)', filter: 'grayscale(1) contrast(1.35)' },
  vintageFilm:{ label: 'פילם וינטג׳ (Kodak)', filter: 'sepia(0.35) contrast(0.95) brightness(1.05)' },
  coolBlue:   { label: 'לילה קר (Cool Blue)', filter: 'saturate(0.9) hue-rotate(15deg) contrast(1.1)' }
};
