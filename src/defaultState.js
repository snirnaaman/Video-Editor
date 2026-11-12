// 1. יחסי מסך ורזולוציות תצוגה (כולל מצב Proxy ליעילות משאבים)
export const ASPECT_RATIOS = {
  '16:9': { label: '16:9 רוחב (YouTube)', width: 1280, height: 720, ratio: 16 / 9 },
  '9:16': { label: '9:16 אורך (Reels / Shorts)', width: 720, height: 1280, ratio: 9 / 16 },
  '1:1':  { label: '1:1 ריבוע (Instagram)', width: 1080, height: 1080, ratio: 1 },
  '4:5':  { label: '4:5 פורטרט (Feed)', width: 1080, height: 1350, ratio: 4 / 5 }
};

export const PREVIEW_QUALITY_MODES = {
  full:    { label: 'מלאה (100%)', scaleFactor: 1.0, fpsLimit: 60 },
  half:    { label: 'חצי (1/2 - מומלץ לעריכה)', scaleFactor: 0.5, fpsLimit: 30 },
  quarter: { label: 'רבע (1/4 - חיסכון מקסימלי)', scaleFactor: 0.25, fpsLimit: 24 }
};

// 2. סביבות עבודה (Workspaces)
export const WORKSPACE_MODES = ['edit', 'cut', 'color', 'audio', 'ai_script'];

// 3. מצבי כלי עריכה בציר הזמן (Toolbar Tools)
export const TIMELINE_TOOLS = {
  SELECT: 'select',       // קיצור: V / A - בחירה והזזה רגילה
  BLADE: 'blade',         // קיצור: B / S - חיתוך קליפ
  RIPPLE: 'ripple',       // קיצור: R - קיצור/הארכת קצה ותזוזת הקליפים שאחרי
  ROLL: 'roll',           // קיצור: N - הזזת נקודת חיתוך בין קליפים
  SLIP: 'slip',           // קיצור: Y - הזזת תוכן המקור פנימה
  SLIDE: 'slide',         // קיצור: U - הזזת הקליפ עצמו על הציר
  RATE_STRETCH: 'stretch' // קיצור: X - מתיחת מהירות ניגון
};

// 4. מבנה Keyframe ועקומות אינטרפולציה
export const EASING_TYPES = {
  linear:    { label: 'ליניארי (קבוע)', bezier: [0.0, 0.0, 1.0, 1.0] },
  easeIn:    { label: 'האצה (Ease In)', bezier: [0.42, 0.0, 1.0, 1.0] },
  easeOut:   { label: 'האטה (Ease Out)', bezier: [0.0, 0.0, 0.58, 1.0] },
  easeInOut: { label: 'חלק (S-Curve)', bezier: [0.42, 0.0, 0.58, 1.0] },
  spring:    { label: 'קפיצי (Spring)', bezier: [0.34, 1.56, 0.64, 1.0] }
};

// 5. הגדרות קליפ מורחבות
export const DEFAULT_CLIP_SETTINGS = {
  // --- צבע בסיסי ---
  brightness: 100,
  contrast: 100,
  saturate: 100,
  temperature: 0,
  hueRotate: 0,
  shadows: 0,
  highlights: 0,
  lutPreset: 'none',

  // --- צבע מתקדם (Primary Wheels & Curves) ---
  pivot: 50,
  vibrance: 0,
  midtoneDetail: 0,
  colorWheels: {
    lift:   { r: 0, g: 0, b: 0, y: 0 },
    gamma:  { r: 0, g: 0, b: 0, y: 0 },
    gain:   { r: 0, g: 0, b: 0, y: 0 },
    offset: { r: 0, g: 0, b: 0, y: 0 }
  },
  curves: {
    master: [{ x: 0, y: 0 }, { x: 255, y: 255 }],
    red:    [{ x: 0, y: 0 }, { x: 255, y: 255 }],
    green:  [{ x: 0, y: 0 }, { x: 255, y: 255 }],
    blue:   [{ x: 0, y: 0 }, { x: 255, y: 255 }],
    hueVsSat: [{ hue: 0, sat: 0 }, { hue: 120, sat: 0 }, { hue: 240, sat: 0 }, { hue: 360, sat: 0 }]
  },
  hslQualifier: {
    enabled: false,
    showHighlightMask: false,
    hueCenter: 20, hueWidth: 30, hueSoftness: 10,
    satMin: 20, satMax: 100, satSoftness: 10,
    lumMin: 20, lumMax: 100, lumSoftness: 10,
    correction: { saturation: 0, brightness: 0, hueShift: 0, blur: 0 }
  },

  // --- מסגור וטרנספורמציה (כולל Anchor & 3D) ---
  fitMode: 'contain',
  scale: 100,
  scaleX: 100,
  scaleY: 100,
  lockAspectScale: true,
  posX: 0,
  posY: 0,
  anchorX: 50,
  anchorY: 50,
  rotation: 0,
  pitch3D: 0,
  yaw3D: 0,
  mirrorH: false,
  mirrorV: false,
  cropTop: 0,
  cropBottom: 0,
  cropLeft: 0,
  cropRight: 0,
  cropFeather: 0,

  // --- אפקטים, שקיפות ומסכות ---
  opacity: 100,
  blendMode: 'normal',
  blur: 0,
  vignette: 0,
  fadeIn: 0,
  fadeOut: 0,
  blurMasks: [], // [{ id, shape: 'rect'|'ellipse', x, y, width, height, feather, amount, invert }]

  // --- מעברים ---
  transitionIn:  { type: 'none', duration: 0.5 },
  transitionOut: { type: 'none', duration: 0.5 },

  // --- זמן, מהירות ושמע מתקדם ---
  speed: 1.0,
  reverse: false,
  speedRampPoints: [], // [{ id, offsetRatio: 0.0-1.0, speed: 1.0, easing: 'easeInOut' }]
  volume: 100,
  pan: 0,
  audioFadeIn: 0,
  audioFadeOut: 0,
  audioEq: {
    lowCutHz: 20,
    lowGainDb: 0,
    midGainDb: 0,
    highGainDb: 0,
    voiceIsolation: 0,
    compressorEnabled: false,
    thresholdDb: -18,
    ratio: 3.0
  },

  // --- מערכת Keyframes ---
  keyframes: {}
};

// חלון PiP קלאסי
export const DEFAULT_PIP_SETTINGS = {
  startTime: 0,
  endTime: 10,
  x: 30,
  y: 30,
  width: 220,
  height: 150,
  rotation: 0,
  opacity: 100,
  cropTop: 0,
  cropBottom: 0,
  cropLeft: 0,
  cropRight: 0,
  borderRadius: 6,
  borderWidth: 2,
  borderColor: '#a855f7'
};

// טקסט קלאסי
export const DEFAULT_TEXT_OBJECT = {
  id: '',
  content: 'טקסט חדש',
  startTime: 0,
  endTime: 5,
  x: 40,
  y: 40,
  fontSize: 24,
  color: '#ffffff',
  bgColor: 'rgba(0, 0, 0, 0.65)',
  bold: true
};

// 6. אלמנט ייעודי לגיטרה: תצוגת אקורד
export const DEFAULT_CHORD_OVERLAY = {
  id: '',
  chordName: 'Am',
  startTime: 0,
  endTime: 5,
  x: 60,
  y: 60,
  scale: 100,
  baseFret: 1,
  frets: [-1, 0, 2, 2, 1, 0], // 6 מיתרים מ-E נמוך ל-E גבוה (-1 = חסום, 0 = פתוח)
  fingers: [0, 0, 2, 3, 1, 0],
  themeColor: '#38bdf8'
};

export const LUT_PRESETS = {
  none: { label: 'ללא פילטר (Original)', filter: '' },
  cinematic: { label: 'קולנועי (Teal & Orange)', filter: 'contrast(1.15) saturate(1.2) sepia(0.15) hue-rotate(-10deg)' },
  warmStudio: { label: 'אולפן חם (Warm Acoustic)', filter: 'sepia(0.25) contrast(1.08) brightness(1.04) saturate(1.15)' },
  bwContrast: { label: 'שחור-לבן דרמטי (Noir)', filter: 'grayscale(1) contrast(1.35)' },
  vintageFilm: { label: 'פילם וינטג׳ (Kodak)', filter: 'sepia(0.35) contrast(0.95) brightness(1.05)' },
  coolBlue: { label: 'לילה קר (Cool Blue)', filter: 'saturate(0.9) hue-rotate(15deg) contrast(1.1)' }
};
