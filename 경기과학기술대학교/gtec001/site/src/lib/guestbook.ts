// 방명록 저장소. 서버 주소(구글 앱스 스크립트 웹앱)가 있으면 거기에 쓰고 읽는다. 없으면 이 기기(localStorage)에만 남긴다.
//  주소 정하는 법(둘 중 하나):  public/config.json → { "guestbook_url": "https://script.google.com/macros/s/.../exec" }
//                              또는 빌드 때 VITE_GUESTBOOK_URL
export type Entry = { id: string; name: string; message: string; time: string; local?: boolean };
const KEY = "gtec001_guestbook_local";
let urlCache: string | null | undefined;

export async function guestbookUrl(): Promise<string | null> {
  if (urlCache !== undefined) return urlCache;
  let u = (import.meta.env.VITE_GUESTBOOK_URL as string | undefined) || "";
  try { const r = await fetch("config.json", { cache: "no-store" }); if (r.ok && (r.headers.get("content-type") || "").includes("json")) { const c = await r.json(); if (c.guestbook_url) u = c.guestbook_url; } } catch { /* 없음 */ }
  urlCache = u || null; return urlCache;
}
function localList(): Entry[] { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; } }
function localSave(list: Entry[]) { try { localStorage.setItem(KEY, JSON.stringify(list.slice(0, 300))); } catch { /* 저장 불가 */ } }

export async function listEntries(limit = 100): Promise<{ entries: Entry[]; remote: boolean }> {
  const u = await guestbookUrl();
  if (u) {
    try {
      const r = await fetch(`${u}?limit=${limit}&_=${Date.now()}`, { redirect: "follow" });
      const j = await r.json(); if (Array.isArray(j.entries)) return { entries: j.entries, remote: true };
    } catch { /* 서버 실패 → 로컬 */ }
  }
  return { entries: localList().slice(0, limit), remote: false };
}

export async function postEntry(name: string, message: string): Promise<{ ok: boolean; remote: boolean; error?: string }> {
  const e: Entry = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, name: name.trim().slice(0, 20) || "익명", message: message.trim().slice(0, 300), time: new Date().toISOString() };
  if (!e.message) return { ok: false, remote: false, error: "내용을 적어 주세요." };
  const u = await guestbookUrl();
  if (u) {
    try {
      // text/plain 으로 보내야 브라우저가 사전 요청(preflight) 없이 앱스 스크립트에 닿는다
      const r = await fetch(u, { method: "POST", redirect: "follow", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ ...e, ua: navigator.userAgent.slice(0, 80) }) });
      const j = await r.json().catch(() => ({ ok: r.ok }));
      if (j.ok) return { ok: true, remote: true };
      return { ok: false, remote: true, error: j.error || "서버가 거절했습니다." };
    } catch (err) { return { ok: false, remote: true, error: "서버에 닿지 못했습니다. " + (err as Error).message }; }
  }
  localSave([{ ...e, local: true }, ...localList()]); return { ok: true, remote: false };
}
export const fmtTime = (iso: string) => { const d = new Date(iso); return isNaN(d.getTime()) ? iso : `${d.getMonth() + 1}.${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };
