import React from "react";

// =================== Accès par mot de passe (en clair) ===================
const PASSWORD = "secret"; // ← change-le ici

function PasswordGate({ children }) {
  const [ok, setOk] = React.useState(false);
  const [pwd, setPwd] = React.useState("");

  React.useEffect(() => {
    const token = localStorage.getItem("sbw.auth");
    if (token === PASSWORD) setOk(true);
  }, []);

  const onSubmit = (e) => {
    e.preventDefault();
    if (pwd === PASSWORD) {
      localStorage.setItem("sbw.auth", PASSWORD);
      setOk(true);
      setPwd("");
    } else {
      alert("Mot de passe incorrect");
    }
  };

  if (ok) return children;

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#0f172a", color: "#e2e8f0", padding: "2rem" }}>
      <form onSubmit={onSubmit} style={{ background: "#111827", padding: "1.5rem", borderRadius: 16, minWidth: 320, boxShadow: "0 10px 30px rgba(0,0,0,.3)" }}>
        <h1 style={{ margin: 0, marginBottom: 12, fontSize: 20, fontWeight: 700 }}>Accès privé</h1>
        <p style={{ marginTop: 0, marginBottom: 12, opacity: .8 }}>Entre le mot de passe pour jouer.</p>
        <input type="password" placeholder="Mot de passe" value={pwd} onChange={(e) => setPwd(e.target.value)}
              style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #334155", background: "#0b1220", color: "#e2e8f0", marginBottom: 10 }} />
        <button type="submit" style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "none", background: "#22c55e", color: "#052e16", fontWeight: 700 }}>Entrer</button>
        <p style={{ marginTop: 10, fontSize: 12, opacity: .6 }}>Astuce: modifie la constante PASSWORD dans le code.</p>
      </form>
    </div>
  );
}

// =================== Jeu: Stop Before The Word ===================

// Données par défaut (tu peux modifier/ajouter)
const DEFAULT_VIDEOS = [
  {
    id: "demo-flower",
    title: "Démo – Flower (CC0)",
    src: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    keyword: "le mot secret",
    limitTime: 4.2,
    displayFuzz: 0.5, // ± secondes affichées aux joueurs
    hideTimer: true,  // masque l'horloge côté joueurs
  },
];

// ===== Utils stockage
function loadVideos() {
  try {
    const raw = localStorage.getItem("sbw.videos");
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEFAULT_VIDEOS;
}
function saveVideos(videos) {
  try { localStorage.setItem("sbw.videos", JSON.stringify(videos)); } catch {}
}
function loadName() {
  try { return localStorage.getItem("sbw.playerName") || ""; } catch { return ""; }
}
function saveName(name) {
  try { localStorage.setItem("sbw.playerName", name); } catch {}
}
function loadLeaderboard(videoId) {
  try {
    const raw = localStorage.getItem(`sbw.lb.${videoId}`);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}
function saveLeaderboard(videoId, list) {
  try { localStorage.setItem(`sbw.lb.${videoId}`, JSON.stringify(list)); } catch {}
}

// ===== Utils divers
function uid(prefix = "id") { return `${prefix}_${Math.random().toString(36).slice(2, 9)}`; }
function formatTime(s) {
  if (!isFinite(s)) return "0:00.000";
  const sign = s < 0 ? "-" : "";
  const x = Math.abs(s);
  const m = Math.floor(x / 60);
  const sec = Math.floor(x % 60).toString().padStart(2, "0");
  const ms = Math.round((x * 1000) % 1000).toString().padStart(3, "0");
  return `${sign}${m}:${sec}.${ms}`;
}
function formatTimeCoarse(s) {
  if (!isFinite(s)) return "0:00";
  const sign = s < 0 ? "-" : "";
  const x = Math.abs(s);
  const m = Math.floor(x / 60);
  const sec = Math.floor(x % 60).toString().padStart(2, "0");
  return `${sign}${m}:${sec}`;
}
function computeScore(pausedAt, limitTime) {
  const diff = limitTime - pausedAt; // ≥0 = avant
  if (diff < 0) return { score: 0, diff };
  const points = Math.max(1, Math.round(100 - (diff / 0.05))); // 1 point / 50 ms d'écart
  return { score: points, diff };
}

function GameApp() {
  const videoRef = React.useRef(null);

  const [videos, setVideos] = React.useState(() => loadVideos());
  const [currentId, setCurrentId] = React.useState(() => (videos[0] ? videos[0].id : ""));
  const current = React.useMemo(() => videos.find(v => v.id === currentId) || null, [videos, currentId]);

  const [playerName, setPlayerName] = React.useState(() => loadName());
  const [curTime, setCurTime] = React.useState(0);
  const [result, setResult] = React.useState(null);
  const [error, setError] = React.useState(null);

  const admin = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("admin") === "1";

  React.useEffect(() => { saveVideos(videos); }, [videos]);

  React.useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTime = () => setCurTime(v.currentTime || 0);
    v.addEventListener("timeupdate", onTime);
    return () => { v.removeEventListener("timeupdate", onTime); };
  }, [currentId]);

  // ---------- Jeu
  const start = async () => {
    setResult(null); setError(null);
    const v = videoRef.current; if (!v || !current) return;
    try { v.currentTime = 0; await v.play(); } catch { setError("Lecture bloquée, cliquez à nouveau sur Démarrer."); }
  };
  const stopBefore = () => {
    const v = videoRef.current; if (!v || !current) return;
    v.pause();
    const pausedAt = v.currentTime;
    const { score, diff } = computeScore(pausedAt, current.limitTime);
    const attempt = { name: playerName || "Anonyme", pausedAt, score, diff, ts: Date.now() };
    setResult(attempt);
    const lb = loadLeaderboard(current.id);
    lb.push(attempt);
    lb.sort((a, b) => (b.score - a.score) || (Math.abs(a.diff) - Math.abs(b.diff)));
    saveLeaderboard(current.id, lb.slice(0, 20));
  };

  // ---------- Admin helpers
  const setLimitHere = () => {
    const v = videoRef.current; if (!v || !current) return;
    const t = Number(v.currentTime.toFixed(3));
    setVideos(arr => arr.map(it => it.id === current.id ? { ...it, limitTime: t } : it));
  };
  const addVideo = () => {
    const id = uid("vid");
    const newItem = { id, title: "Nouvelle vidéo", src: "https://example.com/video.mp4", keyword: "mot", limitTime: 3, displayFuzz: 0.5, hideTimer: true };
    setVideos(v => [newItem, ...v]); setCurrentId(id);
  };
  const removeCurrent = () => {
    if (!current) return; const next = videos.filter(v => v.id !== current.id);
    setVideos(next); if (next[0]) setCurrentId(next[0].id);
  };
  const exportJSON = () => {
    const json = JSON.stringify(videos, null, 2);
    navigator.clipboard.writeText(json).catch(() => {});
    alert("Configuration copiée dans le presse‑papiers. Collez-la dans votre repo (videos.json) ou le code.");
  };
  const importJSON = async () => {
    const txt = prompt("Collez ici le JSON des vidéos (tableau)"); if (!txt) return;
    try { const arr = JSON.parse(txt); if (!Array.isArray(arr)) throw new Error("Format invalide"); setVideos(arr); if (arr[0]) setCurrentId(arr[0].id); }
    catch (e) { alert("JSON invalide: " + (e?.message || e)); }
  };
  const leaderboard = React.useMemo(() => (current ? loadLeaderboard(current.id) : []), [currentId]);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-4 sm:p-6">
      <div className="max-w-5xl mx-auto grid gap-4">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl sm:text-3xl font-bold">Stop Before The Word</h1>
          {admin && <span className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-700">Mode Admin</span>}
        </header>

        {/* Sélection & Profil */}
        <section className="grid gap-3 bg-white rounded-2xl shadow p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label className="text-sm font-medium">Choisir une vidéo</label>
              <select className="w-full border rounded-xl p-2" value={currentId} onChange={(e) => setCurrentId(e.target.value)}>
                {videos.map(v => <option key={v.id} value={v.id}>{v.title}</option>)}
              </select>
            </div>
            <div className="w-full sm:w-64">
              <label className="text-sm font-medium">Votre pseudo</label>
              <input className="w-full border rounded-xl p-2" placeholder="Ex: Léo" value={playerName}
                    onChange={(e) => { setPlayerName(e.target.value); saveName(e.target.value); }} />
            </div>
          </div>

          {current && (
            <p className="text-sm text-gray-600">
              Objectif: stoppez <strong>avant</strong> la limite liée au mot <span className="font-semibold italic">“{current.keyword}”</span>.
              {" "}
              {(current.displayFuzz ?? 0) > 0 && !admin ? (
                <>
                  La limite se situe quelque part entre {" "}
                  <span className="font-semibold tabular-nums">{formatTimeCoarse(current.limitTime - (current.displayFuzz ?? 0))}</span>
                  {" "}et{" "}
                  <span className="font-semibold tabular-nums">{formatTimeCoarse(current.limitTime + (current.displayFuzz ?? 0))}</span>.
                </>
              ) : (
                admin && <>
                  Limite exacte (admin): <span className="font-semibold tabular-nums">{formatTime(current.limitTime)}</span>
                </>
              )}
            </p>
          )}
        </section>

        {/* Lecteur & Contrôles */}
        <section className="bg-white rounded-2xl shadow overflow-hidden">
          <div className="aspect-video bg-black">
            <video ref={videoRef} src={current?.src} className="w-full h-full" preload="metadata" />
          </div>
          <div className="p-4 grid gap-3">
            <div className="flex items-center justify-between text-sm text-gray-600">
              {admin ? (
                <span>Temps: <span className="tabular-nums font-medium">{formatTime(curTime)}</span></span>
              ) : (
                !(current?.hideTimer ?? false) && (
                  <span>Temps: <span className="tabular-nums font-medium">{formatTimeCoarse(curTime)}</span></span>
                )
              )}
              {current && admin && (
                <span>Limite (exacte): <span className="tabular-nums font-semibold">{formatTime(current.limitTime)}</span></span>
              )}
            </div>
            <div className="flex gap-3 flex-wrap">
              <button onClick={start} className="px-4 py-2 rounded-2xl bg-emerald-600 text-white font-semibold shadow hover:bg-emerald-700">Démarrer</button>
              <button onClick={stopBefore} className="px-4 py-2 rounded-2xl bg-rose-600 text-white font-semibold shadow hover:bg-rose-700">STOP (avant la limite)</button>
              {admin && <button onClick={() => videoRef.current?.play()} className="px-3 py-2 rounded-2xl bg-gray-200 text-gray-800 font-medium">Lecture</button>}
              {admin && <button onClick={() => videoRef.current?.pause()} className="px-3 py-2 rounded-2xl bg-gray-200 text-gray-800 font-medium">Pause</button>}
            </div>

            {result && (
              <div className="rounded-xl border bg-gray-50 p-3">
                <p className="text-sm">Vous avez stoppé à <strong className="tabular-nums">{formatTime(result.pausedAt)}</strong>.</p>
                <p className="text-sm">Écart vs limite: <strong className="tabular-nums">{formatTime(result.diff)}</strong> ({result.diff < 0 ? "après ↓ 0 point" : "avant ↑ points"}).</p>
                <p className="text-lg font-bold mt-1">Score: {result.score}</p>
              </div>
            )}

            {error && <p className="text-sm text-rose-600">{error}</p>}
          </div>
        </section>

        {/* Classement local */}
        <section className="bg-white rounded-2xl shadow p-4">
          <h2 className="text-lg font-semibold mb-3">Classement (local, {current?.title})</h2>
          {leaderboard.length === 0 ? (
            <p className="text-sm text-gray-600">Aucune tentative pour l'instant.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500">
                    <th className="py-2 pr-4">#</th>
                    <th className="py-2 pr-4">Pseudo</th>
                    <th className="py-2 pr-4">Stop</th>
                    <th className="py-2 pr-4">Écart</th>
                    <th className="py-2 pr-4">Score</th>
                    <th className="py-2 pr-4">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((a, i) => (
                    <tr key={a.ts} className="border-t">
                      <td className="py-2 pr-4">{i + 1}</td>
                      <td className="py-2 pr-4">{a.name}</td>
                      <td className="py-2 pr-4 tabular-nums">{formatTime(a.pausedAt)}</td>
                      <td className={`py-2 pr-4 tabular-nums ${a.diff < 0 ? "text-rose-600" : "text-emerald-700"}`}>{formatTime(a.diff)}</td>
                      <td className="py-2 pr-4 font-semibold">{a.score}</td>
                      <td className="py-2 pr-4">{new Date(a.ts).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Admin */}
        {admin && current && (
          <section className="bg-white rounded-2xl shadow p-4 grid gap-3">
            <h2 className="text-lg font-semibold">Administration</h2>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Titre</label>
                <input className="w-full border rounded-xl p-2" value={current.title}
                      onChange={(e) => setVideos(v => v.map(it => it.id === current.id ? { ...it, title: e.target.value } : it))} />
              </div>
              <div>
                <label className="text-sm font-medium">Mot clé</label>
                <input className="w-full border rounded-xl p-2" value={current.keyword}
                      onChange={(e) => setVideos(v => v.map(it => it.id === current.id ? { ...it, keyword: e.target.value } : it))} />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">URL vidéo (.mp4)</label>
              <input className="w-full border rounded-xl p-2" value={current.src}
                    onChange={(e) => setVideos(v => v.map(it => it.id === current.id ? { ...it, src: e.target.value } : it))} />
              <p className="text-xs text-gray-500 mt-1">Astuce: place tes .mp4 dans le repo (ex: /assets/ma_video.mp4) ou utilise une URL publique.</p>
            </div>

            <div className="grid sm:grid-cols-3 gap-3 items-end">
              <div>
                <label className="text-sm font-medium">Limite (secondes)</label>
                <input type="number" step="0.001" className="w-full border rounded-xl p-2" value={current.limitTime}
                      onChange={(e) => setVideos(v => v.map(it => it.id === current.id ? { ...it, limitTime: Number(e.target.value) } : it))} />
                <p className="text-xs text-gray-500 mt-1">Les joueurs voient une <strong>plage</strong> si une marge est définie.</p>
              </div>
              <button onClick={setLimitHere} className="px-4 py-2 rounded-2xl bg-indigo-600 text-white font-semibold shadow hover:bg-indigo-700">Fixer la limite = temps courant</button>
              <div className="text-sm text-gray-600">Temps courant: <span className="tabular-nums font-medium">{formatTime(curTime)}</span></div>
            </div>

            <div className="grid sm:grid-cols-3 gap-3 items-end">
              <div>
                <label className="text-sm font-medium">Marge affichée (± secondes)</label>
                <input type="number" step="0.05" className="w-full border rounded-xl p-2" value={current.displayFuzz ?? 0}
                      onChange={(e) => setVideos(v => v.map(it => it.id === current.id ? { ...it, displayFuzz: Number(e.target.value) } : it))} />
                <p className="text-xs text-gray-500 mt-1">Ex: 0.5 ⇒ plage [limite-0.5 ; limite+0.5]. Mettre 0 pour rien afficher.</p>
              </div>
              <div className="flex items-center gap-2">
                <input id="hideTimer" type="checkbox" className="h-4 w-4" checked={!!current.hideTimer}
                      onChange={(e) => setVideos(v => v.map(it => it.id === current.id ? { ...it, hideTimer: e.target.checked } : it))} />
                <label htmlFor="hideTimer" className="text-sm">Masquer l'horloge aux joueurs</label>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button onClick={addVideo} className="px-4 py-2 rounded-2xl bg-gray-800 text-white font-semibold shadow">+ Ajouter une vidéo</button>
              <button onClick={removeCurrent} className="px-4 py-2 rounded-2xl bg-gray-200 text-gray-800 font-semibold shadow">Supprimer la vidéo</button>
              <button onClick={exportJSON} className="px-4 py-2 rounded-2xl bg-emerald-600 text-white font-semibold shadow">Exporter JSON</button>
              <button onClick={importJSON} className="px-4 py-2 rounded-2xl bg-amber-600 text-white font-semibold shadow">Importer JSON</button>
            </div>

            <details className="mt-2">
              <summary className="cursor-pointer text-sm text-gray-700">Aperçu JSON</summary>
              <pre className="mt-2 text-xs bg-gray-50 p-2 rounded-lg overflow-auto max-h-64">{JSON.stringify(videos, null, 2)}</pre>
            </details>
          </section>
        )}

        <footer className="text-center text-xs text-gray-500 py-6">
          Fait pour GitHub Pages • Mode admin: ajoute <code>?admin=1</code> à l'URL.
        </footer>
      </div>
    </div>
  );
}

// =================== Export: PasswordGate + Jeu ===================
export default function App() {
  return (
    <PasswordGate>
      <GameApp />
    </PasswordGate>
  );
}
