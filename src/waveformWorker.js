// 3. Web Worker לעיבוד חישובים כבדים ברקע
self.onmessage = function(e) {
  const { width } = e.data;
  const barCount = Math.min(240, Math.floor(width / 6));
  const heights = [];
  
  // חישוב כבד של גלי הקול רץ כאן ולא תוקע את ה-UI
  for (let i = 0; i < barCount; i++) {
    const h = 25 + Math.abs(Math.sin(i * 0.7) * 55 + Math.cos(i * 1.9) * 20);
    heights.push(Math.min(95, h));
  }
  
  self.postMessage({ heights });
};
