/* 타임라인 공용 헬퍼 — mg.js 의 H/PAL/E 를 쓰는 아이템 빌더. timeline_*.js 보다 먼저 로드된다. */
(() => {
  const K = {};
  // 키프레임 빌더
  K.IN = (t, from, to, dur = 0.7, ease = "back") => [[t, { ...from, a: 0 }], [t + dur, { ...to, a: 1, ease }]];
  K.HOLD = (t, p) => [[t, { ...p }]];
  K.FADE = (t, p, dur = 0.5) => [[t, { ...p, a: 0 }], [t + dur, { ...p, a: 1, ease: "out" }]];
  K.POP = (t, p, dur = 0.5) => [[t, { ...p, a: 0, s: (p.s ?? 1) * 0.3 }], [t + dur, { ...p, a: 1, s: p.s ?? 1, ease: "back" }]];
  K.STAMP = (t, p, dur = 0.28) => [[t, { ...p, a: 0, s: (p.s ?? 1) * 1.9 }], [t + dur, { ...p, a: 1, s: p.s ?? 1, ease: "in" }]];
  K.OUT = (kf, t, to, dur = 0.5) => { const last = { ...kf[kf.length - 1][1] }; delete last.ease; return [...kf, [t, last], [t + dur, { ...last, ...to, a: 0, ease: "in" }]]; };
  // 생성기
  let n = 0;
  K.item = (t0, t1, kf, draw, extra = {}) => ({ id: extra.id || "it" + (n++), t0, t1, kf, draw, ...extra });
  K.text = (t0, t1, kf, text, o = {}) => K.item(t0, t1, kf, (g, t, p) => { H.text(g, typeof text === "function" ? text(t, p) : text, 0, 0, { ...o, reveal: p.rv ?? o.reveal ?? 1 }); }, o.extra || {});
  K.card = (t0, t1, kf, w, h, o = {}) => K.item(t0, t1, kf, (g, t, p) => {
    const fx = p.fx ?? 1; // 뒤집기: fx 1 → -1 (x 스케일)
    g.scale(Math.abs(fx) < 0.02 ? 0.02 : fx, 1);
    const opt = typeof o === "function" ? o(t, p) : o;
    H.card(g, -w / 2, -h / 2, w, h, { ...opt, back: fx < 0 ? true : opt.back });
  }, o.extra || {});
  K.icon = (t0, t1, kf, name, size, color) => K.item(t0, t1, kf, (g, t, p) => H.icon(g, name, 0, 0, size, typeof color === "function" ? color(t, p) : color));
  K.stamp = (t0, t1, kf, w, h, o) => K.item(t0, t1, kf, (g) => H.stamp(g, -w / 2, -h / 2, w, h, o));
  K.postmark = (t0, t1, kf, r, o) => K.item(t0, t1, kf, (g, t, p) => H.postmark(g, 0, 0, r, { ...o, p: p.p ?? 1 }));
  K.seal = (t0, t1, kf, w, h, text, color) => K.item(t0, t1, kf, (g) => H.seal(g, 0, 0, w, h, text, color));
  K.line = (t0, t1, kf, pts, o) => K.item(t0, t1, kf, (g, t, p) => H.line(g, pts, p.p ?? 1, o));
  K.arrow = (t0, t1, kf, x1, y1, x2, y2, o) => K.item(t0, t1, kf, (g, t, p) => H.arrow(g, x1, y1, x2, y2, p.p ?? 1, o));
  // 카운터: v 0→1 를 값으로. fmt(v) 문자열
  K.counter = (t0, t1, kf, target, o = {}) => K.item(t0, t1, kf, (g, t, p) => {
    const v = (p.v ?? 1) * target; const s = (o.fmt || ((x) => H.num(x)))(v);
    H.text(g, s + (o.unit || ""), 0, 0, { size: o.size || 160, w: o.w || "EB", color: o.color || PAL.red, align: o.align || "center" });
    if (o.label) H.text(g, o.label, 0, (o.size || 160) * 0.55, { size: (o.size || 160) * 0.22, w: "B", color: o.labelColor || PAL.ink2, align: o.align || "center" });
  });
  // 막대 그래프 (가로): rows [{label, value, color}], p 0..1 성장
  K.bars = (t0, t1, kf, rows, { w = 700, rowH = 86, max = null, size = 40 } = {}) => K.item(t0, t1, kf, (g, t, p) => {
    const mx = max || Math.max(...rows.map((r) => r.value)); const pp = p.p ?? 1;
    rows.forEach((r, i) => {
      const y = i * rowH; H.text(g, r.label, -20, y + size * 0.45, { size, w: "B", color: PAL.ink, align: "right" });
      const bw = (w * r.value / mx) * clamp(pp * rows.length - i, 0, 1);
      g.fillStyle = r.color || PAL.blue; H.rrect(g, 0, y - size * 0.3, Math.max(bw, 2), size * 1.1, 8); g.fill();
      if (bw > 10) H.text(g, H.num(r.value * clamp(pp * rows.length - i, 0, 1)), bw + 16, y + size * 0.45, { size: size * 0.95, w: "EB", color: r.color || PAL.blue });
    });
  });
  // 치수선
  K.dim = (t0, t1, kf, x1, y1, x2, y2, label, o = {}) => K.item(t0, t1, kf, (g, t, p) => {
    const pp = p.p ?? 1; const ex = lerp(x1, x2, pp), ey = lerp(y1, y2, pp);
    g.strokeStyle = o.color || PAL.red; g.lineWidth = 3; g.beginPath(); g.moveTo(x1, y1); g.lineTo(ex, ey); g.stroke();
    const vert = Math.abs(x2 - x1) < Math.abs(y2 - y1); const tick = 12;
    g.beginPath(); if (vert) { g.moveTo(x1 - tick, y1); g.lineTo(x1 + tick, y1); g.moveTo(ex - tick, ey); g.lineTo(ex + tick, ey); } else { g.moveTo(x1, y1 - tick); g.lineTo(x1, y1 + tick); g.moveTo(ex, ey - tick); g.lineTo(ex, ey + tick); } g.stroke();
    if (pp > 0.95) H.text(g, label, (x1 + x2) / 2 + (vert ? -28 : 0), (y1 + y2) / 2 + (vert ? 14 : -22), { size: o.size || 40, w: "EB", color: o.color || PAL.red, align: vert ? "right" : "center" });
  });
  // 자막 목록 → overlay 함수. caps: [[t0, t1, text, {top}]]
  K.captionOverlay = (W, HH, caps, o = {}) => (g, t) => { for (const c of caps) if (t >= c[0] && t < c[1]) { const rv = clamp((t - c[0]) / 0.35, 0, 1); H.caption(g, W, HH, c[2], { ...o, ...(c[3] || {}), reveal: 1, y: (c[3] && c[3].y) ?? o.y ?? null }); g.save(); g.globalAlpha = 1; g.restore(); break; } };
  // 장면별 카메라: 각 장면 시작 시각 배열 starts, 장면 안에서 1→zoomEnd
  K.camera = (W, HH, starts, zoomEnd = 1.045, drift = 18) => (t) => {
    let i = 0; for (let k = 0; k < starts.length; k++) if (t >= starts[k]) i = k;
    const t0 = starts[i], t1 = starts[i + 1] ?? t0 + 30; const k = clamp((t - t0) / (t1 - t0), 0, 1);
    const sgn = i % 2 ? -1 : 1;
    return { zoom: lerp(1, zoomEnd, k), x: W / 2 + sgn * drift * k, y: HH / 2 + drift * 0.4 * k };
  };
  // 에펠탑 실루엣 (p 진행형 라인)
  K.eiffel = (g, cx, base, h, p = 1, color = PAL.ink) => {
    const pts = [[cx - h * 0.42, base], [cx - h * 0.3, base - h * 0.2], [cx - h * 0.18, base - h * 0.45], [cx - h * 0.09, base - h * 0.72], [cx - h * 0.03, base - h * 0.95], [cx, base - h], [cx + h * 0.03, base - h * 0.95], [cx + h * 0.09, base - h * 0.72], [cx + h * 0.18, base - h * 0.45], [cx + h * 0.3, base - h * 0.2], [cx + h * 0.42, base]];
    H.line(g, pts, p, { color, width: h * 0.03 });
    if (p > 0.5) { H.line(g, [[cx - h * 0.3, base - h * 0.2], [cx + h * 0.3, base - h * 0.2]], clamp((p - 0.5) * 3, 0, 1), { color, width: h * 0.025 }); H.line(g, [[cx - h * 0.18, base - h * 0.45], [cx + h * 0.18, base - h * 0.45]], clamp((p - 0.6) * 3, 0, 1), { color, width: h * 0.02 }); }
  };
  window.K = K;
})();
