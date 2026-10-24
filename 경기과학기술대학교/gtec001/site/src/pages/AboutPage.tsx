import { useState } from "react";
import { Link } from "react-router-dom";
import { ARTISTS, EX, v } from "../lib/data";

export default function AboutPage() {
  const [zoom, setZoom] = useState<string | null>(null);
  const c = EX.counts as Record<string, number>;
  return (
    <>
      <section className="band night">
        <div className="wrap">
          <div className="eyebrow">About</div>
          <h2 className="h2">{EX.school} {EX.dept} {EX.edition}</h2>
          <p className="lead">{EX.title} — {EX.subtitle}. 이소(離巢)는 새가 둥지를 떠난다는 뜻입니다. {EX.dates}</p>
          <div className="nums">
            <div><b>{ARTISTS.length}</b><span>졸업생</span></div>
            <div><b>{c.webtoon}</b><span>웹툰</span></div>
            <div><b>{c.illust}</b><span>일러스트</span></div>
            <div><b>{c.comics}</b><span>출판만화</span></div>
            <div><b>{c.anim}</b><span>애니메이션</span></div>
          </div>
        </div>
      </section>
      <section className="band paper">
        <div className="wrap greet">
          <div className="eyebrow">Greeting</div>
          <h2>{EX.greeting.title}</h2>
          {EX.greeting.paras.map((p, i) => <p key={i}>{p}</p>)}
          <div className="by">{EX.greeting.by}</div>
        </div>
      </section>
      <section className="band">
        <div className="wrap">
          <div className="eyebrow">Tributes</div>
          <h2 className="h2">축전</h2>
          <p className="lead">교수님·선후배가 도록에 보낸 축전 그림입니다. 누르면 크게 봅니다.</p>
          <div className="tributes">
            {EX.tributes.map((t) => <figure key={t.page} onClick={() => setZoom(v(`catalog/${t.img}`))}><img src={v(`catalog/${t.img}`)} alt={t.who} loading="lazy" /><figcaption>{t.who}</figcaption></figure>)}
          </div>
        </div>
      </section>
      <section className="band sand">
        <div className="wrap">
          <div className="eyebrow">Committee</div>
          <h2 className="h2">졸업전시준비위원회</h2>
          <div className="committee">
            {EX.committee.map((m) => <div className="box" key={m.name}><b>{m.name}<small>{m.role}</small></b><p>{m.text}</p></div>)}
          </div>
          <h3 className="h3">졸업생 서명 모음</h3>
          <figure style={{ margin: 0, maxWidth: 520 }} className="tributes"><img src={v(`catalog/${EX.signatures_page}`)} alt="졸업생 서명 모음" onClick={() => setZoom(v(`catalog/${EX.signatures_page}`))} style={{ cursor: "zoom-in", background: "#fff", padding: 8, border: "1px solid var(--hair)" }} /></figure>
          <p className="small" style={{ marginTop: 24 }}>{EX.colophon.replace(/^\d+\s*/, "")}</p>
          <div className="row"><Link to="/gallery" className="btn primary">3D 전시장 입장 →</Link><Link to="/artists" className="btn">작가 {ARTISTS.length}명</Link></div>
        </div>
      </section>
      {zoom && <div className="lightbox" onClick={() => setZoom(null)}><img src={zoom} alt="" /></div>}
    </>
  );
}
