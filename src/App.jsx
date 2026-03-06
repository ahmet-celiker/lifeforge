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
      max_tokens: 150,
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
const WATER_GOAL = 8; // 8 bardak = ~2L

// Su komik mesajları
const WATER_MSGS = [
  { at: 0, msg: "🏜️ İçinde çöl var sanki. Bir bardak iç!", dry: true },
  { at: 1, msg: "💧 Başlangıç sayılır ama kaktüs bile bu kadarla yaşar.", dry: true },
  { at: 2, msg: "🐠 Balık kadar su içtin. Ama sen balık değilsin!", dry: true },
  { at: 3, msg: "😤 Yavaş yavaş ısınıyoruz. Devam!", dry: false },
  { at: 4, msg: "⚡ Tam yarısı! Beyin hücrelerin teşekkür ediyor.", dry: false },
  { at: 5, msg: "🌊 Artık nehir gibi akıyorsun!", dry: false },
  { at: 6, msg: "💪 Son viraj! Neredeyse hedefte!", dry: false },
  { at: 7, msg: "🎉 Bir bardak kaldı! Bitir şunu!", dry: false },
  { at: 8, msg: "🏆 GÜNLÜK HEDEF TAMAM! Sen bir efsanesin!", dry: false },
];

const css = `
@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Space+Mono:wght@400;700&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
:root { --bg:#0f0f1a; --card:#1a1a2e; --border:#2a2a45; --text:#f0f0ff; --muted:#6b6b9a; --accent:#a78bfa; --water:#38bdf8; --water-dark:#0ea5e9; }
body { background:var(--bg); color:var(--text); font-family:'Nunito',sans-serif; min-height:100vh; display:flex; align-items:center; justify-content:center; padding:20px; background-image:radial-gradient(ellipse at 20% 50%,#1a0a3a40 0%,transparent 60%),radial-gradient(ellipse at 80% 20%,#0a2a3a40 0%,transparent 60%); }
.app { width:100%; max-width:480px; display:flex; flex-direction:column; gap:16px; animation:fadeIn 0.5s ease; }
@keyframes fadeIn { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }

/* NAV */
.nav { display:flex; gap:8px; background:var(--card); border:1px solid var(--border); border-radius:16px; padding:6px; }
.nav-btn { flex:1; padding:9px; border:none; border-radius:12px; background:transparent; color:var(--muted); font-family:'Nunito',sans-serif; font-weight:800; font-size:13px; cursor:pointer; transition:all 0.2s; display:flex; align-items:center; justify-content:center; gap:6px; }
.nav-btn:hover { color:var(--text); }
.nav-btn.active { background:#ffffff12; color:var(--text); }
.nav-btn.water-active { background:#38bdf820; color:var(--water); }

.header { text-align:center; padding:8px 0 4px; }
.logo { font-size:28px; font-weight:900; color:var(--text); letter-spacing:-1px; }
.logo span { color:var(--accent); }
.date { font-family:'Space Mono',monospace; font-size:11px; color:var(--muted); margin-top:4px; }
.card { background:var(--card); border:1px solid var(--border); border-radius:20px; padding:20px; }
.card-label { font-size:11px; font-weight:700; letter-spacing:2px; text-transform:uppercase; color:var(--muted); margin-bottom:14px; display:flex; align-items:center; justify-content:space-between; }
.mood-grid { display:flex; gap:8px; flex-wrap:wrap; }
.mood-btn { flex:1; min-width:70px; padding:10px 6px; border-radius:14px; border:1.5px solid var(--border); background:transparent; cursor:pointer; display:flex; flex-direction:column; align-items:center; gap:4px; transition:all 0.2s; font-family:'Nunito',sans-serif; }
.mood-btn:hover { transform:translateY(-2px); }
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
.remove-btn { background:transparent; border:none; color:var(--muted); cursor:pointer; font-size:18px; padding:0 2px; opacity:0.5; transition:opacity 0.15s; flex-shrink:0; line-height:1; }
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
.piece { position:absolute; border-radius:2px; animation:fall linear forwards; }
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

/* ── WATER PAGE ── */
.water-page { display:flex; flex-direction:column; gap:16px; animation:fadeIn 0.4s ease; }

.water-hero { background:linear-gradient(135deg,#0c1f2e,#0a2a3a); border:1px solid #38bdf830; border-radius:24px; padding:28px 20px; display:flex; flex-direction:column; align-items:center; gap:16px; }

.water-glass-wrap { position:relative; width:100px; height:140px; }

.water-glass-svg { width:100%; height:100%; filter:drop-shadow(0 0 20px #38bdf840); }

.water-count { font-family:'Space Mono',monospace; font-size:13px; color:var(--water); text-align:center; font-weight:700; }

.water-tagline { font-size:15px; font-weight:800; text-align:center; line-height:1.5; }
.water-tagline.dry { color:#f87171; }
.water-tagline.good { color:#4ade80; }

.glasses-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; }

.glass-btn { aspect-ratio:1; border-radius:14px; border:2px solid var(--border); background:transparent; cursor:pointer; font-size:26px; transition:all 0.2s; display:flex; align-items:center; justify-content:center; position:relative; overflow:hidden; }

.glass-btn.filled { border-color:#38bdf860; background:#38bdf815; }
.glass-btn.filled::after { content:''; position:absolute; bottom:0; left:0; right:0; background:linear-gradient(to top,#38bdf840,transparent); height:50%; }
.glass-btn:hover { transform:scale(1.08); }
.glass-btn:active { transform:scale(0.95); }

.water-add-btn { background:linear-gradient(135deg,#0ea5e9,#38bdf8); border:none; border-radius:16px; padding:16px; color:white; font-family:'Nunito',sans-serif; font-weight:900; font-size:16px; cursor:pointer; transition:all 0.2s; display:flex; align-items:center; justify-content:center; gap:10px; box-shadow:0 4px 20px #38bdf840; }
.water-add-btn:hover { transform:translateY(-2px); box-shadow:0 6px 24px #38bdf860; }
.water-add-btn:active { transform:translateY(0); }
.water-add-btn:disabled { opacity:0.4; cursor:not-allowed; transform:none; }

.water-undo { background:transparent; border:1px solid var(--border); border-radius:12px; padding:10px 16px; color:var(--muted); font-family:'Nunito',sans-serif; font-weight:700; font-size:13px; cursor:pointer; transition:all 0.15s; }
.water-undo:hover { color:var(--text); border-color:var(--muted); }
.water-undo:disabled { opacity:0.3; cursor:not-allowed; }

.water-stats { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; }
.water-stat { background:var(--card); border:1px solid var(--border); border-radius:14px; padding:14px; text-align:center; }
.water-stat-num { font-family:'Space Mono',monospace; font-size:20px; font-weight:700; color:var(--water); }
.water-stat-label { font-size:11px; color:var(--muted); margin-top:4px; font-weight:600; }

.water-progress-wrap { background:var(--card); border:1px solid var(--border); border-radius:20px; padding:20px; }
.water-progress-bar { height:12px; background:var(--border); border-radius:12px; overflow:hidden; margin:10px 0; }
.water-progress-fill { height:100%; background:linear-gradient(90deg,#0ea5e9,#38bdf8,#7dd3fc); border-radius:12px; transition:width 0.6s ease; }
.water-pct { font-family:'Space Mono',monospace; font-size:12px; color:var(--water); text-align:right; }

.splash { position:fixed; inset:0; pointer-events:none; z-index:50; overflow:hidden; }
.splash-drop { position:absolute; font-size:24px; animation:splashDrop 1s ease forwards; }
@keyframes splashDrop { 0%{transform:translateY(0) scale(1);opacity:1} 100%{transform:translateY(60px) scale(0);opacity:0} }
`;

function Confetti() {
  const pieces = Array.from({ length: 50 }, (_, i) => ({
    id: i, left: Math.random() * 100,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    delay: Math.random() * 1.5, duration: 2 + Math.random() * 2, size: 6 + Math.random() * 8,
  }));
  return (
    <div className="pieces">
      {pieces.map(p => (
        <div key={p.id} className="piece" style={{ left:`${p.left}%`, top:"-20px", background:p.color, width:p.size, height:p.size, animationDelay:`${p.delay}s`, animationDuration:`${p.duration}s` }} />
      ))}
    </div>
  );
}

function WaterGlass({ filled, total }) {
  const pct = Math.min((filled / total) * 100, 100);
  return (
    <svg viewBox="0 0 100 140" className="water-glass-svg">
      <defs>
        <clipPath id="glassClip">
          <path d="M15 10 L10 130 Q10 135 15 135 L85 135 Q90 135 90 130 L85 10 Z" />
        </clipPath>
        <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.9"/>
          <stop offset="100%" stopColor="#0ea5e9" stopOpacity="1"/>
        </linearGradient>
      </defs>
      {/* Glass outline */}
      <path d="M15 10 L10 130 Q10 135 15 135 L85 135 Q90 135 90 130 L85 10 Z" fill="none" stroke="#38bdf840" strokeWidth="2"/>
      {/* Water fill */}
      <rect x="0" y={`${100 - pct}`} width="100" height={`${pct}`} fill="url(#waterGrad)" clipPath="url(#glassClip)" opacity="0.85">
        <animate attributeName="y" values={`${101-pct};${99-pct};${101-pct}`} dur="2s" repeatCount="indefinite"/>
      </rect>
      {/* Shine */}
      <path d="M25 20 L22 110" stroke="white" strokeWidth="3" strokeLinecap="round" opacity="0.15"/>
    </svg>
  );
}

// ── Water Page ─────────────────────────────────────────────────────────────
function WaterPage() {
  const [glasses, setGlasses] = useState(() => {
    try {
      const s = JSON.parse(localStorage.getItem("gl_water") || "{}");
      return s.date === TODAY_KEY ? (s.glasses || 0) : 0;
    } catch { return 0; }
  });
  const [splashes, setSplashes] = useState([]);
  const [waterConfetti, setWaterConfetti] = useState(false);
  const [goalShown, setGoalShown] = useState(false);

  useEffect(() => {
    try { localStorage.setItem("gl_water", JSON.stringify({ date: TODAY_KEY, glasses })); } catch {}
    if (glasses >= WATER_GOAL && !goalShown) {
      setWaterConfetti(true);
      setGoalShown(true);
      setTimeout(() => setWaterConfetti(false), 4000);
    }
  }, [glasses, goalShown]);

  const addGlass = () => {
    if (glasses >= WATER_GOAL) return;
    setGlasses(g => g + 1);
    const id = Date.now();
    const x = 30 + Math.random() * 40;
    setSplashes(prev => [...prev, { id, x }]);
    setTimeout(() => setSplashes(prev => prev.filter(s => s.id !== id)), 1000);
  };

  const undo = () => { if (glasses > 0) setGlasses(g => g - 1); };

  const currentMsg = WATER_MSGS.find(m => m.at === glasses) || WATER_MSGS[WATER_MSGS.length - 1];
  const mlDrank = glasses * 250;
  const remaining = Math.max(0, WATER_GOAL - glasses) * 250;
  const pct = Math.round((glasses / WATER_GOAL) * 100);

  return (
    <div className="water-page">
      {waterConfetti && <div className="confetti-wrap"><div className="confetti-msg">💧</div><Confetti /></div>}
      {splashes.map(s => (
        <div key={s.id} className="splash">
          <div className="splash-drop" style={{ left:`${s.x}%`, top:"40%" }}>💧</div>
        </div>
      ))}

      {/* Hero */}
      <div className="water-hero">
        <div className="water-glass-wrap">
          <WaterGlass filled={glasses} total={WATER_GOAL} />
        </div>
        <div className="water-count">{glasses} / {WATER_GOAL} bardak</div>
        <div className={`water-tagline ${currentMsg.dry ? "dry" : "good"}`}>
          {currentMsg.msg}
        </div>
      </div>

      {/* Bardak grid */}
      <div className="card">
        <div className="card-label">Bardaklarını işaretle</div>
        <div className="glasses-grid">
          {Array.from({ length: WATER_GOAL }, (_, i) => (
            <button key={i} className={`glass-btn ${i < glasses ? "filled" : ""}`}
              onClick={() => { if (i < glasses) setGlasses(i); else if (i === glasses) addGlass(); }}>
              {i < glasses ? "💧" : "🥛"}
            </button>
          ))}
        </div>
      </div>

      {/* Büyük ekle butonu */}
      <button className="water-add-btn" onClick={addGlass} disabled={glasses >= WATER_GOAL}>
        <span style={{fontSize:24}}>💧</span>
        {glasses >= WATER_GOAL ? "Hedef tamamlandı! 🎉" : "Bir bardak içtim!"}
      </button>

      {/* Stats */}
      <div className="water-stats">
        <div className="water-stat">
          <div className="water-stat-num">{mlDrank}</div>
          <div className="water-stat-label">ml içildi</div>
        </div>
        <div className="water-stat">
          <div className="water-stat-num">{remaining}</div>
          <div className="water-stat-label">ml kaldı</div>
        </div>
        <div className="water-stat">
          <div className="water-stat-num">{pct}%</div>
          <div className="water-stat-label">tamamlandı</div>
        </div>
      </div>

      {/* Progress */}
      <div className="water-progress-wrap">
        <div className="card-label" style={{marginBottom:0}}>Günlük ilerleme</div>
        <div className="water-progress-bar">
          <div className="water-progress-fill" style={{width:`${pct}%`}} />
        </div>
        <div className="water-progress-pct" style={{fontFamily:"'Space Mono',monospace",fontSize:11,color:"#38bdf8",textAlign:"right"}}>{pct}%</div>
        <button className="water-undo" style={{marginTop:10,width:"100%"}} onClick={undo} disabled={glasses === 0}>
          ↩ Son bardağı geri al
        </button>
      </div>
    </div>
  );
}

// ── Main App ───────────────────────────────────────────────────────────────
export default function App() {
  const today = new Date().toLocaleDateString("tr-TR", { weekday:"long", day:"numeric", month:"long" });
  const [page, setPage] = useState("home");

  const [mood, setMood] = useState(null);
  const [aiMsg, setAiMsg] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const [permanentTasks, setPermanentTasks] = useState(() => {
    try { return JSON.parse(localStorage.getItem("gl_permanent") || "[]"); } catch { return []; }
  });
  const [newPermInput, setNewPermInput] = useState("");

  const [dailyTasks, setDailyTasks] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("gl_daily") || "{}");
      if (saved.date === TODAY_KEY) return saved.tasks;
      return [{ id:1,text:"",done:false },{ id:2,text:"",done:false },{ id:3,text:"",done:false }];
    } catch { return [{ id:1,text:"",done:false },{ id:2,text:"",done:false },{ id:3,text:"",done:false }]; }
  });

  const [permDone, setPermDone] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("gl_perm_done") || "{}");
      if (saved.date === TODAY_KEY) return saved.done || {};
      return {};
    } catch { return {}; }
  });

  const [showConfetti, setShowConfetti] = useState(false);
  const [confettiShown, setConfettiShown] = useState(false);
  const [newDailyInput, setNewDailyInput] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatRef = useRef(null);

  useEffect(() => { try { localStorage.setItem("gl_permanent", JSON.stringify(permanentTasks)); } catch {} }, [permanentTasks]);
  useEffect(() => { try { localStorage.setItem("gl_daily", JSON.stringify({ date: TODAY_KEY, tasks: dailyTasks })); } catch {} }, [dailyTasks]);
  useEffect(() => { try { localStorage.setItem("gl_perm_done", JSON.stringify({ date: TODAY_KEY, done: permDone })); } catch {} }, [permDone]);
  useEffect(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }, [chatMessages]);

  useEffect(() => {
    const filledDaily = dailyTasks.filter(t => t.text.trim());
    const allDailyDone = filledDaily.length > 0 && filledDaily.every(t => t.done);
    const allPermDone = permanentTasks.length === 0 || permanentTasks.every(t => permDone[t.id]);
    if (allDailyDone && allPermDone && !confettiShown && (filledDaily.length > 0 || permanentTasks.length > 0)) {
      setShowConfetti(true); setConfettiShown(true);
      setTimeout(() => setShowConfetti(false), 4000);
    }
  }, [dailyTasks, permDone, permanentTasks, confettiShown]);

  const selectMood = async (m) => {
    setMood(m); setAiLoading(true); setAiMsg("");
    try {
      const text = await callAI(
        [{ role:"user", content:`Kullanıcı bugün "${m.label}" hissediyor (${m.emoji}). Kısa, samimi karşıla. Türkçe, 2-3 cümle.` }],
        "Sen günlük bir yaşam koçusun. Sıcak, pozitif ve eğlenceli."
      );
      setAiMsg(text);
    } catch { setAiMsg("Bugün de harikasın! Hadi görevlerini tamamla 💪"); }
    setAiLoading(false);
  };

  const addPermanent = () => {
    if (!newPermInput.trim()) return;
    setPermanentTasks(prev => [...prev, { id: Date.now(), text: newPermInput.trim() }]);
    setNewPermInput("");
  };
  const removePermanent = (id) => { setPermanentTasks(prev => prev.filter(t => t.id !== id)); setPermDone(prev => { const n={...prev}; delete n[id]; return n; }); };
  const togglePerm = (id) => setPermDone(prev => ({ ...prev, [id]: !prev[id] }));

  const updateDaily = (id, text) => setDailyTasks(prev => prev.map(t => t.id === id ? { ...t, text } : t));
  const toggleDaily = (id) => setDailyTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
  const addDailyTask = () => { if (!newDailyInput.trim()) return; setDailyTasks(prev => [...prev, { id: Date.now(), text: newDailyInput.trim(), done: false }]); setNewDailyInput(""); };
  const removeDaily = (id) => setDailyTasks(prev => prev.filter(t => t.id !== id));
  const resetDaily = () => { setDailyTasks([{ id:1,text:"",done:false },{ id:2,text:"",done:false },{ id:3,text:"",done:false }]); setConfettiShown(false); };

  const filledDaily = dailyTasks.filter(t => t.text.trim());
  const dailyDone = filledDaily.filter(t => t.done).length;
  const permDoneCount = permanentTasks.filter(t => permDone[t.id]).length;
  const totalAll = filledDaily.length + permanentTasks.length;
  const doneAll = dailyDone + permDoneCount;

  const sendChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = chatInput.trim(); setChatInput("");
    setChatMessages(prev => [...prev, { role:"user", content:userMsg }]); setChatLoading(true);
    const permSummary = permanentTasks.map(t => `- ${t.text} (${permDone[t.id] ? "✓" : "bekliyor"})`).join("\n");
    const dailySummary = filledDaily.map(t => `- ${t.text} (${t.done ? "✓" : "bekliyor"})`).join("\n");
    try {
      const text = await callAI(
        [...chatMessages, { role:"user", content:userMsg }],
        `Sen günlük yaşam koçusun. Ruh hali: ${mood?.label || "bilinmiyor"}.\nDaimi: ${permSummary || "yok"}\nGünlük: ${dailySummary || "yok"}\nTürkçe, kısa, samimi. Max 3 cümle.`
      );
      setChatMessages(prev => [...prev, { role:"assistant", content:text }]);
    } catch { setChatMessages(prev => [...prev, { role:"assistant", content:"Bir hata oluştu!" }]); }
    setChatLoading(false);
  };
  const handleChatKey = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChat(); } };

  // Su bardağı sayısı nav için
  const waterGlasses = (() => { try { const s = JSON.parse(localStorage.getItem("gl_water") || "{}"); return s.date === TODAY_KEY ? (s.glasses || 0) : 0; } catch { return 0; } })();

  return (
    <>
      <style>{css}</style>
      {showConfetti && <div className="confetti-wrap"><div className="confetti-msg">🎉</div><Confetti /></div>}

      <div className="app">
        {/* HEADER */}
        <div className="header">
          <div className="logo">günlük<span>.</span></div>
          <div className="date">{today}</div>
        </div>

        {/* NAV */}
        <div className="nav">
          <button className={`nav-btn ${page === "home" ? "active" : ""}`} onClick={() => setPage("home")}>
            ✅ Görevler
          </button>
          <button className={`nav-btn ${page === "water" ? "water-active" : ""}`} onClick={() => setPage("water")}>
            💧 Su {waterGlasses > 0 && <span style={{fontSize:10,color:"#38bdf8"}}>({waterGlasses}/{WATER_GOAL})</span>}
          </button>
        </div>

        {/* HOME PAGE */}
        {page === "home" && (
          <>
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
                  onKeyDown={e => e.key === "Enter" && addPermanent()} placeholder="Yeni daimi görev ekle..." />
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
                  onKeyDown={e => e.key === "Enter" && addDailyTask()} placeholder="Ekstra görev ekle..." />
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
                    {chatLoading && <div className="chat-msg ai"><div className="chat-bubble"><div className="typing"><div className="dot"/><div className="dot"/><div className="dot"/></div></div></div>}
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
          </>
        )}

        {/* WATER PAGE */}
        {page === "water" && <WaterPage />}
      </div>
    </>
  );
}
