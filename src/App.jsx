import { useState, useEffect, useRef } from "react";

const API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
const ANTHROPIC_MODEL = "claude-sonnet-4-20250514";

const callClaude = async (messages, system) => {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${API_KEY}`,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 1000,
      system,
      messages,
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.content?.map((b) => b.text || "").join("") || "";
};

const t = {
  bg: "#0a0a0f", surface: "#12121a", surfaceHover: "#1a1a26",
  border: "#1e1e2e", accent: "#7c6af7", accentGlow: "#7c6af740",
  gold: "#f5c842", goldSoft: "#f5c84220", green: "#4ade80",
  greenSoft: "#4ade8020", text: "#e8e8f0", textMuted: "#6b6b8a", textDim: "#3a3a55",
};

const GOAL_COLORS = ["#7c6af7","#f5c842","#4ade80","#f87171","#60a5fa","#fb923c","#e879f9"];
const DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

const SAMPLE_GOALS = [
  { id: 1, name: "Read 20 pages daily", category: "Learning", color: GOAL_COLORS[0], progress: 65,
    tasks: ["Read 20 pages of current book","Write a 3-sentence summary"], completedDays: [0,1,2,4] },
  { id: 2, name: "Exercise 4x per week", category: "Health", color: GOAL_COLORS[2], progress: 50,
    tasks: ["30 min workout","10 min stretch cooldown"], completedDays: [1,3] },
  { id: 3, name: "Learn Spanish", category: "Learning", color: GOAL_COLORS[5], progress: 30,
    tasks: ["Duolingo 15 min","Practice 10 new words"], completedDays: [0,2,4] },
];

const buildInitialTasks = (goals) => {
  const flat = [];
  goals.forEach(g => g.tasks.forEach((task, i) =>
    flat.push({ id: `${g.id}-${i}`, text: task, goalId: g.id, done: i === 0 && g.id === 1 })
  ));
  return flat;
};

const css = `
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@400;500&family=Inter:wght@300;400;500;600&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{background:#0a0a0f;color:#e8e8f0;font-family:'Inter',sans-serif;min-height:100vh;overflow-x:hidden}
::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:#0a0a0f}::-webkit-scrollbar-thumb{background:#1e1e2e;border-radius:4px}
.app{display:grid;grid-template-columns:260px 1fr;grid-template-rows:100vh;max-width:1400px;margin:0 auto}
.sidebar{background:#12121a;border-right:1px solid #1e1e2e;display:flex;flex-direction:column;padding:28px 20px;gap:6px;position:sticky;top:0;height:100vh;overflow-y:auto}
.logo{font-family:'DM Serif Display',serif;font-size:22px;color:#7c6af7;letter-spacing:-0.5px;margin-bottom:28px;display:flex;align-items:center;gap:10px}
.logo-dot{width:8px;height:8px;background:#f5c842;border-radius:50%;box-shadow:0 0 10px #f5c842;animation:pulse 2s infinite}
@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(.8)}}
.nav-section{font-size:10px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:#3a3a55;padding:12px 8px 6px}
.nav-btn{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;border:none;background:transparent;color:#6b6b8a;font-family:'Inter',sans-serif;font-size:13.5px;font-weight:500;cursor:pointer;width:100%;text-align:left;transition:all .15s}
.nav-btn:hover{background:#1a1a26;color:#e8e8f0}.nav-btn.active{background:#7c6af740;color:#7c6af7}
.nav-icon{font-size:16px;width:20px;text-align:center}
.goal-pill{display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:8px;font-size:12.5px;color:#6b6b8a;cursor:pointer;transition:all .15s;border:none;background:transparent;width:100%;text-align:left}
.goal-pill:hover{background:#1a1a26;color:#e8e8f0}
.goal-dot{width:6px;height:6px;border-radius:50%;flex-shrink:0}
.streak-badge{margin-top:auto;background:#f5c84220;border:1px solid #f5c84230;border-radius:12px;padding:14px 16px;display:flex;align-items:center;gap:12px}
.streak-num{font-family:'DM Serif Display',serif;font-size:32px;color:#f5c842;line-height:1}
.streak-label{font-size:12px;color:#6b6b8a;line-height:1.4}
.main{display:flex;flex-direction:column;overflow-y:auto;height:100vh}
.topbar{position:sticky;top:0;background:#0a0a0fdd;backdrop-filter:blur(12px);border-bottom:1px solid #1e1e2e;padding:16px 32px;display:flex;align-items:center;justify-content:space-between;z-index:10}
.page-title{font-family:'DM Serif Display',serif;font-size:24px;color:#e8e8f0;letter-spacing:-0.5px}
.date-chip{font-family:'DM Mono',monospace;font-size:12px;color:#6b6b8a;background:#12121a;border:1px solid #1e1e2e;padding:6px 12px;border-radius:20px}
.content{padding:32px;display:flex;flex-direction:column;gap:28px;flex:1}
.card{background:#12121a;border:1px solid #1e1e2e;border-radius:16px;padding:24px}
.card-title{font-size:11px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:#6b6b8a;margin-bottom:18px}
.stats-row{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
.stat-card{background:#12121a;border:1px solid #1e1e2e;border-radius:14px;padding:20px;display:flex;flex-direction:column;gap:6px}
.stat-num{font-family:'DM Serif Display',serif;font-size:36px;line-height:1}
.stat-label{font-size:12px;color:#6b6b8a}
.goals-grid{display:flex;flex-direction:column;gap:12px}
.goal-card{background:#1a1a26;border:1px solid #1e1e2e;border-radius:12px;padding:16px 20px;display:flex;align-items:flex-start;gap:16px;transition:border-color .2s}
.goal-card:hover{border-color:#7c6af760}
.goal-color-bar{width:3px;border-radius:3px;align-self:stretch;flex-shrink:0}
.goal-info{flex:1}.goal-name{font-size:14px;font-weight:500;margin-bottom:4px}.goal-sub{font-size:12px;color:#6b6b8a;margin-bottom:10px}
.progress-bar{height:4px;background:#1e1e2e;border-radius:4px;overflow:hidden}
.progress-fill{height:100%;border-radius:4px;transition:width .6s ease}
.goal-actions{display:flex;gap:6px;margin-top:10px}
.mini-btn{font-size:11px;padding:4px 10px;border-radius:6px;border:1px solid #1e1e2e;background:transparent;color:#6b6b8a;cursor:pointer;font-family:'Inter',sans-serif;transition:all .15s}
.mini-btn:hover{background:#12121a;color:#e8e8f0}.mini-btn.primary{border-color:#7c6af760;color:#7c6af7}.mini-btn.primary:hover{background:#7c6af740}.mini-btn.success{border-color:#4ade8060;color:#4ade80}.mini-btn.success:hover{background:#4ade8020}
.task-list{display:flex;flex-direction:column;gap:8px}
.task-row{display:flex;align-items:center;gap:12px;padding:12px 16px;background:#1a1a26;border-radius:10px;border:1px solid transparent;transition:all .15s;cursor:pointer}
.task-row:hover{border-color:#1e1e2e}.task-row.done{opacity:.45}
.task-check{width:18px;height:18px;border-radius:50%;border:1.5px solid #1e1e2e;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:10px;transition:all .2s}
.task-row.done .task-check{background:#4ade80;border-color:#4ade80;color:#000}
.task-text{flex:1;font-size:13.5px}.task-row.done .task-text{text-decoration:line-through;color:#6b6b8a}
.task-tag{font-size:10px;padding:2px 8px;border-radius:20px;font-weight:500}
.chat-area{display:flex;flex-direction:column;gap:14px;max-height:380px;overflow-y:auto;margin-bottom:14px;padding-right:4px}
.msg{display:flex;gap:10px;align-items:flex-start;animation:fadeUp .3s ease}.msg.user{flex-direction:row-reverse}
@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
.msg-avatar{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;flex-shrink:0}
.msg-avatar.ai{background:#7c6af740;border:1px solid #7c6af740;color:#7c6af7}.msg-avatar.user{background:#f5c84220;border:1px solid #f5c84240;color:#f5c842}
.msg-bubble{padding:10px 14px;border-radius:12px;font-size:13.5px;line-height:1.6;max-width:82%;white-space:pre-wrap}
.msg.ai .msg-bubble{background:#1a1a26;border:1px solid #1e1e2e}.msg.user .msg-bubble{background:#7c6af740;border:1px solid #7c6af730;color:#e8e8f0}
.chat-input-row{display:flex;gap:10px}
.chat-input{flex:1;background:#1a1a26;border:1px solid #1e1e2e;border-radius:10px;padding:10px 14px;color:#e8e8f0;font-family:'Inter',sans-serif;font-size:13.5px;outline:none;transition:border-color .15s;resize:none}
.chat-input:focus{border-color:#7c6af760}.chat-input::placeholder{color:#3a3a55}
.send-btn{background:#7c6af7;border:none;border-radius:10px;padding:10px 18px;color:white;font-family:'Inter',sans-serif;font-size:13px;font-weight:600;cursor:pointer;transition:all .15s;white-space:nowrap}
.send-btn:hover{background:#9d8fff}.send-btn:disabled{opacity:.4;cursor:not-allowed}
.overlay{position:fixed;inset:0;background:#00000080;backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;z-index:100;animation:fadeIn .2s ease}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
.modal{background:#12121a;border:1px solid #1e1e2e;border-radius:20px;padding:32px;width:460px;max-width:95vw;animation:slideUp .25s ease}
@keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
.modal-title{font-family:'DM Serif Display',serif;font-size:22px;margin-bottom:6px}
.modal-sub{font-size:13px;color:#6b6b8a;margin-bottom:24px}
.field{display:flex;flex-direction:column;gap:6px;margin-bottom:16px}
.field label{font-size:12px;font-weight:600;color:#6b6b8a;letter-spacing:.5px}
.field input,.field textarea,.field select{background:#1a1a26;border:1px solid #1e1e2e;border-radius:10px;padding:10px 14px;color:#e8e8f0;font-family:'Inter',sans-serif;font-size:13.5px;outline:none;transition:border-color .15s;resize:none}
.field input:focus,.field textarea:focus,.field select:focus{border-color:#7c6af760}
.field input::placeholder,.field textarea::placeholder{color:#3a3a55}
.field select option{background:#12121a}
.modal-actions{display:flex;gap:10px;margin-top:24px}
.btn{padding:10px 20px;border-radius:10px;font-family:'Inter',sans-serif;font-size:13.5px;font-weight:600;cursor:pointer;border:none;transition:all .15s}
.btn-primary{background:#7c6af7;color:white;flex:1}.btn-primary:hover{background:#9d8fff}.btn-primary:disabled{opacity:.4;cursor:not-allowed}
.btn-ghost{background:transparent;border:1px solid #1e1e2e;color:#6b6b8a}.btn-ghost:hover{color:#e8e8f0;border-color:#e8e8f040}
.generating-hint{font-size:12px;color:#7c6af7;margin-top:10px;display:flex;align-items:center;gap:8px}
.spinner{width:12px;height:12px;border:2px solid #7c6af730;border-top-color:#7c6af7;border-radius:50%;animation:spin .7s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.week-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:8px}
.day-col{display:flex;flex-direction:column;gap:6px;align-items:center}
.day-label{font-size:10px;color:#6b6b8a;font-weight:600;letter-spacing:.5px}
.day-dot{width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;border:1.5px solid #1e1e2e}
.day-dot.today{border-color:#7c6af7;color:#7c6af7;background:#7c6af740}
.day-dot.done{background:#4ade80;border-color:#4ade80;color:#000}
.empty-state{text-align:center;padding:40px;color:#6b6b8a;font-size:14px;line-height:1.8}
.add-btn{display:inline-flex;align-items:center;gap:6px;background:#7c6af740;border:1px solid #7c6af740;border-radius:10px;color:#7c6af7;font-family:'Inter',sans-serif;font-size:13px;font-weight:600;padding:9px 16px;cursor:pointer;transition:all .15s}
.add-btn:hover{background:#7c6af725}
`;

export default function App() {
  const [page, setPage] = useState("dashboard");
  const [goals, setGoals] = useState(() => {
    try { const s = localStorage.getItem("lf_goals"); return s ? JSON.parse(s) : SAMPLE_GOALS; } catch { return SAMPLE_GOALS; }
  });
  const [tasks, setTasks] = useState(() => {
    try { const s = localStorage.getItem("lf_tasks"); return s ? JSON.parse(s) : buildInitialTasks(SAMPLE_GOALS); } catch { return buildInitialTasks(SAMPLE_GOALS); }
  });
  const [streak] = useState(7);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [messages, setMessages] = useState([
    { role: "ai", text: "Hey! I'm your LifeForge coach 🧠\n\nI can see your goals and daily progress. Tell me what's on your mind — struggling with motivation, want to restructure a goal, or just need a check-in?" }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const chatRef = useRef(null);
  const today = new Date();
  const todayIdx = (today.getDay() + 6) % 7;

  useEffect(() => { try { localStorage.setItem("lf_goals", JSON.stringify(goals)); } catch {} }, [goals]);
  useEffect(() => { try { localStorage.setItem("lf_tasks", JSON.stringify(tasks)); } catch {} }, [tasks]);
  useEffect(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }, [messages]);

  const toggleTask = (id) => setTasks(prev => prev.map(tk => tk.id === id ? { ...tk, done: !tk.done } : tk));

  const sendChat = async () => {
    if (!chatInput.trim() || aiLoading) return;
    const userMsg = chatInput.trim();
    setChatInput("");
    setMessages(prev => [...prev, { role: "user", text: userMsg }]);
    setAiLoading(true);
    const goalSummary = goals.map(g => `- ${g.name} (${g.category}, ${g.progress}% progress)`).join("\n");
    const doneCount = tasks.filter(tk => tk.done).length;
    const system = `You are LifeForge, an empathetic, sharp, no-fluff AI life coach.\nCurrent goals:\n${goalSummary}\nToday: ${doneCount}/${tasks.length} tasks done.\nStyle: warm but direct, concrete advice, under 120 words unless asked.`;
    const history = messages.map(m => ({ role: m.role === "ai" ? "assistant" : "user", content: m.text }));
    try {
      const text = await callClaude([...history, { role: "user", content: userMsg }], system);
      setMessages(prev => [...prev, { role: "ai", text }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: "ai", text: `Error: ${e.message}` }]);
    }
    setAiLoading(false);
  };

  const handleKeyDown = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChat(); } };
  const doneCount = tasks.filter(tk => tk.done).length;

  const AddGoalModal = () => {
    const [name, setName] = useState("");
    const [category, setCategory] = useState("Health");
    const [details, setDetails] = useState("");
    const [generating, setGenerating] = useState(false);
    const [generatedTasks, setGeneratedTasks] = useState([]);

    const generateTasks = async () => {
      if (!name.trim()) return;
      setGenerating(true);
      try {
        const raw = await callClaude([{ role: "user", content: `Generate exactly 2-3 specific daily tasks for goal: "${name}". Category: ${category}. Context: ${details || "none"}. Respond ONLY with a JSON array of strings, no other text.` }], "");
        const clean = raw.replace(/```json|```/g, "").trim();
        setGeneratedTasks(JSON.parse(clean));
      } catch { setGeneratedTasks(["Daily practice session", "Track your progress"]); }
      setGenerating(false);
    };

    const addGoal = () => {
      if (!name.trim()) return;
      const newGoal = { id: Date.now(), name, category, color: GOAL_COLORS[goals.length % GOAL_COLORS.length], progress: 0, tasks: generatedTasks.length ? generatedTasks : ["Daily action"], completedDays: [] };
      setGoals(prev => [...prev, newGoal]);
      setTasks(prev => [...prev, ...newGoal.tasks.map((tk, i) => ({ id: `${newGoal.id}-${i}`, text: tk, goalId: newGoal.id, done: false }))]);
      setShowAddGoal(false);
    };

    return (
      <div className="overlay" onClick={e => e.target === e.currentTarget && setShowAddGoal(false)}>
        <div className="modal">
          <div className="modal-title">New Goal ✦</div>
          <div className="modal-sub">Describe your goal and AI will build your daily action plan.</div>
          <div className="field"><label>GOAL NAME</label><input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Run a 5K, Learn guitar..." /></div>
          <div className="field">
            <label>CATEGORY</label>
            <select value={category} onChange={e => setCategory(e.target.value)}>
              {["Health","Learning","Career","Mindfulness","Social","Finance","Creative"].map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="field"><label>EXTRA CONTEXT (optional)</label><textarea rows={2} value={details} onChange={e => setDetails(e.target.value)} placeholder="Any constraints, current level..." /></div>
          {generatedTasks.length > 0 && (
            <div className="field">
              <label>AI-GENERATED DAILY TASKS</label>
              {generatedTasks.map((tk, i) => (
                <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 0",borderBottom:"1px solid #1e1e2e",fontSize:13}}>
                  <span style={{color:"#7c6af7"}}>✓</span> {tk}
                </div>
              ))}
            </div>
          )}
          {generating && <div className="generating-hint"><div className="spinner" /> AI is crafting your tasks...</div>}
          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={() => setShowAddGoal(false)}>Cancel</button>
            {generatedTasks.length === 0
              ? <button className="btn btn-primary" onClick={generateTasks} disabled={generating || !name.trim()}>{generating ? "Generating…" : "✦ Generate Tasks with AI"}</button>
              : <button className="btn btn-primary" onClick={addGoal}>Add Goal →</button>
            }
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <style>{css}</style>
      {showAddGoal && <AddGoalModal />}
      <div className="app">
        <aside className="sidebar">
          <div className="logo"><div className="logo-dot" />LifeForge</div>
          <div className="nav-section">Navigation</div>
          {[{id:"dashboard",icon:"⬡",label:"Dashboard"},{id:"goals",icon:"◎",label:"Goals"},{id:"today",icon:"◈",label:"Today"},{id:"coach",icon:"◉",label:"AI Coach"}].map(n => (
            <button key={n.id} className={`nav-btn ${page===n.id?"active":""}`} onClick={() => setPage(n.id)}>
              <span className="nav-icon">{n.icon}</span>{n.label}
            </button>
          ))}
          <div className="nav-section" style={{marginTop:12}}>Your Goals</div>
          {goals.map(g => (
            <button key={g.id} className="goal-pill" onClick={() => setPage("goals")}>
              <div className="goal-dot" style={{background:g.color}} />
              {g.name.length > 22 ? g.name.slice(0,22)+"…" : g.name}
            </button>
          ))}
          <div className="streak-badge">
            <div className="streak-num">{streak}</div>
            <div><div style={{fontSize:13,fontWeight:600,color:"#f5c842"}}>Day Streak 🔥</div><div className="streak-label">Keep it going!</div></div>
          </div>
        </aside>

        <main className="main">
          <div className="topbar">
            <div className="page-title">
              {page==="dashboard"&&"Overview"}{page==="goals"&&"My Goals"}{page==="today"&&"Today's Plan"}{page==="coach"&&"AI Coach"}
            </div>
            <div style={{display:"flex",gap:10,alignItems:"center"}}>
              <button className="add-btn" onClick={() => setShowAddGoal(true)}>+ New Goal</button>
              <div className="date-chip">{today.toDateString()}</div>
            </div>
          </div>

          <div className="content">
            {page==="dashboard" && (
              <>
                <div className="stats-row">
                  <div className="stat-card"><div className="stat-num" style={{color:"#7c6af7"}}>{goals.length}</div><div className="stat-label">Active Goals</div></div>
                  <div className="stat-card"><div className="stat-num" style={{color:"#4ade80"}}>{doneCount}/{tasks.length}</div><div className="stat-label">Tasks Today</div></div>
                  <div className="stat-card"><div className="stat-num" style={{color:"#f5c842"}}>{streak}</div><div className="stat-label">Day Streak</div></div>
                </div>
                <div className="card">
                  <div className="card-title">This Week</div>
                  <div className="week-grid">
                    {DAYS.map((d,i) => (
                      <div key={d} className="day-col">
                        <div className="day-label">{d}</div>
                        <div className={`day-dot ${i===todayIdx?"today":i<todayIdx?"done":""}`}>{i<todayIdx?"✓":i===todayIdx?"→":""}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="card">
                  <div className="card-title">Goals at a Glance</div>
                  <div className="goals-grid">
                    {goals.map(g => (
                      <div key={g.id} className="goal-card">
                        <div className="goal-color-bar" style={{background:g.color}} />
                        <div className="goal-info">
                          <div className="goal-name">{g.name}</div>
                          <div className="goal-sub">{g.category} · {g.progress}% this week</div>
                          <div className="progress-bar"><div className="progress-fill" style={{width:`${g.progress}%`,background:g.color}} /></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {page==="goals" && (
              goals.length===0
                ? <div className="empty-state">No goals yet.<br /><button className="add-btn" style={{marginTop:16}} onClick={() => setShowAddGoal(true)}>+ Add your first goal</button></div>
                : <div className="goals-grid">
                    {goals.map(g => (
                      <div key={g.id} className="goal-card">
                        <div className="goal-color-bar" style={{background:g.color}} />
                        <div className="goal-info">
                          <div className="goal-name">{g.name}</div>
                          <div className="goal-sub">{g.category}</div>
                          <div style={{fontSize:12,color:"#6b6b8a",marginBottom:8}}>Daily: {g.tasks.join(" · ")}</div>
                          <div className="progress-bar"><div className="progress-fill" style={{width:`${g.progress}%`,background:g.color}} /></div>
                          <div style={{fontSize:11,color:"#6b6b8a",marginTop:4}}>{g.progress}% weekly progress</div>
                          <div className="goal-actions">
                            <button className="mini-btn success" onClick={() => setGoals(prev => prev.map(x => x.id===g.id?{...x,progress:Math.min(100,x.progress+10)}:x))}>✓ Log progress</button>
                            <button className="mini-btn primary" onClick={() => setPage("coach")}>Ask coach</button>
                            <button className="mini-btn" onClick={() => { setGoals(prev => prev.filter(x => x.id!==g.id)); setTasks(prev => prev.filter(tk => tk.goalId!==g.id)); }}>Remove</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
            )}

            {page==="today" && (
              <div className="card">
                <div className="card-title">Today's Tasks — {doneCount}/{tasks.length} done</div>
                <div className="progress-bar" style={{marginBottom:20}}>
                  <div className="progress-fill" style={{width:`${tasks.length?(doneCount/tasks.length)*100:0}%`,background:"#7c6af7"}} />
                </div>
                <div className="task-list">
                  {tasks.map(task => {
                    const goal = goals.find(g => g.id===task.goalId);
                    return (
                      <div key={task.id} className={`task-row ${task.done?"done":""}`} onClick={() => toggleTask(task.id)}>
                        <div className="task-check">{task.done?"✓":""}</div>
                        <div className="task-text">{task.text}</div>
                        {goal && <span className="task-tag" style={{background:goal.color+"25",color:goal.color}}>{goal.category}</span>}
                      </div>
                    );
                  })}
                  {tasks.length===0 && <div className="empty-state">No tasks yet. Add a goal to get started!</div>}
                </div>
              </div>
            )}

            {page==="coach" && (
              <div className="card" style={{flex:1,display:"flex",flexDirection:"column"}}>
                <div className="card-title">AI Coach — Powered by Claude</div>
                <div className="chat-area" ref={chatRef}>
                  {messages.map((m,i) => (
                    <div key={i} className={`msg ${m.role}`}>
                      <div className={`msg-avatar ${m.role}`}>{m.role==="ai"?"✦":"U"}</div>
                      <div className="msg-bubble">{m.text}</div>
                    </div>
                  ))}
                  {aiLoading && (
                    <div className="msg ai">
                      <div className="msg-avatar ai">✦</div>
                      <div className="msg-bubble" style={{color:"#6b6b8a"}}><div style={{display:"flex",gap:4,alignItems:"center"}}><div className="spinner" /> thinking...</div></div>
                    </div>
                  )}
                </div>
                <div className="chat-input-row">
                  <textarea className="chat-input" rows={2} value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="Ask your coach anything… (Enter to send)" />
                  <button className="send-btn" onClick={sendChat} disabled={aiLoading||!chatInput.trim()}>Send →</button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
