import { useState, useRef, useEffect, useCallback } from "react";

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
  { emoji: "🌟", label: "Harika", color: "#f5c842", bg: "#f5c84220" },
  { emoji: "😊", label: "İyi", color: "#4ade80", bg: "#4ade8020" },
  { emoji: "😐", label: "Eh işte", color: "#60a5fa", bg: "#60a5fa20" },
  { emoji: "😔", label: "Kötü", color: "#f87171", bg: "#f8717120" },
  { emoji: "🔥", label: "Enerjik", color: "#fb923c", bg: "#fb923c20" },
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
.nav-btn.game-active{background:#f5c84220;color:#f5c842}
.nav-btn.music-active{background:#f0abfc20;color:#f0abfc}
.card{background:var(--card);border:1px solid var(--border);border-radius:20px;padding:20px}
.card-label{font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--muted);margin-bottom:14px;display:flex;align-items:center;justify-content:space-between}
.mood-grid{display:flex;gap:8px;flex-wrap:wrap}
.mood-btn{flex:1;min-width:70px;padding:10px 6px;border-radius:14px;border:1.5px solid var(--border);background:transparent;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:4px;transition:all 0.2s;font-family:'Nunito',sans-serif}
.mood-btn:hover{transform:translateY(-2px)}
.mood-emoji{font-size:22px}
.mood-label{font-size:11px;font-weight:700;color:var(--muted)}
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

/* GAME */
.game-page{display:flex;flex-direction:column;gap:16px;animation:fadeIn 0.4s ease;align-items:center}
.game-header{width:100%;display:flex;align-items:center;justify-content:space-between}
.game-title{font-size:22px;font-weight:900;color:var(--text)}
.game-title span{color:#f5c842}
.game-scores{display:flex;gap:12px}
.score-chip{background:var(--card);border:1px solid var(--border);border-radius:10px;padding:6px 14px;font-family:'Space Mono',monospace;font-size:12px;color:var(--muted);display:flex;flex-direction:column;align-items:center;gap:1px}
.score-chip span{color:var(--text);font-size:16px;font-weight:700}
.game-canvas-wrap{position:relative;border-radius:16px;overflow:hidden;border:2px solid var(--border);box-shadow:0 0 30px #00000060}
canvas{display:block}
.game-overlay{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#0f0f1aee;gap:12px}
.overlay-title{font-size:32px;font-weight:900;color:var(--text)}
.overlay-sub{font-size:14px;color:var(--muted);text-align:center;line-height:1.6}
.overlay-score{font-family:'Space Mono',monospace;font-size:18px;color:#f5c842}
.game-start-btn{background:linear-gradient(135deg,#f5c842,#fb923c);border:none;border-radius:14px;padding:14px 32px;color:#000;font-family:'Nunito',sans-serif;font-weight:900;font-size:16px;cursor:pointer;transition:all 0.2s;box-shadow:0 4px 20px #f5c84240}
.game-start-btn:hover{transform:translateY(-2px)}
.game-controls{display:flex;gap:10px;width:100%}
.ctrl-btn{flex:1;padding:14px;background:var(--card);border:1px solid var(--border);border-radius:14px;color:var(--text);font-size:22px;cursor:pointer;transition:all 0.15s;font-family:'Nunito',sans-serif;font-weight:900;user-select:none}
.ctrl-btn:active{background:#ffffff15;transform:scale(0.96)}
.lives{display:flex;gap:4px}
.life{font-size:14px}.life.lost{opacity:0.2}

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
    if (glasses >= WATER_GOAL && !goalShown) { setWConfetti(true); setGoalShown(true); setTimeout(() => setWConfetti(false), 4000); }
  }, [glasses, goalShown]);
  const addGlass = () => {
    if (glasses >= WATER_GOAL) return;
    setGlasses(g => g+1);
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

// ── BRICK BREAKER ──────────────────────────────────────────────────────────
const CW=360,CH=480,PAD_W=70,PAD_H=10,PAD_Y=CH-30,BALL_R=8;
const BRICK_COLS=8,BRICK_ROWS=5,BRICK_W=38,BRICK_H=14,BRICK_PAD=4;
const BRICK_OX=(CW-(BRICK_COLS*(BRICK_W+BRICK_PAD)-BRICK_PAD))/2,BRICK_OY=30;
const BRICK_COLORS=["#f87171","#fb923c","#f5c842","#4ade80","#38bdf8"];
const makeBricks=()=>{const b=[];for(let r=0;r<BRICK_ROWS;r++)for(let c=0;c<BRICK_COLS;c++)b.push({r,c,alive:true,color:BRICK_COLORS[r%BRICK_COLORS.length]});return b;};

function GamePage() {
  const canvasRef = useRef(null);
  const stateRef = useRef({ status:"idle", padX:CW/2-PAD_W/2, ball:{x:CW/2,y:PAD_Y-BALL_R-1,vx:3,vy:-4}, bricks:makeBricks(), score:0, lives:3, highScore:parseInt(localStorage.getItem("gl_hs")||"0") });
  const animRef = useRef(null);
  const [display, setDisplay] = useState({ status:"idle", score:0, lives:3, highScore:parseInt(localStorage.getItem("gl_hs")||"0") });
  const keysRef = useRef({});

  const rr = (ctx,x,y,w,h,r) => { ctx.beginPath(); ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.arcTo(x+w,y,x+w,y+r,r); ctx.lineTo(x+w,y+h-r); ctx.arcTo(x+w,y+h,x+w-r,y+h,r); ctx.lineTo(x+r,y+h); ctx.arcTo(x,y+h,x,y+h-r,r); ctx.lineTo(x,y+r); ctx.arcTo(x,y,x+r,y,r); ctx.closePath(); };

  const draw = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); const s = stateRef.current;
    ctx.fillStyle="#0f0f1a"; ctx.fillRect(0,0,CW,CH);
    ctx.strokeStyle="#ffffff05"; ctx.lineWidth=1;
    for(let x=0;x<CW;x+=20){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,CH);ctx.stroke();}
    for(let y=0;y<CH;y+=20){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(CW,y);ctx.stroke();}
    s.bricks.forEach(b => { if(!b.alive)return; const x=BRICK_OX+b.c*(BRICK_W+BRICK_PAD),y=BRICK_OY+b.r*(BRICK_H+BRICK_PAD); ctx.fillStyle=b.color; ctx.shadowColor=b.color; ctx.shadowBlur=6; rr(ctx,x,y,BRICK_W,BRICK_H,4); ctx.fill(); ctx.shadowBlur=0; });
    const g=ctx.createLinearGradient(s.padX,0,s.padX+PAD_W,0); g.addColorStop(0,"#a78bfa"); g.addColorStop(1,"#c4b5fd"); ctx.fillStyle=g; ctx.shadowColor="#a78bfa"; ctx.shadowBlur=12; rr(ctx,s.padX,PAD_Y,PAD_W,PAD_H,5); ctx.fill(); ctx.shadowBlur=0;
    ctx.beginPath(); ctx.arc(s.ball.x,s.ball.y,BALL_R,0,Math.PI*2); ctx.fillStyle="#f0f0ff"; ctx.shadowColor="#ffffff"; ctx.shadowBlur=14; ctx.fill(); ctx.shadowBlur=0;
  }, []);

  const update = useCallback(() => {
    const s = stateRef.current; if(s.status!=="playing")return;
    if(keysRef.current["ArrowLeft"]||keysRef.current["a"])s.padX=Math.max(0,s.padX-6);
    if(keysRef.current["ArrowRight"]||keysRef.current["d"])s.padX=Math.min(CW-PAD_W,s.padX+6);
    s.ball.x+=s.ball.vx; s.ball.y+=s.ball.vy;
    if(s.ball.x<=BALL_R||s.ball.x>=CW-BALL_R)s.ball.vx*=-1;
    if(s.ball.y<=BALL_R)s.ball.vy*=-1;
    if(s.ball.y+BALL_R>=PAD_Y&&s.ball.y-BALL_R<=PAD_Y+PAD_H&&s.ball.x>=s.padX&&s.ball.x<=s.padX+PAD_W){const hit=(s.ball.x-s.padX)/PAD_W;const angle=(hit-0.5)*2.4;const spd=Math.sqrt(s.ball.vx**2+s.ball.vy**2);s.ball.vx=spd*Math.sin(angle);s.ball.vy=-Math.abs(spd*Math.cos(angle));}
    if(s.ball.y>CH+BALL_R){s.lives-=1;if(s.lives<=0){s.status="lost";if(s.score>s.highScore){s.highScore=s.score;localStorage.setItem("gl_hs",s.score);}setDisplay(d=>({...d,status:"lost",lives:0,score:s.score,highScore:s.highScore}));return;}s.ball={x:CW/2,y:PAD_Y-BALL_R-1,vx:3*(Math.random()>0.5?1:-1),vy:-4};setDisplay(d=>({...d,lives:s.lives}));}
    s.bricks.forEach(b=>{if(!b.alive)return;const bx=BRICK_OX+b.c*(BRICK_W+BRICK_PAD),by=BRICK_OY+b.r*(BRICK_H+BRICK_PAD);if(s.ball.x+BALL_R>bx&&s.ball.x-BALL_R<bx+BRICK_W&&s.ball.y+BALL_R>by&&s.ball.y-BALL_R<by+BRICK_H){b.alive=false;s.score+=10;const oL=s.ball.x+BALL_R-bx,oR=bx+BRICK_W-(s.ball.x-BALL_R),oT=s.ball.y+BALL_R-by,oB=by+BRICK_H-(s.ball.y-BALL_R);if(Math.min(oL,oR)<Math.min(oT,oB))s.ball.vx*=-1;else s.ball.vy*=-1;setDisplay(d=>({...d,score:s.score}));}});
    if(s.bricks.every(b=>!b.alive)){s.status="won";if(s.score>s.highScore){s.highScore=s.score;localStorage.setItem("gl_hs",s.score);}setDisplay(d=>({...d,status:"won",score:s.score,highScore:s.highScore}));}
  }, []);

  const loop = useCallback(() => { update(); draw(); animRef.current=requestAnimationFrame(loop); }, [update,draw]);
  const startGame = useCallback(() => { const s=stateRef.current; s.status="playing"; s.padX=CW/2-PAD_W/2; s.ball={x:CW/2,y:PAD_Y-BALL_R-1,vx:3,vy:-4}; s.bricks=makeBricks(); s.score=0; s.lives=3; setDisplay({status:"playing",score:0,lives:3,highScore:s.highScore}); if(animRef.current)cancelAnimationFrame(animRef.current); animRef.current=requestAnimationFrame(loop); }, [loop]);

  useEffect(() => {
    draw();
    const onKey=(e)=>{keysRef.current[e.key]=e.type==="keydown";};
    window.addEventListener("keydown",onKey); window.addEventListener("keyup",onKey);
    return () => { window.removeEventListener("keydown",onKey); window.removeEventListener("keyup",onKey); if(animRef.current)cancelAnimationFrame(animRef.current); };
  }, [draw]);

  const handlePointer = useCallback((e) => { const canvas=canvasRef.current; if(!canvas)return; const rect=canvas.getBoundingClientRect(); const cx=e.touches?e.touches[0].clientX:e.clientX; stateRef.current.padX=Math.max(0,Math.min(CW-PAD_W,(cx-rect.left)*(CW/rect.width)-PAD_W/2)); }, []);

  return (
    <div className="game-page">
      <div className="game-header" style={{width:"100%"}}>
        <div className="game-title">brick<span>.</span></div>
        <div className="game-scores">
          <div className="score-chip">Skor<span>{display.score}</span></div>
          <div className="score-chip">En İyi<span>{display.highScore}</span></div>
          <div className="score-chip">Can<div className="lives">{Array.from({length:3},(_,i)=><span key={i} className={`life ${i>=display.lives?"lost":""}`}>❤️</span>)}</div></div>
        </div>
      </div>
      <div className="game-canvas-wrap">
        <canvas ref={canvasRef} width={CW} height={CH} onMouseMove={handlePointer} onTouchMove={handlePointer} style={{touchAction:"none"}}/>
        {(display.status==="idle"||display.status==="lost"||display.status==="won")&&(
          <div className="game-overlay">
            <div className="overlay-title">{display.status==="idle"&&"🧱 Brick"}{display.status==="lost"&&"💀 Oyun Bitti"}{display.status==="won"&&"🏆 Kazandın!"}</div>
            {display.status!=="idle"&&<div className="overlay-score">Skor: {display.score}</div>}
            <div className="overlay-sub">{display.status==="idle"&&"Klavyeyle veya aşağıdaki butonlarla oyna!"}{display.status==="lost"&&"Daha iyi şans bir dahaki sefere 😅"}{display.status==="won"&&"Tüm tuğlaları kırdın! 🔥"}</div>
            <button className="game-start-btn" onClick={startGame}>{display.status==="idle"?"🎮 Oyunu Başlat":"🔄 Tekrar Oyna"}</button>
          </div>
        )}
      </div>
      <div className="game-controls">
        <button className="ctrl-btn" onPointerDown={()=>keysRef.current["ArrowLeft"]=true} onPointerUp={()=>keysRef.current["ArrowLeft"]=false} onPointerLeave={()=>keysRef.current["ArrowLeft"]=false}>◀</button>
        <button className="ctrl-btn" onPointerDown={()=>keysRef.current["ArrowRight"]=true} onPointerUp={()=>keysRef.current["ArrowRight"]=false} onPointerLeave={()=>keysRef.current["ArrowRight"]=false}>▶</button>
      </div>
      <div style={{fontSize:12,color:"var(--muted)",textAlign:"center"}}>🖥️ Klavye: ← → &nbsp;|&nbsp; 📱 Dokunarak veya ◀▶</div>
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
    setSpinning(true);
    setResults([]);
    setDone({});
    let i = 0;
    const interval = setInterval(() => {
      setWheelEmoji(EMOJIS[i % EMOJIS.length]);
      i++;
    }, 100);
    setTimeout(() => {
      clearInterval(interval);
      setWheelEmoji("🎯");
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
function MusicPage() {
  const [loading, setLoading] = useState(false);
  const [song, setSong] = useState(null);
  const [history, setHistory] = useState(() => { try { return JSON.parse(localStorage.getItem("gl_music_history") || "[]"); } catch { return []; } });
  const [playing, setPlaying] = useState(false);

  useEffect(() => { try { localStorage.setItem("gl_music_history", JSON.stringify(history.slice(0, 10))); } catch {} }, [history]);

  const discover = async () => {
    setLoading(true);
    setPlaying(false);
    setSong(null);
    const recentNames = history.slice(0, 5).map(h => h.name).join(", ");
    try {
      const raw = await callAI([{
        role: "user",
        content: `Bana keşfedilmeyi bekleyen, az bilinen veya unutulmuş ama harika bir şarkı öner. ${recentNames ? `Son önerilenler (bunları tekrar önerme): ${recentNames}` : ""} Her türden olabilir — rock, jazz, elektronik, soul, dünya müziği, klasik, indie, her şey. JSON formatında yanıt ver, başka hiçbir şey yazma: {"name":"şarkı adı","artist":"sanatçı","year":"yıl","genre":"tür","emoji":"tek emoji","why":"neden dinlemeli (türkçe, 2 cümle)","vibe":"bu şarkıyı hangi anda dinlemeli (türkçe, 1 cümle)"}`
      }], "Sen bir müzik uzmanısın. Sadece JSON formatında yanıt ver, başka hiçbir şey yazma.", 300);
      const clean = raw.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      setSong(parsed);
      setPlaying(true);
      setHistory(h => [parsed, ...h.filter(x => x.name !== parsed.name)].slice(0, 10));
    } catch {
      setSong({ name: "Hata oluştu", artist: "Tekrar dene", year: "", genre: "", emoji: "😅", why: "Bir şeyler ters gitti.", vibe: "Tekrar butona bas!" });
    }
    setLoading(false);
  };

  const spotifySearch = song ? `https://open.spotify.com/search/${encodeURIComponent(song.name + " " + song.artist)}` : "#";
  const ytSearch = song ? `https://www.youtube.com/results?search_query=${encodeURIComponent(song.name + " " + song.artist)}` : "#";

  return (
    <div className="music-page">
      {song ? (
        <div className="music-hero">
          <div className={`vinyl ${playing ? "spinning" : ""}`}>
            <span style={{fontSize:36,zIndex:1}}>{song.emoji}</span>
            <div className="vinyl-center"/>
          </div>
          <div className="music-title">{song.name}</div>
          <div className="music-artist">{song.artist}</div>
          <div className="music-meta">
            {song.year && <span className="music-tag">📅 {song.year}</span>}
            {song.genre && <span className="music-tag">🎵 {song.genre}</span>}
          </div>
          <div className="music-desc">{song.why}</div>
          {song.vibe && <div className="music-vibe">"{song.vibe}"</div>}
        </div>
      ) : (
        <div className="card">
          <div className="music-empty">
            <div style={{fontSize:48,marginBottom:12}}>🎵</div>
            <div style={{fontSize:16,fontWeight:800,color:"var(--text)",marginBottom:8}}>Müzik Keşfet</div>
            Butona bas, AI sana özel<br/>bir şarkı önersin!<br/>
            <span style={{fontSize:11,color:"var(--muted)"}}>Her türden sürprizler seni bekliyor 🎲</span>
          </div>
        </div>
      )}

      <button className="music-discover-btn" onClick={discover} disabled={loading}>
        <span style={{fontSize:22}}>{loading ? "🎵" : "✨"}</span>
        {loading ? "Şarkı aranıyor..." : song ? "Başka şarkı öner!" : "Şarkı keşfet!"}
      </button>

      {song && (
        <div className="music-links">
          <a className="music-link spotify" href={spotifySearch} target="_blank" rel="noreferrer">🎧 Spotify'da Aç</a>
          <a className="music-link yt" href={ytSearch} target="_blank" rel="noreferrer">▶️ YouTube'da Aç</a>
        </div>
      )}

      {history.length > 1 && (
        <div className="card">
          <div className="card-label">Geçmiş Öneriler</div>
          <div className="music-history">
            {history.slice(1, 6).map((h, i) => (
              <div key={i} className="music-history-item">
                <span className="music-history-emoji">{h.emoji}</span>
                <div className="music-history-info">
                  <div className="music-history-name">{h.name}</div>
                  <div className="music-history-artist">{h.artist} {h.year && `· ${h.year}`}</div>
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
      setShowConfetti(true); setConfettiShown(true); setTimeout(()=>setShowConfetti(false),4000);
    }
  }, [dailyTasks,permDone,permanentTasks,confettiShown]);

  const selectMood = async (m) => {
    setMood(m); setAiLoading(true); setAiMsg("");
    try { const text=await callAI([{role:"user",content:`Kullanıcı bugün "${m.label}" hissediyor. Kısa, samimi karşıla. Türkçe, 2-3 cümle.`}],"Sen günlük bir yaşam koçusun. Sıcak ve pozitif."); setAiMsg(text); }
    catch { setAiMsg("Bugün de harikasın! 💪"); }
    setAiLoading(false);
  };

  const addPermanent=()=>{ if(!newPermInput.trim())return; setPermanentTasks(p=>[...p,{id:Date.now(),text:newPermInput.trim()}]); setNewPermInput(""); };
  const removePermanent=(id)=>{ setPermanentTasks(p=>p.filter(t=>t.id!==id)); setPermDone(p=>{const n={...p};delete n[id];return n;}); };
  const togglePerm=(id)=>setPermDone(p=>({...p,[id]:!p[id]}));
  const updateDaily=(id,text)=>setDailyTasks(p=>p.map(t=>t.id===id?{...t,text}:t));
  const toggleDaily=(id)=>setDailyTasks(p=>p.map(t=>t.id===id?{...t,done:!t.done}:t));
  const addDailyTask=()=>{ if(!newDailyInput.trim())return; setDailyTasks(p=>[...p,{id:Date.now(),text:newDailyInput.trim(),done:false}]); setNewDailyInput(""); };
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
          <button className={`nav-btn ${page==="home"?"active":""}`} onClick={()=>setPage("home")}>✅ Görev</button>
          <button className={`nav-btn ${page==="water"?"water-active":""}`} onClick={()=>setPage("water")}>💧 Su</button>
          <button className={`nav-btn ${page==="rulet"?"active":""}`} onClick={()=>setPage("rulet")}>🎰 Rulet</button>
          <button className={`nav-btn ${page==="music"?"music-active":""}`} onClick={()=>setPage("music")}>🎵 Müzik</button>
          <button className={`nav-btn ${page==="game"?"game-active":""}`} onClick={()=>setPage("game")}>🎮 Oyun</button>
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
        {page==="game"&&<GamePage/>}
      </div>
    </>
  );
}
