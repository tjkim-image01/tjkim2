import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ARTISTS, EX, urlOfGuestbook } from "../lib/data";
import { Entry, fmtTime, guestbookUrl, listEntries, postEntry } from "../lib/guestbook";
import { QR } from "../components/QR";

// 방명록: 입구 방명록대의 QR 로 들어온 휴대폰에서 바로 쓴다. 서버(앱스 스크립트) 연결 전에는 이 기기에만 남는다.
export default function GuestbookPage() {
  const [sp] = useSearchParams();
  const [entries, setEntries] = useState<Entry[]>([]); const [remote, setRemote] = useState<boolean | null>(null);
  const [name, setName] = useState(""); const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false); const [note, setNote] = useState("");
  const load = useCallback(async () => { const r = await listEntries(200); setEntries(r.entries); setRemote(r.remote); }, []);
  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, [load]);
  const [hasUrl, setHasUrl] = useState<boolean | null>(null);
  useEffect(() => { guestbookUrl().then((u) => setHasUrl(!!u)); }, []);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); if (busy) return; setBusy(true); setNote("");
    const r = await postEntry(name, msg); setBusy(false);
    if (r.ok) { setMsg(""); setNote(r.remote ? "방명록에 남겼습니다. 고맙습니다!" : "이 기기에 저장했습니다(서버 연결 전)."); load(); }
    else setNote(r.error || "실패했습니다.");
  };
  const fromQR = sp.get("open") === "1";
  return (
    <>
      <section className="band night" style={{ padding: "40px 0 30px" }}>
        <div className="wrap">
          <div className="eyebrow">Guestbook</div>
          <h2 className="h2">방명록</h2>
          <p className="lead">{EX.title}에 다녀간 흔적을 남겨 주세요. 졸업생 {ARTISTS.length}명에게 전해집니다. {fromQR ? "아래에 바로 적을 수 있어요." : ""}</p>
        </div>
      </section>
      <section className="band paper" style={{ padding: "30px 0 60px" }}>
        <div className="wrap gb">
          <form className="gb-form box" onSubmit={submit}>
            <h3>한마디 남기기</h3>
            <label>이름(별명) <input value={name} onChange={(e) => setName(e.target.value)} maxLength={20} placeholder="익명도 괜찮아요" /></label>
            <label>내용 <textarea value={msg} onChange={(e) => setMsg(e.target.value)} maxLength={300} rows={4} placeholder="축하 인사, 인상 깊었던 작품, 작가에게 하고 싶은 말…" required /></label>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <span className="small">{msg.length}/300</span>
              <button className="btn primary" disabled={busy}>{busy ? "남기는 중…" : "방명록에 남기기"}</button>
            </div>
            {note && <p className="small" style={{ color: "var(--accent)", marginTop: 8 }}>{note}</p>}
            {hasUrl === false && <p className="small" style={{ marginTop: 10 }}>※ 아직 방명록 서버(구글 시트)가 연결되지 않아 이 기기 안에만 저장됩니다. 연결 방법은 site/README 「방명록」 항목.</p>}
          </form>
          <div>
            <div className="row" style={{ justifyContent: "space-between", marginBottom: 12 }}>
              <h3 className="h3" style={{ margin: 0 }}>남겨 주신 글 {entries.length}{remote === false ? " (이 기기)" : ""}</h3>
              <button className="btn small" onClick={load}>새로고침</button>
            </div>
            {entries.length === 0 && <p className="small">아직 글이 없습니다. 첫 번째 방명록을 남겨 주세요.</p>}
            <ul className="gb-list">
              {entries.map((e) => <li key={e.id}><b>{e.name}</b><span>{fmtTime(e.time)}</span><p>{e.message}</p></li>)}
            </ul>
          </div>
        </div>
        <div className="wrap" style={{ marginTop: 40 }}>
          <div className="qrcard"><QR url={urlOfGuestbook()} size={120} alt="방명록 QR" /><div><b>휴대폰으로 쓰기</b><p className="small" style={{ margin: 0 }}>이 QR 을 찍으면 휴대폰에서 방명록이 열립니다. 전시장 입구 방명록대에도 같은 QR 이 있습니다.</p><Link to="/gallery" className="btn small" style={{ marginTop: 8 }}>← 3D 전시장</Link></div></div>
        </div>
      </section>
    </>
  );
}
