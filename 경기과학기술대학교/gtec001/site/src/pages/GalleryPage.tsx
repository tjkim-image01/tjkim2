import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ARTISTS, DEPTS, artImg, avatarOf, deptOf, Artist, CEREMONY, HOSTS, hostOf } from "../lib/data";
import { BOOTHS, Booth, boothOf, bounds, LOBBY_R, WINGS, Wing, wingLength, HALL_HALF } from "../lib/layout";
import { World, Hit, isMobile } from "../three/world";
import { Intro } from "../components/Intro";

export default function GalleryPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const worldRef = useRef<World | null>(null);
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const boothParam = sp.get("booth");
  const [intro, setIntro] = useState(() => !boothParam && !sp.get("skipintro") && !sessionStorage.getItem("introSeen"));
  const [ready, setReady] = useState(false);
  const [fail, setFail] = useState<string | null>(null);
  const [near, setNear] = useState<Booth | null>(null);
  const [hit, setHit] = useState<Hit | null>(null);
  const [wingPanel, setWingPanel] = useState<Wing | null>(null);
  const [toast, setToast] = useState<Wing | null>(null);
  const [drawer, setDrawer] = useState(false);
  const drag = useRef<{ id: number; x: number; y: number; moved: number; t: number } | null>(null);
  const toastTimer = useRef(0);

  const go = useCallback((b: Booth) => { worldRef.current?.teleport(b); setDrawer(false); setHit(null); setWingPanel(null); }, []);
  const onHit = useCallback((h: Hit) => {
    if (h.kind === "thumb" && h.booth) { go(h.booth); return; }
    if (h.kind === "wing" && h.wing) { setWingPanel(h.wing); return; }
    if (h.kind === "photo") { nav("/photo"); return; }
    if (h.kind === "host") { setCeremony(true); return; }
    if (h.kind === "guestbook") { nav("/guestbook"); return; }
    setHit(h);
  }, [go, nav]);
  const [ceremony, setCeremony] = useState(false);
  const onNear = useCallback((b: Booth | null) => setNear(b), []);
  const onWing = useCallback((w: Wing | null) => {
    window.clearTimeout(toastTimer.current); setToast(w);
    if (w) toastTimer.current = window.setTimeout(() => setToast(null), 7000);
  }, []);

  useEffect(() => {
    if (intro) return;
    const canvas = canvasRef.current!;
    let w: World;
    try {
      w = new World({ canvas, onHit, onNear, onWing, onReady: () => setReady(true) });
    } catch (err) {
      console.error("3D 전시장을 만들지 못했습니다", err); setFail(String((err as Error)?.message || err)); return;
    }
    worldRef.current = w;
    const b = boothParam ? boothOf(boothParam) : null;
    if (b) w.teleport(b); else w.setView(0, LOBBY_R + 18, 0);
    const kd = (e: KeyboardEvent) => { if (e.target instanceof HTMLInputElement) return; w.keys.add(e.code); if (e.code === "Escape") { setHit(null); setDrawer(false); setWingPanel(null); } };
    const ku = (e: KeyboardEvent) => w.keys.delete(e.code);
    window.addEventListener("keydown", kd); window.addEventListener("keyup", ku);
    return () => { window.removeEventListener("keydown", kd); window.removeEventListener("keyup", ku); w.dispose(); worldRef.current = null; };
  }, [intro, boothParam, onHit, onNear, onWing]);

  // 시점 드래그 + 탭(클릭) 판정
  const pd = (e: React.PointerEvent) => {
    if (drag.current) return; (e.target as Element).setPointerCapture?.(e.pointerId);
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: 0, t: performance.now() };
  };
  const pm = (e: React.PointerEvent) => {
    const d = drag.current; if (!d || d.id !== e.pointerId || !worldRef.current) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y; d.x = e.clientX; d.y = e.clientY; d.moved += Math.abs(dx) + Math.abs(dy);
    worldRef.current.look.dx += dx * (e.pointerType === "touch" ? 1.6 : 1); worldRef.current.look.dy += dy * (e.pointerType === "touch" ? 1.6 : 1);
  };
  const pu = (e: React.PointerEvent) => {
    const d = drag.current; if (!d || d.id !== e.pointerId) return; drag.current = null;
    if (d.moved < 8 && performance.now() - d.t < 500 && worldRef.current) { const h = worldRef.current.pick(e.clientX, e.clientY); if (h) onHit(h); }
  };
  const finishIntro = () => { sessionStorage.setItem("introSeen", "1"); setIntro(false); };

  if (intro) return <Intro onDone={finishIntro} />;
  const dept = near ? deptOf(near.artist.dept) : null;
  return (
    <div className="gal">
      <canvas ref={canvasRef} onPointerDown={pd} onPointerMove={pm} onPointerUp={pu} onPointerCancel={pu} onContextMenu={(e) => e.preventDefault()} />
      {!ready && !fail && <div className="loading">전시장을 짓는 중<small>MOVE : 이소 · 부스 {BOOTHS.length}개 · 10초 넘게 멈춰 있으면 새로고침해 주세요</small></div>}
      {fail && (
        <div className="loading">이 기기에서 3D 전시장을 열지 못했습니다
          <small>{fail}</small>
          <small style={{ marginTop: 16 }}><Link to="/artists" className="btn primary small">작가 42명 작품 보기(2D) →</Link> <button className="btn small" style={{ marginLeft: 8 }} onClick={() => location.reload()}>다시 시도</button></small>
        </div>
      )}
      <div className="hud">
        <div className="row" style={{ gap: 8 }}>
          <button className="pill b" onClick={() => nav("/")}>← 홈</button>
          <button className="pill b" onClick={() => setDrawer(true)}>☰ 작가 {ARTISTS.length}명</button>
          <button className="pill b" onClick={() => worldRef.current?.teleportLobby()}>⌂ 로비</button>
          <button className="pill b more" onClick={() => nav("/photo")}>📷 포토존</button>
          <button className="pill b more" onClick={() => setCeremony(true)}>🎤 개회식 안내</button>
          <button className="pill b more" onClick={() => nav("/guestbook")}>✎ 방명록</button>
        </div>
        <div className="pill" style={{ ["--c" as string]: dept?.color || "#F6F1E7" }}><span className="dot" />{near ? `${near.artist.dept_ko} · ${near.artist.name}` : toast ? toast.name : "MOVE : 이소 · 로비"}</div>
      </div>
      {toast && !hit && !wingPanel && (
        <div className="wingtoast" style={{ ["--c" as string]: toast.color }} onClick={() => setWingPanel(toast)}>
          <i>{toast.en}</i><b>{toast.name}에 들어왔습니다</b><span>{toast.desc}</span><em>누르면 이 관의 작가 목록 →</em>
        </div>
      )}
      {near && !hit && (
        <div className="near">
          <img src={avatarOf(near.artist)} alt="" />
          <div><b>{near.artist.name} <span style={{ fontWeight: 400, fontSize: 12 }}>{near.artist.name_en}</span></b><span>「{near.artist.title}」 · 작품을 누르면 크게 보입니다</span></div>
          <Link to={`/artists/${near.artist.id}`} className="btn small">작가 페이지</Link>
        </div>
      )}
      {!isMobile && <div className="help">이동 W A S D / 방향키 · Shift 달리기 · 마우스 드래그로 둘러보기 · 작품 클릭 = 크게 보기 · 관 입구 썸네일 클릭 = 그 부스로 · 미니맵 클릭 = 순간이동</div>}
      {isMobile && <Joystick onMove={(x, y) => { if (worldRef.current) { worldRef.current.move.x = x; worldRef.current.move.y = y; } }} />}
      <MiniMap worldRef={worldRef} near={near} onPick={go} />
      <div className={`drawer ${drawer ? "open" : ""}`}>
        <div className="drawer-h"><span>부스로 바로 가기</span><button className="panel-x" onClick={() => setDrawer(false)}>✕</button></div>
        <div className="drawer-list">
          <button onClick={() => { worldRef.current?.teleportLobby(); setDrawer(false); }}><b>⌂ 로비 · 입구</b></button>
          <button onClick={() => { setDrawer(false); setCeremony(true); }}><b>🎤 개회식 안내</b><span>학과장 · 졸업전시 위원장</span></button>
          <button onClick={() => nav("/photo")}><b>📷 포토존</b><span>작가 캐릭터와 사진 찍기</span></button>
          <button onClick={() => nav("/guestbook")}><b>✎ 방명록</b><span>한마디 남기기</span></button>
          {DEPTS.map((d) => (
            <div key={d.code}>
              <h4 style={{ color: d.color }}>{d.ko.toUpperCase()} · {d.en.toUpperCase()}</h4>
              {BOOTHS.filter((b) => b.artist.dept === d.code).map((b) => (
                <button key={b.artist.id} onClick={() => go(b)}><img src={avatarOf(b.artist)} alt="" loading="lazy" /><div><b>{b.artist.name}</b><span>{b.artist.title}</span></div></button>
              ))}
            </div>
          ))}
        </div>
      </div>
      {wingPanel && <WingPanel wing={wingPanel} onClose={() => setWingPanel(null)} onJump={go} />}
      {ceremony && <CeremonyPanel onClose={() => setCeremony(false)} onEnter={() => { setCeremony(false); worldRef.current?.teleportLobby(); }} />}
      {hit && hit.booth && <Panel hit={hit} booth={hit.booth} onClose={() => setHit(null)} onJump={go} />}
    </div>
  );
}

// 개회식: 학과장과 졸업전시 위원장이 번갈아 진행. 한 줄씩 넘긴다.
function CeremonyPanel({ onClose, onEnter }: { onClose: () => void; onEnter: () => void }) {
  const [i, setI] = useState(0);
  const cur = CEREMONY[i]; const h = hostOf(cur.who); const last = i === CEREMONY.length - 1;
  return (
    <div className="panel">
      <div className="panel-h"><div><b>개회식 · 전시 안내</b> <span className="small">{i + 1} / {CEREMONY.length}</span></div><button className="panel-x" onClick={onClose}>✕</button></div>
      <div className="panel-body">
        <div className="hosts">{HOSTS.map((x) => <div key={x.id} className={`host ${x.id === cur.who ? "on" : ""}`}><img src={x.img} alt={x.name} /><b>{x.name}</b><span>{x.role}</span></div>)}</div>
        <div className="say" style={{ borderLeft: `6px solid ${h.color}` }}><b style={{ color: h.color }}>{h.name}</b><p style={{ marginTop: 6 }}>{cur.text}</p></div>
        <div className="row">
          <button className="btn small" disabled={i === 0} onClick={() => setI(i - 1)}>← 이전</button>
          {!last ? <button className="btn primary small" onClick={() => setI(i + 1)}>다음 →</button> : <button className="btn primary small" onClick={onEnter}>전시장 입장 → 로비로</button>}
          <button className="btn small ghost" onClick={onEnter}>건너뛰고 입장</button>
        </div>
        <p className="small">진행: 학과장 고원상 · 졸업전시 위원장 안소희(웹툰 「좀순愛」 작가)</p>
      </div>
    </div>
  );
}

function WingPanel({ wing, onClose, onJump }: { wing: Wing; onClose: () => void; onJump: (b: Booth) => void }) {
  const list = BOOTHS.filter((b) => b.wing === wing.key);
  return (
    <div className="panel">
      <div className="panel-h"><div><b style={{ color: wing.color }}>{wing.name}</b> <span className="small">{wing.en}</span></div><button className="panel-x" onClick={onClose}>✕</button></div>
      <div className="panel-body">
        <p>{wing.desc}</p>
        <p className="small">작가 {list.length}명 · 대표작을 누르면 그 부스 앞으로 이동합니다.</p>
        <div className="thumbgrid">
          {list.map((b) => (
            <button key={b.artist.id} onClick={() => onJump(b)}>
              {b.artist.main && <img src={artImg(b.artist, b.artist.main.thumb)} alt={b.artist.title} loading="lazy" />}
              <b>{b.artist.name}</b><span>{b.artist.title}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Panel({ hit, booth, onClose, onJump }: { hit: Hit; booth: Booth; onClose: () => void; onJump: (b: Booth) => void }) {
  const a: Artist = booth.artist;
  const items = [a.main ? { ...a.main, label: "대표작" } : null, ...a.works.map((w, i) => ({ ...w, label: `작품 ${i + 1}` }))].filter(Boolean) as (typeof a.works[0] & { label: string })[];
  const start = hit.kind === "work" ? hit.index + (a.main ? 1 : 0) : 0;
  const [i, setI] = useState(Math.min(start, items.length - 1));
  const cur = items[i];
  const infoOnly = hit.kind === "plate" || hit.kind === "qr";
  return (
    <div className="panel">
      <div className="panel-h"><div><span className={`chip ${a.dept}`}>{a.dept_ko}</span> <b style={{ marginLeft: 8 }}>{a.name}</b> <span className="small">{a.name_en}</span></div><button className="panel-x" onClick={onClose}>✕</button></div>
      <div className="panel-body">
        {!infoOnly && cur && (cur.strip ? <div className="strip"><img src={artImg(a, cur.file)} alt="" /></div> : <img className="art" src={artImg(a, cur.file)} alt="" />)}
        {!infoOnly && items.length > 1 && <div className="thumbs">{items.map((it, k) => <img key={k} src={artImg(a, it.thumb)} className={k === i ? "on" : ""} onClick={() => setI(k)} alt={it.label} />)}</div>}
        <h2>「{a.title}」</h2>
        <p>{a.intro}</p>
        <p className="small">{a.note}</p>
        <div className="row">
          <Link to={`/artists/${a.id}`} className="btn primary small">작가 페이지 →</Link>
          <Link to={`/photo?with=${a.id}`} className="btn small">📷 이 캐릭터와 사진</Link>
          <button className="btn small" onClick={() => onJump(booth)}>부스 정면으로</button>
        </div>
      </div>
    </div>
  );
}

// 모바일 가상 조이스틱(왼쪽 아래)
function Joystick({ onMove }: { onMove: (x: number, y: number) => void }) {
  const ref = useRef<HTMLDivElement>(null); const [k, setK] = useState({ x: 0, y: 0 }); const id = useRef<number | null>(null);
  const upd = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect(); let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    const max = r.width / 2 - 10; const l = Math.hypot(dx, dy); if (l > max) { dx *= max / l; dy *= max / l; }
    setK({ x: dx, y: dy }); onMove(dx / max, -dy / max);
  };
  return (
    <div ref={ref} className="stick"
      onPointerDown={(e) => { id.current = e.pointerId; (e.target as Element).setPointerCapture(e.pointerId); upd(e); }}
      onPointerMove={(e) => { if (id.current === e.pointerId) upd(e); }}
      onPointerUp={() => { id.current = null; setK({ x: 0, y: 0 }); onMove(0, 0); }}
      onPointerCancel={() => { id.current = null; setK({ x: 0, y: 0 }); onMove(0, 0); }}>
      <div className="knob" style={{ transform: `translate(${k.x}px, ${k.y}px)` }} />
    </div>
  );
}

// 미니맵: 평면도 + 내 위치. 부스를 누르면 순간이동.
function MiniMap({ worldRef, near, onPick }: { worldRef: React.MutableRefObject<World | null>; near: Booth | null; onPick: (b: Booth) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const size = isMobile ? 150 : 210;
  const B = bounds(); const pad = 6; const sx = (size - pad * 2) / (B.maxX - B.minX), sz = (size - pad * 2) / (B.maxZ - B.minZ); const s = Math.min(sx, sz);
  const ox = pad + ((size - pad * 2) - (B.maxX - B.minX) * s) / 2, oz = pad + ((size - pad * 2) - (B.maxZ - B.minZ) * s) / 2;
  const toPx = (x: number, z: number) => [ox + (x - B.minX) * s, oz + (z - B.minZ) * s];
  useEffect(() => {
    let raf = 0;
    const draw = () => {
      const c = ref.current; const w = worldRef.current; if (!c) return; const ctx = c.getContext("2d")!;
      ctx.clearRect(0, 0, size, size); ctx.fillStyle = "#EDE4D3"; ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = "#D9D0BF";
      for (const wg of WINGS) { const L = wingLength(wg.key); const [dx, dz] = wg.dir; const [ax, az] = toPx(0, 0); const [bx, bz] = toPx(dx * L, dz * L); ctx.lineWidth = HALL_HALF * 2 * s; ctx.strokeStyle = "#D9D0BF"; ctx.beginPath(); ctx.moveTo(ax, az); ctx.lineTo(bx, bz); ctx.stroke(); }
      { const [ax, az] = toPx(0, 0); const [bx, bz] = toPx(0, B.maxZ); ctx.beginPath(); ctx.moveTo(ax, az); ctx.lineTo(bx, bz); ctx.stroke(); }
      { const [cx, cz] = toPx(0, 0); ctx.beginPath(); ctx.arc(cx, cz, LOBBY_R * s, 0, 7); ctx.fillStyle = "#D9D0BF"; ctx.fill(); }
      for (const b of BOOTHS) { const [x, z] = toPx(b.x, b.z); ctx.fillStyle = b === near ? "#C86B5C" : deptOf(b.artist.dept).color; ctx.fillRect(x - 2.6 * s, z - 2 * s, 5.2 * s, 4 * s); }
      if (w) { const [x, z] = toPx(w.pos.x, w.pos.z); ctx.fillStyle = "#171A33"; ctx.beginPath(); ctx.arc(x, z, 4, 0, 7); ctx.fill(); const fx = -Math.sin(w.yaw), fz = -Math.cos(w.yaw); ctx.strokeStyle = "#171A33"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, z); ctx.lineTo(x + fx * 10, z + fz * 10); ctx.stroke(); }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw); return () => cancelAnimationFrame(raf);
  }, [near, size, worldRef]); // eslint-disable-line react-hooks/exhaustive-deps
  const click = (e: React.MouseEvent) => {
    const r = ref.current!.getBoundingClientRect(); const px = e.clientX - r.left, pz = e.clientY - r.top;
    let best: Booth | null = null, bd = 12;
    for (const b of BOOTHS) { const [x, z] = toPx(b.x, b.z); const d = Math.hypot(x - px, z - pz); if (d < bd) { bd = d; best = b; } }
    if (best) onPick(best); else { const [lx, lz] = toPx(0, 0); if (Math.hypot(lx - px, lz - pz) < LOBBY_R * s) worldRef.current?.teleportLobby(); }
  };
  return <div className="minimap"><canvas ref={ref} width={size} height={size} onClick={click} /></div>;
}
