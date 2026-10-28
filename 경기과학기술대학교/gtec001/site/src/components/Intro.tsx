import { useEffect, useState } from "react";
import { ARTISTS, EX, HOSTS, CEREMONY } from "../lib/data";

// 인트로 영상(웹 버전 v0): 코드로 그린 7초 시퀀스. 나중에 Remotion 렌더 mp4(public/videos/intro.mp4)가 생기면 그걸 우선 재생한다.
export function Intro({ onDone }: { onDone: () => void }) {
  const [hasVideo, setHasVideo] = useState<boolean | null>(null);
  useEffect(() => {
    fetch("videos/intro.mp4", { method: "HEAD" }).then((r) => setHasVideo(r.ok && (r.headers.get("content-type") || "").startsWith("video"))).catch(() => setHasVideo(false));
  }, []);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape" || e.key === "Enter") onDone(); };
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  }, [onDone]);
  if (hasVideo === null) return <div className="intro" />;
  if (hasVideo) {
    return (
      <div className="intro">
        <video src="videos/intro.mp4" autoPlay playsInline onEnded={onDone} style={{ maxWidth: "100%", maxHeight: "100%" }} />
        <button className="skip" onClick={onDone}>건너뛰기 ✕</button>
      </div>
    );
  }
  return (
    <div className="intro">
      <div className="stars" />
      <Letters n={26} />
      <div className="intro-in">
        <div className="k">{EX.school} {EX.dept} · {EX.edition}</div>
        <img className="bird" src={EX.cover} alt="" />
        <div className="t">{EX.title}</div>
        <div className="s">{EX.subtitle}</div>
        <div className="d">{EX.dates} · 졸업생 {ARTISTS.length}명 · 웹툰 {EX.counts.webtoon} · 일러스트 {EX.counts.illust} · 출판만화 {EX.counts.comics} · 애니메이션 {EX.counts.anim}</div>
        <div className="names">{ARTISTS.map((a) => <span key={a.id}>{a.name}</span>)}</div>
        <div className="intro-hosts">
          {[...HOSTS].sort((a) => (a.id === "mc" ? -1 : 1)).map((h, i) => (
            <div key={h.id} className="ih" style={{ animationDelay: `${4.4 + i * 1.2}s` }}>
              <img src={h.img} alt={h.name} />
              <div className="ih-say"><b>{h.name} · {h.role}</b><span>{CEREMONY.find((l) => l.who === h.id)!.text}</span></div>
            </div>
          ))}
        </div>
        <button className="btn primary big go" onClick={onDone}>전시장 입장 →</button>
      </div>
      <button className="skip" onClick={onDone}>건너뛰기 ✕</button>
    </div>
  );
}

export function Letters({ n = 18 }: { n?: number }) {
  const items = Array.from({ length: n }, (_, i) => ({ left: `${(i * 37) % 100}%`, dur: `${9 + (i * 7) % 9}s`, delay: `${-(i * 1.7) % 12}s`, scale: 0.7 + ((i * 13) % 7) / 10 }));
  return <div className="letters">{items.map((it, i) => <span key={i} style={{ left: it.left, animationDuration: it.dur, animationDelay: it.delay, transform: `scale(${it.scale})` }} />)}</div>;
}
