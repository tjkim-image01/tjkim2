/* tj001 숏폼 타임라인 — 9:16 1080×1920. durations.json(01_숏폼) 기준. */
window.ASSETS = {};
window.BUILD = (D) => {
  const W = 1080, HH = 1920, CX = 540, CY = 900;
  const S = D.scenes.map((s) => s.start); const END = D.total;
  const nx = (i) => (D.scenes[i + 1] ? D.scenes[i + 1].start : END);
  const items = [], caps = [];
  const cap = (t0, t1, text, o) => caps.push([t0, t1, text, o]);
  const { IN, HOLD, FADE, POP, STAMP } = K;
  const add = (...its) => items.push(...its);
  const CW = 700, CH = 450;
  // 상단 고정 타이틀 띠
  add(K.item(0, END, HOLD(0, { x: 0, y: 0 }), (g) => { g.fillStyle = PAL.ink; g.fillRect(0, 0, W, 150); H.text(g, "티제이 김 컬렉션 · 엽서", CX, 95, { size: 40, w: "EB", color: PAL.cream, align: "center" }); }, { z: 7 }));

  // S01 훅 — 폰 → 종이
  { const T = S[0], N = nx(0);
    add(K.icon(T, T + 2.2, [[T, { x: CX, y: CY + 40, s: 1, a: 0 }], [T + 0.4, { x: CX, y: CY + 40, s: 1, a: 1, ease: "out" }], [T + 1.6, { x: CX, y: CY + 40, s: 1, a: 1 }], [T + 2.2, { x: CX, y: CY + 40, s: 0.6, a: 0, ease: "in" }]], "phone", 700, PAL.ink));
    add(K.card(T + 1.8, N, [[T + 1.8, { x: CX, y: CY + 40, s: 1.4, a: 0, r: 0.12 }], [T + 2.4, { x: CX, y: CY + 40, s: 1, a: 1, r: -0.03, ease: "back" }]], CW, CH, { tint: PAL.cream }));
    add(K.text(T + 0.2, N, POP(T + 0.2, { x: CX, y: 340, s: 1 }), "1900년의\n{인스타그램}", { size: 110, w: "EB", color: PAL.ink, align: "center", lh: 1.1, hlStyle: "color" }));
    add(K.text(T + 2.8, N, FADE(T + 2.8, { x: CX, y: 1420 }), "이 종이 한 장", { size: 64, w: "EB", color: PAL.red, align: "center" })); }

  // S02 거절
  { const T = S[1], N = nx(1);
    add(K.text(T, N, FADE(T, { x: CX, y: 420 }), "1865", { size: 200, w: "EB", color: "rgba(31,42,55,0.18)", align: "center" }));
    add(K.item(T + 0.4, N, POP(T + 0.4, { x: CX, y: 760, s: 1 }), (g) => { g.fillStyle = PAL.paper2; H.shadow(g, true); H.rrect(g, -300, -140, 600, 300, 12); g.fill(); H.shadow(g, false); g.strokeStyle = "rgba(60,45,25,0.4)"; g.lineWidth = 3; H.rrect(g, -300, -140, 600, 300, 12); g.stroke(); g.beginPath(); g.moveTo(-300, -135); g.lineTo(0, 60); g.lineTo(300, -135); g.stroke(); }));
    add(K.text(T + 1.2, N, FADE(T + 1.2, { x: CX, y: 1000 }), "봉투 없는 편지?", { size: 64, w: "EB", color: PAL.ink, align: "center" }));
    add(K.text(T + 3.2, N, [[T + 3.2, { x: CX, y: 1200, a: 0, rv: 0 }], [T + 4.6, { x: CX, y: 1200, a: 1, rv: 1, ease: "linear" }]], "\"{남이 읽잖아}.\n품위 없어.\"", { size: 84, w: "EB", color: PAL.ink, align: "center", lh: 1.2, hlStyle: "color" }));
    add(K.seal(T + 7.6, N, STAMP(T + 7.6, { x: CX + 60, y: 1500, s: 1, r: -0.12 }), 440, 180, "거절", PAL.red)); }

  // S03 1869
  { const T = S[2], N = nx(2);
    add(K.postmark(T + 0.2, N, [[T + 0.2, { x: CX, y: 520, p: 0, s: 1.6 }], [T + 0.5, { x: CX, y: 520, p: 1, s: 1, ease: "in" }]], 150, { text: "1869", sub: "WIEN", waves: false }));
    add(K.item(T + 1.6, N, [[T + 1.6, { x: 120, y: 760, p: 0 }], [T + 4.6, { x: 120, y: 760, p: 1, ease: "out" }]], (g, t, p) => { const cols = 8, rows = 6, n = Math.floor(p.p * cols * rows); for (let i = 0; i < n; i++) { const c = i % cols, r = Math.floor(i / cols); g.fillStyle = "#E9D7A8"; H.shadow(g, true, 8, 4, 0.18); g.fillRect(c * 108, r * 78, 92, 62); H.shadow(g, false); g.strokeStyle = "rgba(60,45,25,0.3)"; g.lineWidth = 1.5; g.strokeRect(c * 108, r * 78, 92, 62); } }));
    add(K.counter(T + 2.0, N, [[T + 2.0, { x: CX, y: 1440, v: 0, a: 0 }], [T + 2.3, { x: CX, y: 1440, v: 0, a: 1 }], [T + 4.8, { x: CX, y: 1440, v: 1, ease: "out" }]], 3000000, { unit: " 장", size: 120, label: "석 달 만에" }));
    add(K.text(T + 5.6, N, POP(T + 5.6, { x: CX, y: 1640, s: 1 }), "싸다 · {빠르다} · 짧다", { size: 60, w: "EB", color: PAL.ink, align: "center", hlStyle: "color" })); }

  // S04 조선 1900
  { const T = S[3], N = nx(3);
    add(K.text(T, N, FADE(T, { x: CX, y: 400 }), "1900. 5. 10", { size: 96, w: "EB", color: PAL.red, align: "center" }));
    add(K.stamp(T + 0.6, N, [[T + 0.6, { x: CX, y: 760, s: 0, a: 0, r: -0.05 }], [T + 1.2, { x: CX, y: 760, s: 1, a: 1, r: -0.05, ease: "back" }], [T + 4.4, { x: CX, y: 760, s: 1, r: -0.05 }], [T + 5.2, { x: 220, y: 560, s: 0.6, r: -0.08, ease: "inout" }]], 300, 380, { color: PAL.red, text: "一錢", flower: true }));
    add(K.text(T + 1.6, T + 5.2, FADE(T + 1.6, { x: CX, y: 1080 }), "대한제국 {1전} 우체엽서", { size: 60, w: "B", color: PAL.ink, align: "center", hlStyle: "color" }));
    add(K.icon(T + 5.4, N, [[T + 5.4, { x: CX + 120, y: 700, s: 0, a: 0 }], [T + 5.9, { x: CX + 120, y: 700, s: 1, a: 1, ease: "back" }], [T + 8.4, { x: CX + 120, y: 700, s: 1, a: 1 }], [T + 9.2, { x: CX + 220, y: 660, s: 0.7, a: 0.3, ease: "out" }]], "hat", 220, PAL.ink));
    add(K.text(T + 6.0, N, [[T + 6.0, { x: CX, y: 1000, a: 0, rv: 0 }], [T + 7.0, { x: CX, y: 1000, a: 1, rv: 1, ease: "linear" }]], "양반: \"{남이 읽잖아}\"", { size: 72, w: "EB", color: PAL.ink, align: "center", hlStyle: "color" }));
    [["jige", "상인"], ["person", "서민"]].forEach(([nm, lb], i) => { const t = T + 9.0 + i * 0.5, x = 360 + i * 360; add(K.icon(t, N, [[t, { x, y: 1400, s: 0.6, a: 0 }], [t + 0.6, { x, y: 1300, s: 1.3, a: 1, ease: "back" }]], nm, 170, PAL.blue)); add(K.text(t + 0.3, N, FADE(t + 0.3, { x, y: 1460 }), lb, { size: 56, w: "EB", color: PAL.blue, align: "center" })); });
    add(K.text(T + 10.2, N, FADE(T + 10.2, { x: CX, y: 1620 }), "먼저 쓴 사람들", { size: 52, w: "B", color: PAL.ink2, align: "center" })); }

  // S05 70억
  { const T = S[4], N = nx(4);
    add(K.text(T, N, FADE(T, { x: CX, y: 420 }), "1905년 한 해", { size: 64, w: "B", color: PAL.ink2, align: "center" }));
    add(K.counter(T + 0.3, N, [[T + 0.3, { x: CX, y: 760, v: 0, a: 0 }], [T + 0.6, { x: CX, y: 760, v: 0, a: 1 }], [T + 3.0, { x: CX, y: 760, v: 1, ease: "out" }]], 70, { fmt: (v) => H.num(v), unit: "억 장", size: 190, label: "전 세계" }));
    [["photo", "사진"], ["text", "한 줄"], ["send", "보내기"]].forEach(([nm, lb], i) => { const t = T + 3.2 + i * 0.5, x = 230 + i * 310; add(K.icon(t, N, POP(t, { x, y: 1150, s: 1 }), nm, 130, PAL.ink)); add(K.text(t + 0.2, N, FADE(t + 0.2, { x, y: 1290 }), lb, { size: 50, w: "B", color: PAL.ink, align: "center" })); if (i < 2) add(K.text(t + 0.4, N, FADE(t + 0.4, { x: x + 155, y: 1175 }), "+", { size: 80, w: "EB", color: PAL.red, align: "center" })); }); }

  // S06 착지
  { const T = S[5], N = END;
    add(K.icon(T, N, FADE(T, { x: CX, y: 760, s: 1 }), "phone", 700, PAL.ink));
    add(K.card(T + 0.6, N, [[T + 0.6, { x: CX, y: 760, s: 1.3, a: 0, r: -0.08 }], [T + 1.2, { x: CX, y: 760, s: 0.52, a: 1, r: 0, ease: "back" }]], CW, CH, { tint: PAL.cream }));
    add(K.text(T + 1.6, N, FADE(T + 1.6, { x: CX, y: 1260 }), "우린 지금도 매일\n{엽서}를 보낸다", { size: 72, w: "EB", color: PAL.ink, align: "center", lh: 1.2, hlStyle: "color" }));
    add(K.counter(T + 4.2, N, [[T + 4.2, { x: CX, y: 1560, v: 0, a: 0 }], [T + 4.5, { x: CX, y: 1560, v: 0, a: 1 }], [T + 6.2, { x: CX, y: 1560, v: 1, ease: "out" }]], 1000, { unit: "장+", size: 120, color: PAL.red, label: "TJ Kim Collection · 엽서" }));
    add(K.text(T + 6.8, N, FADE(T + 6.8, { x: CX, y: 1760 }), "뒷면 이야기는 롱폼에서 →", { size: 40, w: "B", color: PAL.ink2, align: "center" })); }

  for (const it of items) if (it.extra && it.extra.z != null) it.z = it.extra.z;
  return { W, H: HH, duration: END, items, camera: K.camera(W, HH, S, 1.05, 10), overlay: (g, t) => {} };
};
