import { useState } from "react";
import { Link } from "react-router-dom";
import { ARTISTS, DEPTS, EX, siteBase } from "../lib/data";
import { QR } from "../components/QR";

// 인쇄용 QR 모음: 입구 1 + 부스 42. 배포 주소가 정해지기 전엔 주소 칸에 적어 넣고 인쇄한다.
export default function QRPage() {
  const [base, setBase] = useState(siteBase());
  const b = base.replace(/\/?$/, "/");
  const entrance = `${b}#/gallery`;
  return (
    <div className="qrsheet">
      <div className="sheet">
        <div className="qr-tools">
          <Link to="/" className="btn small">← 홈</Link>
          <label>사이트 주소 <input value={base} onChange={(e) => setBase(e.target.value)} /></label>
          <button className="btn small primary" onClick={() => window.print()}>인쇄</button>
          <span className="small">QR 은 이 주소 기준으로 만들어집니다. 배포 후 실제 주소를 넣고 인쇄하세요.</span>
        </div>
        <div className="qr-entrance">
          <QR url={entrance} size={300} alt="입구 QR" />
          <div>
            <div className="eyebrow">Entrance</div>
            <h1>{EX.title}</h1>
            <p>{EX.school} {EX.dept} {EX.edition} · {EX.dates}</p>
            <p>휴대폰으로 찍으면 가상 전시장 입구로 들어갑니다. 졸업생 {ARTISTS.length}명 · 부스 {ARTISTS.length}개</p>
            <p className="small">{entrance}</p>
          </div>
        </div>
        {DEPTS.map((d) => (
          <div key={d.code} style={{ marginBottom: 30 }}>
            <h2 className="h2" style={{ fontSize: 24 }}>{d.ko} <span className="small">{d.en}</span></h2>
            <div className="qr-grid">
              {ARTISTS.filter((a) => a.dept === d.code).map((a) => (
                <div className="qr-item" key={a.id} style={{ ["--c" as string]: d.color }}>
                  <QR url={`${b}#/a/${a.id}`} size={130} alt={`${a.name} QR`} />
                  <div>
                    <i>{a.dept_en} · {a.id.toUpperCase()}</i>
                    <b>{a.name}</b>
                    <i>{a.name_en}</i>
                    <div className="t">「{a.title}」</div>
                    <div className="u">{b}#/a/{a.id}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
