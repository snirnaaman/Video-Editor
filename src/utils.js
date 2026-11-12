// 1. תור משימות רקע (Idle Queue)
// מריץ פעולות לא דחופות רק כשהמעבד פנוי לחלוטין (למשל שמירת טיוטות או איסוף לוגים)
export const runWhenIdle = (callback, timeout = 2000) => {
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(callback, { timeout });
  } else {
    setTimeout(callback, 1);
  }
};

// 2. מקביליות מול שרת (Concurrency)
// מקבל מערך של בקשות רשת ומריץ אותן יחד מבלי שאחת תעכב את השנייה
export const fetchAllSettled = async (requests) => {
  const results = await Promise.allSettled(requests);
  return results.map(res => 
    res.status === 'fulfilled' 
      ? { success: true, data: res.value } 
      : { success: false, error: res.reason }
  );
};
