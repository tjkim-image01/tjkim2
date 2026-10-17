/* tj001 롱폼 타임라인 — 16:9 1920×1080. durations.json 의 장면 시작 시각을 기준으로 모든 키프레임을 쓴다.
 * window.BUILD(D) → { W, H, duration, items, camera, overlay }
 */
window.ASSETS = {};
window.BUILD = (D) => {
  const W = 1920, HH = 1080, CX = 960, CY = 520;
  const S = D.scenes.map((s) => s.start); const END = D.total;
  const nx = (i) => (D.scenes[i + 1] ? D.scenes[i + 1].start : END);
  const items = [], caps = [];
  const cap = (t0, t1, text, o) => caps.push([t0, t1, text, o]);
  const { IN, HOLD, FADE, POP, STAMP, OUT } = K;
  const add = (...its) => items.push(...its);
  const CARD_W = 560, CARD_H = 360; // 14:9

  // ---------- S01 훅 ----------
  { const T = S[0], N = nx(0);
    add(K.card(T, N, [[T, { x: CX, y: CY - 40, s: 1.35, a: 0, r: 0.08 }], [T + 0.7, { x: CX, y: CY - 40, s: 1, a: 1, r: -0.01, ease: "back" }], [T + 4.6, { x: CX, y: CY - 40, s: 1, r: -0.01 }], [T + 5.4, { x: 520, y: CY - 40, s: 0.9, r: -0.03, ease: "inout" }]], CARD_W, CARD_H, { photo: null }, ), );
    add(K.dim(T + 1.2, T + 5.2, [[T + 1.2, { x: CX, y: CY - 40, p: 0 }], [T + 2.0, { x: CX, y: CY - 40, p: 1, ease: "out" }]], -CARD_W / 2, -CARD_H / 2 - 34, CARD_W / 2, -CARD_H / 2 - 34, "14 cm"));
    add(K.dim(T + 1.8, T + 5.2, [[T + 1.8, { x: CX, y: CY - 40, p: 0 }], [T + 2.5, { x: CX, y: CY - 40, p: 1, ease: "out" }]], -CARD_W / 2 - 34, -CARD_H / 2, -CARD_W / 2 - 34, CARD_H / 2, "9 cm"));
    add(K.text(T + 2.6, T + 5.2, FADE(T + 2.6, { x: CX, y: CY + 230 }), "종이 한 장", { size: 64, w: "EB", color: PAL.ink, align: "center" }));
    // 70억 카운터
    add(K.counter(T + 5.6, N, [[T + 5.6, { x: 1290, y: CY - 10, v: 0, a: 0 }], [T + 6.0, { x: 1290, y: CY - 10, v: 0, a: 1 }], [T + 9.0, { x: 1290, y: CY - 10, v: 1, ease: "out" }]], 70, { fmt: (v) => H.num(v, { digits: 0 }), unit: "억 장", size: 150, label: "1905년 · 한 해 · 전 세계" }));
    add(K.text(T + 5.8, N, FADE(T + 5.8, { x: 1290, y: CY - 150 }), "1905", { size: 56, w: "B", color: PAL.ink2, align: "center" }));
    // 아이콘 3개
    const iy = CY + 250; const names = [["photo", "사진 한 장"], ["text", "글 한 줄"], ["send", "보내기"]];
    names.forEach(([nm, lb], i) => { const x = 620 + i * 340, t = T + 11.2 + i * 0.9;
      add(K.icon(t, N, POP(t, { x, y: iy, s: 1 }), nm, 96, PAL.ink));
      add(K.text(t + 0.2, N, FADE(t + 0.2, { x, y: iy + 110 }), lb, { size: 40, w: "B", color: PAL.ink, align: "center" }));
      if (i < 2) add(K.text(t + 0.6, N, FADE(t + 0.6, { x: x + 170, y: iy + 18 }), "+", { size: 70, w: "EB", color: PAL.red, align: "center" })); });
    add(K.text(T + 16.0, N, [[T + 16.0, { x: CX, y: 140, a: 0, rv: 0 }], [T + 17.6, { x: CX, y: 140, a: 1, rv: 1, ease: "linear" }]], "120년 전 사람들은 {이미} 이렇게 살았습니다", { size: 54, w: "B", color: PAL.ink, align: "center", hlStyle: "color" }));
    cap(T, T + 5.4, "14 × 9 cm 종이 한 장"); cap(T + 5.4, T + 11, "1905년 한 해, 전 세계 {70억 장}"); cap(T + 11, N, "사진 한 장 + 글 한 줄 + 보내기"); }

  // ---------- S02 거절 (1865) ----------
  { const T = S[1], N = nx(1);
    add(K.text(T, N, FADE(T, { x: 160, y: 250 }), "1865", { size: 220, w: "EB", color: "rgba(31,42,55,0.14)" }));
    add(K.text(T + 0.4, N, FADE(T + 0.4, { x: 160, y: 320 }), "독일 · 카를스루에 우편 회의", { size: 40, w: "B", color: PAL.ink2 }));
    // 봉투와 그 안의 카드
    add(K.card(T + 1.0, N, [[T + 1.0, { x: CX + 120, y: CY + 60, s: 0.75, a: 0 }], [T + 1.6, { x: CX + 120, y: CY + 60, s: 0.75, a: 1, ease: "out" }], [T + 3.4, { x: CX + 120, y: CY + 60, s: 0.75 }], [T + 4.6, { x: CX + 120, y: CY - 150, s: 0.8, r: -0.04, ease: "inout" }]], CARD_W, CARD_H, { back: true, lines: 3, divider: 0, stampOn: false, scribble: 0.6 }, ));
    add(K.item(T + 1.0, N, [[T + 1.0, { x: CX + 120, y: CY + 110, s: 0, a: 0 }], [T + 1.6, { x: CX + 120, y: CY + 110, s: 1, a: 1, ease: "back" }], [T + 3.6, { x: CX + 120, y: CY + 110, s: 1 }], [T + 4.6, { x: CX + 120, y: CY + 150, s: 1, a: 0.35, ease: "out" }]], (g) => { g.fillStyle = PAL.paper2; H.shadow(g, true); H.rrect(g, -300, -130, 600, 300, 10); g.fill(); H.shadow(g, false); g.strokeStyle = "rgba(60,45,25,0.4)"; g.lineWidth = 3; H.rrect(g, -300, -130, 600, 300, 10); g.stroke(); g.beginPath(); g.moveTo(-300, -125); g.lineTo(0, 60); g.lineTo(300, -125); g.stroke(); }, { z: -1 }));
    add(K.text(T + 5.0, N, FADE(T + 5.0, { x: CX + 120, y: CY + 260 }), "봉투 없는 편지?", { size: 60, w: "EB", color: PAL.ink, align: "center" }));
    // 도장 쾅
    add(K.seal(T + 7.6, N, STAMP(T + 7.6, { x: CX + 300, y: CY - 160, s: 1, r: -0.12 }), 420, 170, "안 된다", PAL.red));
    add(K.text(T + 10.6, N, [[T + 10.6, { x: 160, y: 620, a: 0, rv: 0 }], [T + 11.9, { x: 160, y: 620, a: 1, rv: 1, ease: "linear" }]], "이유는 하나,\n{남이 읽는다}", { size: 92, w: "EB", color: PAL.ink, hlStyle: "color", lh: 1.25 }));
    add(K.text(T + 13.6, N, FADE(T + 13.6, { x: 160, y: 850 }), "\"품위가 없다\"", { size: 48, w: "B", color: PAL.ink2 }));
    cap(T, T + 7.4, "1865 독일 — 봉투 없는 편지?"); cap(T + 7.4, T + 10.4, "→ {거절}"); cap(T + 10.4, N, "이유: \"남이 읽는다\""); }

  // ---------- S03 1869 ----------
  { const T = S[2], N = nx(2);
    add(K.card(T, N, [[T, { x: CX - 300, y: CY - 30, s: 1, a: 0 }], [T + 0.6, { x: CX - 300, y: CY - 30, s: 1, a: 1, ease: "out" }], [T + 7.5, { x: CX - 300, y: CY - 30, s: 1 }], [T + 8.4, { x: 360, y: 330, s: 0.55, ease: "inout" }]], CARD_W, CARD_H, { back: true, tint: "#E9D7A8", lines: 3, divider: 0, stampOn: true, label: "Correspondenz-Karte" }));
    add(K.postmark(T + 2.2, N, [[T + 2.2, { x: CX + 240, y: CY - 160, p: 0, s: 1.6 }], [T + 2.5, { x: CX + 240, y: CY - 160, p: 1, s: 1, ease: "in" }], [T + 7.5, { x: CX + 240, y: CY - 160, s: 1 }], [T + 8.4, { x: 560, y: 240, s: 0.6, ease: "inout" }]], 120, { text: "1869", sub: "10 · 1 · WIEN" }));
    add(K.text(T + 3.4, T + 8.2, FADE(T + 3.4, { x: CX + 120, y: CY + 60 }), "세계 최초의 엽서\n오스트리아", { size: 56, w: "EB", color: PAL.ink, lh: 1.25 }));
    // 복제 그리드
    add(K.item(T + 8.6, N, [[T + 8.6, { x: 760, y: 150, p: 0 }], [T + 12.4, { x: 760, y: 150, p: 1, ease: "out" }]], (g, t, p) => { const cols = 12, rows = 5, n = Math.floor(p.p * cols * rows); for (let i = 0; i < n; i++) { const c = i % cols, r = Math.floor(i / cols); g.fillStyle = "#E9D7A8"; H.shadow(g, true, 8, 4, 0.18); g.fillRect(c * 90, r * 62, 78, 50); H.shadow(g, false); g.strokeStyle = "rgba(60,45,25,0.3)"; g.lineWidth = 1.5; g.strokeRect(c * 90, r * 62, 78, 50); } }));
    add(K.counter(T + 9.0, N, [[T + 9.0, { x: 1300, y: 640, v: 0, a: 0 }], [T + 9.4, { x: 1300, y: 640, v: 0, a: 1 }], [T + 12.6, { x: 1300, y: 640, v: 1, ease: "out" }]], 3000000, { unit: " 장", size: 128, label: "석 달 만에" }));
    const words = ["싸다", "빠르다", "짧다"];
    words.forEach((wd, i) => { const t = T + 13.6 + i * 0.75; add(K.text(t, N, POP(t, { x: 420 + i * 290, y: 820, s: 1 }), wd, { size: 76, w: "EB", color: i === 1 ? PAL.red : PAL.ink, align: "center" })); if (i < 2) add(K.text(t + 0.4, N, FADE(t + 0.4, { x: 565 + i * 290, y: 812 }), "·", { size: 70, w: "EB", color: PAL.gray, align: "center" })); });
    cap(T, T + 8.4, "1869. 10. 1 — 오스트리아, 세계 최초의 엽서"); cap(T + 8.4, T + 13.4, "석 달 만에 {300만 장}"); cap(T + 13.4, N, "싸다 · 빠르다 · 짧다"); }

  // ---------- S04 황금기 ----------
  { const T = S[3], N = nx(3);
    // 카드: 앞면에 에펠탑이 그려지고, 1907 에 뒤집혀 분할선
    add(K.item(T, N, [[T, { x: 640, y: CY - 20, s: 1, a: 0, fx: 1, ep: 0, dv: 0 }], [T + 0.6, { x: 640, y: CY - 20, s: 1, a: 1, fx: 1, ep: 0, dv: 0, ease: "out" }], [T + 1.8, { x: 640, y: CY - 20, ep: 0 }], [T + 4.2, { x: 640, y: CY - 20, ep: 1, ease: "out" }], [T + 7.6, { x: 640, y: CY - 20, fx: 1, dv: 0 }], [T + 8.4, { x: 640, y: CY - 20, fx: -1, dv: 0, ease: "inout" }], [T + 9.4, { x: 640, y: CY - 20, dv: 0 }], [T + 10.6, { x: 640, y: CY - 20, dv: 1, ease: "out" }]], (g, t, p) => {
      const fx = p.fx, w = 620, h = 400; g.scale(Math.max(0.02, Math.abs(fx)), 1);
      if (fx >= 0) { H.card(g, -w / 2, -h / 2, w, h, { tint: PAL.cream, photo: null }); g.fillStyle = "#cfd9e4"; g.fillRect(-w / 2 + w * 0.045, -h / 2 + h * 0.045, w * 0.91, h * 0.91); K.eiffel(g, 0, h / 2 - h * 0.09, h * 0.78, p.ep, PAL.ink); if (p.ep > 0.9) H.text(g, "PARIS 1900", 0, h / 2 - h * 0.11, { size: 26, w: "B", color: PAL.ink2, align: "center" }); }
      else H.card(g, -w / 2, -h / 2, w, h, { back: true, divider: p.dv, lines: 4, scribble: p.dv });
    }));
    add(K.icon(T + 1.6, T + 4.4, [[T + 1.6, { x: 1040, y: 260, s: 0, a: 0 }], [T + 2.0, { x: 1040, y: 260, s: 1, a: 1, ease: "back" }], [T + 2.3, { x: 1040, y: 260, s: 1.25 }], [T + 2.6, { x: 1040, y: 260, s: 1, ease: "out" }]], "camera", 90, PAL.ink));
    add(K.item(T + 2.2, T + 2.5, HOLD(T + 2.2, { x: 0, y: 0 }), (g) => { g.fillStyle = "rgba(255,255,255,0.85)"; g.fillRect(-100, -100, W + 200, HH + 200); }, { z: 5 }));
    add(K.text(T + 2.8, T + 7.6, FADE(T + 2.8, { x: 1120, y: 380 }), "사진 + 석판 인쇄", { size: 60, w: "EB", color: PAL.ink }));
    add(K.text(T + 4.6, T + 7.6, FADE(T + 4.6, { x: 1120, y: 470 }), "박람회 · 에펠탑 · 낯선 풍경", { size: 42, w: "B", color: PAL.ink2 }));
    add(K.text(T + 8.6, N, FADE(T + 8.6, { x: 1120, y: 330 }), "1907", { size: 150, w: "EB", color: PAL.red }));
    add(K.text(T + 9.6, N, FADE(T + 9.6, { x: 1120, y: 420 }), "뒷면을 반으로 → 앞면은 {통째로 사진}", { size: 42, w: "B", color: PAL.ink, hlStyle: "color", maxW: 720 }));
    add(K.icon(T + 12.2, N, POP(T + 12.2, { x: 1200, y: 640, s: 1 }), "album", 150, PAL.ink));
    add(K.text(T + 12.8, N, FADE(T + 12.8, { x: 1200, y: 770 }), "집집마다 엽서 앨범", { size: 44, w: "B", color: PAL.ink, align: "center" }));
    cap(T, T + 7.6, "사진 + 석판 인쇄 → 그림엽서"); cap(T + 7.6, T + 12, "1907 UPU 뒷면 분할 → 앞면 전체가 사진"); cap(T + 12, N, "받은 엽서는 {앨범}에"); }

  // ---------- S05 조선 1900 ----------
  { const T = S[4], N = nx(4);
    const y0 = 700, x1 = 300, x2 = 1620; const px = (yr) => lerp(x1, x2, (yr - 1884) / 16);
    add(K.line(T + 0.2, N, [[T + 0.2, { p: 0 }], [T + 1.4, { p: 1, ease: "out" }]], [[x1, y0], [x2, y0]], { color: PAL.ink2, width: 5 }));
    [1884, 1890, 1895, 1900].forEach((yr) => add(K.item(T + 0.4 + (yr - 1884) / 16, N, FADE(T + 0.4 + (yr - 1884) / 16, { x: px(yr), y: y0 }), (g) => { g.fillStyle = PAL.ink2; g.fillRect(-3, -16, 6, 32); H.text(g, String(yr), 0, 62, { size: 36, w: "B", color: PAL.ink2, align: "center" }); })));
    add(K.text(T, N, FADE(T, { x: 160, y: 200 }), "조선은?", { size: 80, w: "EB", color: PAL.ink }));
    // 1884 우표 등장 → X
    add(K.stamp(T + 1.6, N, [[T + 1.6, { x: px(1884), y: 470, s: 0, a: 0 }], [T + 2.1, { x: px(1884), y: 470, s: 1, a: 1, ease: "back" }], [T + 6.4, { x: px(1884), y: 470, s: 1, a: 1 }], [T + 7.0, { x: px(1884), y: 470, s: 0.8, a: 0.35 }]], 150, 190, { color: PAL.blue, text: "5文", sub: "우정총국" }));
    add(K.text(T + 2.3, T + 6.4, FADE(T + 2.3, { x: px(1884) + 110, y: 430 }), "1884 문위우표", { size: 40, w: "B", color: PAL.ink }));
    add(K.icon(T + 4.2, N, STAMP(T + 4.2, { x: px(1884), y: 470, s: 1 }), "x", 220, PAL.red));
    add(K.text(T + 4.8, N, FADE(T + 4.8, { x: px(1884) + 110, y: 500 }), "갑신정변 → {21일} 만에 중단", { size: 40, w: "B", color: PAL.ink, hlStyle: "color" }));
    // 마커 이동 → 1900
    add(K.item(T + 7.0, N, [[T + 7.0, { x: px(1884), y: y0 }], [T + 8.4, { x: px(1900), y: y0, ease: "inout" }]], (g) => { g.fillStyle = PAL.red; g.beginPath(); g.arc(0, 0, 16, 0, 7); g.fill(); }));
    add(K.stamp(T + 8.6, N, [[T + 8.6, { x: px(1900) - 60, y: 420, s: 0, a: 0, r: -0.05 }], [T + 9.2, { x: px(1900) - 60, y: 420, s: 1, a: 1, r: -0.05, ease: "back" }]], 230, 290, { color: PAL.red, text: "一錢", flower: true, sub: "" }));
    add(K.text(T + 9.6, N, FADE(T + 9.6, { x: px(1900) - 210, y: 300 }), "1900. 5. 10", { size: 64, w: "EB", color: PAL.red, align: "right" }));
    add(K.text(T + 10.4, N, FADE(T + 10.4, { x: px(1900) - 210, y: 380 }), "대한제국 1전 우체엽서", { size: 44, w: "B", color: PAL.ink, align: "right" }));
    add(K.text(T + 11.6, N, FADE(T + 11.6, { x: px(1900) - 210, y: 450 }), "오얏꽃 문양", { size: 40, w: "B", color: PAL.gold, align: "right" }));
    cap(T, T + 7, "1884 우표 → 갑신정변, {21일} 만에 중단"); cap(T + 7, N, "1900. 5. 10 대한제국 {1전 우체엽서} · 오얏꽃"); }

  // ---------- S06 같은 이유 ----------
  { const T = S[5], N = nx(5);
    add(K.text(T, N, FADE(T, { x: 420, y: 260 }), "1865", { size: 120, w: "EB", color: PAL.ink2, align: "center" }));
    add(K.text(T + 0.3, N, FADE(T + 0.3, { x: 420, y: 370 }), "유럽 우체국", { size: 40, w: "B", color: PAL.gray, align: "center" }));
    add(K.text(T + 0.6, N, [[T + 0.6, { x: 420, y: 470, a: 0 }], [T + 1.1, { x: 420, y: 470, a: 1, ease: "out" }], [T + 3.2, { x: 420, y: 470, a: 1 }], [T + 3.8, { x: 420, y: 470, a: 0.35, ease: "out" }]], "\"남이 읽는다\"", { size: 64, w: "EB", color: PAL.red, align: "center" }));
    add(K.text(T + 1.6, N, POP(T + 1.6, { x: CX, y: 420, s: 1 }), "=", { size: 160, w: "EB", color: PAL.ink, align: "center" }));
    add(K.text(T + 1.2, N, FADE(T + 1.2, { x: 1500, y: 260 }), "1900", { size: 120, w: "EB", color: PAL.ink, align: "center" }));
    add(K.text(T + 1.5, N, FADE(T + 1.5, { x: 1500, y: 370 }), "조선 양반", { size: 40, w: "B", color: PAL.gray, align: "center" }));
    // 글자가 왼쪽에서 떨어져 오른쪽에 붙는다
    add(K.text(T + 3.2, N, [[T + 3.2, { x: 420, y: 470, a: 0.0 }], [T + 3.3, { x: 420, y: 470, a: 1 }], [T + 4.4, { x: 1500, y: 470, a: 1, ease: "inout" }], [T + 4.7, { x: 1500, y: 470, s: 1.12 }], [T + 5.0, { x: 1500, y: 470, s: 1, ease: "out" }]], "\"남이 읽는다\"", { size: 64, w: "EB", color: PAL.red, align: "center" }));
    add(K.icon(T + 5.6, N, [[T + 5.6, { x: 1500, y: 640, s: 0, a: 0 }], [T + 6.1, { x: 1500, y: 640, s: 1, a: 1, ease: "back" }], [T + 8.6, { x: 1500, y: 640, s: 1, a: 1 }], [T + 9.6, { x: 1560, y: 600, s: 0.7, a: 0.3, ease: "out" }]], "hat", 150, PAL.ink));
    add(K.text(T + 6.0, T + 9.6, FADE(T + 6.0, { x: 1500, y: 760 }), "양반은 꺼렸다", { size: 40, w: "B", color: PAL.ink2, align: "center" }));
    // 먼저 쓴 사람들
    add(K.text(T + 8.6, N, FADE(T + 8.6, { x: CX, y: 640 }), "먼저 쓴 사람", { size: 48, w: "B", color: PAL.ink2, align: "center" }));
    [["jige", "상인"], ["person", "서민"]].forEach(([nm, lb], i) => { const t = T + 9.6 + i * 0.7, x = 820 + i * 280;
      add(K.icon(t, N, [[t, { x, y: 840, s: 0.6, a: 0 }], [t + 0.6, { x, y: 740, s: 1.2, a: 1, ease: "back" }]], nm, 150, PAL.blue));
      add(K.text(t + 0.3, N, FADE(t + 0.3, { x, y: 860 }), lb, { size: 46, w: "EB", color: PAL.blue, align: "center" })); });
    add(K.text(T + 12.4, N, FADE(T + 12.4, { x: CX, y: 960 }), "싸고 빠른 게 더 중요했던 사람들", { size: 40, w: "B", color: PAL.ink, align: "center" }));
    cap(T, T + 5.4, "1865 = 1900 · 똑같은 이유", { top: true }); cap(T + 5.4, T + 9.4, "\"남이 읽는다\" — 양반은 꺼렸다 (전해진다)", { top: true }); cap(T + 9.4, N, "먼저 쓴 사람: {상인 · 서민}", { top: true }); }

  // ---------- S07 파리 1900 ----------
  { const T = S[6], N = nx(6);
    add(K.icon(T, N, FADE(T, { x: 300, y: 330 }), "globe", 260, PAL.ink2));
    add(K.text(T + 0.4, N, FADE(T + 0.4, { x: 300, y: 530 }), "서울", { size: 40, w: "B", color: PAL.ink, align: "center" }));
    add(K.item(T + 0.8, N, [[T + 0.8, { p: 0 }], [T + 2.2, { p: 1, ease: "inout" }]], (g, t, p) => { const pts = []; for (let i = 0; i <= 40; i++) { const k = i / 40; pts.push([lerp(330, 1080, k), 330 - Math.sin(k * Math.PI) * 220]); } H.line(g, pts, p.p, { color: PAL.red, width: 6, dash: [16, 12] }); }));
    add(K.text(T + 2.2, N, POP(T + 2.2, { x: 1120, y: 340, s: 1 }), "파리 1900", { size: 72, w: "EB", color: PAL.red }));
    add(K.text(T + 2.8, N, FADE(T + 2.8, { x: 1120, y: 400 }), "만국박람회 · 한국관", { size: 40, w: "B", color: PAL.ink2 }));
    // 48장 부채꼴
    add(K.item(T + 4.6, T + 13.4, [[T + 4.6, { x: 760, y: 900, p: 0 }], [T + 8.2, { x: 760, y: 900, p: 1, ease: "out" }]], (g, t, p) => { const n = Math.floor(p.p * 48); for (let i = 0; i < n; i++) { const a = -Math.PI * 0.86 + i * (Math.PI * 0.72 / 47); g.save(); g.rotate(a); g.translate(0, -260); g.fillStyle = PAL.cream; H.shadow(g, true, 10, 4, 0.2); g.fillRect(-48, -70, 96, 140); H.shadow(g, false); g.fillStyle = "#8c7b63"; g.fillRect(-40, -62, 80, 110); g.restore(); } }));
    add(K.counter(T + 5.0, T + 13.4, [[T + 5.0, { x: 760, y: 560, v: 0, a: 0 }], [T + 5.3, { x: 760, y: 560, v: 0, a: 1 }], [T + 8.2, { x: 760, y: 560, v: 1, ease: "out" }]], 48, { unit: "장", size: 130, label: "알레베크 사진엽서 · 프랑스 인쇄" }));
    add(K.text(T + 9.0, T + 13.4, FADE(T + 9.0, { x: 1300, y: 560 }), "한국 최초의\n{사진엽서}", { size: 60, w: "EB", color: PAL.ink, lh: 1.2, hlStyle: "color" }));
    // 컬렉션 실물
    add(K.item(T + 13.4, N, [[T + 13.4, { x: 0, y: 0, a: 0 }], [T + 14.0, { x: 0, y: 0, a: 1 }]], (g) => { g.fillStyle = "rgba(242,233,216,0.92)"; g.fillRect(560, 120, 1300, 860); }, { z: 2 }));
    add(K.text(T + 13.8, N, FADE(T + 13.8, { x: 1210, y: 215 }), "TJ Kim Collection", { size: 44, w: "EB", color: PAL.red, align: "center", extra: { z: 3 } }));
    add(K.card(T + 14.2, N, IN(T + 14.2, { x: 900, y: 520, s: 1.3, r: 0.1 }, { x: 900, y: 520, s: 0.95, r: -0.03 }), CARD_W, CARD_H, { caption: "Paris Exposition 1900", tint: PAL.cream, extra: { z: 3 } }));
    add(K.text(T + 15.0, N, FADE(T + 15.0, { x: 900, y: 760 }), "파리 박람회 엽서 {35장}", { size: 40, w: "B", color: PAL.ink, align: "center", hlStyle: "color", extra: { z: 3 } }));
    add(K.text(T + 15.3, N, FADE(T + 15.3, { x: 900, y: 806 }), "APAC190101059 · 갤러리", { size: 26, w: "R", color: PAL.gray, align: "center", extra: { z: 3 } }));
    add(K.card(T + 16.4, N, IN(T + 16.4, { x: 1520, y: 520, s: 1.3, r: -0.1 }, { x: 1520, y: 520, s: 0.95, r: 0.03 }), CARD_H * 0.9, CARD_W * 0.9, { caption: "H. M. The COREAN Emperor", tint: PAL.cream, extra: { z: 3 } }));
    add(K.text(T + 17.2, N, FADE(T + 17.2, { x: 1520, y: 820 }), "대한제국 황제 엽서 · 1900", { size: 40, w: "B", color: PAL.ink, align: "center", extra: { z: 3 } }));
    add(K.text(T + 17.5, N, FADE(T + 17.5, { x: 1520, y: 862 }), "AP20130215008 · 갤러리-엽서폴더", { size: 26, w: "R", color: PAL.gray, align: "center", extra: { z: 3 } }));
    cap(T, T + 4.6, "1900 파리 만국박람회 · 한국관"); cap(T + 4.6, T + 13.4, "알레베크 사진엽서 {48장} — 한국 최초의 사진엽서"); cap(T + 13.4, N, "컬렉션: 파리 1900 엽서 35장 · 황제 엽서"); }

  // ---------- S08 조선풍속 ----------
  { const T = S[7], N = nx(7);
    add(K.text(T, T + 17.4, FADE(T, { x: 160, y: 200 }), "1910 →", { size: 60, w: "EB", color: PAL.ink2 }));
    add(K.text(T + 0.5, T + 17.4, FADE(T + 0.5, { x: 400, y: 200 }), "엽서는 {관광 상품}이 된다", { size: 60, w: "EB", color: PAL.ink, hlStyle: "color" }));
    // 봉투 → 10장
    add(K.item(T + 1.2, T + 10.5, FADE(T + 1.2, { x: 330, y: 480 }), (g) => { g.fillStyle = PAL.paper2; H.shadow(g, true); H.rrect(g, -180, -110, 360, 220, 10); g.fill(); H.shadow(g, false); g.strokeStyle = "rgba(60,45,25,0.4)"; g.lineWidth = 3; H.rrect(g, -180, -110, 360, 220, 10); g.stroke(); H.text(g, "朝鮮風俗", 0, 14, { size: 40, w: "EB", color: PAL.ink2, align: "center" }); H.text(g, "繪葉書", 0, 60, { size: 28, w: "B", color: PAL.ink2, align: "center" }); }));
    for (let i = 0; i < 10; i++) { const t = T + 2.2 + i * 0.32; add(K.card(t, T + 10.5, [[t, { x: 330, y: 480, s: 0.42, a: 0, r: 0 }], [t + 0.6, { x: 640 + i * 118, y: 480 + (i % 2) * 26, s: 0.42, a: 1, r: (i % 2 ? 1 : -1) * 0.04, ease: "out" }]], CARD_W, CARD_H, { tint: PAL.cream }, )); }
    add(K.text(T + 6.0, T + 10.5, FADE(T + 6.0, { x: 1150, y: 760 }), "'조선풍속' · '조선명소' {8~10장} 세트", { size: 44, w: "B", color: PAL.ink, align: "center", hlStyle: "color" }));
    // 막대
    add(K.bars(T + 10.6, T + 17.4, [[T + 10.6, { x: 560, y: 420, p: 0, a: 0 }], [T + 10.9, { x: 560, y: 420, p: 0, a: 1 }], [T + 13.4, { x: 560, y: 420, p: 1, ease: "out" }]], [{ label: "조선풍속", value: 59, color: PAL.red }, { label: "경성", value: 44, color: PAL.blue }, { label: "금강산", value: 32, color: PAL.green }], { w: 900, rowH: 110, size: 48 }));
    add(K.text(T + 10.8, T + 17.4, FADE(T + 10.8, { x: 560, y: 350 }), "이 컬렉션의 엽서 제목에 나오는 횟수", { size: 34, w: "B", color: PAL.ink2 }));
    // 두 시선
    add(K.card(T + 17.4, N, FADE(T + 17.4, { x: CX, y: 540, s: 1 }), CARD_W, CARD_H, { tint: PAL.cream }));
    add(K.icon(T + 18.2, N, POP(T + 18.2, { x: 330, y: 330, s: 1 }), "eye", 120, PAL.red));
    add(K.arrow(T + 18.6, N, [[T + 18.6, { p: 0 }], [T + 19.4, { p: 1, ease: "out" }]], 400, 360, 700, 450, { color: PAL.red, width: 7 }));
    add(K.text(T + 18.8, N, FADE(T + 18.8, { x: 330, y: 440 }), "제국의 시선", { size: 46, w: "EB", color: PAL.red, align: "center" }));
    add(K.text(T + 19.2, N, FADE(T + 19.2, { x: 330, y: 490 }), "조선을 구경거리로", { size: 32, w: "B", color: PAL.ink2, align: "center" }));
    add(K.icon(T + 20.6, N, POP(T + 20.6, { x: 1590, y: 760, s: 1 }), "eye", 120, PAL.blue));
    add(K.arrow(T + 21.0, N, [[T + 21.0, { p: 0 }], [T + 21.8, { p: 1, ease: "out" }]], 1520, 740, 1220, 620, { color: PAL.blue, width: 7 }));
    add(K.text(T + 21.2, N, FADE(T + 21.2, { x: 1590, y: 870 }), "제 모습을 지키려는 시선", { size: 46, w: "EB", color: PAL.blue, align: "center" }));
    add(K.text(T + 22.6, N, FADE(T + 22.6, { x: CX, y: 200 }), "연구자들은 두 시선이 {겹쳐} 있다고 본다", { size: 50, w: "B", color: PAL.ink, align: "center", hlStyle: "color" }));
    cap(T, T + 10.5, "'조선풍속' 8~10장 세트 — 식민지 시기 내내"); cap(T + 10.5, T + 17.4, "조선풍속 59 · 경성 44 · 금강산 32"); cap(T + 17.4, N, "두 시선: 제국 ↔ 민족 (연구자 견해)"); }

  // ---------- S09 뒷면 ----------
  { const T = S[8], N = nx(8);
    add(K.item(T, N, [[T, { x: CX, y: CY, s: 1.15, a: 0, fx: 1, sc: 0 }], [T + 0.6, { x: CX, y: CY, s: 1.15, a: 1, fx: 1, sc: 0, ease: "out" }], [T + 2.8, { x: CX, y: CY, fx: 1, sc: 0 }], [T + 3.8, { x: CX, y: CY, fx: -1, sc: 0, ease: "inout" }], [T + 8.5, { x: CX, y: CY, sc: 0 }], [T + 11.5, { x: CX, y: CY, sc: 1, ease: "linear" }]], (g, t, p) => { const w = 760, h = 490; g.scale(Math.max(0.02, Math.abs(p.fx)), 1); if (p.fx >= 0) H.card(g, -w / 2, -h / 2, w, h, { caption: "A Korean Travelling on a Donkey" }); else H.card(g, -w / 2, -h / 2, w, h, { back: true, divider: 1, lines: 4, scribble: p.sc, label: "POST CARD" }); }));
    add(K.text(T + 0.8, T + 3.2, FADE(T + 0.8, { x: CX, y: 160 }), "앞면: 팔려고 만든 그림", { size: 50, w: "B", color: PAL.ink2, align: "center" }));
    add(K.text(T + 4.0, N, FADE(T + 4.0, { x: CX, y: 160 }), "뒷면을 보면", { size: 60, w: "EB", color: PAL.ink, align: "center" }));
    add(K.stamp(T + 5.2, N, STAMP(T + 5.2, { x: CX + 300, y: CY - 160, s: 1, r: 0.06 }), 100, 125, { color: PAL.red, text: "1½", sub: "錢" }));
    add(K.text(T + 5.6, N, FADE(T + 5.6, { x: CX + 420, y: CY - 230 }), "우표", { size: 40, w: "EB", color: PAL.red }));
    add(K.postmark(T + 6.8, N, [[T + 6.8, { x: CX + 250, y: CY - 120, p: 0, s: 1.5, r: -0.2 }], [T + 7.1, { x: CX + 250, y: CY - 120, p: 1, s: 1, r: -0.2, ease: "in" }]], 70, { text: "京城", sub: "KEIJO", color: "rgba(31,42,55,0.75)", waves: true }));
    add(K.text(T + 7.4, N, FADE(T + 7.4, { x: CX + 420, y: CY - 20 }), "소인", { size: 40, w: "EB", color: PAL.ink }));
    add(K.text(T + 8.8, N, FADE(T + 8.8, { x: CX - 400, y: CY + 300 }), "손글씨", { size: 40, w: "EB", color: PAL.blue }));
    add(K.text(T + 12.0, N, FADE(T + 12.0, { x: CX, y: 920 }), "APKC210925669-17 · With Japanese Stamp and Used · 갤러리-엽서폴더", { size: 28, w: "R", color: PAL.gray, align: "center" }));
    add(K.text(T + 13.4, N, FADE(T + 13.4, { x: CX - 380, y: 250 }), "누가 · 어디서 · 누구에게", { size: 40, w: "B", color: PAL.ink2 }));
    add(K.icon(T + 16.0, N, [[T + 16.0, { x: CX + 250, y: CY - 120, s: 0, a: 0 }], [T + 16.5, { x: CX + 250, y: CY - 120, s: 1, a: 1, ease: "back" }]], "send", 150, PAL.red));
    add(K.text(T + 16.6, N, POP(T + 16.6, { x: CX + 250, y: CY + 40, s: 1 }), "100년 전의 '보내기'", { size: 52, w: "EB", color: PAL.red, align: "center" }));
    cap(T, T + 4, "엽서는 {뒤집어} 봐야 한다", { top: true }); cap(T + 4, T + 13, "뒷면: 우표 · 소인 · 손글씨 — 실제로 부쳐진 엽서", { top: true }); cap(T + 13, N, "100년 전의 '보내기' 버튼", { top: true }); }

  // ---------- S10 착지 ----------
  { const T = S[9], N = END;
    add(K.text(T, T + 10, FADE(T, { x: 160, y: 220 }), "2000년대 →", { size: 60, w: "EB", color: PAL.ink2 }));
    add(K.text(T + 0.6, T + 10, FADE(T + 0.6, { x: 160, y: 300 }), "엽서는 거의 사라졌다", { size: 44, w: "B", color: PAL.gray }));
    add(K.icon(T + 1.0, T + 10, FADE(T + 1.0, { x: 1380, y: 520 }), "phone", 560, PAL.ink));
    add(K.card(T + 3.0, T + 10, [[T + 3.0, { x: 500, y: 560, s: 0.9, a: 0, r: -0.1 }], [T + 3.5, { x: 500, y: 560, s: 0.9, a: 1, r: -0.05, ease: "out" }], [T + 4.8, { x: 500, y: 560, s: 0.9, r: -0.05 }], [T + 5.8, { x: 1380, y: 470, s: 0.42, r: 0, ease: "inout" }]], CARD_W, CARD_H, { tint: PAL.cream }));
    [["photo", "사진"], ["text", "한 줄"], ["send", "보내기"]].forEach(([nm, lb], i) => { const t = T + 6.4 + i * 0.5, x = 1300 + i * 80; add(K.icon(t, T + 10, POP(t, { x, y: 640, s: 1 }), nm, 50, PAL.red)); });
    add(K.text(T + 6.0, T + 10, FADE(T + 6.0, { x: 160, y: 520 }), "사진 한 장에 한 줄을 붙여 보내는 일은\n{사라지지 않았다}", { size: 50, w: "B", color: PAL.ink, lh: 1.3, hlStyle: "color" }));
    add(K.text(T + 8.4, T + 10, FADE(T + 8.4, { x: 160, y: 720 }), "우리는 매일 엽서를 보낸다", { size: 44, w: "EB", color: PAL.red }));
    // 엔딩 카드
    add(K.item(T + 10, N, FADE(T + 10, { x: 0, y: 0 }), (g) => { g.fillStyle = PAL.ink; g.fillRect(-100, -100, W + 200, HH + 200); }, { z: 8 }));
    add(K.text(T + 10.4, N, FADE(T + 10.4, { x: CX, y: 360 }), "엽서는 1900년의\n인스타그램이었다", { size: 96, w: "EB", color: PAL.cream, align: "center", lh: 1.15, extra: { z: 9 } }));
    add(K.counter(T + 11.2, N, [[T + 11.2, { x: 700, y: 640, v: 0, a: 0 }], [T + 11.5, { x: 700, y: 640, v: 0, a: 1 }], [T + 13.5, { x: 700, y: 640, v: 1, ease: "out" }]], 367, { unit: "건", size: 110, color: PAL.gold, label: "엽서 항목", labelColor: PAL.gray, extra: { z: 9 } }));
    add(K.counter(T + 11.6, N, [[T + 11.6, { x: 1220, y: 640, v: 0, a: 0 }], [T + 11.9, { x: 1220, y: 640, v: 0, a: 1 }], [T + 13.9, { x: 1220, y: 640, v: 1, ease: "out" }]], 1050, { unit: "장+", size: 110, color: PAL.gold, label: "낱장 합계", labelColor: PAL.gray, extra: { z: 9 } }));
    add(K.text(T + 12.0, N, FADE(T + 12.0, { x: CX, y: 800 }), "TJ Kim Collection", { size: 48, w: "EB", color: PAL.cream, align: "center", extra: { z: 9 } }));
    add(K.text(T + 12.6, N, FADE(T + 12.6, { x: CX, y: 960 }), "컬렉션 수치는 2026-10-15 재고 시트 기준 · 연구자 해석은 한국민족문화대백과(오혜리, 2024) 등을 따랐습니다", { size: 24, w: "R", color: PAL.gray, align: "center", extra: { z: 9 } }));
    cap(T, T + 6, "2000년대 이후 급감"); cap(T + 6, T + 10, "그래도 매일 '엽서'를 보낸다"); }

  // 아이템에 z 보정 (extra.z)
  for (const it of items) if (it.extra && it.extra.z != null) it.z = it.extra.z;
  return { W, H: HH, duration: END, items, camera: K.camera(W, HH, S, 1.04, 14), overlay: K.captionOverlay(W, HH, caps, { size: 42 }) };
};
