import React, { useState, useEffect } from 'react';
import { Bot, Send, X, Settings, Zap } from 'lucide-react';

export default function AiCopilotPanel({ 
  isOpen, onClose, currentTime, selectedClip, hasPip, onSendPrompt 
}) {
  const [prompt, setPrompt] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'היי שניר! אני סוכן ה-AI שלך. מה תרצה לערוך בסרטון היום?' }
  ]);
  const [showSettings, setShowSettings] = useState(false);

  // טעינת ה-Webhook השמור
  useEffect(() => {
    const savedUrl = localStorage.getItem('n8n_webhook_url');
    if (savedUrl) setWebhookUrl(savedUrl);
  }, []);

  const handleSaveUrl = (url) => {
    setWebhookUrl(url);
    localStorage.setItem('n8n_webhook_url', url);
  };

  const handleSend = async () => {
    if (!prompt.trim() || !webhookUrl) {
      if (!webhookUrl) alert('יש להגדיר כתובת n8n Webhook בהגדרות ה-AI.');
      return;
    }

    const userText = prompt;
    setPrompt('');
    setMessages(prev => [...prev, { role: 'user', text: userText }]);
    setIsLoading(true);

    try {
      const responseMsg = await onSendPrompt(userText, webhookUrl);
      if (responseMsg) {
        setMessages(prev => [...prev, { role: 'assistant', text: responseMsg }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', text: 'הפקודות בוצעו בהצלחה!' }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', text: '❌ שגיאה בתקשורת מול n8n: ' + error.message }]);
    }
    
    setIsLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.panel}>
        {/* כותרת */}
        <div style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Bot size={18} color="#38bdf8" />
            <span style={{ fontWeight: 600, fontSize: 14 }}>AI Co-Pilot</span>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button style={styles.iconBtn} onClick={() => setShowSettings(!showSettings)} title="הגדרות Webhook">
              <Settings size={14} />
            </button>
            <button style={styles.iconBtn} onClick={onClose}><X size={16} /></button>
          </div>
        </div>

        {/* הגדרות n8n Webhook */}
        {showSettings && (
          <div style={styles.settingsBox}>
            <label style={styles.label}>n8n Webhook URL (POST):</label>
            <input 
              type="text" 
              value={webhookUrl} 
              onChange={(e) => handleSaveUrl(e.target.value)} 
              placeholder="https://your-n8n-server.com/webhook/ai-edit"
              style={styles.input}
            />
            <span style={{ fontSize: 10, color: '#71717a' }}>נשמר אוטומטית בדפדפן</span>
          </div>
        )}

        {/* חלון הצ'אט */}
        <div style={styles.chatArea}>
          {messages.map((m, i) => (
            <div key={i} style={m.role === 'user' ? styles.userMsg : styles.aiMsg}>
              {m.text}
            </div>
          ))}
          {isLoading && (
            <div style={styles.aiMsg}>
              <Zap size={12} color="#f59e0b" style={{ animation: 'pulse 1s infinite' }} /> חושב ומעבד פקודות...
            </div>
          )}
        </div>

        {/* תגיות הקשר (Context Badges) המועברות ל-AI */}
        <div style={styles.contextArea}>
          <span style={styles.badge}>זמן: {currentTime.toFixed(1)}s</span>
          {selectedClip && <span style={styles.badge}>קליפ פעיל: {selectedClip.id.slice(-4)}</span>}
          {hasPip && <span style={styles.badge}>PiP: פעיל</span>}
        </div>

        {/* שורת פקודה */}
        <div style={styles.inputArea}>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder='לדוגמה: "תוסיף זום איטי ל-130% על הקליפ הזה..."'
            style={styles.textArea}
          />
          <button style={styles.sendBtn} onClick={handleSend} disabled={isLoading}>
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', direction: 'rtl' },
  panel: { width: 400, height: 550, backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: 8, display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #27272a', backgroundColor: '#121214', borderTopLeftRadius: 8, borderTopRightRadius: 8 },
  iconBtn: { background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  settingsBox: { padding: 12, backgroundColor: '#09090b', borderBottom: '1px solid #27272a' },
  label: { display: 'block', fontSize: 11, color: '#38bdf8', marginBottom: 4, fontWeight: 600 },
  input: { width: '100%', backgroundColor: '#27272a', border: '1px solid #3f3f46', color: '#fff', padding: '6px', borderRadius: 4, fontSize: 12, boxSizing: 'border-box', marginBottom: 4, fontFamily: 'monospace' },
  chatArea: { flex: 1, padding: 16, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 },
  aiMsg: { alignSelf: 'flex-start', backgroundColor: '#27272a', padding: '8px 12px', borderRadius: '4px 12px 12px 12px', fontSize: 13, color: '#e4e4e7', maxWidth: '85%', lineHeight: 1.5, border: '1px solid #3f3f46' },
  userMsg: { alignSelf: 'flex-end', backgroundColor: '#0ea5e9', padding: '8px 12px', borderRadius: '12px 4px 12px 12px', fontSize: 13, color: '#fff', maxWidth: '85%', lineHeight: 1.5 },
  contextArea: { display: 'flex', gap: 6, padding: '8px 16px', backgroundColor: '#121214', borderTop: '1px solid #27272a', flexWrap: 'wrap' },
  badge: { fontSize: 10, backgroundColor: '#3f3f46', color: '#d4d4d8', padding: '2px 6px', borderRadius: 12 },
  inputArea: { display: 'flex', padding: 12, gap: 8, backgroundColor: '#18181b', borderBottomLeftRadius: 8, borderBottomRightRadius: 8 },
  textArea: { flex: 1, height: 40, backgroundColor: '#27272a', border: '1px solid #3f3f46', borderRadius: 4, color: '#fff', padding: '8px', fontSize: 13, resize: 'none', outline: 'none' },
  sendBtn: { width: 40, height: 40, backgroundColor: '#38bdf8', border: 'none', borderRadius: 4, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }
};
