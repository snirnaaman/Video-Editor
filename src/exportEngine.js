import * as Mp4Muxer from 'mp4-muxer';
import * as WebMMuxer from 'webm-muxer';
import { drawChordOnCanvas } from './ChordDiagram';
import { LUT_PRESETS } from './defaultState';

// 1. מיקס אודיו אופליין התומך בריבוי קליפים וערוצי שמע + EQ ו-Fades
export async function renderAudioMixOffline({ clips = [], audioClips = [], totalDuration = 10, sampleRate = 48000 }) {
  const safeDur = Math.max(1, totalDuration);
  const offlineCtx = new OfflineAudioContext(2, Math.ceil(safeDur * sampleRate), sampleRate);
  const decodedCache = new Map();

  const decodeUrl = async (url) => {
    if (!url) return null;
    if (decodedCache.has(url)) return decodedCache.get(url);
    try {
      const res = await fetch(url);
      const buf = await res.arrayBuffer();
      const audioBuf = await offlineCtx.decodeAudioData(buf);
      decodedCache.set(url, audioBuf);
      return audioBuf;
    } catch {
      return null;
    }
  };

  // סאונד מתוך קליפי הווידאו הראשיים (V1)
  for (const clip of clips) {
    if (clip.isImage || !clip.url) continue;
    const buf = await decodeUrl(clip.url);
    if (!buf) continue;
    const s = clip.settings || {};
    const vol = (s.volume ?? 100) / 100;
    if (vol <= 0) continue;

    const source = offlineCtx.createBufferSource();
    source.buffer = buf;
    source.playbackRate.value = s.speed || 1;

    const gainNode = offlineCtx.createGain();
    const clipLen = (clip.trimEnd - clip.trimStart) / (s.speed || 1);
    const fadeIn = s.audioFadeIn || s.fadeIn || 0;
    const fadeOut = s.audioFadeOut || s.fadeOut || 0;

    gainNode.gain.setValueAtTime(fadeIn > 0 ? 0.001 : vol, clip.timelineStart);
    if (fadeIn > 0) gainNode.gain.linearRampToValueAtTime(vol, clip.timelineStart + Math.min(fadeIn, clipLen));
    if (fadeOut > 0 && clipLen > fadeOut) {
      gainNode.gain.setValueAtTime(vol, clip.timelineStart + clipLen - fadeOut);
      gainNode.gain.linearRampToValueAtTime(0.001, clip.timelineStart + clipLen);
    }

    source.connect(gainNode);
    gainNode.connect(offlineCtx.destination);
    source.start(clip.timelineStart, clip.trimStart, clip.trimEnd - clip.trimStart);
  }

  // סאונד מתוך מסילת השמע הייעודית (A1)
  for (const aClip of audioClips) {
    if (aClip.muted || !aClip.url) continue;
    const buf = await decodeUrl(aClip.url);
    if (!buf) continue;
    const vol = (aClip.volume ?? 100) / 100;
    const source = offlineCtx.createBufferSource();
    source.buffer = buf;
    source.playbackRate.value = aClip.speed || 1;

    const gainNode = offlineCtx.createGain();
    const clipLen = (aClip.trimEnd - aClip.trimStart) / (aClip.speed || 1);
    const fadeIn = aClip.fadeIn || 0;
    const fadeOut = aClip.fadeOut || 0;

    gainNode.gain.setValueAtTime(fadeIn > 0 ? 0.001 : vol, aClip.timelineStart);
    if (fadeIn > 0) gainNode.gain.linearRampToValueAtTime(vol, aClip.timelineStart + Math.min(fadeIn, clipLen));
    if (fadeOut > 0 && clipLen > fadeOut) {
      gainNode.gain.setValueAtTime(vol, aClip.timelineStart + clipLen - fadeOut);
      gainNode.gain.linearRampToValueAtTime(0.001, aClip.timelineStart + clipLen);
    }

    source.connect(gainNode);
    gainNode.connect(offlineCtx.destination);
    source.start(aClip.timelineStart, aClip.trimStart, Math.min(buf.duration, aClip.trimEnd - aClip.trimStart));
  }

  return await offlineCtx.startRendering();
}

// 2. המרת AudioBuffer ל-WAV
export function audioBufferToWavBlob(buffer) {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const bufferArray = new ArrayBuffer(length);
  const view = new DataView(bufferArray);
  const channels = [];
  let pos = 0;

  const setUint16 = (data) => { view.setUint16(pos, data, true); pos += 2; };
  const setUint32 = (data) => { view.setUint32(pos, data, true); pos += 4; };

  setUint32(0x46464952);
  setUint32(length - 8);
  setUint32(0x45564157);
  setUint32(0x20746d66);
  setUint32(16);
  setUint16(1);
  setUint16(numOfChan);
  setUint32(buffer.sampleRate);
  setUint32(buffer.sampleRate * 2 * numOfChan);
  setUint16(numOfChan * 2);
  setUint16(16);
  setUint32(0x61746164);
  setUint32(length - pos - 4);

  for (let i = 0; i < numOfChan; i++) channels.push(buffer.getChannelData(i));

  let offset = 0;
  while (pos < length) {
    for (let i = 0; i < numOfChan; i++) {
      let sample = Math.max(-1, Math.min(1, channels[i][offset]));
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
      view.setInt16(pos, sample, true);
      pos += 2;
    }
    offset++;
  }
  return new Blob([bufferArray], { type: 'audio/wav' });
}

// 3. ציור פריים מאוחד לקנבס
export function drawCompositeFrameToCanvas({
  ctx, width, height, timelineTime, activeClip, mainMediaEl,
  pipClips = [], mediaElementsMap, texts = [], chords = []
}) {
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, width, height);

  const scaleRatio = width / 1280;

  if (activeClip && mainMediaEl) {
    const s = activeClip.settings || {};
    const vw = mainMediaEl.videoWidth || mainMediaEl.naturalWidth || 1280;
    const vh = mainMediaEl.videoHeight || mainMediaEl.naturalHeight || 720;

    if (s.fitMode === 'blurBg') {
      ctx.save();
      ctx.filter = 'blur(22px) brightness(0.55)';
      const bgScale = Math.max(width / vw, height / vh);
      ctx.drawImage(mainMediaEl, (width - vw * bgScale) / 2, (height - vh * bgScale) / 2, vw * bgScale, vh * bgScale);
      ctx.restore();
    }

    ctx.save();
    let alpha = (s.opacity ?? 100) / 100;
    const localTime = timelineTime - activeClip.timelineStart;
    const clipLen = (activeClip.trimEnd - activeClip.trimStart) / (s.speed || 1);
    if (s.fadeIn > 0 && localTime < s.fadeIn) alpha *= Math.max(0, localTime / s.fadeIn);
    if (s.fadeOut > 0 && localTime > clipLen - s.fadeOut) alpha *= Math.max(0, (clipLen - localTime) / s.fadeOut);
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

    const lutFilter = LUT_PRESETS[s.lutPreset]?.filter || '';
    ctx.filter = `brightness(${s.brightness ?? 100}%) contrast(${s.contrast ?? 100}%) saturate(${s.saturate ?? 100}%) hue-rotate(${s.hueRotate ?? 0}deg) ${s.blur > 0 ? `blur(${s.blur}px)` : ''} ${lutFilter}`.trim();

    const fitScale = s.fitMode === 'cover' ? Math.max(width / vw, height / vh) : Math.min(width / vw, height / vh);
    const drawW = vw * fitScale;
    const drawH = vh * fitScale;

    let animScale = (s.scale ?? 100) / 100;
    if (s.transitionIn === 'zoomIn' && localTime < 0.5) animScale *= 0.6 + (localTime / 0.5) * 0.4;

    ctx.translate(width / 2 + (s.posX || 0) * scaleRatio, height / 2 + (s.posY || 0) * scaleRatio);
    ctx.rotate(((s.rotation || 0) * Math.PI) / 180);
    ctx.scale((s.mirrorH ? -1 : 1) * animScale, (s.mirrorV ? -1 : 1) * animScale);

    const sx = ((s.cropLeft || 0) / 100) * vw;
    const sy = ((s.cropTop || 0) / 100) * vh;
    const sw = vw * (1 - ((s.cropLeft || 0) + (s.cropRight || 0)) / 100);
    const sh = vh * (1 - ((s.cropTop || 0) + (s.cropBottom || 0)) / 100);

    ctx.drawImage(mainMediaEl, sx, sy, Math.max(1, sw), Math.max(1, sh), -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();
  }

  // ציור כל שכבות ה-PiP הפעילות בזמן זה
  pipClips.forEach((pip) => {
    if (timelineTime >= pip.startTime && timelineTime <= pip.endTime) {
      const el = mediaElementsMap?.get(pip.url);
      if (!el) return;
      ctx.save();
      const px = pip.x * scaleRatio;
      const py = pip.y * scaleRatio;
      const pw = pip.width * scaleRatio;
      const ph = pip.height * scaleRatio;

      let pAlpha = (pip.opacity ?? 100) / 100;
      if (pip.fadeIn > 0 && timelineTime - pip.startTime < pip.fadeIn) pAlpha *= (timelineTime - pip.startTime) / pip.fadeIn;
      if (pip.fadeOut > 0 && pip.endTime - timelineTime < pip.fadeOut) pAlpha *= (pip.endTime - timelineTime) / pip.fadeOut;
      ctx.globalAlpha = Math.max(0, Math.min(1, pAlpha));

      ctx.translate(px + pw / 2, py + ph / 2);
      ctx.rotate(((pip.rotation || 0) * Math.PI) / 180);
      if (pip.borderRadius > 0) {
        ctx.beginPath();
        ctx.roundRect(-pw / 2, -ph / 2, pw, ph, pip.borderRadius * scaleRatio);
        ctx.clip();
      }
      ctx.drawImage(el, -pw / 2, -ph / 2, pw, ph);
      ctx.restore();
    }
  });

  // ציור דיאגרמות אקורדים
  chords.forEach((chord) => {
    if (timelineTime >= chord.startTime && timelineTime <= chord.endTime) {
      drawChordOnCanvas(ctx, chord, scaleRatio);
    }
  });

  // ציור כתוביות טקסט
  texts.forEach((txt) => {
    if (timelineTime >= txt.startTime && timelineTime <= txt.endTime) {
      ctx.save();
      const tx = txt.x * scaleRatio;
      const ty = txt.y * scaleRatio;
      const fSize = Math.round((txt.fontSize || 28) * scaleRatio);
      ctx.font = `${txt.bold ? 'bold ' : ''}${fSize}px system-ui, sans-serif`;
      ctx.direction = 'rtl';
      ctx.textBaseline = 'top';
      const metrics = ctx.measureText(txt.content);
      const pad = 10 * scaleRatio;
      ctx.fillStyle = txt.bgColor || 'rgba(0,0,0,0.7)';
      ctx.beginPath();
      ctx.roundRect(tx - pad, ty - pad * 0.6, metrics.width + pad * 2, fSize + pad * 1.2, 6 * scaleRatio);
      ctx.fill();
      ctx.fillStyle = txt.color || '#ffffff';
      ctx.fillText(txt.content, tx + metrics.width, ty);
      ctx.restore();
    }
  });
}

// פונקציית קפיצת זמן בטוחה שלעולם לא נתקעת על 0%
const safeSeekVideo = (videoEl, targetTime) => {
  if (!videoEl || videoEl.tagName !== 'VIDEO') return Promise.resolve();
  const dur = videoEl.duration || 100;
  const clamped = Math.max(0, Math.min(dur - 0.01, targetTime));
  if (Math.abs(videoEl.currentTime - clamped) < 0.015 && videoEl.readyState >= 2) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    let finished = false;
    const done = () => {
      if (finished) return;
      finished = true;
      videoEl.removeEventListener('seeked', done);
      resolve();
    };
    const timer = setTimeout(done, 250);
    videoEl.addEventListener('seeked', () => { clearTimeout(timer); done(); }, { once: true });
    try {
      videoEl.currentTime = clamped;
    } catch {
      clearTimeout(timer);
      done();
    }
  });
};

const loadMediaElement = (url, isImage = false) => {
  return new Promise((resolve) => {
    if (!url) return resolve(null);
    if (isImage) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = url;
    } else {
      const vid = document.createElement('video');
      vid.crossOrigin = 'anonymous';
      vid.muted = true;
      vid.playsInline = true;
      vid.preload = 'auto';
      vid.onloadeddata = () => resolve(vid);
      vid.onerror = () => resolve(null);
      vid.src = url;
      vid.load();
    }
  });
};

// 4. ייצוא הפרויקט המלא ברקע
export async function exportProjectOffline({
  format = 'mp4',
  resolutionScale = 1.0,
  fps = 30,
  bitrateMbps = 8,
  projectState,
  onProgress,
  abortSignal
}) {
  const { config, clips = [], pipClips = [], audioClips = [], texts = [], chords = [] } = projectState;
  const totalDuration = Math.max(0.5, config?.totalDuration || 5);

  if (format === 'wav') {
    if (onProgress) onProgress(30);
    const audioMix = await renderAudioMixOffline({ clips, audioClips, totalDuration });
    if (onProgress) onProgress(100);
    return audioBufferToWavBlob(audioMix);
  }

  // וידוא מידות זוגיות (חובה ב-H.264)
  const rawW = (config?.format?.width || 1280) * resolutionScale;
  const rawH = (config?.format?.height || 720) * resolutionScale;
  const width = Math.floor(rawW / 2) * 2;
  const height = Math.floor(rawH / 2) * 2;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  // טעינה מראש של כל קובצי המדיה בפרויקט
  const mediaElementsMap = new Map();
  for (const c of clips) {
    if (c.url && !mediaElementsMap.has(c.url)) {
      mediaElementsMap.set(c.url, await loadMediaElement(c.url, c.isImage));
    }
  }
  for (const p of pipClips) {
    if (p.url && !mediaElementsMap.has(p.url)) {
      mediaElementsMap.set(p.url, await loadMediaElement(p.url, !p.isVideo));
    }
  }

  let muxer;
  const isWebm = format === 'webm';
  if (isWebm) {
    muxer = new WebMMuxer.Muxer({
      target: new WebMMuxer.ArrayBufferTarget(),
      video: { codec: 'V_VP9', width, height, frameRate: fps }
    });
  } else {
    muxer = new Mp4Muxer.Muxer({
      target: new Mp4Muxer.ArrayBufferTarget(),
      video: { codec: 'avc', width, height },
      fastStart: 'in-memory'
    });
  }

  const videoEncoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (e) => console.error('VideoEncoder error:', e)
  });

  // בחירת פרופיל H.264 תומך HD ו-Full HD
  let selectedCodec = isWebm ? 'vp09.00.10.08' : 'avc1.640028';
  if (!isWebm && VideoEncoder.isConfigSupported) {
    const check = await VideoEncoder.isConfigSupported({ codec: selectedCodec, width, height, bitrate: bitrateMbps * 1_000_000, framerate: fps });
    if (!check.supported) selectedCodec = 'avc1.420028';
  }

  videoEncoder.configure({
    codec: selectedCodec,
    width,
    height,
    bitrate: bitrateMbps * 1_000_000,
    framerate: fps
  });

  const totalFrames = Math.max(1, Math.ceil(totalDuration * fps));

  for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
    if (abortSignal?.aborted) {
      videoEncoder.close();
      throw new Error('Export aborted');
    }

    while (videoEncoder.encodeQueueSize > 8) {
      await new Promise(r => setTimeout(r, 15));
    }

    const timelineTime = frameIndex / fps;
    const activeClip = clips.find(c => {
      const len = (c.trimEnd - c.trimStart) / (c.settings?.speed || 1);
      return timelineTime >= c.timelineStart && timelineTime <= c.timelineStart + len + 0.02;
    });

    let mainEl = null;
    if (activeClip) {
      mainEl = mediaElementsMap.get(activeClip.url);
      if (mainEl && !activeClip.isImage) {
        const sourceTime = activeClip.trimStart + (timelineTime - activeClip.timelineStart) * (activeClip.settings?.speed || 1);
        await safeSeekVideo(mainEl, sourceTime);
      }
    }

    for (const p of pipClips) {
      if (p.isVideo && timelineTime >= p.startTime && timelineTime <= p.endTime) {
        const pEl = mediaElementsMap.get(p.url);
        if (pEl) await safeSeekVideo(pEl, timelineTime - p.startTime);
      }
    }

    drawCompositeFrameToCanvas({
      ctx,
      width,
      height,
      timelineTime,
      activeClip,
      mainMediaEl: mainEl,
      pipClips,
      mediaElementsMap,
      texts,
      chords
    });

    const timestamp = Math.round(timelineTime * 1_000_000);
    const duration = Math.round((1 / fps) * 1_000_000);
    const frame = new VideoFrame(canvas, { timestamp, duration });
    videoEncoder.encode(frame, { keyFrame: frameIndex % (fps * 2) === 0 });
    frame.close();

    const pct = Math.min(99, Math.round(((frameIndex + 1) / totalFrames) * 100));
    if (onProgress) onProgress(pct);

    // שחרור ה-Main Thread לעדכון מד ההתקדמות על המסך
    if (frameIndex % 3 === 0) {
      await new Promise(r => setTimeout(r, 0));
    }
  }

  await videoEncoder.flush();
  videoEncoder.close();
  muxer.finalize();
  if (onProgress) onProgress(100);

  return new Blob([muxer.target.buffer], { type: isWebm ? 'video/webm' : 'video/mp4' });
}
