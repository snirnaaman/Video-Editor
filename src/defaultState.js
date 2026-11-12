export const ASPECT_RATIOS = {
  '16:9': { label: '16:9 רוחב (YouTube / קורס)', width: 1280, height: 720, ratio: 16 / 9 },
  '9:16': { label: '9:16 אורך (Reels / Shorts)', width: 720, height: 1280, ratio: 9 / 16 },
  '1:1':  { label: '1:1 ריבוע (Instagram)', width: 1080, height: 1080, ratio: 1 }
};

export const DEFAULT_CLIP_SETTINGS = {
  // 1. תיקון ודירוג צבעים (Color Correction & Grading)
  brightness: 100,
  contrast: 100,
  saturate: 100,
  temperature: 0,
  hueRotate: 0,
  shadows: 0,
  highlights: 0,
  lutPreset: 'none',

  // 2. תנועה, גודל, התאמת מסך וחיתוך (Transform & Crop)
  fitMode: 'contain',   // 'contain' (התאמה מלאה) | 'cover' (מילוי מסך) | 'blurBg' (רקע מטושטש)
  scale: 100,
  posX: 0,
  posY: 0,
  rotation: 0,
  mirrorH: true,
  mirrorV: false,
  cropTop: 0,
  cropBottom: 0,
  cropLeft: 0,
  cropRight: 0,

  // 3. שקיפות, מעברים ואפקטים (Compositing & FX)
  opacity: 100,
  blendMode: 'normal',
  blur: 0,
  vignette: 0,
  fadeIn: 0,            // עמעום כניסה בשניות (0 - 3)
  fadeOut: 0,           // עמעום יציאה בשניות (0 - 3)

  // 4. זמן ושמע (Time & Audio)
  speed: 1.0,
  volume: 100
};

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

export const DEFAULT_TEXT_SETTINGS = {
  enabled: false,
  content: 'אקורד Am — פריטה איטית',
  startTime: 0,
  endTime: 8,
  x: 40,
  y: 260,
  fontSize: 24,
  color: '#ffffff',
  bgColor: 'rgba(0, 0, 0, 0.65)',
  bold: true
};

export const LUT_PRESETS = {
  none: { label: 'ללא פילטר (Original)', filter: '' },
  cinematic: { label: 'קולנועי (Teal & Orange)', filter: 'contrast(1.15) saturate(1.2) sepia(0.15) hue-rotate(-10deg)' },
  warmStudio: { label: 'אולפן חם (Warm Acoustic)', filter: 'sepia(0.25) contrast(1.08) brightness(1.04) saturate(1.15)' },
  bwContrast: { label: 'שחור-לבן דרמטי (Noir)', filter: 'grayscale(1) contrast(1.35)' },
  vintageFilm: { label: 'פילם וינטג׳ (Kodak)', filter: 'sepia(0.35) contrast(0.95) brightness(1.05)' },
  coolBlue: { label: 'לילה קר (Cool Blue)', filter: 'saturate(0.9) hue-rotate(15deg) contrast(1.1)' }
};
