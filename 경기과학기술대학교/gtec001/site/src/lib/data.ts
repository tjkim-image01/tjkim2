// 작가 42명 · 전시 공통 자료. scripts/build_data.py 가 만든 json 을 읽는다.
import artistsJson from "../data/artists.json";
import exhibitionJson from "../data/exhibition.json";
import hostsJson from "../data/hosts.json";

// 배포마다 바뀌는 버전 문자열. 같은 이름으로 교체되는 그림(진행자·서명·축전·표지)에 ?v= 로 붙여 옛 캐시가 보이지 않게 한다
export const BUILD_ID: string = typeof __BUILD_ID__ !== "undefined" ? __BUILD_ID__ : "dev";
export const v = (p: string) => `${p}${p.includes("?") ? "&" : "?"}v=${BUILD_ID}`;

export type Img = { file: string; thumb: string; tex: string; w: number; h: number; strip?: boolean; src?: string };
export type Palette = { base: string; accent: string; dark: string; wall: string; floor: string; mood: "dark" | "light" };
export type Artist = {
  id: string; dept: DeptCode; dept_ko: string; dept_en: string; student_no: string; name: string; name_en: string;
  email: string; sns: string; title: string; intro: string; note: string; intro_src: string; catalog_page: number | null;
  avatar: string | null; main: Img | null; works: Img[]; sign: string | null; palette: Palette | null;
};
export type DeptCode = "webtoon" | "illust" | "comics" | "anim";
export type Dept = { code: DeptCode; ko: string; en: string; color: string };
export type Exhibition = typeof exhibitionJson;

export const ARTISTS = artistsJson as unknown as Artist[];
export const EX = { ...exhibitionJson, cover: v(exhibitionJson.cover), logo: v(exhibitionJson.logo) } as Exhibition;
export const DEPTS = EX.depts as Dept[];
// 개회식 진행: 학과장 + 사회자. 사진은 public/hosts/*.png 교체, 대사는 src/data/hosts.json
export type Host = { id: "dean" | "mc"; name: string; role: string; img: string; color: string };
export const HOSTS = (hostsJson.hosts as Host[]).map((h) => ({ ...h, img: v(h.img) }));
export const hostOf = (id: string) => HOSTS.find((h) => h.id === id)!;
export const CEREMONY: { who: "dean" | "mc"; text: string }[] = hostsJson.ceremony.map((l) => ({
  who: l.who as "dean" | "mc",
  text: l.text === "@greeting0" ? EX.greeting.paras[0] : l.text === "@greetingLast" ? EX.greeting.paras[EX.greeting.paras.length - 1] : l.text,
}));
export const ENTRANCE_BUBBLES = hostsJson.entrance_bubbles as Record<"dean" | "mc", string>;
export const deptOf = (code: string) => DEPTS.find((d) => d.code === code)!;
export const artistById = (id?: string) => ARTISTS.find((a) => a.id === id);
export const byDept = (code: DeptCode) => ARTISTS.filter((a) => a.dept === code);

// 자산 경로 (vite base 가 ./ 이므로 상대 경로). v(): 배포 때마다 바뀌는 버전을 붙여 같은 이름으로 교체된 그림이 옛 캐시로 보이지 않게 한다
export const asset = (p: string) => p.replace(/^\//, "");
export const artImg = (a: Artist, file: string) => `artists/${a.id}/${file}`;
export const avatarOf = (a: Artist) => a.avatar ? artImg(a, a.avatar) : a.main ? artImg(a, a.main.thumb) : "";
export const signOf = (a: Artist) => a.sign ? v(`sign/${a.sign}`) : "";

// SNS 문자열 → 링크 목록. 예 "X : handle / Instagram : handle", "네이버블로그 : https://..."
export function snsLinks(s: string): { label: string; href: string; handle: string }[] {
  if (!s) return [];
  return s.split(/\s*\/\s*(?=[A-Za-z가-힣]+\s*:)/).map((part) => {
    const m = part.match(/^\s*([^:]+?)\s*:\s*(.+)$/); if (!m) return null;
    const platform = m[1].trim(); let handle = m[2].trim().replace(/^@/, "");
    const p = platform.toLowerCase();
    if (handle.startsWith("http")) return { label: platform, href: handle, handle: handle.replace(/^https?:\/\//, "") };
    if (p === "x" || p.includes("트위터") || p.includes("twitter")) return { label: "X", href: `https://x.com/${handle.replace(/.*\(@?([^)]+)\).*/, "$1")}`, handle: "@" + handle };
    if (p.includes("instagram") || p.includes("인스타")) return { label: "Instagram", href: `https://instagram.com/${handle}`, handle: "@" + handle };
    return { label: platform, href: "", handle };
  }).filter(Boolean) as { label: string; href: string; handle: string }[];
}

// 사이트 주소(QR 용). 배포 주소가 정해지면 ?base= 없이도 현재 주소를 그대로 쓴다.
export function siteBase(): string {
  const q = new URLSearchParams(window.location.search).get("base");
  if (q) return q.replace(/\/?$/, "/");
  return window.location.origin + window.location.pathname.replace(/[^/]*$/, "");
}
export const urlOfArtist = (id: string) => `${siteBase()}#/a/${id}`;
export const urlOfBooth = (id: string) => `${siteBase()}#/booth/${id}`;
export const urlOfEntrance = () => `${siteBase()}#/gallery`;
export const urlOfGuestbook = () => `${siteBase()}#/guestbook?open=1`;

export const prevNext = (a: Artist) => {
  const i = ARTISTS.findIndex((x) => x.id === a.id);
  return { prev: ARTISTS[(i - 1 + ARTISTS.length) % ARTISTS.length], next: ARTISTS[(i + 1) % ARTISTS.length] };
};
