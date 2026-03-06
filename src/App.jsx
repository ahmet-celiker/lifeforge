import { useState, useRef, useEffect, useCallback } from "react";

// ── SES ENJİNİ (Web Audio API) ─────────────────────────────────────────────
const AudioCtx = typeof window !== "undefined" ? (window.AudioContext || window.webkitAudioContext) : null;
let _ctx = null;
const getCtx = () => { if(!_ctx && AudioCtx) _ctx = new AudioCtx(); return _ctx; };

const playTone = (freq, type, duration, volume=0.3, delay=0) => {
  try {
    const ctx = getCtx(); if(!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = type; osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
    gain.gain.setValueAtTime(volume, ctx.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + duration);
  } catch(e) {}
};

const playNoise = (duration, volume=0.15) => {
  try {
    const ctx = getCtx(); if(!ctx) return;
    const bufSize = ctx.sampleRate * duration;
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for(let i=0;i<bufSize;i++) data[i] = Math.random()*2-1;
    const src = ctx.createBufferSource();
    const gain = ctx.createGain();
    src.buffer = buf; src.connect(gain); gain.connect(ctx.destination);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    src.start(); src.stop(ctx.currentTime + duration);
  } catch(e) {}
};

const SFX = {
  // Oyun sesleri
  ballBounce: () => { playTone(440, "sine", 0.06, 0.15); },
  wallBounce: () => { playTone(220, "square", 0.08, 0.1); },
  brickHit: (pts) => {
    const freq = pts===50?800:pts===40?650:pts===30?500:pts===20?380:280;
    playTone(freq, "square", 0.08, 0.25);
    playTone(freq*1.5, "sine", 0.12, 0.15, 0.05);
  },
  combo: (n) => {
    for(let i=0;i<Math.min(n,5);i++) playTone(300+i*120,"sine",0.1,0.2,i*0.06);
  },
  lifeLost: () => {
    playTone(300,"sawtooth",0.15,0.3);
    playTone(200,"sawtooth",0.2,0.3,0.15);
    playTone(120,"sawtooth",0.3,0.3,0.3);
  },
  gameOver: () => {
    [400,350,300,200,150].forEach((f,i)=>playTone(f,"sawtooth",0.2,0.25,i*0.12));
  },
  gameWin: () => {
    [523,659,784,1047].forEach((f,i)=>playTone(f,"sine",0.3,0.3,i*0.1));
    setTimeout(()=>[1047,784,659,523,659,784,1047].forEach((f,i)=>playTone(f,"sine",0.2,0.2,i*0.08)),600);
  },
  gameStart: () => {
    [262,330,392,523].forEach((f,i)=>playTone(f,"triangle",0.15,0.25,i*0.08));
  },

  // Sinek sesleri
  flyHit: () => {
    playNoise(0.08, 0.3);
    playTone(80,"sawtooth",0.1,0.2,0.05);
  },
  flyMiss: () => {
    playTone(200,"sine",0.05,0.1);
    playTone(150,"sine",0.08,0.1,0.05);
  },
  flyBuzz: () => { playTone(180,"sawtooth",0.06,0.08); },

  // UI sesleri
  moodSelect: (idx) => {
    const freqs=[523,587,659,698,784];
    playTone(freqs[idx]||523,"sine",0.15,0.2);
  },
  taskDone: () => {
    playTone(523,"sine",0.1,0.2);
    playTone(659,"sine",0.1,0.2,0.1);
  },
  allDone: () => {
    [523,659,784,1047,1319].forEach((f,i)=>playTone(f,"sine",0.2,0.25,i*0.08));
  },
  waterAdd: () => {
    playTone(600,"sine",0.05,0.15);
    playTone(800,"sine",0.08,0.1,0.06);
  },
  waterGoal: () => {
    [400,500,600,800,1000].forEach((f,i)=>playTone(f,"sine",0.15,0.2,i*0.07));
  },
  ruletSpin: () => {
    for(let i=0;i<8;i++) playTone(200+i*40,"square",0.05,0.1,i*0.05);
  },
  ruletResult: () => {
    [300,400,500,400,600].forEach((f,i)=>playTone(f,"triangle",0.1,0.2,i*0.07));
  },
  musicDiscover: () => {
    [330,415,494,659].forEach((f,i)=>playTone(f,"sine",0.15,0.2,i*0.07));
  },
  navClick: () => { playTone(440,"sine",0.04,0.08); },
  addTask: () => { playTone(550,"triangle",0.08,0.15); },
  removeTask: () => { playTone(300,"square",0.06,0.1); },
};


const API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const MODEL = "llama-3.3-70b-versatile";

const callAI = async (messages, system, maxTokens = 150) => {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${API_KEY}` },
    body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, messages: [{ role: "system", content: system }, ...messages] }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.choices?.[0]?.message?.content || "";
};

const MOODS = [
  { emoji: "☀️", label: "Günaydın!", desc: "Yataktan fırladım", color: "#f5c842", bg: "#f5c84220" },
  { emoji: "☕", label: "Kahve lazım", desc: "İnsan olmam için", color: "#fb923c", bg: "#fb923c20" },
  { emoji: "🧟", label: "Zombiyim", desc: "Alarm düşmanım", color: "#a78bfa", bg: "#a78bfa20" },
  { emoji: "😤", label: "Hırslıyım", desc: "Bugün her şey olur", color: "#4ade80", bg: "#4ade8020" },
  { emoji: "🌧️", label: "Hüzünlüyüm", desc: "Yorganım özlüyor", color: "#60a5fa", bg: "#60a5fa20" },
  { emoji: "🤯", label: "Kafam şişti", desc: "Ne yapacağım bilmem", color: "#f87171", bg: "#f8717120" },
  { emoji: "😴", label: "Uyku hali", desc: "5 dakika daha...", color: "#94a3b8", bg: "#94a3b820" },
  { emoji: "🔥", label: "Üstüme gelme", desc: "Bugün fırtına gibiyim", color: "#ef4444", bg: "#ef444420" },
];
const CONFETTI_COLORS = ["#a78bfa","#f5c842","#4ade80","#f87171","#60a5fa","#fb923c"];
const TODAY_KEY = new Date().toDateString();
const WATER_GOAL = 8;
const WATER_MSGS = [
  { at:0, msg:"🏜️ İçinde çöl var sanki. Bir bardak iç!", dry:true },
  { at:1, msg:"💧 Kaktüs bile bu kadarla yaşar.", dry:true },
  { at:2, msg:"🐠 Balık kadar su içtin. Ama sen balık değilsin!", dry:true },
  { at:3, msg:"😤 Yavaş yavaş ısınıyoruz. Devam!", dry:false },
  { at:4, msg:"⚡ Tam yarısı! Beyin hücrelerin teşekkür ediyor.", dry:false },
  { at:5, msg:"🌊 Artık nehir gibi akıyorsun!", dry:false },
  { at:6, msg:"💪 Son viraj! Neredeyse hedefte!", dry:false },
  { at:7, msg:"🎉 Bir bardak kaldı! Bitir şunu!", dry:false },
  { at:8, msg:"🏆 GÜNLÜK HEDEF TAMAM! Efsanesin!", dry:false },
];

const RULET_HAVUZU = [
  "10 şınav çek 💪","Bir bardak su iç 💧","5 dakika meditasyon yap 🧘","Bir arkadaşını ara 📞",
  "Masanı topla 🧹","10 dakika yürü 🚶","Bir şeyler atıştır 🍎","Derin 5 nefes al 😮‍💨",
  "Bir şarkı söyle 🎵","Pencerenin önünde dur, dışarıya bak 🪟","Birine teşekkür et 🙏",
  "30 saniye dans et 💃","Bir kitap sayfası oku 📖","Yüzünü yıka 😌","Bacak esnetmesi yap 🦵",
  "Biriyle selfsie çek 🤳","Masandan kalk, bir tur at 🔄","Komik bir video izle 😂",
  "Kendine kahve/çay yap ☕","5 dakika telefonsuz otur 📵",
];

const css = `
@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Space+Mono:wght@400;700&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--bg:#0f0f1a;--card:#1a1a2e;--border:#2a2a45;--text:#f0f0ff;--muted:#6b6b9a;--accent:#a78bfa;--water:#38bdf8}
body{background:var(--bg);color:var(--text);font-family:'Nunito',sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px;background-image:radial-gradient(ellipse at 20% 50%,#1a0a3a40 0%,transparent 60%),radial-gradient(ellipse at 80% 20%,#0a2a3a40 0%,transparent 60%)}
.app{width:100%;max-width:480px;display:flex;flex-direction:column;gap:16px;animation:fadeIn 0.5s ease}
@keyframes fadeIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
.header{text-align:center;padding:8px 0 4px}
.logo{font-size:28px;font-weight:900;color:var(--text);letter-spacing:-1px}
.logo span{color:var(--accent)}
.date{font-family:'Space Mono',monospace;font-size:11px;color:var(--muted);margin-top:4px}
.nav{display:flex;gap:5px;background:var(--card);border:1px solid var(--border);border-radius:16px;padding:5px}
.nav-btn{flex:1;padding:8px 3px;border:none;border-radius:11px;background:transparent;color:var(--muted);font-family:'Nunito',sans-serif;font-weight:800;font-size:11px;cursor:pointer;transition:all 0.2s;display:flex;align-items:center;justify-content:center;gap:3px;white-space:nowrap}
.nav-btn:hover{color:var(--text)}
.nav-btn.active{background:#ffffff12;color:var(--text)}
.nav-btn.water-active{background:#38bdf820;color:#38bdf8}
.nav-btn.music-active{background:#f0abfc20;color:#f0abfc}
.card{background:var(--card);border:1px solid var(--border);border-radius:20px;padding:20px}
.card-label{font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--muted);margin-bottom:14px;display:flex;align-items:center;justify-content:space-between}
.mood-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
.mood-btn{flex:1;min-width:80px;padding:10px 6px;border-radius:14px;border:1.5px solid var(--border);background:transparent;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:3px;transition:all 0.2s;font-family:'Nunito',sans-serif}
.mood-btn:hover{transform:translateY(-2px)}
.mood-emoji{font-size:22px}
.mood-label{font-size:11px;font-weight:700;color:var(--muted)}
.mood-desc{font-size:9px;color:var(--muted);text-align:center;line-height:1.3;opacity:0.7}
.mood-btn.selected .mood-desc{opacity:1}
.mood-btn.selected .mood-label{color:inherit}
.ai-bubble{background:linear-gradient(135deg,#1e1e35,#1a1a2e);border:1px solid var(--border);border-radius:18px 18px 18px 4px;padding:14px 18px;font-size:14px;line-height:1.7;color:var(--text);min-height:52px}
.ai-tag{font-size:10px;font-weight:700;letter-spacing:1px;color:var(--accent);margin-bottom:6px;display:block}
.typing{display:flex;gap:4px;align-items:center;padding:4px 0}
.dot{width:6px;height:6px;background:var(--muted);border-radius:50%;animation:bounce 1.2s infinite}
.dot:nth-child(2){animation-delay:0.2s}.dot:nth-child(3){animation-delay:0.4s}
@keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
.tasks-list{display:flex;flex-direction:column;gap:10px}
.task-item{display:flex;align-items:center;gap:12px;padding:12px 14px;background:#12122080;border:1.5px solid var(--border);border-radius:14px;transition:all 0.2s}
.task-item.done{opacity:0.5}
.task-check{width:24px;height:24px;border-radius:50%;border:2px solid var(--border);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;font-size:12px;transition:all 0.2s;background:transparent;color:transparent}
.task-item.done .task-check{background:#4ade80;border-color:#4ade80;color:#000}
.task-input{flex:1;background:transparent;border:none;outline:none;font-family:'Nunito',sans-serif;font-size:14px;font-weight:600;color:var(--text)}
.task-input::placeholder{color:var(--muted)}
.task-item.done .task-input{text-decoration:line-through;color:var(--muted)}
.task-num{font-family:'Space Mono',monospace;font-size:11px;color:var(--muted);flex-shrink:0}
.remove-btn{background:transparent;border:none;color:var(--muted);cursor:pointer;font-size:18px;padding:0 2px;opacity:0.5;transition:opacity 0.15s;flex-shrink:0;line-height:1}
.remove-btn:hover{opacity:1;color:#f87171}
.progress-row{display:flex;align-items:center;gap:12px;margin-top:14px}
.progress-bar{flex:1;height:6px;background:var(--border);border-radius:6px;overflow:hidden}
.progress-fill{height:100%;background:linear-gradient(90deg,var(--accent),#c4b5fd);border-radius:6px;transition:width 0.5s ease}
.progress-text{font-family:'Space Mono',monospace;font-size:11px;color:var(--muted);white-space:nowrap}
.add-row{display:flex;gap:8px;margin-top:12px}
.add-input{flex:1;background:#12122080;border:1.5px solid var(--border);border-radius:12px;padding:9px 14px;color:var(--text);font-family:'Nunito',sans-serif;font-size:13.5px;outline:none;transition:border-color 0.15s}
.add-input:focus{border-color:var(--accent)}
.add-input::placeholder{color:var(--muted)}
.add-btn{background:var(--accent);border:none;border-radius:12px;padding:9px 16px;color:white;font-family:'Nunito',sans-serif;font-weight:800;font-size:13px;cursor:pointer;transition:all 0.15s;white-space:nowrap}
.add-btn:hover{background:#c4b5fd}
.add-btn:disabled{opacity:0.4;cursor:not-allowed}
.reset-btn{font-size:10px;font-weight:700;letter-spacing:1px;background:transparent;border:1px solid var(--border);border-radius:8px;padding:3px 8px;color:var(--muted);cursor:pointer;font-family:'Nunito',sans-serif;transition:all 0.15s}
.reset-btn:hover{color:var(--text);border-color:var(--muted)}
.confetti-wrap{position:fixed;inset:0;pointer-events:none;z-index:100;display:flex;align-items:center;justify-content:center}
.confetti-msg{font-size:64px;animation:pop 0.5s ease}
@keyframes pop{0%{transform:scale(0) rotate(-20deg);opacity:0}60%{transform:scale(1.3) rotate(10deg);opacity:1}100%{transform:scale(1) rotate(0deg);opacity:1}}
.pieces{position:fixed;inset:0;pointer-events:none}
.piece{position:absolute;border-radius:2px;animation:fall linear forwards}
@keyframes fall{0%{transform:translateY(-20px) rotate(0deg);opacity:1}100%{transform:translateY(110vh) rotate(720deg);opacity:0}}
.chat-messages{display:flex;flex-direction:column;gap:10px;max-height:200px;overflow-y:auto;margin-bottom:12px}
.chat-msg{display:flex;gap:8px;animation:fadeIn 0.3s ease}
.chat-msg.user{flex-direction:row-reverse}
.chat-bubble{padding:9px 14px;border-radius:16px;font-size:13.5px;line-height:1.6;max-width:85%}
.chat-msg.ai .chat-bubble{background:#1e1e35;border:1px solid var(--border);border-radius:16px 16px 16px 4px}
.chat-msg.user .chat-bubble{background:var(--accent);color:#fff;border-radius:16px 16px 4px 16px}
.chat-row{display:flex;gap:8px}
.chat-field{flex:1;background:#12122080;border:1.5px solid var(--border);border-radius:12px;padding:10px 14px;color:var(--text);font-family:'Nunito',sans-serif;font-size:13.5px;outline:none;resize:none;transition:border-color 0.15s}
.chat-field:focus{border-color:var(--accent)}
.chat-field::placeholder{color:var(--muted)}
.send-btn{background:var(--accent);border:none;border-radius:12px;padding:10px 16px;color:white;font-family:'Nunito',sans-serif;font-weight:800;font-size:13px;cursor:pointer;transition:all 0.15s;white-space:nowrap}
.send-btn:hover{background:#c4b5fd}
.send-btn:disabled{opacity:0.4;cursor:not-allowed}

/* WATER */
.water-page{display:flex;flex-direction:column;gap:16px;animation:fadeIn 0.4s ease}
.water-hero{background:linear-gradient(135deg,#0c1f2e,#0a2a3a);border:1px solid #38bdf830;border-radius:24px;padding:28px 20px;display:flex;flex-direction:column;align-items:center;gap:16px}
.water-glass-wrap{width:100px;height:140px}
.water-glass-svg{width:100%;height:100%;filter:drop-shadow(0 0 20px #38bdf840)}
.water-count{font-family:'Space Mono',monospace;font-size:13px;color:#38bdf8;text-align:center;font-weight:700}
.water-tagline{font-size:15px;font-weight:800;text-align:center;line-height:1.5}
.water-tagline.dry{color:#f87171}.water-tagline.good{color:#4ade80}
.glasses-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
.glass-btn{aspect-ratio:1;border-radius:14px;border:2px solid var(--border);background:transparent;cursor:pointer;font-size:26px;transition:all 0.2s;display:flex;align-items:center;justify-content:center}
.glass-btn.filled{border-color:#38bdf860;background:#38bdf815}
.glass-btn:hover{transform:scale(1.08)}.glass-btn:active{transform:scale(0.95)}
.water-add-btn{background:linear-gradient(135deg,#0ea5e9,#38bdf8);border:none;border-radius:16px;padding:16px;color:white;font-family:'Nunito',sans-serif;font-weight:900;font-size:16px;cursor:pointer;transition:all 0.2s;display:flex;align-items:center;justify-content:center;gap:10px;box-shadow:0 4px 20px #38bdf840}
.water-add-btn:hover{transform:translateY(-2px)}.water-add-btn:disabled{opacity:0.4;cursor:not-allowed;transform:none}
.water-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.water-stat{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:14px;text-align:center}
.water-stat-num{font-family:'Space Mono',monospace;font-size:20px;font-weight:700;color:#38bdf8}
.water-stat-label{font-size:11px;color:var(--muted);margin-top:4px;font-weight:600}
.water-progress-wrap{background:var(--card);border:1px solid var(--border);border-radius:20px;padding:20px}
.water-progress-bar{height:12px;background:var(--border);border-radius:12px;overflow:hidden;margin:10px 0}
.water-progress-fill{height:100%;background:linear-gradient(90deg,#0ea5e9,#38bdf8,#7dd3fc);border-radius:12px;transition:width 0.6s ease}
.water-undo{background:transparent;border:1px solid var(--border);border-radius:12px;padding:10px 16px;color:var(--muted);font-family:'Nunito',sans-serif;font-weight:700;font-size:13px;cursor:pointer;transition:all 0.15s;width:100%;margin-top:10px}
.water-undo:hover{color:var(--text);border-color:var(--muted)}.water-undo:disabled{opacity:0.3;cursor:not-allowed}
.splash{position:fixed;inset:0;pointer-events:none;z-index:50;overflow:hidden}
.splash-drop{position:absolute;font-size:24px;animation:splashDrop 1s ease forwards}
@keyframes splashDrop{0%{transform:translateY(0) scale(1);opacity:1}100%{transform:translateY(60px) scale(0);opacity:0}}

/* RULET */
.rulet-page{display:flex;flex-direction:column;gap:16px;animation:fadeIn 0.4s ease}
.rulet-hero{background:linear-gradient(135deg,#1a0a2e,#12122a);border:1px solid #a78bfa30;border-radius:24px;padding:32px 20px;display:flex;flex-direction:column;align-items:center;gap:20px;text-align:center}
.rulet-wheel{width:140px;height:140px;border-radius:50%;border:3px solid var(--accent);display:flex;align-items:center;justify-content:center;font-size:48px;background:radial-gradient(circle,#1e1e35,#0f0f1a);box-shadow:0 0 30px #a78bfa40;transition:transform 0.1s}
.rulet-wheel.spinning{animation:spin 0.15s linear infinite}
@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
.rulet-btn{background:linear-gradient(135deg,#a78bfa,#c4b5fd);border:none;border-radius:16px;padding:16px 32px;color:white;font-family:'Nunito',sans-serif;font-weight:900;font-size:16px;cursor:pointer;transition:all 0.2s;box-shadow:0 4px 20px #a78bfa40}
.rulet-btn:hover{transform:translateY(-2px);box-shadow:0 6px 28px #a78bfa60}
.rulet-btn:disabled{opacity:0.4;cursor:not-allowed;transform:none}
.rulet-results{display:flex;flex-direction:column;gap:10px}
.rulet-task{display:flex;align-items:center;gap:14px;padding:14px 18px;background:#1a1a2e;border:1.5px solid #a78bfa30;border-radius:14px;animation:fadeIn 0.4s ease;cursor:pointer;transition:all 0.2s}
.rulet-task:hover{border-color:#a78bfa60;background:#1e1e35}
.rulet-task.done{opacity:0.45}
.rulet-task-check{width:26px;height:26px;border-radius:50%;border:2px solid #a78bfa60;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:12px;transition:all 0.2s;color:transparent;background:transparent}
.rulet-task.done .rulet-task-check{background:#4ade80;border-color:#4ade80;color:#000}
.rulet-task-text{flex:1;font-size:14px;font-weight:700}
.rulet-task.done .rulet-task-text{text-decoration:line-through;color:var(--muted)}
.rulet-hint{font-size:12px;color:var(--muted);text-align:center}

/* MUSIC */
.music-page{display:flex;flex-direction:column;gap:16px;animation:fadeIn 0.4s ease}
.music-hero{background:linear-gradient(135deg,#1a0a1e,#0f0f1a);border:1px solid #f0abfc30;border-radius:24px;padding:28px 20px;display:flex;flex-direction:column;align-items:center;gap:16px;text-align:center;position:relative;overflow:hidden}
.music-hero::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at 50% 0%,#f0abfc15,transparent 70%);pointer-events:none}
.vinyl{width:120px;height:120px;border-radius:50%;background:radial-gradient(circle at 50%,#1a1a2e 20%,#2a2a45 40%,#1a1a2e 60%,#2a2a45 80%,#1a1a2e 100%);border:3px solid #f0abfc40;display:flex;align-items:center;justify-content:center;font-size:36px;box-shadow:0 0 30px #f0abfc30;position:relative}
.vinyl.spinning{animation:vinylSpin 3s linear infinite}
@keyframes vinylSpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
.vinyl-center{position:absolute;width:28px;height:28px;border-radius:50%;background:#0f0f1a;border:2px solid #f0abfc40}
.music-title{font-size:22px;font-weight:900;color:var(--text);line-height:1.3}
.music-artist{font-size:15px;color:#f0abfc;font-weight:700}
.music-meta{display:flex;gap:10px;flex-wrap:wrap;justify-content:center}
.music-tag{font-size:11px;font-weight:700;padding:4px 12px;border-radius:20px;background:#f0abfc15;border:1px solid #f0abfc30;color:#f0abfc}
.music-desc{font-size:13.5px;color:var(--muted);line-height:1.7;max-width:360px}
.music-vibe{font-size:14px;color:var(--text);font-weight:600;font-style:italic;padding:12px 16px;background:#ffffff08;border-radius:12px;border-left:3px solid #f0abfc}
.music-links{display:flex;gap:10px;width:100%}
.music-link{flex:1;padding:12px;border-radius:14px;border:1.5px solid var(--border);background:transparent;color:var(--muted);font-family:'Nunito',sans-serif;font-weight:700;font-size:13px;cursor:pointer;transition:all 0.15s;text-decoration:none;display:flex;align-items:center;justify-content:center;gap:6px}
.music-link.spotify{border-color:#1db95440;color:#1db954}
.music-link.spotify:hover{background:#1db95415}
.music-link.yt{border-color:#ff000040;color:#ff0000}
.music-link.yt:hover{background:#ff000015}
.music-discover-btn{background:linear-gradient(135deg,#e879f9,#f0abfc);border:none;border-radius:16px;padding:16px;color:white;font-family:'Nunito',sans-serif;font-weight:900;font-size:16px;cursor:pointer;transition:all 0.2s;display:flex;align-items:center;justify-content:center;gap:10px;box-shadow:0 4px 20px #e879f940;width:100%}
.music-discover-btn:hover{transform:translateY(-2px);box-shadow:0 6px 28px #e879f960}
.music-discover-btn:disabled{opacity:0.4;cursor:not-allowed;transform:none}
.music-empty{text-align:center;padding:20px;color:var(--muted);font-size:14px;line-height:1.8}
.music-history{display:flex;flex-direction:column;gap:8px}
.music-history-item{display:flex;align-items:center;gap:12px;padding:10px 14px;background:#12122080;border:1px solid var(--border);border-radius:12px;font-size:13px}
.music-history-emoji{font-size:20px;flex-shrink:0}
.music-history-info{flex:1}
.music-history-name{font-weight:700;color:var(--text)}
.music-history-artist{color:var(--muted);font-size:12px}
`;

function Confetti() {
  const pieces = Array.from({ length: 50 }, (_, i) => ({
    id: i, left: Math.random() * 100,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    delay: Math.random() * 1.5, duration: 2 + Math.random() * 2, size: 6 + Math.random() * 8,
  }));
  return <div className="pieces">{pieces.map(p => <div key={p.id} className="piece" style={{ left:`${p.left}%`, top:"-20px", background:p.color, width:p.size, height:p.size, animationDelay:`${p.delay}s`, animationDuration:`${p.duration}s` }} />)}</div>;
}

function WaterGlass({ filled, total }) {
  const pct = Math.min((filled / total) * 100, 100);
  return (
    <svg viewBox="0 0 100 140" className="water-glass-svg">
      <defs>
        <clipPath id="gc"><path d="M15 10 L10 130 Q10 135 15 135 L85 135 Q90 135 90 130 L85 10 Z"/></clipPath>
        <linearGradient id="wg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.9"/>
          <stop offset="100%" stopColor="#0ea5e9" stopOpacity="1"/>
        </linearGradient>
      </defs>
      <path d="M15 10 L10 130 Q10 135 15 135 L85 135 Q90 135 90 130 L85 10 Z" fill="none" stroke="#38bdf840" strokeWidth="2"/>
      <rect x="0" y={`${100-pct}`} width="100" height={`${pct}`} fill="url(#wg)" clipPath="url(#gc)" opacity="0.85">
        <animate attributeName="y" values={`${101-pct};${99-pct};${101-pct}`} dur="2s" repeatCount="indefinite"/>
      </rect>
      <path d="M25 20 L22 110" stroke="white" strokeWidth="3" strokeLinecap="round" opacity="0.15"/>
    </svg>
  );
}

function WaterPage() {
  const [glasses, setGlasses] = useState(() => { try { const s = JSON.parse(localStorage.getItem("gl_water")||"{}"); return s.date===TODAY_KEY?(s.glasses||0):0; } catch { return 0; } });
  const [splashes, setSplashes] = useState([]);
  const [wConfetti, setWConfetti] = useState(false);
  const [goalShown, setGoalShown] = useState(false);
  useEffect(() => {
    try { localStorage.setItem("gl_water", JSON.stringify({ date:TODAY_KEY, glasses })); } catch {}
    if (glasses >= WATER_GOAL && !goalShown) { SFX.waterGoal(); setWConfetti(true); setGoalShown(true); setTimeout(() => setWConfetti(false), 4000); }
  }, [glasses, goalShown]);
  const addGlass = () => {
    if (glasses >= WATER_GOAL) return;
    SFX.waterAdd(); setGlasses(g => g+1);
    const id = Date.now();
    setSplashes(p => [...p, { id, x:30+Math.random()*40 }]);
    setTimeout(() => setSplashes(p => p.filter(s => s.id!==id)), 1000);
  };
  const msg = WATER_MSGS.find(m => m.at===glasses) || WATER_MSGS[WATER_MSGS.length-1];
  const pct = Math.round((glasses/WATER_GOAL)*100);
  return (
    <div className="water-page">
      {wConfetti && <div className="confetti-wrap"><div className="confetti-msg">💧</div><Confetti /></div>}
      {splashes.map(s => <div key={s.id} className="splash"><div className="splash-drop" style={{left:`${s.x}%`,top:"40%"}}>💧</div></div>)}
      <div className="water-hero">
        <div className="water-glass-wrap"><WaterGlass filled={glasses} total={WATER_GOAL}/></div>
        <div className="water-count">{glasses} / {WATER_GOAL} bardak</div>
        <div className={`water-tagline ${msg.dry?"dry":"good"}`}>{msg.msg}</div>
      </div>
      <div className="card">
        <div className="card-label">Bardaklarını işaretle</div>
        <div className="glasses-grid">
          {Array.from({length:WATER_GOAL},(_,i) => <button key={i} className={`glass-btn ${i<glasses?"filled":""}`} onClick={() => i<glasses?setGlasses(i):i===glasses&&addGlass()}>{i<glasses?"💧":"🥛"}</button>)}
        </div>
      </div>
      <button className="water-add-btn" onClick={addGlass} disabled={glasses>=WATER_GOAL}><span style={{fontSize:24}}>💧</span>{glasses>=WATER_GOAL?"Hedef tamamlandı! 🎉":"Bir bardak içtim!"}</button>
      <div className="water-stats">
        <div className="water-stat"><div className="water-stat-num">{glasses*250}</div><div className="water-stat-label">ml içildi</div></div>
        <div className="water-stat"><div className="water-stat-num">{Math.max(0,WATER_GOAL-glasses)*250}</div><div className="water-stat-label">ml kaldı</div></div>
        <div className="water-stat"><div className="water-stat-num">{pct}%</div><div className="water-stat-label">tamamlandı</div></div>
      </div>
      <div className="water-progress-wrap">
        <div className="card-label" style={{marginBottom:0}}>Günlük ilerleme</div>
        <div className="water-progress-bar"><div className="water-progress-fill" style={{width:`${pct}%`}}/></div>
        <div style={{fontFamily:"'Space Mono',monospace",fontSize:11,color:"#38bdf8",textAlign:"right"}}>{pct}%</div>
        <button className="water-undo" onClick={() => setGlasses(g => Math.max(0,g-1))} disabled={glasses===0}>↩ Son bardağı geri al</button>
      </div>
    </div>
  );
}

// ── SİNEK VUR ──────────────────────────────────────────────────────────────
const FLY_MSGS_HIT = ["YUCK! 🤢","EZİLDİ! 💀","GOTCHA! 😈","BUZ! 🪰","SÜPER! 🤮","GİT ORDAN! 👋","PATLADI! 💥","REZALET! 😤"];
const FLY_MSGS_MISS = ["KAÇTI! 😤","BECEREMEDÎN! 🤡","HAHAha 🪰","NEREYE BASTIN?! 😂","EL SALLIYOR 👋","TUTAMADIN! 😭","ŞANS YOK! 🎪"];
const FLY_FACES = ["🪰","🦟","🐛","🐜","🦗"];

function FlyPage() {
  const [flies, setFlies] = useState([]);
  const [score, setScore] = useState(0);
  const [missed, setMissed] = useState(0);
  const [msg, setMsg] = useState("");
  const [msgPos, setMsgPos] = useState({x:50,y:50});
  const [msgColor, setMsgColor] = useState("#4ade80");
  const [gameActive, setGameActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [highScore, setHighScore] = useState(()=>parseInt(localStorage.getItem("gl_fly_hs")||"0"));
  const [gameOver, setGameOver] = useState(false);
  const [splats, setSplats] = useState([]);
  const areaRef = useRef(null);
  const flyIdRef = useRef(0);
  const timerRef = useRef(null);
  const spawnRef = useRef(null);

  const showMsg = (text, x, y, hit) => {
    setMsg(text); setMsgPos({x,y}); setMsgColor(hit?"#4ade80":"#f87171");
    setTimeout(()=>setMsg(""), 700);
  };

  const spawnFly = useCallback(()=>{
    if(!areaRef.current) return;
    const area = areaRef.current.getBoundingClientRect();
    const id = ++flyIdRef.current;
    const emoji = FLY_FACES[Math.floor(Math.random()*FLY_FACES.length)];
    const x = 5 + Math.random()*85;
    const y = 5 + Math.random()*85;
    const speed = 0.3 + Math.random()*0.8;
    const dx = (Math.random()-0.5)*speed;
    const dy = (Math.random()-0.5)*speed;
    const size = 28 + Math.random()*20;
    const life = 2500 + Math.random()*2000;
    setFlies(prev=>[...prev, {id, emoji, x, y, dx, dy, size, rotation:Math.random()*360}]);
    setTimeout(()=>{
      setFlies(prev=>prev.filter(f=>f.id!==id));
    }, life);
  },[]);

  const startGame = () => {
    setFlies([]); setSplats([]); setScore(0); setMissed(0);
    setTimeLeft(30); setGameOver(false); setGameActive(true);
    spawnRef.current = setInterval(spawnFly, 600);
    timerRef.current = setInterval(()=>{
      setTimeLeft(t=>{
        if(t<=1){
          clearInterval(spawnRef.current);
          clearInterval(timerRef.current);
          setGameActive(false);
          setGameOver(true);
          setFlies([]);
          return 0;
        }
        return t-1;
      });
    },1000);
  };

  useEffect(()=>{
    if(gameOver){
      setScore(s=>{ if(s>highScore){setHighScore(s);localStorage.setItem("gl_fly_hs",s);} return s; });
    }
  },[gameOver]);

  useEffect(()=>{
    if(!gameActive) return;
    const move = setInterval(()=>{
      setFlies(prev=>prev.map(f=>{
        let nx = f.x + f.dx;
        let ny = f.y + f.dy;
        let ndx = f.dx; let ndy = f.dy;
        if(nx<2||nx>93){ndx*=-1; nx=Math.max(2,Math.min(93,nx));}
        if(ny<2||ny>90){ndy*=-1; ny=Math.max(2,Math.min(90,ny));}
        return {...f, x:nx, y:ny, dx:ndx, dy:ndy, rotation:f.rotation+5};
      }));
    },50);
    return ()=>clearInterval(move);
  },[gameActive]);

  useEffect(()=>()=>{ clearInterval(spawnRef.current); clearInterval(timerRef.current); },[]);

  const hitFly = (e, id, fx, fy) => {
    e.stopPropagation();
    const m = FLY_MSGS_HIT[Math.floor(Math.random()*FLY_MSGS_HIT.length)];
    showMsg(m, fx, fy, true); SFX.flyHit();
    setFlies(prev=>prev.filter(f=>f.id!==id));
    setScore(s=>s+10);
    const sid = Date.now();
    setSplats(prev=>[...prev,{id:sid, x:fx, y:fy}]);
    setTimeout(()=>setSplats(prev=>prev.filter(s=>s.id!==sid)),3000);
  };

  const missClick = (e) => {
    if(!gameActive) return;
    const rect = areaRef.current.getBoundingClientRect();
    const px = ((e.clientX-rect.left)/rect.width)*100;
    const py = ((e.clientY-rect.top)/rect.height)*100;
    const m = FLY_MSGS_MISS[Math.floor(Math.random()*FLY_MSGS_MISS.length)];
    showMsg(m, px, py, false); SFX.flyMiss();
    setMissed(m=>m+1);
  };

  const accuracy = score+missed*10 > 0 ? Math.round((score/(score+missed*10))*100) : 0;

  return (
    <div style={{display:"flex",flexDirection:"column",gap:16,animation:"fadeIn 0.4s ease"}}>
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{fontSize:22,fontWeight:900,color:"var(--text)"}}>sinek<span style={{color:"#4ade80"}}>.</span>vur</div>
        <div style={{display:"flex",gap:8}}>
          <div className="score-chip">Skor<span>{score}</span></div>
          <div className="score-chip">Rekor<span>{highScore}</span></div>
          <div className="score-chip" style={{color:timeLeft<=10?"#f87171":"var(--muted)"}}>Süre<span style={{color:timeLeft<=10?"#f87171":"var(--text)"}}>{timeLeft}s</span></div>
        </div>
      </div>

      {/* Game area */}
      <div ref={areaRef} onClick={missClick} style={{
        position:"relative", width:"100%", paddingBottom:"85%",
        background:"linear-gradient(135deg,#0f1a0f,#0a140a)",
        border:"2px solid #4ade8030", borderRadius:20,
        overflow:"hidden", cursor:"crosshair",
        boxShadow:"0 0 30px #00000060"
      }}>
        {/* Splats */}
        {splats.map(s=>(
          <div key={s.id} style={{position:"absolute",left:`${s.x}%`,top:`${s.y}%`,fontSize:20,transform:"translate(-50%,-50%)",opacity:0.4,pointerEvents:"none",filter:"blur(1px)"}}>💥</div>
        ))}

        {/* Flies */}
        {flies.map(f=>(
          <div key={f.id} onClick={(e)=>hitFly(e,f.id,f.x,f.y)}
            style={{
              position:"absolute", left:`${f.x}%`, top:`${f.y}%`,
              fontSize:f.size, transform:`translate(-50%,-50%) rotate(${f.rotation}deg)`,
              cursor:"pointer", userSelect:"none", transition:"left 0.05s, top 0.05s",
              filter:"drop-shadow(0 0 4px #00ff0060)",
              zIndex:10,
            }}>
            {f.emoji}
          </div>
        ))}

        {/* Floating message */}
        {msg && (
          <div style={{
            position:"absolute", left:`${msgPos.x}%`, top:`${msgPos.y}%`,
            transform:"translate(-50%,-50%)", color:msgColor,
            fontWeight:900, fontSize:16, fontFamily:"'Nunito',sans-serif",
            pointerEvents:"none", zIndex:20, whiteSpace:"nowrap",
            textShadow:`0 0 10px ${msgColor}`,
            animation:"fadeIn 0.1s ease",
          }}>{msg}</div>
        )}

        {/* Overlay — idle/gameover */}
        {!gameActive && (
          <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"#0a140aee",gap:12,zIndex:30}}>
            {gameOver ? (
              <>
                <div style={{fontSize:40}}>🪰</div>
                <div style={{fontSize:24,fontWeight:900,color:"var(--text)"}}>Bitti! 💀</div>
                <div style={{fontSize:14,color:"var(--muted)",textAlign:"center",lineHeight:1.8}}>
                  {score} puan — {score/10|0} sinek ezildi<br/>
                  Kaçan: {missed} sinek 😤<br/>
                  İsabet: %{accuracy}
                  {score>=highScore&&score>0&&<div style={{color:"#f5c842",fontWeight:800,marginTop:4}}>🏆 YENİ REKOR!</div>}
                </div>
                <button className="game-start-btn" style={{background:"linear-gradient(135deg,#4ade80,#22c55e)",color:"#000"}} onClick={startGame}>🪰 Tekrar Oyna</button>
              </>
            ):(
              <>
                <div style={{fontSize:48,animation:"bounce 1s infinite"}}>🪰</div>
                <div style={{fontSize:22,fontWeight:900,color:"var(--text)"}}>Sinek Vur!</div>
                <div style={{fontSize:13,color:"var(--muted)",textAlign:"center",lineHeight:1.8}}>
                  30 saniyede mümkün olduğunca<br/>
                  fazla sineği ez! 🪰💀<br/>
                  <span style={{fontSize:11}}>Kaçırırsan onlar güler 😂</span>
                </div>
                <button className="game-start-btn" style={{background:"linear-gradient(135deg,#4ade80,#22c55e)",color:"#000"}} onClick={startGame}>🪰 Başlat!</button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Stats */}
      {gameActive && (
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
          <div className="water-stat"><div className="water-stat-num" style={{color:"#4ade80"}}>{score/10|0}</div><div className="water-stat-label">sinek ezildi</div></div>
          <div className="water-stat"><div className="water-stat-num" style={{color:"#f87171"}}>{missed}</div><div className="water-stat-label">kaçan sinek</div></div>
          <div className="water-stat"><div className="water-stat-num" style={{color:"#f5c842"}}>{accuracy}%</div><div className="water-stat-label">isabet</div></div>
        </div>
      )}

      {!gameActive&&!gameOver&&(
        <div style={{textAlign:"center",fontSize:12,color:"var(--muted)",lineHeight:1.8}}>
          🪰 Sinekler kaçar 🦟 Sivrisinekler de var<br/>
          🐛 Tırtıl ve 🐜 karınca bonus!
        </div>
      )}
    </div>
  );
}

// ── GÖREV RULET ────────────────────────────────────────────────────────────
function RuletPage() {
  const [spinning, setSpinning] = useState(false);
  const [results, setResults] = useState([]);
  const [done, setDone] = useState({});
  const [wheelEmoji, setWheelEmoji] = useState("🎰");
  const EMOJIS = ["🎯","🌀","⚡","🔮","🎲","🌟","💥","🎪"];

  const spin = () => {
    if (spinning) return;
    SFX.ruletSpin(); setSpinning(true);
    setResults([]);
    setDone({});
    let i = 0;
    const interval = setInterval(() => {
      setWheelEmoji(EMOJIS[i % EMOJIS.length]);
      i++;
    }, 100);
    setTimeout(() => {
      clearInterval(interval);
      setWheelEmoji("🎯"); SFX.ruletResult();
      const shuffled = [...RULET_HAVUZU].sort(() => Math.random() - 0.5);
      const picked = shuffled.slice(0, 3);
      setResults(picked);
      setSpinning(false);
    }, 2000);
  };

  const toggleDone = (i) => setDone(d => ({ ...d, [i]: !d[i] }));
  const allDone = results.length > 0 && results.every((_, i) => done[i]);

  return (
    <div className="rulet-page">
      {allDone && <div className="confetti-wrap"><div className="confetti-msg">🎰</div><Confetti /></div>}
      <div className="rulet-hero">
        <div className={`rulet-wheel ${spinning ? "spinning" : ""}`}>{wheelEmoji}</div>
        <div style={{fontSize:22,fontWeight:900,color:"var(--text)"}}>Görev Rulet</div>
        <div style={{fontSize:14,color:"var(--muted)",lineHeight:1.6}}>Ne yapacağını bilemiyorsun?<br/>Rulet karar versin! 🎲</div>
        <button className="rulet-btn" onClick={spin} disabled={spinning}>
          {spinning ? "Dönüyor... 🌀" : "🎰 Çevir!"}
        </button>
      </div>

      {results.length > 0 && (
        <div className="card">
          <div className="card-label">
            <span>Bugünkü Görevlerin</span>
            {allDone && <span style={{color:"#4ade80",fontSize:11}}>Hepsi tamam! 🎉</span>}
          </div>
          <div className="rulet-results">
            {results.map((task, i) => (
              <div key={i} className={`rulet-task ${done[i] ? "done" : ""}`} onClick={() => toggleDone(i)}>
                <div className="rulet-task-check">{done[i] ? "✓" : ""}</div>
                <div className="rulet-task-text">{task}</div>
              </div>
            ))}
          </div>
          <div className="rulet-hint" style={{marginTop:12}}>Tıklayarak tamamlandı olarak işaretle 👆</div>
        </div>
      )}

      {results.length === 0 && !spinning && (
        <div className="card">
          <div style={{textAlign:"center",padding:"20px 0",color:"var(--muted)",fontSize:14,lineHeight:2}}>
            Butona bas, rulet 3 görev seçsin!<br/>
            <span style={{fontSize:24}}>🎯 🎲 🌟</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── MÜZİK KEŞİF ────────────────────────────────────────────────────────────
const GENRE_CHIPS = [
  {label:"🎲 Random",value:""},
  {label:"🎸 Rock",value:"rock veya alternative"},
  {label:"🎹 Electronic",value:"electronic veya synthwave"},
  {label:"🎷 Jazz",value:"jazz veya soul"},
  {label:"🎤 Hip-hop",value:"hip-hop veya R&B"},
  {label:"🌍 Dünya",value:"world music veya Latin"},
  {label:"🎻 Klasik",value:"klasik müzik"},
  {label:"🌊 Ambient",value:"ambient veya chillout"},
  {label:"🤘 Metal",value:"metal veya punk"},
  {label:"🎵 Indie",value:"indie veya folk"},
  {label:"💃 Pop",value:"pop veya disco"},
  {label:"🎬 Sinema",value:"film müziği"},
];

function MusicPage() {
  const [loading, setLoading] = useState(false);
  const [song, setSong] = useState(null);
  const [history, setHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem("gl_music_history") || "[]"); } catch { return []; }
  });
  const [playing, setPlaying] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState(GENRE_CHIPS[0]);

  useEffect(() => {
    try { localStorage.setItem("gl_music_history", JSON.stringify(history.slice(0, 20))); } catch {}
  }, [history]);

  const discover = async (chip) => {
    const genre = chip || selectedGenre;
    setLoading(true); setPlaying(false); setSong(null);
    const recentNames = history.slice(0, 5).map(h => h.name).join(", ");
    const genreText = genre.value || "her türden rastgele";
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${import.meta.env.VITE_GROQ_API_KEY}` },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          max_tokens: 400,
          messages: [
            {
              role: "system",
              content: "You are a music expert. Always respond with ONLY a valid JSON object, no markdown, no explanation. Start with { and end with }."
            },
            {
              role: "user",
              content: `Recommend a lesser-known but great song in the genre: ${genreText}. ${recentNames ? "Do not recommend these again: " + recentNames + "." : ""} Respond ONLY with this JSON (all text fields in Turkish): {"name":"song title","artist":"artist name","year":"release year","genre":"genre","emoji":"one emoji","why":"why listen (turkish, 2 sentences)","vibe":"when to listen (turkish, 1 sentence)"}`
            }
          ]
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      const raw = data.choices?.[0]?.message?.content || "";
      const first = raw.indexOf("{");
      const last = raw.lastIndexOf("}");
      if (first === -1 || last === -1) throw new Error("no json");
      const parsed = JSON.parse(raw.slice(first, last + 1));
      if (!parsed.name || !parsed.artist) throw new Error("missing fields");
      SFX.musicDiscover();
      setSong(parsed); setPlaying(true);
      setHistory(h => [parsed, ...h.filter(x => x.name !== parsed.name)].slice(0, 20));
    } catch(err) {
      console.error("Music error:", err);
      setSong({ name: "Bir hata oluştu", artist: "Tekrar dene 🔄", year: "", genre: genreText, emoji: "😅", why: "Groq API şu an yanıt vermedi.", vibe: "Butona tekrar bas!" });
    }
    setLoading(false);
  };

  const handleRandom = () => {
    const r = GENRE_CHIPS[1 + Math.floor(Math.random() * (GENRE_CHIPS.length - 1))];
    setSelectedGenre(r);
    discover(r);
  };

  const spotifySearch = song ? `https://open.spotify.com/search/${encodeURIComponent((song.name||"") + " " + (song.artist||""))}` : "#";
  const ytSearch = song ? `https://www.youtube.com/results?search_query=${encodeURIComponent((song.name||"") + " " + (song.artist||""))}` : "#";

  return (
    <div className="music-page">
      {/* Genre chips */}
      <div className="card">
        <div className="card-label">Tür Seç</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:7}}>
          {GENRE_CHIPS.map(g => (
            <button key={g.label} onClick={()=>setSelectedGenre(g)}
              style={{
                padding:"7px 13px", borderRadius:20, border:"1.5px solid",
                borderColor: selectedGenre.label===g.label ? "#f0abfc" : "var(--border)",
                background: selectedGenre.label===g.label ? "#f0abfc20" : "transparent",
                color: selectedGenre.label===g.label ? "#f0abfc" : "var(--muted)",
                fontFamily:"Nunito,sans-serif", fontWeight:700, fontSize:12,
                cursor:"pointer", transition:"all 0.15s",
              }}>
              {g.label}
            </button>
          ))}
        </div>
      </div>

      {/* Song card */}
      {song ? (
        <div className="music-hero">
          <div className={`vinyl ${playing?"spinning":""}`}>
            <span style={{fontSize:36,zIndex:1}}>{song.emoji}</span>
            <div className="vinyl-center"/>
          </div>
          <div className="music-title">{song.name}</div>
          <div className="music-artist">{song.artist}</div>
          <div className="music-meta">
            {song.year&&<span className="music-tag">📅 {song.year}</span>}
            {song.genre&&<span className="music-tag">🎵 {song.genre}</span>}
          </div>
          <div className="music-desc">{song.why}</div>
          {song.vibe&&<div className="music-vibe">"{song.vibe}"</div>}
        </div>
      ) : (
        <div className="card">
          <div className="music-empty">
            <div style={{fontSize:48,marginBottom:12}}>🎵</div>
            <div style={{fontSize:16,fontWeight:800,color:"var(--text)",marginBottom:8}}>Müzik Keşfet</div>
            Tür seç ve keşfet butonuna bas,<br/>AI sana özel bir şarkı önersin!<br/>
            <span style={{fontSize:11,color:"var(--muted)"}}>Sürprizler seni bekliyor 🎲</span>
          </div>
        </div>
      )}

      {/* Buttons */}
      <div style={{display:"flex",gap:10}}>
        <button className="music-discover-btn" onClick={()=>discover()} disabled={loading} style={{flex:1}}>
          <span style={{fontSize:20}}>{loading?"⏳":"✨"}</span>
          {loading ? "Aranıyor..." : song ? "Başka öner!" : "Keşfet!"}
        </button>
        <button onClick={handleRandom} disabled={loading} title="Tamamen random!"
          style={{padding:"0 20px",borderRadius:16,border:"1.5px solid #f5c84240",background:"#f5c84215",color:"#f5c842",fontFamily:"Nunito,sans-serif",fontWeight:900,fontSize:22,cursor:"pointer",transition:"all 0.15s",flexShrink:0}}>
          🎲
        </button>
      </div>

      {song&&(
        <div className="music-links">
          <a className="music-link spotify" href={spotifySearch} target="_blank" rel="noreferrer">🎧 Spotify</a>
          <a className="music-link yt" href={ytSearch} target="_blank" rel="noreferrer">▶️ YouTube</a>
        </div>
      )}

      {history.length > 1 && (
        <div className="card">
          <div className="card-label">Geçmiş Öneriler</div>
          <div className="music-history">
            {history.slice(1, 8).map((h, i) => (
              <div key={i} className="music-history-item">
                <span className="music-history-emoji">{h.emoji}</span>
                <div className="music-history-info">
                  <div className="music-history-name">{h.name}</div>
                  <div className="music-history-artist">{h.artist}{h.year&&` · ${h.year}`}{h.genre&&` · ${h.genre}`}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


// ── MAIN APP ───────────────────────────────────────────────────────────────
export default function App() {
  const today = new Date().toLocaleDateString("tr-TR", { weekday:"long", day:"numeric", month:"long" });
  const [page, setPage] = useState("home");
  const [mood, setMood] = useState(null);
  const [aiMsg, setAiMsg] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [permanentTasks, setPermanentTasks] = useState(() => { try { return JSON.parse(localStorage.getItem("gl_permanent")||"[]"); } catch { return []; } });
  const [newPermInput, setNewPermInput] = useState("");
  const [dailyTasks, setDailyTasks] = useState(() => {
    try { const s=JSON.parse(localStorage.getItem("gl_daily")||"{}"); return s.date===TODAY_KEY?s.tasks:[{id:1,text:"",done:false},{id:2,text:"",done:false},{id:3,text:"",done:false}]; }
    catch { return [{id:1,text:"",done:false},{id:2,text:"",done:false},{id:3,text:"",done:false}]; }
  });
  const [permDone, setPermDone] = useState(() => { try { const s=JSON.parse(localStorage.getItem("gl_perm_done")||"{}"); return s.date===TODAY_KEY?(s.done||{}):{} } catch { return {}; } });
  const [showConfetti, setShowConfetti] = useState(false);
  const [confettiShown, setConfettiShown] = useState(false);
  const [newDailyInput, setNewDailyInput] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatRef = useRef(null);

  useEffect(() => { try { localStorage.setItem("gl_permanent", JSON.stringify(permanentTasks)); } catch {} }, [permanentTasks]);
  useEffect(() => { try { localStorage.setItem("gl_daily", JSON.stringify({ date:TODAY_KEY, tasks:dailyTasks })); } catch {} }, [dailyTasks]);
  useEffect(() => { try { localStorage.setItem("gl_perm_done", JSON.stringify({ date:TODAY_KEY, done:permDone })); } catch {} }, [permDone]);
  useEffect(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }, [chatMessages]);
  useEffect(() => {
    const fd=dailyTasks.filter(t=>t.text.trim());
    if(fd.length>0&&fd.every(t=>t.done)&&(permanentTasks.length===0||permanentTasks.every(t=>permDone[t.id]))&&!confettiShown){
      SFX.allDone(); setShowConfetti(true); setConfettiShown(true); setTimeout(()=>setShowConfetti(false),4000);
    }
  }, [dailyTasks,permDone,permanentTasks,confettiShown]);

  const selectMood = async (m) => {
    SFX.moodSelect(MOODS.indexOf(m)); setMood(m); setAiLoading(true); setAiMsg("");
    try { const text=await callAI([{role:"user",content:`Kullanıcı sabah "${m.label}" hissediyor (${m.desc}). Bu ruh haline uygun kısa, samimi ve biraz eğlenceli bir şekilde karşıla. Türkçe, 2-3 cümle.`}],"Sen günlük bir yaşam koçusun. Sıcak ve pozitif."); setAiMsg(text); }
    catch { setAiMsg("Bugün de harikasın! 💪"); }
    setAiLoading(false);
  };

  const addPermanent=()=>{ if(!newPermInput.trim())return; SFX.addTask(); setPermanentTasks(p=>[...p,{id:Date.now(),text:newPermInput.trim()}]); setNewPermInput(""); };
  const removePermanent=(id)=>{ setPermanentTasks(p=>p.filter(t=>t.id!==id)); setPermDone(p=>{const n={...p};delete n[id];return n;}); };
  const togglePerm=(id)=>{ SFX.taskDone(); setPermDone(p=>({...p,[id]:!p[id]})); };
  const updateDaily=(id,text)=>setDailyTasks(p=>p.map(t=>t.id===id?{...t,text}:t));
  const toggleDaily=(id)=>{ SFX.taskDone(); setDailyTasks(p=>p.map(t=>t.id===id?{...t,done:!t.done}:t)); };
  const addDailyTask=()=>{ if(!newDailyInput.trim())return; SFX.addTask(); setDailyTasks(p=>[...p,{id:Date.now(),text:newDailyInput.trim(),done:false}]); setNewDailyInput(""); };
  const removeDaily=(id)=>setDailyTasks(p=>p.filter(t=>t.id!==id));
  const resetDaily=()=>{ setDailyTasks([{id:1,text:"",done:false},{id:2,text:"",done:false},{id:3,text:"",done:false}]); setConfettiShown(false); };

  const fd=dailyTasks.filter(t=>t.text.trim());
  const totalAll=fd.length+permanentTasks.length;
  const doneAll=fd.filter(t=>t.done).length+permanentTasks.filter(t=>permDone[t.id]).length;

  const sendChat=async()=>{ if(!chatInput.trim()||chatLoading)return; const msg=chatInput.trim(); setChatInput(""); setChatMessages(p=>[...p,{role:"user",content:msg}]); setChatLoading(true); try { const text=await callAI([...chatMessages,{role:"user",content:msg}],`Günlük koçsun. Ruh hali:${mood?.label||"?"} Türkçe, kısa.`); setChatMessages(p=>[...p,{role:"assistant",content:text}]); } catch { setChatMessages(p=>[...p,{role:"assistant",content:"Hata oluştu!"}]); } setChatLoading(false); };

  const waterG=()=>{ try { const s=JSON.parse(localStorage.getItem("gl_water")||"{}"); return s.date===TODAY_KEY?(s.glasses||0):0; } catch { return 0; } };

  return (
    <>
      <style>{css}</style>
      {showConfetti && <div className="confetti-wrap"><div className="confetti-msg">🎉</div><Confetti /></div>}
      <div className="app">
        <div className="header">
          <div className="logo">günlük<span>.</span></div>
          <div className="date">{today}</div>
        </div>

        <div className="nav">
          <button className={`nav-btn ${page==="home"?"active":""}`} onClick={()=>{ SFX.navClick(); setPage("home"); }}>✅ Görev</button>
          <button className={`nav-btn ${page==="water"?"water-active":""}`} onClick={()=>{ SFX.navClick(); setPage("water"); }}>💧 Su</button>
          <button className={`nav-btn ${page==="rulet"?"active":""}`} onClick={()=>{ SFX.navClick(); setPage("rulet"); }}>🎰 Rulet</button>
          <button className={`nav-btn ${page==="music"?"music-active":""}`} onClick={()=>{ SFX.navClick(); setPage("music"); }}>🎵 Müzik</button>
          <button className={`nav-btn ${page==="fly"?"active":""}`} onClick={()=>{ SFX.navClick(); setPage("fly"); }} style={page==="fly"?{background:"#4ade8020",color:"#4ade80"}:{}}>🪰 Sinek</button>
        </div>

        {page==="home" && (
          <>
            <div className="card">
              <div className="card-label">Bugün nasıl hissediyorsun?</div>
              <div className="mood-grid">
                {MOODS.map(m=>(
                  <button key={m.label} className={`mood-btn ${mood?.label===m.label?"selected":""}`}
                    style={{color:m.color,borderColor:mood?.label===m.label?m.color:undefined,background:mood?.label===m.label?m.bg:undefined}}
                    onClick={()=>selectMood(m)}>
                    <span className="mood-emoji">{m.emoji}</span>
                    <span className="mood-label">{m.label}</span>
                    <span className="mood-desc">{m.desc}</span>
                  </button>
                ))}
              </div>
            </div>
            {mood&&<div className="ai-bubble"><span className="ai-tag">✦ AI KOÇUN</span>{aiLoading?<div className="typing"><div className="dot"/><div className="dot"/><div className="dot"/></div>:aiMsg}</div>}
            <div className="card">
              <div className="card-label"><span>Daimi Görevler</span><span style={{fontSize:10,color:"#6b6b9a"}}>Her gün</span></div>
              {permanentTasks.length>0&&<div className="tasks-list" style={{marginBottom:12}}>{permanentTasks.map(t=><div key={t.id} className={`task-item ${permDone[t.id]?"done":""}`}><button className="task-check" onClick={()=>togglePerm(t.id)}>{permDone[t.id]?"✓":""}</button><span className="task-input" style={{cursor:"default"}}>{t.text}</span><button className="remove-btn" onClick={()=>removePermanent(t.id)}>×</button></div>)}</div>}
              <div className="add-row"><input className="add-input" value={newPermInput} onChange={e=>setNewPermInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addPermanent()} placeholder="Yeni daimi görev..."/><button className="add-btn" onClick={addPermanent} disabled={!newPermInput.trim()}>+ Ekle</button></div>
            </div>
            <div className="card">
              <div className="card-label"><span>Bugünün Görevleri</span><button className="reset-btn" onClick={resetDaily}>Sıfırla</button></div>
              <div className="tasks-list">
                {dailyTasks.map((t,i)=>(
                  <div key={t.id} className={`task-item ${t.done?"done":""}`}>
                    <span className="task-num">{i+1}.</span>
                    <input className="task-input" value={t.text} onChange={e=>updateDaily(t.id,e.target.value)} placeholder={["En önemli görevin...","İkinci görevin...","Üçüncü görevin..."][i]||"Görev ekle..."} disabled={t.done}/>
                    {t.text.trim()&&<><button className="task-check" onClick={()=>toggleDaily(t.id)}>{t.done?"✓":""}</button><button className="remove-btn" onClick={()=>removeDaily(t.id)}>×</button></>}
                  </div>
                ))}
              </div>
              <div className="add-row" style={{marginTop:10}}><input className="add-input" value={newDailyInput} onChange={e=>setNewDailyInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addDailyTask()} placeholder="Ekstra görev..."/><button className="add-btn" onClick={addDailyTask} disabled={!newDailyInput.trim()}>+ Ekle</button></div>
              {totalAll>0&&<div className="progress-row"><div className="progress-bar"><div className="progress-fill" style={{width:`${(doneAll/totalAll)*100}%`}}/></div><div className="progress-text">{doneAll}/{totalAll}</div></div>}
            </div>
            {mood&&<div className="card">
              <div className="card-label">Koçunla Konuş</div>
              {chatMessages.length>0&&<div className="chat-messages" ref={chatRef}>{chatMessages.map((m,i)=><div key={i} className={`chat-msg ${m.role==="user"?"user":"ai"}`}><div className="chat-bubble">{m.content}</div></div>)}{chatLoading&&<div className="chat-msg ai"><div className="chat-bubble"><div className="typing"><div className="dot"/><div className="dot"/><div className="dot"/></div></div></div>}</div>}
              <div className="chat-row"><textarea className="chat-field" rows={2} value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&(e.preventDefault(),sendChat())} placeholder="Bir şey sor..."/><button className="send-btn" onClick={sendChat} disabled={chatLoading||!chatInput.trim()}>Gönder →</button></div>
            </div>}
          </>
        )}
        {page==="water"&&<WaterPage/>}
        {page==="rulet"&&<RuletPage/>}
        {page==="music"&&<MusicPage/>}
        
        {page==="fly"&&<FlyPage/>}
      </div>
    </>
  );
}
