import { useSearchParams } from "react-router-dom";
import { ARTISTS, DEPTS } from "../lib/data";
import { ArtistCard } from "../components/ArtistCard";

export default function ArtistsPage() {
  const [sp, setSp] = useSearchParams();
  const d = sp.get("d") || "";
  const list = d ? ARTISTS.filter((a) => a.dept === d) : ARTISTS;
  return (
    <section className="band">
      <div className="wrap">
        <div className="eyebrow">Graduates</div>
        <h2 className="h2">작가 {list.length}명</h2>
        <div className="filter">
          <button className={d ? "" : "on"} onClick={() => setSp({})}>전체 {ARTISTS.length}</button>
          {DEPTS.map((x) => <button key={x.code} className={d === x.code ? "on" : ""} onClick={() => setSp({ d: x.code })}>{x.ko} {ARTISTS.filter((a) => a.dept === x.code).length}</button>)}
        </div>
        <div className="grid">{list.map((a) => <ArtistCard key={a.id} a={a} />)}</div>
      </div>
    </section>
  );
}
