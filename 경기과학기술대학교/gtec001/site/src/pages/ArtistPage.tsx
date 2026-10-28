import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Artist, artImg, artistById, avatarOf, prevNext, signOf, snsLinks, urlOfArtist } from "../lib/data";
import { QR } from "../components/QR";

// 작가 인터뷰 영상: public/interviews/<id>.mp4 가 올라오면 작가의 캐릭터(프로필 아이콘)가 작가를 소개하는 말풍선과 함께 보인다.
// 소개 대사는 public/interviews/<id>.txt (한 줄)가 있으면 그걸, 없으면 기본 문장을 쓴다.
function Interview({ a }: { a: Artist }) {
  const [src, setSrc] = useState<string | null>(null); const [line, setLine] = useState("");
  useEffect(() => {
    let alive = true; setSrc(null);
    fetch(`interviews/${a.id}.mp4`, { method: "HEAD" }).then((r) => { if (alive && r.ok && (r.headers.get("content-type") || "").startsWith("video")) setSrc(`interviews/${a.id}.mp4`); }).catch(() => {});
    fetch(`interviews/${a.id}.txt`).then((r) => r.ok && (r.headers.get("content-type") || "").includes("text") ? r.text() : "").then((t) => { if (alive) setLine(t.trim()); }).catch(() => {});
    return () => { alive = false; };
  }, [a.id]);
  if (!src) return null;
  return (
    <section className="band">
      <div className="wrap">
        <div className="eyebrow">Interview</div>
        <h2 className="h2">작가 인터뷰</h2>
        <div className="interview">
          <div className="who"><img src={avatarOf(a)} alt="" /><span>「{a.title}」의 캐릭터</span></div>
          <div className="say">
            <p style={{ margin: 0 }}>{line || `안녕하세요, 저는 「${a.title}」에서 왔어요. 저를 그린 작가 ${a.name}을 소개할게요. 어떤 마음으로 이 작품을 만들었는지, 직접 들어 보세요.`}</p>
            <video src={src} controls playsInline poster={a.main ? artImg(a, a.main.thumb) : undefined} />
          </div>
        </div>
      </div>
    </section>
  );
}

export default function ArtistPage() {
  const { id = "" } = useParams();
  const a = artistById(id);
  const [zoom, setZoom] = useState<string | null>(null);
  if (!a) return <section className="band"><div className="wrap">작가를 찾을 수 없습니다. <Link to="/artists">작가 목록</Link></div></section>;
  const { prev, next } = prevNext(a);
  const pal = a.palette!;
  const strips = a.works.filter((w) => w.strip), pages = a.works.filter((w) => !w.strip);
  return (
    <>
      <section className={`ahero ${pal.mood === "dark" ? "dark" : ""}`} style={{ ["--wall" as string]: pal.mood === "dark" ? pal.dark : pal.wall }}>
        <div className="wrap ahero-in">
          <div>
            <div className="row"><span className={`chip ${a.dept}`}>{a.dept_ko} · {a.dept_en}</span><span className="chip outline">부스 {a.id.toUpperCase()}</span></div>
            <h1>{a.name}</h1>
            <div className="en">{a.name_en}</div>
            <div className="ttl">「{a.title}」</div>
            <div className="person">{a.avatar && <img src={avatarOf(a)} alt="" />}<div><div className="small">{a.student_no} · 도록 {a.catalog_page}쪽</div></div></div>
            <div className="contact">
              {a.email && <a href={`mailto:${a.email}`}>✉ {a.email}</a>}
              {snsLinks(a.sns).map((s, i) => s.href ? <a key={i} href={s.href} target="_blank" rel="noreferrer">{s.label} {s.handle}</a> : <span key={i}>{s.label} {s.handle}</span>)}
            </div>
            <div className="row" style={{ marginTop: 22 }}>
              <Link to={`/gallery?booth=${a.id}`} className="btn primary">3D 부스로 들어가기 →</Link>
              <Link to={`/artists?d=${a.dept}`} className="btn ghost">{a.dept_ko} 전체</Link>
            </div>
          </div>
          {a.main && <figure className="ahero-main" style={{ margin: 0 }}><img src={artImg(a, a.main.file)} alt={a.title} onClick={() => setZoom(artImg(a, a.main!.file))} style={{ cursor: "zoom-in" }} /></figure>}
        </div>
      </section>

      <Interview a={a} />
      <section className="band paper">
        <div className="wrap two">
          <div className="box"><h3>작품 소개</h3><p>{a.intro}</p></div>
          <div className="box"><h3>소감, 짧은 한마디</h3><p>{a.note}</p>{a.sign && <img className="sign" src={signOf(a)} alt={`${a.name} 서명`} />}</div>
        </div>
      </section>

      {strips.length > 0 && (
        <section className="band">
          <div className="wrap">
            <div className="eyebrow">Webtoon</div>
            <h2 className="h2">웹툰 보기</h2>
            <p className="lead">도록에 실린 원고를 세로로 이어서 읽습니다.</p>
            <div className="reader">{strips.map((w) => <img key={w.file} src={artImg(a, w.file)} alt={a.title} loading="lazy" />)}</div>
          </div>
        </section>
      )}
      {pages.length > 0 && (
        <section className="band">
          <div className="wrap">
            <div className="eyebrow">Works</div>
            <h2 className="h2">작품 {pages.length}점</h2>
            <div className="pages">
              {pages.map((w, i) => (
                <figure key={w.file} onClick={() => setZoom(artImg(a, w.file))}>
                  <img src={artImg(a, w.thumb)} alt={`${a.title} ${i + 1}`} loading="lazy" />
                  <figcaption>{a.title} · {i + 1}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="band sand">
        <div className="wrap">
          <div className="qrcard">
            <QR url={urlOfArtist(a.id)} size={150} alt={`${a.name} 부스 QR`} />
            <div>
              <h3 className="h3" style={{ marginTop: 0 }}>이 부스의 QR</h3>
              <p className="small" style={{ margin: 0 }}>부스 앞에 붙이는 QR 입니다. 휴대폰으로 찍으면 이 페이지가 열리고, 「3D 부스로 들어가기」로 가상 전시장의 {a.name} 부스 앞에서 시작합니다.</p>
            </div>
          </div>
          <div className="pn">
            <Link to={`/artists/${prev.id}`} className="btn">← {prev.name} · {prev.title}</Link>
            <Link to={`/artists/${next.id}`} className="btn">{next.name} · {next.title} →</Link>
          </div>
        </div>
      </section>
      {zoom && <div className="lightbox" onClick={() => setZoom(null)}><img src={zoom} alt="" /></div>}
    </>
  );
}
