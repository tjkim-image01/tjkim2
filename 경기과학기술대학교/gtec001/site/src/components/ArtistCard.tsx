import { Link } from "react-router-dom";
import { Artist, artImg, avatarOf } from "../lib/data";

export function ArtistCard({ a }: { a: Artist }) {
  return (
    <Link to={`/artists/${a.id}`} className="acard">
      <div className="acard-img">
        {a.main && <img src={artImg(a, a.main.thumb)} alt={a.title} loading="lazy" />}
        <span className={`chip ${a.dept}`}>{a.dept_ko}</span>
        {a.avatar && <img className="avatar" src={avatarOf(a)} alt="" loading="lazy" />}
      </div>
      <div className="acard-body">
        <b>{a.name}</b>
        <span className="en">{a.name_en}</span>
        <span className="t">{a.title}</span>
      </div>
    </Link>
  );
}
