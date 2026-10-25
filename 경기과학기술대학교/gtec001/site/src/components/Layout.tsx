import { Link, NavLink } from "react-router-dom";
import { EX, ARTISTS } from "../lib/data";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="top">
        <Link to="/" className="logo">
          <span className="logo-chip">GTEC 웹툰일러스트학과 · 제4회 졸업전시</span>
          <span className="logo-title">MOVE : 이소</span>
        </Link>
        <nav className="nav">
          <NavLink to="/" end>홈</NavLink>
          <NavLink to="/artists">작가 {ARTISTS.length}</NavLink>
          <NavLink to="/about">전시 소개</NavLink>
          <NavLink to="/photo">포토존</NavLink>
          <NavLink to="/guestbook">방명록</NavLink>
          <NavLink to="/qr">QR</NavLink>
          <NavLink to="/gallery" className="cta">3D 전시장 입장</NavLink>
        </nav>
      </header>
      <main>{children}</main>
      <footer className="foot">
        <div className="foot-in">
          <div><b>{EX.title} — {EX.subtitle}</b> · {EX.school} {EX.dept} {EX.edition} · {EX.dates} · 졸업생 {ARTISTS.length}명의 웹툰·일러스트·출판만화·애니메이션</div>
          <div>{EX.colophon.replace(/^\d+\s*/, "")}</div>
          <div className="small" style={{ color: "rgba(246,241,231,.5)" }}>이 가상 전시장은 졸업전시 도록과 학생 제출 자료로 만든 미리보기 버전입니다. 공개 전 학과·작가 확인이 필요합니다.</div>
        </div>
      </footer>
    </>
  );
}
