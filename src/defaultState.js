export const DEFAULT_CLIP_SETTINGS = {
  // 1. תיקון ודירוג צבעים (Color Correction & Grading)
  brightness: 100,      // בהירות וחשיפה (0% - 200%)
  contrast: 100,        // ניגודיות (0% - 200%)
  saturate: 100,        // רוויה (0% - 300%)
  temperature: 0,       // טמפרטורה חם/קר (-100 עד 100)
  hueRotate: 0,         // גוון / Tint (-180deg עד 180deg)
  shadows: 0,           // כהים (-50 עד 50)
  highlights: 0,        // בהירים (-50 עד 50)
  lutPreset: 'none',    // פרופיל צבע מוכן (Cinematic, Warm, B&W, Vintage)

  // 2. תנועה, גודל, סיבוב וחיתוך (Transform & Crop)
  scale: 100,           // זום באחוזים (10% - 300%)
  posX: 0,              // הזזה אופקית
  posY: 0,              // הזזה אנכית
  rotation: 0,          // סיבוב במעלות (-180 עד 180)
  mirrorH: true,        // היפוך מראה אופקי (מותאם לגיטרה)
  mirrorV: false,       // היפוך אנכי
  cropTop: 0,           // חיתוך שוליים עליון (0% - 50%)
  cropBottom: 0,        // חיתוך שוליים תחתון (0% - 50%)
  cropLeft: 0,          // חיתוך שוליים שמאל (0% - 50%)
  cropRight: 0,         // חיתוך שוליים ימין (0% - 50%)

  // 3. שקיפות ומיזוג שכבות (Compositing & Blending)
  opacity: 100,         // אטימות (0% - 100%)
  blendMode: 'normal',  // normal, multiply, screen, overlay

  // 4. אפקטים חזותיים (Visual Effects)
  blur: 0,              // טשטוש (0px - 20px)
  sharpen: 0,           // חידוד (0 - 100)
  vignette: 0,          // האפלת פינות (0% - 100%)
  grain: 0,             // גרעיניות סרט (0% - 100%)

  // 5. זמן וקצב (Time Remapping)
  speed: 1.0,           // מהירות (0.25x עד 4x)
  volume: 100           // עוצמת שמע של המקטע
};

export const DEFAULT_PIP_SETTINGS = {
  startTime: 0,         // שנייה שבה התמונה/חלון מופיעים
  endTime: 10,          // שנייה שבה התמונה/חלון נעלמים
  x: 30,                // מיקום X על המסך
  y: 30,                // מיקום Y על המסך
  width: 220,           // רוחב החלון
  height: 150,          // גובה החלון
  rotation: 0,          // סיבוב החלון
  opacity: 100,         // שקיפות החלון
  cropTop: 0,           // חיתוך פנימי של התמונה עצמה
  cropBottom: 0,
  cropLeft: 0,
  cropRight: 0,
  borderRadius: 6,      // עיגול פינות
  borderWidth: 2,       // עובי מסגרת
  borderColor: '#a855f7',
  blendMode: 'normal'
};

export const LUT_PRESETS = {
  none: { label: 'ללא פילטר (Original)', filter: '' },
  cinematic: { label: 'קולנועי (Teal & Orange)', filter: 'contrast(1.15) saturate(1.2) sepia(0.15) hue-rotate(-10deg)' },
  warmStudio: { label: 'אולפן חם (Warm Acoustic)', filter: 'sepia(0.25) contrast(1.08) brightness(1.04) saturate(1.15)' },
  bwContrast: { label: 'שחור-לבן דרמטי (Noir)', filter: 'grayscale(1) contrast(1.35)' },
  vintageFilm: { label: 'פילם וינטג׳ (Kodak)', filter: 'sepia(0.35) contrast(0.95) brightness(1.05)' },
  coolBlue: { label: 'לילה קר (Cool Blue)', filter: 'saturate(0.9) hue-rotate(15deg) contrast(1.1)' }
};
