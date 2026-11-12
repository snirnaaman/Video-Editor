import React, { useState } from 'react';
import { Video, Image as ImageIcon, Music, Columns, MessageSquare, List, Plus, Trash2, Scissors, Subtitles } from 'lucide-react';
import { CHORD_LIBRARY, DEFAULT_CHORD_OVERLAY } from './defaultState';
import ChordDiagram from './ChordDiagram';

export default function MediaPoolPanel({
  mediaPool,
  onUploadFiles,
  onDeleteMedia,
  onAddVideoToTimeline,
  onAddPipToTimeline,
  onAddAudioToTimeline,
  transcript,
  onUpdateTranscript,
  onConvertTranscriptToText,
  onRippleCutRange,
  onAddChord,
  currentTime,
  onSeek
}) {
  const [poolTab, setPoolTab] = useState('files'); // files | transcript | chords
  const [newLineText, setNewLineText] = useState('');
  const [newLineDuration, setNewLineDuration] = useState(4);

  // בונה אקורדים מותאם אישית
  const [customChordName, setCustomChordName] = useState('Cmaj7');
  const [customFrets, setCustomFrets] = useState([-1, 3, 2, 0, 0, 0]);
  const [customBaseFret, setCustomBaseFret] = useState(1);

  const handleAddTranscriptItem = () => {
    if (!newLineText.trim()) return;
    const item = {
      id: 'tr-' + Date.now(),
      startTime: Number(currentTime.toFixed(1)),
      endTime: Number((currentTime + Number(newLineDuration || 4)).toFixed(1)),
      text: newLineText.trim()
    };
    onUpdateTranscript([...(transcript || []), item]);
    setNewLineText('');
  };

  const handleImportSrtFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target.result || '';
      const blocks = content.trim().split(/\n\s*\n/);
      const parsed = [];
      blocks.forEach((b, idx) => {
        const lines = b.split('\n').map(l => l.trim());
        const timeLine = lines.find(l => l.includes('-->'));
        if (timeLine) {
          const [startStr, endStr] = timeLine.split('-->').map(s => s.trim());
          const parseSec = (str) => {
            const parts = str.replace(',', '.').split(':').map(Number);
            return parts.length === 3 ? parts[0] * 3600 + parts[1] * 60 + parts[2] : parts[0] * 60 + parts[1];
          };
          const textLines = lines.slice(lines.indexOf(timeLine) + 1).join(' ');
          parsed.push({
            id: 'srt-' + Date.now() + '-' + idx,
            startTime: Number(parseSec(startStr).toFixed(2)) || 0,
            endTime: Number(parseSec(endStr).toFixed(2)) || 4,
            text: textLines
          });
        }
      });
      if (parsed.length > 0) onUpdateTranscript([...(transcript || []), ...parsed]);
    };
    reader.readAsText(file);
    e.target.value = null;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={styles.tabsRow}>
        <button style={{ ...styles.poolTab, borderBottomColor: poolTab === 'files' ? '#38bdf8' : 'transparent', color: poolTab === 'files' ? '#38bdf8' : '#a1a1aa' }} onClick={() => setPoolTab('files')}>
          <Columns size={12} /> מאגר מדיה
        </button>
        <button style={{ ...styles.poolTab, borderBottomColor: poolTab === 'transcript' ? '#38bdf8' : 'transparent', color: poolTab === 'transcript' ? '#38bdf8' : '#a1a1aa' }} onClick={() => setPoolTab('transcript')}>
          <MessageSquare size={12} /> תמלול
        </button>
        <button style={{ ...styles.poolTab, borderBottomColor: poolTab === 'chords' ? '#38bdf8' : 'transparent', color: poolTab === 'chords' ? '#38bdf8' : '#a1a1aa' }} onClick={() => setPoolTab('chords')}>
          <List size={12} /> אקורדים
        </button>
      </div>

      <div style={styles.poolBody}>
        {/* לשונית 1: מאגר מדיה מרובה קבצים */}
        {poolTab === 'files' && (
          <>
            <div style={{ display: 'flex', gap: 5, marginBottom: 10 }}>
              <label style={styles.uploadBtn} title="העלה סרטון אחד או יותר">
                <Video size={13} color="#3b82f6" /> + וידאו
                <input type="file" accept="video/*,image/*" multiple onChange={(e) => onUploadFiles(e, 'video')} hidden />
              </label>
              <label style={styles.uploadBtn} title="העלה מספר תמונות או סרטונים לשכבת PiP">
                <ImageIcon size={13} color="#a855f7" /> + תמונות/PiP
                <input type="file" accept="image/*,video/*" multiple onChange={(e) => onUploadFiles(e, 'pip')} hidden />
              </label>
              <label style={styles.uploadBtn} title="העלה מספר קובצי שמע ומוזיקה">
                <Music size={13} color="#10b981" /> + שמע
                <input type="file" accept="audio/*,video/*" multiple onChange={(e) => onUploadFiles(e, 'audio')} hidden />
              </label>
            </div>

            {mediaPool.length === 0 && (
              <div style={styles.emptyBox}>
                העלה מספר סרטונים, תמונות וקובצי שמע במקביל. לכל קובץ יש כפתורי הוספה ישירים לציר הזמן!
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {mediaPool.map((item) => (
                <div key={item.id} style={styles.mediaRowCard}>
                  <div style={styles.thumbBox}>
                    {item.thumbUrl ? (
                      <img src={item.thumbUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : item.type === 'pip' && !item.isVideo ? (
                      <img src={item.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <Music size={20} color="#10b981" />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '4px 8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#e4e4e7', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.name}
                      </span>
                      <button onClick={(e) => onDeleteMedia(e, item.id, item.url)} style={styles.iconTrash} title="מחק מהמאגר">
                        <Trash2 size={12} />
                      </button>
                    </div>
                    <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                      {item.type !== 'audio' && (
                        <button style={{ ...styles.addTrackBtn, backgroundColor: '#1e3a8a', borderColor: '#3b82f6' }} onClick={() => onAddVideoToTimeline(item)} title="הוסף למסילת הווידאו הראשית (V1)">
                          + וידאו (V1)
                        </button>
                      )}
                      {item.type !== 'audio' && (
                        <button style={{ ...styles.addTrackBtn, backgroundColor: '#581c87', borderColor: '#a855f7' }} onClick={() => onAddPipToTimeline(item)} title="הוסף כשכבת PiP חדשה (V2)">
                          + שכבת PiP
                        </button>
                      )}
                      {(item.type === 'audio' || item.isVideo) && (
                        <button style={{ ...styles.addTrackBtn, backgroundColor: '#064e3b', borderColor: '#10b981' }} onClick={() => onAddAudioToTimeline(item)} title="הוסף למסילת השמע (A1)">
                          + שמע (A1)
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* לשונית 2: תמלול וכתוביות אינטראקטיבי */}
        {poolTab === 'transcript' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={styles.subCard}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#38bdf8', marginBottom: 6 }}>הוספת שורת תמלול (בזמן {currentTime.toFixed(1)}s)</div>
              <textarea
                value={newLineText}
                onChange={(e) => setNewLineText(e.target.value)}
                placeholder="הקלד משפט או הסבר מהשיעור..."
                style={styles.textArea}
              />
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 6 }}>
                <span style={{ fontSize: 11, color: '#a1a1aa' }}>משך (שנ'):</span>
                <input type="number" min="0.5" step="0.5" value={newLineDuration} onChange={(e) => setNewLineDuration(e.target.value)} style={{ ...styles.smallInput, width: 55 }} />
                <button style={styles.primarySmallBtn} onClick={handleAddTranscriptItem}>
                  <Plus size={13} /> הוסף לתמלול
                </button>
              </div>
              <div style={{ marginTop: 8, borderTop: '1px solid #27272a', paddingTop: 8 }}>
                <label style={{ ...styles.uploadBtn, width: '100%', boxSizing: 'border-box' }}>
                  <Subtitles size={13} color="#38bdf8" /> ייבא קובץ כתוביות (.srt)
                  <input type="file" accept=".srt,.vtt" onChange={handleImportSrtFile} hidden />
                </label>
              </div>
            </div>

            {(transcript || []).map((line) => (
              <div key={line.id} style={styles.transcriptItem}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span onClick={() => onSeek(line.startTime)} style={{ fontSize: 10, fontFamily: 'monospace', color: '#38bdf8', cursor: 'pointer', textDecoration: 'underline' }}>
                    {line.startTime}s - {line.endTime}s
                  </span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button onClick={() => onConvertTranscriptToText(line)} title="הצג ככתובית על המסך (T1)" style={styles.miniActionBtn}>
                      + לכתוביות
                    </button>
                    <button onClick={() => onRippleCutRange(line.startTime, line.endTime)} title="גזור והסר קטע זה מהווידאו" style={{ ...styles.miniActionBtn, color: '#fca5a5', borderColor: '#7f1d1d' }}>
                      <Scissors size={10} /> גזור וידאו
                    </button>
                    <button onClick={() => onUpdateTranscript(transcript.filter(t => t.id !== line.id))} style={styles.iconTrash}>
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
                <input
                  type="text"
                  value={line.text}
                  onChange={(e) => onUpdateTranscript(transcript.map(t => t.id === line.id ? { ...t, text: e.target.value } : t))}
                  style={styles.smallInput}
                />
              </div>
            ))}
          </div>
        )}

        {/* לשונית 3: ספריית אקורדים מלאה + בונה אקורדים */}
        {poolTab === 'chords' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 11, color: '#a1a1aa' }}>לחץ על כל אקורד כדי להוסיף אותו למסך בזמן הנוכחי ({currentTime.toFixed(1)}s):</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {Object.entries(CHORD_LIBRARY).map(([key, chordObj]) => (
                <div
                  key={key}
                  onClick={() => onAddChord({ ...DEFAULT_CHORD_OVERLAY, ...chordObj, id: 'ch-' + Date.now(), startTime: Number(currentTime.toFixed(1)), endTime: Number((currentTime + 4).toFixed(1)) })}
                  style={styles.chordCard}
                >
                  <ChordDiagram chord={chordObj} size={86} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#e4e4e7', marginTop: 4 }}>+ הוסף {chordObj.chordName}</span>
                </div>
              ))}
            </div>

            {/* בונה אקורד מותאם אישית */}
            <div style={styles.subCard}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#38bdf8', marginBottom: 8 }}>בונה אקורד מותאם אישית</div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                <input type="text" value={customChordName} onChange={(e) => setCustomChordName(e.target.value)} placeholder="שם אקורד" style={{ ...styles.smallInput, flex: 1 }} />
                <input type="number" min="1" max="15" value={customBaseFret} onChange={(e) => setCustomBaseFret(Number(e.target.value))} title="סריג התחלתי" style={{ ...styles.smallInput, width: 55 }} />
              </div>
              <div style={{ fontSize: 10, color: '#a1a1aa', marginBottom: 4 }}>סריגים מ-E נמוך ל-E גבוה (-1 = חסום X, 0 = פתוח):</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 4, marginBottom: 8, direction: 'ltr' }}>
                {customFrets.map((val, idx) => (
                  <input
                    key={idx}
                    type="number"
                    min="-1"
                    max="15"
                    value={val}
                    onChange={(e) => {
                      const next = [...customFrets];
                      next[idx] = Number(e.target.value);
                      setCustomFrets(next);
                    }}
                    style={{ ...styles.smallInput, textAlign: 'center', padding: '4px 2px' }}
                  />
                ))}
              </div>
              <button
                style={styles.primarySmallBtn}
                onClick={() => onAddChord({
                  ...DEFAULT_CHORD_OVERLAY,
                  id: 'ch-' + Date.now(),
                  chordName: customChordName,
                  frets: [...customFrets],
                  baseFret: customBaseFret,
                  startTime: Number(currentTime.toFixed(1)),
                  endTime: Number((currentTime + 4).toFixed(1))
                })}
              >
                <Plus size={13} /> הוסף אקורד מותאם למסך
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  tabsRow: { display: 'flex', backgroundColor: '#141416', borderBottom: '1px solid #27272a', flexShrink: 0 },
  poolTab: { flex: 1, padding: '8px 0', border: 'none', backgroundColor: 'transparent', borderBottom: '2px solid transparent', fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 },
  poolBody: { padding: 10, overflowY: 'auto', flex: 1 },
  uploadBtn: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: '#27272a', padding: '7px 4px', borderRadius: 5, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: '1px solid #3f3f46', color: '#fff' },
  emptyBox: { fontSize: 11, color: '#71717a', textAlign: 'center', padding: 18, border: '1px dashed #27272a', borderRadius: 6, lineHeight: 1.5 },
  mediaRowCard: { display: 'flex', backgroundColor: '#121214', border: '1px solid #27272a', borderRadius: 6, overflow: 'hidden', minHeight: 62 },
  thumbBox: { width: 72, backgroundColor: '#09090b', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' },
  addTrackBtn: { flex: 1, border: '1px solid', color: '#fff', fontSize: 10, padding: '3px 4px', borderRadius: 4, cursor: 'pointer', fontWeight: 600 },
  iconTrash: { background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 2, display: 'flex' },
  subCard: { backgroundColor: '#121214', border: '1px solid #27272a', borderRadius: 6, padding: 10 },
  textArea: { width: '100%', height: 48, backgroundColor: '#27272a', border: '1px solid #3f3f46', borderRadius: 4, color: '#fff', padding: 6, fontSize: 12, boxSizing: 'border-box', resize: 'none' },
  smallInput: { width: '100%', backgroundColor: '#27272a', border: '1px solid #3f3f46', color: '#fff', padding: '5px 6px', borderRadius: 4, fontSize: 11, boxSizing: 'border-box' },
  primarySmallBtn: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: '#2563eb', border: 'none', color: '#fff', padding: '6px 10px', borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: 'pointer', width: '100%' },
  transcriptItem: { backgroundColor: '#121214', border: '1px solid #27272a', borderRadius: 6, padding: 8 },
  miniActionBtn: { backgroundColor: '#27272a', border: '1px solid #3f3f46', color: '#38bdf8', fontSize: 10, padding: '2px 6px', borderRadius: 4, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 },
  chordCard: { backgroundColor: '#121214', border: '1px solid #27272a', borderRadius: 6, padding: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }
};
