import { useState, useRef, useEffect } from "react";

const API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const MODEL = "llama-3.3-70b-versatile";

const callAI = async (messages, system) => {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 200,
      messages: [{ role: "system", content: system }, ...messages],
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.choices?.[0]?.message?.content || "";
};

const MOODS = [
  { emoji: "🌟", label: "Harika", color: "#f5c842", bg: "#f5c84220" },
  { emoji: "😊", label: "İyi", color: "#4ade80", bg: "#4ade8020" },
  { emoji: "😐", label: "Eh işte", color: "#60a5fa", bg: "#60a5fa20" },
  { emoji: "😔", label: "Kötü", color: "#f87171", bg: "#f8717120" },
  { emoji: "🔥", label: "Enerjik", color: "#fb923c", bg: "#fb923c20" },
];

const CONFETTI_COLORS = ["#a78bfa","#f5c842","#4ade80","#f87171","#60a5fa","#fb923c"];

const TODAY_KEY = new Date().toDateString();

const css = `
@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Space+Mono:wght@400;700&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
:root { --bg:#0f0f1a; --card:#1a1a2e; --border:#2a2a45; --text:#f0f0ff; --muted:#6b6b9a; --accent:#a78bfa; }
body { background:var(--bg); color:var(--text); font-family:'Nunito',sans-serif; min-height:100vh; display:flex; align-items:center; justify-content:center; padding:20px; background-image:radial-gradient(ellipse at 20% 50%,#1a0a3a40 0%,transparent 60%),radial-gradient(ellipse at 80% 20%,#0a2a3a40 0%,transparent 60%); }
.app { width:100%; max-width:480px; display:flex; flex-direction:column; gap:16px; animation:fadeIn 0.5s ease; }
@keyframes fadeIn { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
.header { text-align:center; padding:8px 0 4px; }
.logo { font-size:28px; font-weight:900; color:var(--text); letter-spacing:-1px; }
.logo span { color:var(--accent); }
.date { font-family:'Space Mono',monospace; font-size:11px; color:var(--muted); margin-top:4px; }
.card { background:var(--card); border:1px solid var(--border); border-radius:20px; padding:20px; }
.card-label { font-size:11px; font-weight:700; letter-spacing:2px; text-transform:uppercase; color:var(--muted); margin-bottom:14px; display:flex; align-items:center; justify-content:space-between; }
.mood-grid { display:flex; gap:8px; flex-wrap:wrap; }
.mood-btn { flex:1; min-width:70px; padding:10px 6px; border-radius:14px; border:1.5px solid var(--border); background:transparent; cursor:pointer; display:flex; flex-direction:column; align-items:center; gap:4px; transition:all 0.2s; font-family:'Nunito',sans-serif; }
.mood-btn:hover { transform:translateY(-2px); }
.mood-btn.selected { border-color:currentColor; }
.mood-emoji { font-size:22px; }
.mood-label { font-size:11px; font-weight:700; color:var(--muted); }
.mood-btn.selected .mood-label { color:inherit; }
.ai-bubble { background:linear-gradient(135deg,#1e1e35,#1a1a2e); border:1px solid var(--border); border-radius:18px 18px 18px 4px; padding:14px 18px; font-size:14px; line-height:1.7; color:var(--text); min-height:52px; }
.ai-tag { font-size:10px; font-weight:700; letter-spacing:1px; color:var(--accent); margin-bottom:6px; display:block; }
.typing { display:flex; gap:4px; align-items:center; padding:4px 0; }
.dot { width:6px; height:6px; background:var(--muted); border-radius:50%; animation:bounce 1.2s infinite; }
.dot:nth-child(2){animation-delay:0.2s} .dot:nth-child(3){animation-delay:0.4s}
@keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
.tasks-list { display:flex; flex-direction:column; gap:10px; }
.task-item { display:flex; align-items:center; gap:12px; padding:12px 14px; background:#12122080; border:1.5px solid var(--border); border-radius:14px; transition:all 0.2s; }
.task-item.done { opacity:0.5; }
.task-check { width:24px; height:24px; border-radius:50%; border:2px solid var(--border); display:flex; align-items:center; justify-content:center; cursor:pointer; flex-shrink:0; font-size:12px; transition:all 0.2s; background:transparent; color:transparent; }
.task-item.done .task-check { background:#4ade80; border-color:#4ade80; color:#000; }
.task-input { flex:1; background:transparent; border:none; outline:none; font-family:'Nunito',sans-serif; font-size:14px; font-weight:600; color:var(--text); }
.task-input::placeholder { color:var(--muted); }
.task-item.done .task-input { text-decoration:line-through; color:var(--muted); }
.task-num { font-family:'Space Mono',monospace; font-size:11px; color:var(--muted); flex-shrink:0; }
.remove-btn { background:transparent; border:none; color:var(--muted); cursor:pointer; font-size:16px; padding:0 2px; opacity:0.5; transition:opacity 0.15s; flex-shrink:0; }
.remove-btn:hover { opacity:1; color:#f87171; }
.progress-row { display:flex; align-items:center; gap:12px; margin-top:14px; }
.progress-bar { flex:1; height:6px; background:var(--border); border-radius:6px; overflow:hidden; }
.progress-fill { height:100%; background:linear-gradient(90deg,var(--accent),#c4b5fd); border-radius:6px; transition:width 0.5s ease; }
.progress-text { font-family:'Space Mono',monospace; font-size:11px; color:var(--muted); white-space:nowrap; }
.add-row { display:flex; gap:8px; margin-top:12px; }
.add-input { flex:1; background:#12122080; border:1.5px solid var(--border); border-radius:12px; padding:9px 14px; color:var(--text); font-family:'Nunito',sans-serif; font-size:13.5px; outline:none; transition:border-color 0.15s; }
.add-input:focus { border-color:var(--accent); }
.add-input::placeholder { color:var(--muted); }
.add-btn { background:var(--accent); border:none; border-radius:12px; padding:9px 16px; color:white; font-family:'Nunito',sans-serif; font-weight:800; font-size:13px; cursor:pointer; transition:all 0.15s; white-space:nowrap; }
.add-btn:hover { background:#c4b5fd; }
.add-btn:disabled { opacity:0.4; cursor:not-allowed; }
.reset-btn { font-size:10px; font-weight:700; letter-spacing:1px; background:transparent; border:1px solid var(--border); border-radius:8px; padding:3px 8px; color:var(--muted); cursor:pointer; font-family:'Nunito',sans-serif; transition:all 0.15s; }
.reset-btn:hover { color:var(--text); border-color:var(--muted); }
.confetti-wrap { position:fixed; inset:0; pointer-events:none; z-index:100; display:flex; align-items:center; justify-content:center; }
.confetti-msg { font-size:64px; animation:pop 0.5s ease; }
@keyframes pop { 0%{transform:scale(0) rotate(-20deg);opacity:0} 60%{transform:scale(1.3) rotate(10deg);opacity:1} 100%{transform:scale(1) rotate(0deg);opacity:1} }
.pieces { position:fixed; inset:0; pointer-events:none; }
.piece { position:absolute; width:8px; height:8px; border-radius:2px; animation:fall linear forwards; }
@keyframes fall { 0%{transform:translateY(-20px) rotate(0deg);opacity:1} 100%{transform:translateY(110vh) rotate(720deg);opacity:0} }
.chat-messages { display:flex; flex-direction:column; gap:10px; max-height:200px; overflow-y:auto; margin-bottom:12px; }
.chat-msg { display:flex; gap:8px; animation:fadeIn 0.3s ease; }
.chat-msg.user { flex-direction:row-reverse; }
.chat-bubble { padding:9px 14px; border-radius:16px; font-size:13.5px; line-height:1.6; max-width:85%; }
.chat-msg.ai .chat-bubble { background:#1e1e35; border:1px solid var(--border); border-radius:16px 16px 16px 4px; }
.chat-msg.user .chat-bubble { background:var(--accent); color:#fff; border-radius:16px 16px 4px 16px; }
.chat-row { display:flex; gap:8px; }
.chat-field { flex:1; background:#12122080; border:1.5px solid var(--border); border-radius:12px; padding:10px 14px; color:var(--text); font-family:'Nunito',sans-serif; font-size:13.5px; outline:none; resize:none; transition:border-color 0.15s; }
.chat-field:focus { border-color:var(--accent); }
.chat-field::placeholder { color:var(--muted); }
.send-btn { background:var(--accent); border:none; border-radius:12px; padding:10px 16px; color:white; font-family:'Nunito',sans-serif; font-weight:800; font-size:13px; cursor:pointer; transition:all 0.15s; white-space:nowrap; }
.send-btn:hover { background:#c4b5fd; }
.send-btn:disabled { opacity:0.4; cursor:not-allowed; }
.divider { height:1px; background:var(--border); margin:14px 0; }
.section-tag { font-size:10px; font-weight:700; letter-spacing:1.5px; text-transform:uppercase; color:var(--muted); margin-bottom:10px; }
`;

function Confetti() {
  const pieces = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    delay: Math.random() * 1.5,
    duration: 2 + Math.random() * 2,
    size: 6 + Math.random() * 8,
  }));
  return (
    <div className="pieces">
      {pieces.map(p => (
        <div key={p.id} className="piece" style={{ left:`${p.left}%`, top:"-20px", background:p.color, width:p.size, height:p.size, animationDelay:`${p.delay}s`, animationDuration:`${p.duration}s` }} />
      ))}
    </div>
  );
}

export default function App() {
  const today = new Date().toLocaleDateString("tr-TR", { weekday:"long", day:"numeric", month:"long" });

  // Mood
  const [mood, setMood] = useState(null);
  const [aiMsg, setAiMsg] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  // Daimi görevler (localStorage'da kalır)
  const [permanentTasks, setPermanentTasks] = useState(() => {
    try { return JSON.parse(localStorage.getItem("gl_permanent") || "[]"); } catch { return []; }
  });
  const [newPermInput, setNewPermInput] = useState("");

  // Günlük görevler (her gün sıfırlanır)
  const [dailyTasks, setDailyTasks] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("gl_daily") || "{}");
      if (saved.date === TODAY_KEY) return saved.tasks;
      return [{ id: 1, text: "", done: false }, { id: 2, text: "", done: false }, { id: 3, text: "", done: false }];
    } catch {
      return [{ id: 1, text: "", done: false }, { id: 2, text: "", done: false }, { id: 3, text: "", done: false }];
    }
  });

  // Daimi tik durumu (her gün sıfırlanır)
  const [permDone, setPermDone] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("gl_perm_done") || "{}");
      if (saved.date === TODAY_KEY) return saved.done || {};
      return {};
    } catch { return {}; }
  });

  const [showConfetti, setShowConfetti] = useState(false);
  const [confettiShown, setConfettiShown] = useState(false);

  // Chat
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatRef = useRef(null);
  const [newDailyInput, setNewDailyInput] = useState("");

  // Persist
  useEffect(() => { try { localStorage.setItem("gl_permanent", JSON.stringify(permanentTasks)); } catch {} }, [permanentTasks]);
  useEffect(() => { try { localStorage.setItem("gl_daily", JSON.stringify({ date: TODAY_KEY, tasks: dailyTasks })); } catch {} }, [dailyTasks]);
  useEffect(() => { try { localStorage.setItem("gl_perm_done", JSON.stringify({ date: TODAY_KEY, done: permDone })); } catch {} }, [permDone]);
  useEffect(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }, [chatMessages]);

  // Konfeti kontrolü
  useEffect(() => {
    const filledDaily = dailyTasks.filter(t => t.text.trim());
    const allDailyDone = filledDaily.length > 0 && filledDaily.every(t => t.done);
    const allPermDone = permanentTasks.length === 0 || permanentTasks.every(t => permDone[t.id]);
    if (allDailyDone && allPermDone && !confettiShown && (filledDaily.length > 0 || permanentTasks.length > 0)) {
      setShowConfetti(true);
      setConfettiShown(true);
      setTimeout(() => setShowConfetti(false), 4000);
    }
  }, [dailyTasks, permDone, permanentTasks, confettiShown]);

  const selectMood = async (m) => {
    setMood(m);
    setAiLoading(true);
    setAiMsg("");
    try {
      const text = await callAI(
        [{ role: "user", content: `Kullanıcı bugün kendini "${m.label}" hissediyor (${m.emoji}). Kısa, samimi ve motive edici karşıla. Türkçe, 2-3 cümle.` }],
        "Sen günlük bir yaşam koçusun. Sıcak, pozitif ve eğlenceli. Emojiler kullanabilirsin ama abartma."
      );
      setAiMsg(text);
    } catch { setAiMsg("Bugün de harikasın! Hadi görevlerini tamamla 💪"); }
    setAiLoading(false);
  };

  // Daimi görevler
  const addPermanent = () => {
    if (!newPermInput.trim()) return;
    setPermanentTasks(prev => [...prev, { id: Date.now(), text: newPermInput.trim() }]);
    setNewPermInput("");
  };
  const removePermanent = (id) => {
    setPermanentTasks(prev => prev.filter(t => t.id !== id));
    setPermDone(prev => { const n = {...prev}; delete n[id]; return n; });
  };
  const togglePerm = (id) => setPermDone(prev => ({ ...prev, [id]: !prev[id] }));

  // Günlük görevler
  const updateDaily = (id, text) => setDailyTasks(prev => prev.map(t => t.id === id ? { ...t, text } : t));
  const toggleDaily = (id) => setDailyTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
  const addDailyTask = () => {
    if (!newDailyInput.trim()) return;
    setDailyTasks(prev => [...prev, { id: Date.now(), text: newDailyInput.trim(), done: false }]);
    setNewDailyInput("");
  };
  const removeDaily = (id) => setDailyTasks(prev => prev.filter(t => t.id !== id));
  const resetDaily = () => {
    setDailyTasks([{ id: 1, text: "", done: false }, { id: 2, text: "", done: false }, { id: 3, text: "", done: false }]);
    setConfettiShown(false);
  };

  // Progress
  const filledDaily = dailyTasks.filter(t => t.text.trim());
  const dailyDone = filledDaily.filter(t => t.done).length;
  const permDoneCount = permanentTasks.filter(t => permDone[t.id]).length;
  const totalAll = filledDaily.length + permanentTasks.length;
  const doneAll = dailyDone + permDoneCount;

  // Chat
  const sendChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = chatInput.trim();
    setChatInput("");
    setChatMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setChatLoading(true);
    const permSummary = permanentTasks.map(t => `- ${t.text} (${permDone[t.id] ? "✓" : "bekliyor"})`).join("\n");
    const dailySummary = filledDaily.map(t => `- ${t.text} (${t.done ? "✓" : "bekliyor"})`).join("\n");
    try {
      const text = await callAI(
        [...chatMessages, { role: "user", content: userMsg }],
        `Sen günlük bir yaşam koçusun. Kullanıcının ruh hali: ${mood?.label || "bilinmiyor"}.\nDaimi görevler:\n${permSummary || "yok"}\nGünlük görevler:\n${dailySummary || "yok"}\nTürkçe, kısa, samimi cevap ver. Max 3 cümle.`
      );
      setChatMessages(prev => [...prev, { role: "assistant", content: text }]);
    } catch { setChatMessages(prev => [...prev, { role: "assistant", content: "Bir hata oluştu, tekrar dene!" }]); }
    setChatLoading(false);
  };
  const handleChatKey = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChat(); } };

  return (
    <>
      <style>{css}</style>
      {showConfetti && (<div className="confetti-wrap"><div className="confetti-msg">🎉</div><Confetti /></div>)}

      <div className="app">
        {/* HEADER */}
        <div className="header">
          <div className="logo">günlük<span>.</span></div>
          <div className="date">{today}</div>
        </div>

        {/* MOOD */}
        <div className="card">
          <div className="card-label">Bugün nasıl hissediyorsun?</div>
          <div className="mood-grid">
            {MOODS.map(m => (
              <button key={m.label} className={`mood-btn ${mood?.label === m.label ? "selected" : ""}`}
                style={{ color:m.color, borderColor:mood?.label===m.label?m.color:undefined, background:mood?.label===m.label?m.bg:undefined }}
                onClick={() => selectMood(m)}>
                <span className="mood-emoji">{m.emoji}</span>
                <span className="mood-label">{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* AI MESAJ */}
        {mood && (
          <div className="ai-bubble">
            <span className="ai-tag">✦ AI KOÇUN</span>
            {aiLoading ? <div className="typing"><div className="dot"/><div className="dot"/><div className="dot"/></div> : aiMsg}
          </div>
        )}

        {/* DAİMİ GÖREVLER */}
        <div className="card">
          <div className="card-label">
            <span>Daimi Görevler</span>
            <span style={{fontSize:10,color:"#6b6b9a"}}>Her gün tekrarlanır</span>
          </div>
          {permanentTasks.length > 0 && (
            <div className="tasks-list" style={{marginBottom:12}}>
              {permanentTasks.map(task => (
                <div key={task.id} className={`task-item ${permDone[task.id] ? "done" : ""}`}>
                  <button className="task-check" onClick={() => togglePerm(task.id)}>{permDone[task.id] ? "✓" : ""}</button>
                  <span className="task-input" style={{cursor:"default"}}>{task.text}</span>
                  <button className="remove-btn" onClick={() => removePermanent(task.id)}>×</button>
                </div>
              ))}
            </div>
          )}
          <div className="add-row">
            <input className="add-input" value={newPermInput} onChange={e => setNewPermInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addPermanent()}
              placeholder="Yeni daimi görev ekle..." />
            <button className="add-btn" onClick={addPermanent} disabled={!newPermInput.trim()}>+ Ekle</button>
          </div>
        </div>

        {/* GÜNLÜK GÖREVLER */}
        <div className="card">
          <div className="card-label">
            <span>Bugünün Görevleri</span>
            <button className="reset-btn" onClick={resetDaily}>Sıfırla</button>
          </div>
          <div className="tasks-list">
            {dailyTasks.map((task, i) => (
              <div key={task.id} className={`task-item ${task.done ? "done" : ""}`}>
                <span className="task-num">{i + 1}.</span>
                <input className="task-input" value={task.text}
                  onChange={e => updateDaily(task.id, e.target.value)}
                  placeholder={["En önemli görevin...", "İkinci görevin...", "Üçüncü görevin..."][i] || "Görev ekle..."}
                  disabled={task.done} />
                {task.text.trim() && (
                  <>
                    <button className="task-check" onClick={() => toggleDaily(task.id)}>{task.done ? "✓" : ""}</button>
                    <button className="remove-btn" onClick={() => removeDaily(task.id)}>×</button>
                  </>
                )}
              </div>
            ))}
          </div>
          <div className="add-row" style={{marginTop:10}}>
            <input className="add-input" value={newDailyInput} onChange={e => setNewDailyInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addDailyTask()}
              placeholder="Ekstra görev ekle..." />
            <button className="add-btn" onClick={addDailyTask} disabled={!newDailyInput.trim()}>+ Ekle</button>
          </div>
          {totalAll > 0 && (
            <div className="progress-row">
              <div className="progress-bar"><div className="progress-fill" style={{width:`${(doneAll/totalAll)*100}%`}} /></div>
              <div className="progress-text">{doneAll}/{totalAll}</div>
            </div>
          )}
        </div>

        {/* CHAT */}
        {mood && (
          <div className="card">
            <div className="card-label">Koçunla Konuş</div>
            {chatMessages.length > 0 && (
              <div className="chat-messages" ref={chatRef}>
                {chatMessages.map((m, i) => (
                  <div key={i} className={`chat-msg ${m.role === "user" ? "user" : "ai"}`}>
                    <div className="chat-bubble">{m.content}</div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="chat-msg ai"><div className="chat-bubble"><div className="typing"><div className="dot"/><div className="dot"/><div className="dot"/></div></div></div>
                )}
              </div>
            )}
            <div className="chat-row">
              <textarea className="chat-field" rows={2} value={chatInput}
                onChange={e => setChatInput(e.target.value)} onKeyDown={handleChatKey}
                placeholder="Bir şey sor veya anlat... (Enter ile gönder)" />
              <button className="send-btn" onClick={sendChat} disabled={chatLoading || !chatInput.trim()}>Gönder →</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
