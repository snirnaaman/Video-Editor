import * as Mp4Muxer from 'mp4-muxer';
import * as WebMMuxer from 'webm-muxer';

// ---------------------------------------------------------------------------
// 1. עיבוד וערבול אודיו אופליין (Offline Audio Mix)
// ---------------------------------------------------------------------------
export async function renderAudioMixOffline({ mainVideoUrl, extAudioUrl, clips, totalDuration, sampleRate = 48000 }) {
  const offlineCtx = new OfflineAudioContext(2, Math.ceil(totalDuration * sampleRate), sampleRate);

  const fetchAndDecode = async (url) => {
    const res = await fetch(url);
    const arrayBuffer = await res.arrayBuffer();
    return await offlineCtx.decodeAudioData(arrayBuffer);
  };

  const mainAudioBuffer = mainVideoUrl ? await fetchAndDecode(mainVideoUrl) : null;
  const extAudioBuffer = extAudioUrl ? await fetchAndDecode(extAudioUrl) : null;

  // עיבוד מקטעי האודיו מתוך הסרטון הראשי בהתאם לחיתוכים בציר הזמן
  if (mainAudioBuffer && clips && clips.length > 0) {
    clips.forEach(clip => {
      const source = offlineCtx.createBufferSource();
      source.buffer = mainAudioBuffer;
      source.playbackRate.value = clip.settings.speed || 1;

      const gainNode = offlineCtx.createGain();
      gainNode.gain.value = (clip.settings.volume !== undefined ? clip.settings.volume : 100) / 100;

      // הגדרת עמעום (Fade In/Out)
      const { fadeIn = 0, fadeOut = 0 } = clip.settings;
      const clipDuration = (clip.trimEnd - clip.trimStart) / source.playbackRate.value;
      
      gainNode.gain.setValueAtTime(fadeIn > 0 ? 0 : gainNode.gain.value, clip.timelineStart);
      if (fadeIn > 0) {
        gainNode.gain.linearRampToValueAtTime(gainNode.gain.value, clip.timelineStart + fadeIn);
      }
      if (fadeOut > 0 && clipDuration > fadeOut) {
        gainNode.gain.setValueAtTime(gainNode.gain.value, clip.timelineStart + clipDuration - fadeOut);
        gainNode.gain.linearRampToValueAtTime(0, clip.timelineStart + clipDuration);
      }

      source.connect(gainNode);
      gainNode.connect(offlineCtx.destination);

      const durationToPlay = clip.trimEnd - clip.trimStart;
      source.start(clip.timelineStart, clip.trimStart, durationToPlay);
    });
  }

  // הוספת שכבת סאונד חיצוני אם ישנה
  if (extAudioBuffer) {
    const extSource = offlineCtx.createBufferSource();
    extSource.buffer = extAudioBuffer;
    extSource.connect(offlineCtx.destination);
    extSource.start(0, 0, totalDuration);
  }

  return await offlineCtx.startRendering();
}

// ---------------------------------------------------------------------------
// 2. המרת AudioBuffer ל-WAV מובנה
// ---------------------------------------------------------------------------
export function audioBufferToWavBlob(buffer) {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const bufferArray = new ArrayBuffer(length);
  const view = new DataView(bufferArray);
  const channels = [];
  let sample;
  let offset = 0;
  let pos = 0;

  const setUint16 = (data) => { view.setUint16(pos, data, true); pos += 2; };
  const setUint32 = (data) => { view.setUint32(pos, data, true); pos += 4; };

  // RIFF Chunk Descriptor
  setUint32(0x46464952); // "RIFF"
  setUint32(length - 8);
  setUint32(0x45564157); // "WAVE"
  
  // FMT Sub-chunk
  setUint32(0x20746d66); // "fmt "
  setUint32(16);
  setUint16(1); // PCM
  setUint16(numOfChan);
  setUint32(buffer.sampleRate);
  setUint32(buffer.sampleRate * 2 * numOfChan);
  setUint16(numOfChan * 2);
  setUint16(16);
  
  // Data Sub-chunk
  setUint32(0x61746164); // "data"
  setUint32(length - pos - 4);

  for (let i = 0; i < buffer.numberOfChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  while (pos < length) {
    for (let i = 0; i < numOfChan; i++) {
      sample = Math.max(-1, Math.min(1, channels[i][offset]));
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
      view.setInt16(pos, sample, true);
      pos += 2;
    }
    offset++;
  }

  return new Blob([bufferArray], { type: 'audio/wav' });
}

// ---------------------------------------------------------------------------
// 3. מנוע ציור הפריים - מרנדר את כל השכבות בהתאם ל-timelineTime הנתון
// ---------------------------------------------------------------------------
export function drawCompositeFrameToCanvas({ 
  ctx, width, height, timelineTime, activeClip, 
  mainVideoEl, pipMediaEl, pipSettings, hasPip, texts, lutPresets 
}) {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, width, height);
  if (!activeClip || !mainVideoEl) return;

  const s = activeClip.settings;
  const vw = mainVideoEl.videoWidth || 1280;
  const vh = mainVideoEl.videoHeight || 720;
  
  // חישוב יחס פרופורציה לייצוא
  const scaleRatio = width / vw; // בהנחה שהקנבס יחסי לגודל המקור

  // ציור רקע מטושטש
  if (s.fitMode === 'blurBg') {
    ctx.save();
    ctx.filter = 'blur(24px) brightness(0.55)';
    const bgScale = Math.max(width / vw, height / vh);
    const bw = vw * bgScale;
    const bh = vh * bgScale;
    ctx.drawImage(mainVideoEl, (width - bw) / 2, (height - bh) / 2, bw, bh);
    ctx.restore();
  }

  ctx.save();
  // שקיפות (כולל הדרגתיות בכניסה/יציאה)
  let alpha = s.opacity / 100;
  const localTime = timelineTime - activeClip.timelineStart;
  const clipLen = activeClip.trimEnd - activeClip.trimStart;
  if (s.fadeIn > 0 && localTime < s.fadeIn) alpha *= Math.max(0, localTime / s.fadeIn);
  if (s.fadeOut > 0 && localTime > clipLen - s.fadeOut) alpha *= Math.max(0, (clipLen - localTime) / s.fadeOut);
  
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = s.blendMode || 'source-over';

  // בניית מחרוזת ה-Filter
  const lutFilter = lutPresets?.[s.lutPreset]?.filter || '';
  const tempSepia = s.temperature > 0 ? `sepia(${s.temperature / 200})` : '';
  const tempCool = s.temperature < 0 ? `hue-rotate(${s.temperature * 0.4}deg)` : '';
  const contrastAdj = s.shadows !== 0 || s.highlights !== 0 ? `contrast(${100 + (s.highlights - s.shadows) * 0.3}%)` : '';
  ctx.filter = [
    `brightness(${s.brightness}%)`, `contrast(${s.contrast}%)`, `saturate(${s.saturate}%)`,
    `hue-rotate(${s.hueRotate}deg)`, s.blur > 0 ? `blur(${s.blur}px)` : '',
    tempSepia, tempCool, contrastAdj, lutFilter
  ].filter(Boolean).join(' ');

  // התאמת מידות וטרנספורמציה
  const fitScale = s.fitMode === 'cover' ? Math.max(width / vw, height / vh) : Math.min(width / vw, height / vh);
  const drawW = vw * fitScale;
  const drawH = vh * fitScale;

  ctx.translate(width / 2 + s.posX * scaleRatio, height / 2 + s.posY * scaleRatio);
  ctx.rotate((s.rotation * Math.PI) / 180);
  ctx.scale((s.mirrorH ? -1 : 1) * (s.scale / 100), (s.mirrorV ? -1 : 1) * (s.scale / 100));

  // חיתוך שוליים (Crop)
  const sx = (s.cropLeft / 100) * vw;
  const sy = (s.cropTop / 100) * vh;
  const sw = vw * (1 - (s.cropLeft + s.cropRight) / 100);
  const sh = vh * (1 - (s.cropTop + s.cropBottom) / 100);

  ctx.drawImage(mainVideoEl, sx, sy, Math.max(1, sw), Math.max(1, sh), -drawW / 2, -drawH / 2, drawW, drawH);
  ctx.restore();

  // ציור האפלת פינות (Vignette)
  if (s.vignette > 0) {
    ctx.save();
    const grad = ctx.createRadialGradient(width/2, height/2, height/4, width/2, height/2, width/2);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, `rgba(0,0,0,${s.vignette / 100})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  // ציור מסכות טשטוש נקודתיות
  if (s.blurMasks && s.blurMasks.length > 0) {
    s.blurMasks.forEach(mask => {
      ctx.save();
      ctx.filter = `blur(${mask.amount}px)`;
      ctx.beginPath();
      if (mask.shape === 'ellipse') {
        ctx.ellipse(mask.x * scaleRatio + (mask.width * scaleRatio)/2, mask.y * scaleRatio + (mask.height * scaleRatio)/2, (mask.width * scaleRatio)/2, (mask.height * scaleRatio)/2, 0, 0, 2 * Math.PI);
      } else {
        ctx.rect(mask.x * scaleRatio, mask.y * scaleRatio, mask.width * scaleRatio, mask.height * scaleRatio);
      }
      ctx.clip();
      ctx.drawImage(ctx.canvas, 0, 0); // מטשטש את התוכן שכבר צויר בקנבס דרך clipping
      ctx.restore();
    });
  }

  // חלון PiP (תמונה בתוך תמונה)
  if (hasPip && pipMediaEl && timelineTime >= pipSettings.startTime && timelineTime <= pipSettings.endTime) {
    ctx.save();
    const px = pipSettings.x * scaleRatio;
    const py = pipSettings.y * scaleRatio;
    const pw = pipSettings.width * scaleRatio;
    const ph = pipSettings.height * scaleRatio;

    ctx.globalAlpha = pipSettings.opacity / 100;
    ctx.translate(px + pw / 2, py + ph / 2);
    ctx.rotate((pipSettings.rotation * Math.PI) / 180);

    // עיגול פינות בחיתוך Path
    if (pipSettings.borderRadius > 0) {
      ctx.beginPath();
      ctx.roundRect(-pw / 2, -ph / 2, pw, ph, pipSettings.borderRadius * scaleRatio);
      ctx.clip();
    }
    
    ctx.drawImage(pipMediaEl, -pw / 2, -ph / 2, pw, ph);

    if (pipSettings.borderWidth > 0) {
      ctx.lineWidth = pipSettings.borderWidth * scaleRatio;
      ctx.strokeStyle = pipSettings.borderColor;
      ctx.stroke();
    }
    ctx.restore();
  }

  // שכבות טקסט
  if (texts && texts.length > 0) {
    texts.forEach(txt => {
      if (timelineTime >= txt.startTime && timelineTime <= txt.endTime) {
        ctx.save();
        const tx = txt.x * scaleRatio;
        const ty = txt.y * scaleRatio;
        const fSize = Math.round(txt.fontSize * scaleRatio);
        ctx.font = `${txt.bold ? 'bold ' : ''}${fSize}px system-ui, sans-serif`;
        ctx.direction = 'rtl';
        const metrics = ctx.measureText(txt.content);
        
        // ציור רקע לתיבת הטקסט
        ctx.fillStyle = txt.bgColor;
        ctx.fillRect(tx - metrics.actualBoundingBoxRight - 10, ty - fSize, metrics.width + 20, fSize + 14);
        
        ctx.fillStyle = txt.color;
        ctx.fillText(txt.content, tx, ty);
        ctx.restore();
      }
    });
  }
}

// ---------------------------------------------------------------------------
// 4. לוגיקת קידוד וידאו WebCodecs ב-Background (ללא תצוגה חיה)
// ---------------------------------------------------------------------------
const seekVideoToTime = (videoEl, time) => {
  return new Promise((resolve) => {
    const handleSeeked = () => { videoEl.removeEventListener('seeked', handleSeeked); resolve(); };
    videoEl.addEventListener('seeked', handleSeeked);
    videoEl.currentTime = time;
  });
};

export async function exportProjectOffline({
  format = 'mp4', resolutionScale = 1.0, fps = 30, bitrateMbps = 5,
  projectState, onProgress, abortSignal
}) {
  const { config, clips, pipSettings, pipFileUrl, texts, mainVideoUrl, extAudioUrl, lutPresets } = projectState;
  
  if (format === 'wav') {
    const audioMix = await renderAudioMixOffline({ mainVideoUrl, extAudioUrl, clips, totalDuration: config.totalDuration });
    return audioBufferToWavBlob(audioMix);
  }

  if (!['mp4', 'mov', 'webm'].includes(format)) throw new Error('Format not supported by WebCodecs background export');
  if (!window.VideoEncoder) throw new Error('WebCodecs API לא נתמך בדפדפן זה');

  const width = Math.round(config.format.width * resolutionScale);
  const height = Math.round(config.format.height * resolutionScale);
  
  // קנבס וווידאו המוחזקים בזכרון בלבד
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  
  const hiddenVideo = document.createElement('video');
  hiddenVideo.src = mainVideoUrl;
  hiddenVideo.muted = true;
  await new Promise(r => { hiddenVideo.onloadedmetadata = r; hiddenVideo.load(); });

  let hiddenPip = null;
  if (pipSettings && pipFileUrl) {
    hiddenPip = document.createElement('video');
    hiddenPip.src = pipFileUrl;
    hiddenPip.muted = true;
    await new Promise(r => { hiddenPip.onloadedmetadata = r; hiddenPip.load(); });
  }

  // הגדרת המוקסר (Muxer) המתאים
  let muxer;
  if (format === 'webm') {
    muxer = new WebMMuxer.Muxer({ target: new WebMMuxer.ArrayBufferTarget(), video: { codec: 'V_VP9', width, height, frameRate: fps }});
  } else {
    muxer = new Mp4Muxer.Muxer({ target: new Mp4Muxer.ArrayBufferTarget(), video: { codec: 'avc', width, height }, fastStart: 'in-memory' });
  }

  const videoEncoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (e) => console.error('VideoEncoder error:', e)
  });

  videoEncoder.configure({
    codec: format === 'webm' ? 'vp09.00.10.08' : 'avc1.42E01F',
    width, height, bitrate: bitrateMbps * 1000000, framerate: fps
  });

  const totalFrames = Math.ceil(config.totalDuration * fps);
  
  // לולאת רינדור פריימים
  for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
    if (abortSignal?.aborted) { videoEncoder.close(); throw new Error('Export aborted'); }
    
    // ניהול עומס של ה-Encoder (Backpressure) למניעת קריסות זכרון
    if (videoEncoder.encodeQueueSize > 5) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    const timelineTime = frameIndex / fps;
    const currentClip = clips.find(c => timelineTime >= c.timelineStart && timelineTime <= c.timelineStart + (c.trimEnd - c.trimStart));
    
    if (currentClip) {
      const sourceTime = currentClip.trimStart + (timelineTime - currentClip.timelineStart) * currentClip.settings.speed;
      await seekVideoToTime(hiddenVideo, sourceTime);
      if (hiddenPip) await seekVideoToTime(hiddenPip, (pipSettings.startTime + timelineTime) % hiddenPip.duration);
      
      drawCompositeFrameToCanvas({ 
        ctx, width, height, timelineTime, activeClip: currentClip, mainVideoEl: hiddenVideo, 
        pipMediaEl: hiddenPip, pipSettings, hasPip: !!hiddenPip, texts, lutPresets 
      });
    } else {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, width, height);
    }

    const timestamp = Math.round(timelineTime * 1_000_000);
    const duration = Math.round((1 / fps) * 1_000_000);
    const frame = new VideoFrame(canvas, { timestamp, duration });
    
    videoEncoder.encode(frame, { keyFrame: frameIndex % (fps * 2) === 0 });
    frame.close();

    if (onProgress) onProgress(Math.round((frameIndex / totalFrames) * 100));
  }

  await videoEncoder.flush();
  videoEncoder.close();
  muxer.finalize();

  const buffer = muxer.target.buffer;
  return new Blob([buffer], { type: format === 'webm' ? 'video/webm' : 'video/mp4' });
}
