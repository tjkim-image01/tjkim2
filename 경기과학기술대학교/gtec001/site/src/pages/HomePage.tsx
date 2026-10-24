import { Link } from "react-router-dom";
import { ARTISTS, DEPTS, EX, HOSTS, avatarOf, byDept, DeptCode, urlOfEntrance } from "../lib/data";
import { ArtistCard } from "../components/ArtistCard";
import { Letters } from "../components/Intro";
import { QR } from "../components/QR";

export default function HomePage() {
  const counts = EX.counts as Record<DeptCode, number>;
  return (
    <>
      <section className="hero">
        <div className="stars" />
        <Letters n={16} />
        <div className="hero-in">
          <div>
            <div className="hero-kicker">{EX.school} {EX.dept} · {EX.edition}</div>
            <h1 className="hero-title">{EX.title}<small>{EX.subtitle}</small></h1>
            <p className="hero-sub">둥지를 떠나는 날. 졸업생 {ARTISTS.length}명이 3년의 이야기를 들고 세상으로 날아갑니다. 가상 전시장의 부스 {ARTISTS.length}개에서 웹툰·일러스트·출판만화·애니메이션을 만나 보세요.</p>
            <div className="hero-dates">{EX.dates}</div>
            <div className="hero-cta">
              <Link to="/gallery" className="btn primary big">3D 전시장 입장 →</Link>
              <Link to="/intro" className="btn ghost big">▶ 인트로 보기</Link>
              <Link to="/artists" className="btn ghost big">작가 {ARTISTS.length}명</Link>
            </div>
          </div>
          <figure className="hero-cover">
            <img src={EX.cover} alt="도록 표지 MOVE : 이소" />
            <figcaption>도록 표지 · 표지 이미지 박시온 · 로고 정예선</figcaption>
          </figure>
        </div>
      </section>

      <section className="band paper">
        <div className="wrap">
          <div className="eyebrow">Sections</div>
          <h2 className="h2">네 개의 전시관</h2>
          <p className="lead">로비에서 서쪽은 웹툰관, 북쪽은 일러스트관, 동쪽은 출판만화·애니메이션관. 부스마다 작가의 대표작 색을 벽에 입혔습니다.</p>
          <div className="dept-row">
            {DEPTS.map((d) => {
              const list = byDept(d.code);
              return (
                <Link key={d.code} to={`/artists?d=${d.code}`} className="dept-card" style={{ ["--c" as string]: d.color }}>
                  <i>{d.en}</i><b>{d.ko}</b>
                  <div className="n">{counts[d.code]}<small>명</small></div>
                  <div className="faces">{list.slice(0, 8).map((a) => <img key={a.id} src={avatarOf(a)} alt={a.name} loading="lazy" />)}</div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="band">
        <div className="wrap">
          <div className="eyebrow">Graduates</div>
          <h2 className="h2">졸업생 {ARTISTS.length}명, 부스 {ARTISTS.length}개</h2>
          <p className="lead">카드를 누르면 작가 페이지로, 작가 페이지에서 바로 그 부스로 들어갑니다. 전시장 안에서 작품을 누르면 크게 볼 수 있습니다.</p>
          <div className="grid">{ARTISTS.map((a) => <ArtistCard key={a.id} a={a} />)}</div>
        </div>
      </section>

      <section className="band night">
        <div className="wrap qrband">
          <div>
            <div className="eyebrow">Mobile</div>
            <h2 className="h2">입구 QR — 휴대폰으로 들어오기</h2>
            <p className="lead">전시장 입구와 부스마다 QR 을 붙입니다. 찍으면 같은 가상 전시장이 휴대폰에서 열리고, 부스 QR 은 그 작가의 부스 앞에서 시작합니다. 인쇄용 QR 모음은 <Link to="/qr" style={{ textDecoration: "underline" }}>QR 페이지</Link>에.</p>
            <div className="row"><Link to="/qr" className="btn ghost">QR 전체 인쇄</Link><Link to="/about" className="btn ghost">전시 소개·인사말</Link></div>
          </div>
          <div style={{ background: "#fff", padding: 12, borderRadius: 14 }}><QR url={urlOfEntrance()} size={180} alt="입구 QR" /></div>
        </div>
      </section>

      <section className="band paper">
        <div className="wrap hosts-home">
          <div className="hosts">{HOSTS.map((h) => <div key={h.id} className="host on"><img src={h.img} alt={h.name} /><b>{h.name}</b><span>{h.role}</span></div>)}</div>
          <div>
            <div className="eyebrow">Ceremony</div>
            <h2 className="h2">학과장과 졸전준비위원장이 개회식을 진행합니다</h2>
            <p className="lead">전시장 입구에서 두 분이 기다립니다. 눌러서 개회식 안내를 듣고 로비로 들어가세요. 로비 왼쪽 포토존에서는 작가 캐릭터와 사진을 찍을 수 있습니다.</p>
            <div className="row"><Link to="/gallery" className="btn primary">입구에서 개회식 보기 →</Link><Link to="/photo" className="btn">📷 포토존</Link></div>
          </div>
        </div>
      </section>

      <section className="band sand">
        <div className="wrap">
          <div className="eyebrow">Greeting</div>
          <h2 className="h2">{EX.greeting.title}</h2>
          <p className="lead">{EX.greeting.paras[0]}</p>
          <div className="row"><Link to="/about" className="btn">인사말 전문 · 축전 · 졸업전시준비위원회 →</Link></div>
        </div>
      </section>
    </>
  );
}
