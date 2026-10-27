import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ARTISTS, Artist, artImg, avatarOf, EX } from "../lib/data";

// 포토존: 내 사진(기기에서만 처리, 업로드 없음) + 작가 캐릭터 스티커 + 전시 프레임 → 한 장으로 저장
type Sticker = { id: string; x: number; y: number; s: number };
const W = 1080, H = 1350;

export default function PhotoPage() {
  const [sp] = useSearchParams();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [photo, setPhoto] = useState<HTMLImageElement | null>(null);
  const [pz, setPz] = useState({ x: 0, y: 0, s: 1 });
  const [stickers, setStickers] = useState<Sticker[]>(() => { const w = sp.get("with"); return w && ARTISTS.some((a) => a.id === w) ? [{ id: w, x: 0.76, y: 0.6, s: 1 }] : []; });
  const [bg, setBg] = useState<string>(sp.get("with") || "");
  const [sel, setSel] = useState<number>(-1);
  const [dept, setDept] = useState("");
  const imgs = useRef<Record<string, HTMLImageElement>>({});
  const drag = useRef<{ kind: "photo" | "sticker"; i: number; x: number; y: number } | null>(null);

  const load = (src: string) => new Promise<HTMLImageElement>((res, rej) => { if (imgs.current[src]) return res(imgs.current[src]); const im = new Image(); im.onload = () => { imgs.current[src] = im; res(im); }; im.onerror = rej; im.src = src; });

  // 그리기
  useEffect(() => {
    let alive = true;
    (async () => {
      const c = canvasRef.current!; const ctx = c.getContext("2d")!;
      const bgA = ARTISTS.find((a) => a.id === bg);
      const bgImg = bgA?.main ? await load(artImg(bgA, bgA.main.file)).catch(() => null) : null;
      const stImgs = await Promise.all(stickers.map((s) => { const a = ARTISTS.find((x) => x.id === s.id)!; return load(avatarOf(a)).catch(() => null); }));
      if (!alive) return;
      // 배경: 작가 대표작(흐리게·어둡게) 또는 밤하늘
      const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#2E3474"); g.addColorStop(1, "#171A33"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      if (bgImg) { ctx.save(); ctx.filter = "blur(14px) brightness(.55)"; const s = Math.max(W / bgImg.width, H / bgImg.height); ctx.drawImage(bgImg, (W - bgImg.width * s) / 2, (H - bgImg.height * s) / 2, bgImg.width * s, bgImg.height * s); ctx.restore(); }
      for (let i = 0; i < 90; i++) { ctx.fillStyle = `rgba(255,244,214,${.2 + ((i * 7919) % 70) / 100})`; ctx.beginPath(); ctx.arc(((i * 1237) % W), ((i * 911) % H), ((i * 31) % 20) / 10 + .4, 0, 7); ctx.fill(); }
      // 내 사진(폴라로이드 틀)
      const fx = 80, fy = 110, fw = W - 160, fh = H - 420;
      ctx.save(); ctx.translate(W / 2, fy + fh / 2); ctx.rotate(-0.02); ctx.translate(-W / 2, -(fy + fh / 2));
      ctx.fillStyle = "#FCFAF5"; ctx.shadowColor = "rgba(0,0,0,.45)"; ctx.shadowBlur = 40; ctx.shadowOffsetY = 18; ctx.fillRect(fx - 22, fy - 22, fw + 44, fh + 44); ctx.shadowColor = "transparent";
      ctx.save(); ctx.beginPath(); ctx.rect(fx, fy, fw, fh); ctx.clip();
      if (photo) { const s0 = Math.max(fw / photo.width, fh / photo.height) * pz.s; const pw = photo.width * s0, ph = photo.height * s0; ctx.drawImage(photo, fx + (fw - pw) / 2 + pz.x, fy + (fh - ph) / 2 + pz.y, pw, ph); }
      else { ctx.fillStyle = "#E7DFCF"; ctx.fillRect(fx, fy, fw, fh); ctx.fillStyle = "#6B6675"; ctx.font = '600 40px Pretendard, sans-serif'; ctx.textAlign = "center"; ctx.fillText("여기에 내 사진이 들어갑니다", W / 2, fy + fh / 2 - 10); ctx.font = '400 28px Pretendard, sans-serif'; ctx.fillText("아래 「내 사진 올리기」 → 드래그로 위치, 슬라이더로 크기", W / 2, fy + fh / 2 + 40); }
      ctx.restore(); ctx.restore();
      // 스티커(작가 캐릭터)
      stickers.forEach((s, i) => {
        const im = stImgs[i]; const r = 150 * s.s; const cx = s.x * W, cy = s.y * H;
        ctx.save(); ctx.shadowColor = "rgba(0,0,0,.35)"; ctx.shadowBlur = 24; ctx.shadowOffsetY = 8; ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(cx, cy, r + 10, 0, 7); ctx.fill(); ctx.restore();
        ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.clip(); if (im) ctx.drawImage(im, cx - r, cy - r, r * 2, r * 2); else { ctx.fillStyle = "#ccc"; ctx.fillRect(cx - r, cy - r, r * 2, r * 2); } ctx.restore();
        if (i === sel) { ctx.strokeStyle = "#C86B5C"; ctx.lineWidth = 6; ctx.setLineDash([14, 10]); ctx.beginPath(); ctx.arc(cx, cy, r + 18, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
        const a = ARTISTS.find((x) => x.id === s.id)!;
        ctx.fillStyle = "rgba(252,250,245,.95)"; ctx.font = `700 ${Math.round(30 * Math.max(.8, s.s))}px "Noto Serif KR", serif`; ctx.textAlign = "center"; const tw = ctx.measureText(a.name).width + 36; ctx.fillRect(cx - tw / 2, cy + r + 18, tw, 46 * Math.max(.8, s.s)); ctx.fillStyle = "#2B2833"; ctx.fillText(a.name, cx, cy + r + 18 + 34 * Math.max(.8, s.s));
      });
      // 프레임 글자
      ctx.textAlign = "left"; ctx.fillStyle = "#FFF4D6"; ctx.font = '700 86px "Noto Serif KR", serif'; ctx.fillText("MOVE : 이소", 80, H - 150);
      ctx.font = '500 26px Pretendard, sans-serif'; ctx.fillStyle = "rgba(255,244,214,.85)"; ctx.fillText(`${EX.school} ${EX.dept} ${EX.edition}`, 82, H - 100); ctx.fillText(EX.dates, 82, H - 66);
      const with_ = stickers.map((s) => ARTISTS.find((a) => a.id === s.id)!.name).filter((v, i, arr) => arr.indexOf(v) === i).join(" · ");
      ctx.textAlign = "right"; ctx.font = '600 30px Pretendard, sans-serif'; ctx.fillStyle = with_ ? "#FFF4D6" : "rgba(255,244,214,.6)";
      ctx.fillText(with_ ? `with ${with_}` : "PHOTO ZONE", W - 80, H - 160);
      ctx.font = '500 22px Pretendard, sans-serif'; ctx.fillStyle = "rgba(255,244,214,.6)"; ctx.fillText("PHOTO ZONE · 작가 캐릭터와 함께", W - 80, H - 124);
    })();
    return () => { alive = false; };
  }, [photo, pz, stickers, bg, sel]);

  const onFile = (f: File | undefined) => { if (!f) return; const url = URL.createObjectURL(f); const im = new Image(); im.onload = () => { setPhoto(im); setPz({ x: 0, y: 0, s: 1 }); canvasRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }; im.src = url; };
  const canvasPt = (e: React.PointerEvent) => { const r = canvasRef.current!.getBoundingClientRect(); return { x: (e.clientX - r.left) * (W / r.width), y: (e.clientY - r.top) * (H / r.height) }; };
  const pd = (e: React.PointerEvent) => {
    const p = canvasPt(e); (e.target as Element).setPointerCapture(e.pointerId);
    for (let i = stickers.length - 1; i >= 0; i--) { const s = stickers[i]; if (Math.hypot(p.x - s.x * W, p.y - s.y * H) < 150 * s.s + 12) { setSel(i); drag.current = { kind: "sticker", i, x: p.x, y: p.y }; return; } }
    setSel(-1); drag.current = { kind: "photo", i: -1, x: p.x, y: p.y };
  };
  const pm = (e: React.PointerEvent) => {
    const d = drag.current; if (!d) return; const p = canvasPt(e); const dx = p.x - d.x, dy = p.y - d.y; d.x = p.x; d.y = p.y;
    if (d.kind === "photo") setPz((z) => ({ ...z, x: z.x + dx, y: z.y + dy }));
    else setStickers((arr) => arr.map((s, i) => i === d.i ? { ...s, x: s.x + dx / W, y: s.y + dy / H } : s));
  };
  const pu = () => { drag.current = null; };
  const add = (a: Artist) => { setStickers((arr) => [...arr, { id: a.id, x: 0.2 + Math.random() * 0.6, y: 0.25 + Math.random() * 0.45, s: 1 }]); setSel(stickers.length); if (!bg) setBg(a.id); };
  const save = () => { canvasRef.current!.toBlob((b) => { if (!b) return; const u = URL.createObjectURL(b); const el = document.createElement("a"); el.href = u; el.download = `MOVE_이소_포토존_${Date.now()}.jpg`; el.click(); setTimeout(() => URL.revokeObjectURL(u), 5000); }, "image/jpeg", 0.92); };
  const share = async () => { const c = canvasRef.current!; const blob: Blob | null = await new Promise((r) => c.toBlob(r, "image/jpeg", 0.92)); if (!blob) return; const file = new File([blob], "move-iso-photozone.jpg", { type: "image/jpeg" }); const n = navigator as Navigator & { canShare?: (d: ShareData) => boolean }; if (n.share && n.canShare?.({ files: [file] })) await n.share({ files: [file], title: "MOVE : 이소 포토존" }); else save(); };
  const list = dept ? ARTISTS.filter((a) => a.dept === dept) : ARTISTS;
  const curS = sel >= 0 ? stickers[sel] : null;
  const fromQR = sp.get("open") === "1"; // 3D 포토존 QR 로 들어온 휴대폰: 첫 화면에서 바로 사진 찍기
  return (
    <>
      <section className="band night" style={{ padding: "40px 0 30px" }}>
        <div className="wrap">
          <div className="eyebrow">Photo Zone</div>
          <h2 className="h2">작가 캐릭터와 사진 찍기</h2>
          <p className="lead">내 사진을 올리고 좋아하는 작가의 캐릭터 스티커를 붙여 한 장으로 저장하세요. 사진은 내 기기 안에서만 합성되고 어디에도 올라가지 않습니다.</p>
          {fromQR && !photo && (
            <div className="row" style={{ gap: 12 }}>
              <label className="btn primary big">📷 지금 사진 찍기<input type="file" accept="image/*" capture="user" hidden onChange={(e) => onFile(e.target.files?.[0])} /></label>
              <label className="btn ghost big">앨범에서 고르기<input type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0])} /></label>
            </div>
          )}
        </div>
      </section>
      <section className="band paper" style={{ padding: "30px 0 60px" }}>
        <div className="wrap photo">
          <div className="photo-stage">
            <canvas ref={canvasRef} width={W} height={H} onPointerDown={pd} onPointerMove={pm} onPointerUp={pu} onPointerCancel={pu} />
            <div className="photo-actions">
              <label className="btn primary">📷 내 사진 올리기<input type="file" accept="image/*" capture="user" hidden onChange={(e) => onFile(e.target.files?.[0])} /></label>
              <label className="btn">앨범에서<input type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0])} /></label>
              <button className="btn" onClick={save}>⬇ 저장</button>
              <button className="btn" onClick={share}>공유</button>
              <Link to="/gallery" className="btn ghost small">← 전시장</Link>
            </div>
            <div className="photo-ctl">
              <label>내 사진 크기 <input type="range" min={0.6} max={3} step={0.02} value={pz.s} onChange={(e) => setPz((z) => ({ ...z, s: +e.target.value }))} /></label>
              {curS && <label>선택한 캐릭터 크기 <input type="range" min={0.4} max={2.4} step={0.02} value={curS.s} onChange={(e) => setStickers((arr) => arr.map((s, i) => i === sel ? { ...s, s: +e.target.value } : s))} /></label>}
              {curS && <button className="btn small" onClick={() => { setStickers((arr) => arr.filter((_, i) => i !== sel)); setSel(-1); }}>선택한 캐릭터 빼기</button>}
              {stickers.length > 0 && <button className="btn small ghost" onClick={() => { setStickers([]); setSel(-1); }}>모두 빼기</button>}
            </div>
          </div>
          <div className="photo-pick">
            <h3 className="h3" style={{ marginTop: 0 }}>캐릭터 고르기 <span className="small">누르면 사진에 붙습니다 · 배경은 그 작가 대표작</span></h3>
            <div className="filter">
              <button className={dept ? "" : "on"} onClick={() => setDept("")}>전체</button>
              {EX.depts.map((d) => <button key={d.code} className={dept === d.code ? "on" : ""} onClick={() => setDept(d.code)}>{d.ko}</button>)}
            </div>
            <div className="charpick">
              {list.map((a) => (
                <button key={a.id} onClick={() => add(a)} title={`${a.name} · ${a.title}`}>
                  <img src={avatarOf(a)} alt={a.name} loading="lazy" /><b>{a.name}</b>
                </button>
              ))}
            </div>
            <h3 className="h3">배경 바꾸기</h3>
            <div className="row">
              <button className={`btn small ${bg ? "" : "primary"}`} onClick={() => setBg("")}>밤하늘</button>
              {stickers.map((s) => s.id).filter((v, i, arr) => arr.indexOf(v) === i).map((id) => { const a = ARTISTS.find((x) => x.id === id)!; return <button key={id} className={`btn small ${bg === id ? "primary" : ""}`} onClick={() => setBg(id)}>{a.name} 대표작</button>; })}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
