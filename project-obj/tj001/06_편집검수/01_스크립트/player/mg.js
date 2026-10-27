/* tj001 모션 그래픽 엔진 — 결정적 SEEK(t) 캔버스 렌더러.
 * 타임라인(timeline_*.js)이 window.BUILD(durations) 로 { W, H, duration, items, cameras } 를 돌려주면
 * SEEK(t) 가 그 시각의 프레임을 그린다. 외부 모듈 없음.
 *
 * item = { t0, t1, z, draw(ctx, t, p) , kf: [[time, {x,y,s,r,a,...}], ...], ease, seed, wobble }
 *  - kf 로 보간된 p(props) 가 draw 로 넘어간다. p.a (알파) p.x p.y p.s (스케일) p.r (회전 rad)
 *  - 모든 시각은 절대 초. 보이는 구간 [t0, t1) 밖이면 그리지 않는다.
 */
(() => {
  const PAL = {
    paper: "#F2E9D8", paper2: "#E8DCC4", ink: "#1F2A37", ink2: "#4A5563", red: "#C5392B",
    blue: "#2C5F8A", green: "#4E7A55", gold: "#C9A24A", cream: "#FBF6EA", gray: "#9AA3AD", white: "#FFFFFF",
  };
  window.PAL = PAL;

  // ---------- easing / interpolation ----------
  const E = {
    linear: (x) => x,
    out: (x) => 1 - Math.pow(1 - x, 3),
    in: (x) => x * x * x,
    inout: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
    back: (x) => { const c = 1.70158, d = c + 1; return 1 + d * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); },
    elastic: (x) => x === 0 ? 0 : x === 1 ? 1 : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * (2 * Math.PI) / 3) + 1,
    stamp: (x) => (x < 0.6 ? 1.6 - x : 1) , // 1.6→1.0 (별도 처리)
  };
  window.E = E;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  window.clamp = clamp; window.lerp = lerp;

  function interp(kf, t, ease) {
    if (!kf || !kf.length) return {};
    if (t <= kf[0][0]) return { ...kf[0][1] };
    const last = kf[kf.length - 1];
    if (t >= last[0]) return { ...last[1] };
    for (let i = 0; i < kf.length - 1; i++) {
      const [ta, pa] = kf[i], [tb, pb] = kf[i + 1];
      if (t >= ta && t < tb) {
        const es = pb.ease || ease || "out";
        const k = (E[es] || E.out)((t - ta) / (tb - ta));
        const out = { ...pa };
        for (const key of Object.keys(pb)) {
          if (key === "ease") continue;
          const va = pa[key], vb = pb[key];
          out[key] = typeof va === "number" && typeof vb === "number" ? lerp(va, vb, k) : (k < 1 ? (va ?? vb) : vb);
        }
        return out;
      }
    }
    return { ...last[1] };
  }

  // seeded noise for wobble
  function rnd(seed) { let s = seed * 9301 + 49297; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; }

  // ---------- paper background ----------
  let paperTex = null;
  function makePaper(W, H, seed = 7) {
    const c = document.createElement("canvas"); c.width = W; c.height = H;
    const g = c.getContext("2d");
    g.fillStyle = PAL.paper; g.fillRect(0, 0, W, H);
    const img = g.getImageData(0, 0, W, H), d = img.data, r = rnd(seed);
    for (let i = 0; i < d.length; i += 4) { const n = (r() - 0.5) * 14; d[i] += n; d[i + 1] += n; d[i + 2] += n * 0.8; }
    g.putImageData(img, 0, 0);
    // fibers
    g.strokeStyle = "rgba(90,70,40,0.07)"; g.lineWidth = 1;
    for (let i = 0; i < 260; i++) { const x = r() * W, y = r() * H, l = 10 + r() * 50, a = r() * Math.PI; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
    // vignette
    const v = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.45, W / 2, H / 2, Math.max(W, H) * 0.75);
    v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(60,40,20,0.22)");
    g.fillStyle = v; g.fillRect(0, 0, W, H);
    return c;
  }

  // ---------- drawing helpers ----------
  const H = {
    font(size, w = "R") {
      const fam = { EB: "Pretendard-ExtraBold", B: "NanumSquareRoundB", R: "NanumSquareRoundR", J: "Jua" }[w] || "NanumSquareRoundR";
      return `${size}px "${fam}"`;
    },
    rrect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); },
    shadow(g, on, blur = 28, oy = 14, a = 0.28) { if (on) { g.shadowColor = `rgba(40,25,10,${a})`; g.shadowBlur = blur; g.shadowOffsetY = oy; } else { g.shadowColor = "transparent"; g.shadowBlur = 0; g.shadowOffsetY = 0; } },
    // 텍스트 (여러 줄, 하이라이트 단어는 {hl} 로 감싸기). reveal 0..1 로 글자 단위 노출.
    text(g, str, x, y, { size = 48, w = "R", color = PAL.ink, align = "left", lh = 1.3, maxW = 1e9, reveal = 1, hlColor = PAL.red, hlStyle = "under" } = {}) {
      g.font = H.font(size, w); g.textBaseline = "alphabetic"; g.textAlign = "left";
      const lines = []; // [{segs:[{t,hl}], width}]
      for (const raw of String(str).split("\n")) {
        const toks = []; raw.replace(/\{([^}]*)\}|([^{}]+)/g, (m, a, b) => { toks.push({ t: a ?? b, hl: a !== undefined }); });
        let cur = [], cw = 0;
        for (const tk of toks) {
          for (const word of tk.t.split(/(\s+)/)) {
            if (!word) continue; const ww = g.measureText(word).width;
            if (cw + ww > maxW && cur.length && word.trim()) { lines.push({ segs: cur, width: cw }); cur = []; cw = 0; if (!word.trim()) continue; }
            cur.push({ t: word, hl: tk.hl }); cw += ww;
          }
        }
        lines.push({ segs: cur, width: cw });
      }
      const total = lines.reduce((n, l) => n + l.segs.reduce((m, s) => m + s.t.length, 0), 0);
      let budget = Math.ceil(total * clamp(reveal, 0, 1));
      let yy = y;
      for (const ln of lines) {
        let xx = align === "center" ? x - ln.width / 2 : align === "right" ? x - ln.width : x;
        for (const s of ln.segs) {
          if (budget <= 0) break;
          const show = s.t.slice(0, budget); budget -= s.t.length;
          const sw = g.measureText(s.t).width;
          if (s.hl) {
            if (hlStyle === "box") { g.fillStyle = hlColor; H.rrect(g, xx - 6, yy - size * 0.86, sw + 12, size * 1.08, 6); g.fill(); g.fillStyle = PAL.cream; }
            else { g.strokeStyle = hlColor; g.lineWidth = Math.max(3, size * 0.09); g.lineCap = "round"; g.beginPath(); g.moveTo(xx, yy + size * 0.18); g.lineTo(xx + sw, yy + size * 0.2); g.stroke(); g.fillStyle = hlStyle === "color" ? hlColor : color; }
          } else g.fillStyle = color;
          g.fillText(show, xx, yy); xx += sw;
        }
        yy += size * lh;
      }
      return lines.length * size * lh;
    },
    // 엽서 (앞면/뒷면). photo: 이미지 또는 null. w,h 기본 14:9 비율.
    card(g, x, y, w, h, { back = false, photo = null, tint = PAL.cream, divider = 1, caption = "", stampOn = true, lines = 4, scribble = 0, border = true, photoFit = "cover", label = "" } = {}) {
      H.shadow(g, true); g.fillStyle = tint; g.fillRect(x, y, w, h); H.shadow(g, false);
      g.strokeStyle = "rgba(60,45,25,0.25)"; g.lineWidth = 2; g.strokeRect(x + 1, y + 1, w - 2, h - 2);
      if (!back) {
        const m = w * 0.045;
        if (photo) {
          const iw = photo.naturalWidth || photo.width, ih = photo.naturalHeight || photo.height;
          const bw = w - m * 2, bh = h - m * 2; let sw, sh, sx, sy;
          if (photoFit === "contain") { const k = Math.min(bw / iw, bh / ih); sw = iw * k; sh = ih * k; sx = x + m + (bw - sw) / 2; sy = y + m + (bh - sh) / 2; g.drawImage(photo, sx, sy, sw, sh); }
          else { const k = Math.max(bw / iw, bh / ih); const cw = bw / k, ch = bh / k; g.drawImage(photo, (iw - cw) / 2, (ih - ch) / 2, cw, ch, x + m, y + m, bw, bh); }
        } else {
          const gr = g.createLinearGradient(x, y, x + w, y + h); gr.addColorStop(0, "#8c7b63"); gr.addColorStop(1, "#5c4f3d");
          g.fillStyle = gr; g.fillRect(x + m, y + m, w - m * 2, h - m * 2);
          g.fillStyle = "rgba(255,255,255,0.08)"; for (let i = 0; i < 5; i++) g.fillRect(x + m, y + m + i * (h - 2 * m) / 5, w - 2 * m, (h - 2 * m) / 10);
        }
        if (caption) { g.fillStyle = "rgba(255,255,255,0.85)"; g.fillRect(x + m, y + h - m - h * 0.12, w - m * 2, h * 0.12); H.text(g, caption, x + w / 2, y + h - m - h * 0.035, { size: h * 0.07, w: "B", color: PAL.ink, align: "center" }); }
      } else {
        // 뒷면: 우표란, 세로 분할선, 주소줄, 통신문 낙서
        const m = w * 0.06;
        if (stampOn) { g.strokeStyle = "rgba(60,45,25,0.5)"; g.setLineDash([6, 5]); g.lineWidth = 2; g.strokeRect(x + w - m - w * 0.16, y + m, w * 0.16, h * 0.24); g.setLineDash([]); }
        if (divider > 0) { g.strokeStyle = "rgba(60,45,25,0.55)"; g.lineWidth = 2; g.beginPath(); g.moveTo(x + w / 2, y + m + h * 0.18 * (1 - divider)); g.lineTo(x + w / 2, y + h - m); g.stroke(); }
        g.strokeStyle = "rgba(60,45,25,0.35)"; g.lineWidth = 2;
        for (let i = 0; i < lines; i++) { const yy = y + h * 0.48 + i * h * 0.12; g.beginPath(); g.moveTo(x + w * 0.56, yy); g.lineTo(x + w - m, yy); g.stroke(); }
        if (scribble > 0) { // 손글씨 흉내
          g.strokeStyle = PAL.blue; g.lineWidth = 2.2; g.lineCap = "round";
          const r = rnd(3); const n = Math.floor(scribble * 46);
          for (let i = 0; i < n; i++) { const row = Math.floor(i / 12), col = i % 12; const sx = x + m + col * (w * 0.4 / 12), sy = y + m + h * 0.14 + row * h * 0.16; g.beginPath(); g.moveTo(sx, sy); for (let k = 1; k <= 4; k++) g.lineTo(sx + k * w * 0.008, sy + (r() - 0.5) * h * 0.07); g.stroke(); }
        }
        if (label) H.text(g, label, x + w * 0.52, y + m + h * 0.09, { size: h * 0.065, w: "B", color: PAL.ink2, align: "left" });
      }
    },
    // 우표: 톱니 테두리
    stamp(g, x, y, w, h, { color = PAL.red, inner = PAL.cream, text = "", sub = "", flower = false } = {}) {
      const r = Math.min(w, h) * 0.045, step = r * 2.6;
      g.fillStyle = PAL.white; g.beginPath(); g.rect(x, y, w, h); g.fill();
      g.fillStyle = PAL.paper; // 톱니 구멍
      for (let i = 0; i <= w; i += step) { g.beginPath(); g.arc(x + i, y, r, 0, 7); g.fill(); g.beginPath(); g.arc(x + i, y + h, r, 0, 7); g.fill(); }
      for (let i = 0; i <= h; i += step) { g.beginPath(); g.arc(x, y + i, r, 0, 7); g.fill(); g.beginPath(); g.arc(x + w, y + i, r, 0, 7); g.fill(); }
      const m = w * 0.1; g.fillStyle = color; g.fillRect(x + m, y + m, w - 2 * m, h - 2 * m);
      g.fillStyle = inner; g.fillRect(x + m * 1.5, y + m * 1.5, w - 3 * m, h - 3 * m);
      if (flower) H.plum(g, x + w / 2, y + h * 0.47, Math.min(w, h) * 0.2, color);
      if (text) H.text(g, text, x + w / 2, y + h * (flower ? 0.86 : 0.58), { size: h * (flower ? 0.11 : 0.22), w: "EB", color, align: "center" });
      if (sub) H.text(g, sub, x + w / 2, y + h * 0.78, { size: h * 0.1, w: "B", color, align: "center" });
    },
    // 오얏꽃(이화) 문양
    plum(g, cx, cy, r, color = PAL.gold) {
      g.fillStyle = color;
      for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * Math.PI * 2 / 5; g.beginPath(); g.ellipse(cx + Math.cos(a) * r * 0.62, cy + Math.sin(a) * r * 0.62, r * 0.42, r * 0.3, a, 0, 7); g.fill(); }
      g.fillStyle = PAL.cream; g.beginPath(); g.arc(cx, cy, r * 0.22, 0, 7); g.fill();
      g.fillStyle = color; for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * Math.PI * 2 / 5; g.beginPath(); g.arc(cx + Math.cos(a) * r * 0.12, cy + Math.sin(a) * r * 0.12, r * 0.05, 0, 7); g.fill(); }
    },
    // 소인(우체국 도장)
    postmark(g, cx, cy, r, { text = "", sub = "", color = PAL.ink2, p = 1, waves = true } = {}) {
      g.save(); g.globalAlpha *= clamp(p, 0, 1); g.strokeStyle = color; g.lineWidth = r * 0.07;
      g.beginPath(); g.arc(cx, cy, r, 0, 7); g.stroke(); g.lineWidth = r * 0.04; g.beginPath(); g.arc(cx, cy, r * 0.82, 0, 7); g.stroke();
      if (text) H.text(g, text, cx, cy + r * 0.12, { size: r * 0.34, w: "EB", color, align: "center" });
      if (sub) H.text(g, sub, cx, cy + r * 0.5, { size: r * 0.2, w: "B", color, align: "center" });
      if (waves) { g.lineWidth = r * 0.06; for (let i = -1; i <= 1; i++) { g.beginPath(); for (let x = 0; x <= r * 2.2; x += 4) { const yy = cy + i * r * 0.28 + Math.sin(x / (r * 0.25)) * r * 0.08; if (x === 0) g.moveTo(cx + r * 1.15 + x, yy); else g.lineTo(cx + r * 1.15 + x, yy); } g.stroke(); } }
      g.restore();
    },
    // 아이콘들 (단색 라인)
    icon(g, name, cx, cy, s, color = PAL.ink) {
      g.save(); g.translate(cx, cy); g.strokeStyle = color; g.fillStyle = color; g.lineWidth = s * 0.09; g.lineCap = "round"; g.lineJoin = "round";
      const u = s / 2;
      switch (name) {
        case "photo": H.rrect(g, -u, -u * 0.8, 2 * u, 1.6 * u, u * 0.15); g.stroke(); g.beginPath(); g.moveTo(-u * 0.8, u * 0.5); g.lineTo(-u * 0.3, -u * 0.1); g.lineTo(u * 0.1, u * 0.3); g.lineTo(u * 0.4, 0); g.lineTo(u * 0.8, u * 0.5); g.stroke(); g.beginPath(); g.arc(u * 0.45, -u * 0.35, u * 0.14, 0, 7); g.fill(); break;
        case "text": for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(-u * 0.9, i * u * 0.5); g.lineTo(i === 1 ? u * 0.2 : u * 0.9, i * u * 0.5); g.stroke(); } break;
        case "send": g.beginPath(); g.moveTo(-u * 0.9, -u * 0.1); g.lineTo(u * 0.9, -u * 0.6); g.lineTo(u * 0.1, u * 0.9); g.lineTo(-u * 0.1, u * 0.1); g.closePath(); g.stroke(); g.beginPath(); g.moveTo(-u * 0.1, u * 0.1); g.lineTo(u * 0.9, -u * 0.6); g.stroke(); break;
        case "envelope": H.rrect(g, -u, -u * 0.65, 2 * u, 1.3 * u, u * 0.1); g.stroke(); g.beginPath(); g.moveTo(-u, -u * 0.6); g.lineTo(0, u * 0.15); g.lineTo(u, -u * 0.6); g.stroke(); break;
        case "phone": H.rrect(g, -u * 0.55, -u, u * 1.1, 2 * u, u * 0.18); g.stroke(); g.beginPath(); g.moveTo(-u * 0.2, u * 0.78); g.lineTo(u * 0.2, u * 0.78); g.stroke(); break;
        case "hat": // 갓
          g.beginPath(); g.ellipse(0, u * 0.25, u, u * 0.28, 0, 0, 7); g.stroke(); g.beginPath(); g.moveTo(-u * 0.45, u * 0.2); g.lineTo(-u * 0.35, -u * 0.7); g.lineTo(u * 0.35, -u * 0.7); g.lineTo(u * 0.45, u * 0.2); g.stroke(); break;
        case "person": g.beginPath(); g.arc(0, -u * 0.5, u * 0.3, 0, 7); g.stroke(); g.beginPath(); g.moveTo(-u * 0.7, u * 0.95); g.quadraticCurveTo(-u * 0.7, u * 0.05, 0, u * 0.05); g.quadraticCurveTo(u * 0.7, u * 0.05, u * 0.7, u * 0.95); g.stroke(); break;
        case "jige": // 지게 진 사람(상인·서민)
          g.beginPath(); g.arc(-u * 0.15, -u * 0.5, u * 0.26, 0, 7); g.stroke(); g.beginPath(); g.moveTo(-u * 0.6, u * 0.95); g.quadraticCurveTo(-u * 0.6, u * 0.05, -u * 0.15, u * 0.05); g.quadraticCurveTo(u * 0.3, u * 0.05, u * 0.3, u * 0.95); g.stroke(); g.beginPath(); g.moveTo(u * 0.35, u * 0.5); g.lineTo(u * 0.95, -u * 0.6); g.moveTo(u * 0.25, -u * 0.1); g.lineTo(u * 0.9, -u * 0.1); g.stroke(); break;
        case "album": H.rrect(g, -u * 0.9, -u * 0.75, u * 1.8, u * 1.5, u * 0.1); g.stroke(); g.beginPath(); g.moveTo(-u * 0.55, -u * 0.75); g.lineTo(-u * 0.55, u * 0.75); g.stroke(); g.strokeRect(-u * 0.3, -u * 0.4, u * 0.9, u * 0.6); break;
        case "x": g.lineWidth = s * 0.14; g.beginPath(); g.moveTo(-u * 0.7, -u * 0.7); g.lineTo(u * 0.7, u * 0.7); g.moveTo(u * 0.7, -u * 0.7); g.lineTo(-u * 0.7, u * 0.7); g.stroke(); break;
        case "check": g.lineWidth = s * 0.14; g.beginPath(); g.moveTo(-u * 0.7, 0); g.lineTo(-u * 0.2, u * 0.55); g.lineTo(u * 0.75, -u * 0.6); g.stroke(); break;
        case "eye": g.beginPath(); g.moveTo(-u, 0); g.quadraticCurveTo(0, -u * 0.9, u, 0); g.quadraticCurveTo(0, u * 0.9, -u, 0); g.stroke(); g.beginPath(); g.arc(0, 0, u * 0.3, 0, 7); g.fill(); break;
        case "camera": H.rrect(g, -u, -u * 0.55, 2 * u, 1.3 * u, u * 0.12); g.stroke(); g.beginPath(); g.arc(0, u * 0.1, u * 0.38, 0, 7); g.stroke(); g.fillRect(-u * 0.45, -u * 0.85, u * 0.5, u * 0.3); break;
        case "globe": g.beginPath(); g.arc(0, 0, u, 0, 7); g.stroke(); g.beginPath(); g.ellipse(0, 0, u * 0.45, u, 0, 0, 7); g.stroke(); g.beginPath(); g.moveTo(-u, 0); g.lineTo(u, 0); g.moveTo(-u * 0.85, -u * 0.5); g.lineTo(u * 0.85, -u * 0.5); g.moveTo(-u * 0.85, u * 0.5); g.lineTo(u * 0.85, u * 0.5); g.stroke(); break;
      }
      g.restore();
    },
    // 도장 (사각 테두리 + 글자), 찍힘 애니메이션은 호출측 s 로
    seal(g, cx, cy, w, h, text, color = PAL.red, size = 0) {
      g.save(); g.translate(cx, cy); g.rotate(-0.08);
      g.strokeStyle = color; g.lineWidth = Math.max(4, h * 0.06); H.rrect(g, -w / 2, -h / 2, w, h, h * 0.12); g.stroke();
      g.lineWidth = Math.max(2, h * 0.025); H.rrect(g, -w / 2 + h * 0.1, -h / 2 + h * 0.1, w - h * 0.2, h - h * 0.2, h * 0.08); g.stroke();
      H.text(g, text, 0, h * 0.22, { size: size || h * 0.55, w: "EB", color, align: "center" });
      g.restore();
    },
    // 진행형 선 (p 0..1)
    line(g, pts, p = 1, { color = PAL.ink, width = 4, dash = null } = {}) {
      let total = 0; const seg = [];
      for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(d); total += d; }
      let left = total * clamp(p, 0, 1); g.strokeStyle = color; g.lineWidth = width; g.lineCap = "round"; g.lineJoin = "round"; if (dash) g.setLineDash(dash);
      g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) { if (left <= 0) break; const k = Math.min(1, left / seg[i - 1]); g.lineTo(lerp(pts[i - 1][0], pts[i][0], k), lerp(pts[i - 1][1], pts[i][1], k)); left -= seg[i - 1]; }
      g.stroke(); g.setLineDash([]);
    },
    arrow(g, x1, y1, x2, y2, p = 1, { color = PAL.red, width = 6 } = {}) {
      const ex = lerp(x1, x2, p), ey = lerp(y1, y2, p); H.line(g, [[x1, y1], [ex, ey]], 1, { color, width });
      if (p > 0.15) { const a = Math.atan2(y2 - y1, x2 - x1), hl = width * 3.2; g.fillStyle = color; g.beginPath(); g.moveTo(ex, ey); g.lineTo(ex - Math.cos(a - 0.5) * hl, ey - Math.sin(a - 0.5) * hl); g.lineTo(ex - Math.cos(a + 0.5) * hl, ey - Math.sin(a + 0.5) * hl); g.closePath(); g.fill(); }
    },
    // 숫자 포맷 (카운트업용)
    num(v, { comma = true, digits = 0 } = {}) { const s = v.toFixed(digits); return comma ? s.replace(/\B(?=(\d{3})+(?!\d))/g, ",") : s; },
    // 자막 판
    caption(g, W, H_, str, { y = null, size = 44, top = false, reveal = 1, maxW = null } = {}) {
      if (!str) return;
      g.font = H.font(size, "B"); const lines = str.split("\n"); const tw = Math.max(...lines.map((l) => g.measureText(l.replace(/[{}]/g, "")).width));
      const pw = Math.min(maxW || W * 0.86, tw + size * 1.6), ph = lines.length * size * 1.35 + size * 0.7;
      const yy = y ?? (top ? H_ * 0.09 : H_ - ph - H_ * 0.075);
      g.save(); g.globalAlpha *= 0.96; g.fillStyle = PAL.cream; H.shadow(g, true, 18, 8, 0.2); H.rrect(g, W / 2 - pw / 2, yy, pw, ph, 10); g.fill(); H.shadow(g, false); g.restore();
      H.text(g, str, W / 2, yy + size * 1.15, { size, w: "B", color: PAL.ink, align: "center", lh: 1.35, reveal, hlColor: PAL.red, hlStyle: "color" });
    },
  };
  window.H = H;

  // ---------- image loading ----------
  const IMG = {}; window.IMG = IMG;
  function loadImage(key, src) {
    return new Promise((res) => { const im = new Image(); im.onload = () => { IMG[key] = im; res(im); }; im.onerror = () => { console.warn("image fail", src); res(null); }; im.src = src; });
  }

  // ---------- main ----------
  let TL = null, stage, ctx, paper;
  async function init() {
    const q = new URLSearchParams(location.search);
    const which = q.get("tl") || window.TIMELINE_NAME || "long";
    const durations = await (await fetch(`../../../05_제작소스/03_음성/${which === "short" ? "01_숏폼" : "02_롱폼"}/durations.json?${Date.now()}`)).json();
    const assets = window.ASSETS || {};
    await Promise.all(Object.entries(assets).map(([k, src]) => loadImage(k, src)));
    try { await document.fonts.load('40px "Pretendard-ExtraBold"'); await document.fonts.load('40px "NanumSquareRoundB"'); await document.fonts.load('40px "NanumSquareRoundR"'); await document.fonts.load('40px "Jua"'); } catch (e) {}
    TL = window.BUILD(durations); window.TL = TL;
    stage = document.getElementById("stage"); stage.width = TL.W; stage.height = TL.H; ctx = stage.getContext("2d");
    paper = makePaper(TL.W, TL.H);
    TL.items.sort((a, b) => (a.z || 0) - (b.z || 0));
    window.SEEK(0);
    return true;
  }

  window.SEEK = function (t) {
    const g = ctx, { W, H: HH } = TL;
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.drawImage(paper, 0, 0);
    // camera: 장면별 천천히 줌, 점프컷 리셋
    let cam = { zoom: 1, x: W / 2, y: HH / 2 };
    if (TL.camera) cam = TL.camera(t) || cam;
    g.translate(W / 2, HH / 2); g.scale(cam.zoom, cam.zoom); g.translate(-cam.x, -cam.y);
    for (const it of TL.items) {
      if (t < it.t0 || t >= it.t1) continue;
      const p = interp(it.kf, t, it.ease);
      const a = p.a ?? 1; if (a <= 0) continue;
      let wx = 0, wy = 0, wr = 0;
      if (it.wobble) { const s = (it.seed || 1) * 1.37; wx = Math.sin(t * 1.3 + s) * it.wobble; wy = Math.cos(t * 1.1 + s * 2) * it.wobble; wr = Math.sin(t * 0.9 + s * 3) * (it.wobbleR || 0.004); }
      g.save(); g.globalAlpha = clamp(a, 0, 1);
      g.translate((p.x ?? 0) + wx, (p.y ?? 0) + wy); g.rotate((p.r ?? 0) + wr); const sc = p.s ?? 1; g.scale(sc, sc);
      try { it.draw(g, t, p, it); } catch (e) { console.error(it.id, e); }
      g.restore();
    }
    g.setTransform(1, 0, 0, 1, 0, 0);
    if (TL.overlay) TL.overlay(g, t);
  };

  window.READY = init();
  // 미리보기: 클릭하면 재생/정지, 키보드 ←→ 1초 이동
  window.addEventListener("load", () => {
    let playing = false, t0 = 0, base = 0, raf;
    const tick = () => { if (!playing) return; const t = base + (performance.now() - t0) / 1000; if (t > TL.duration) { playing = false; return; } window.SEEK(t); document.title = t.toFixed(1); raf = requestAnimationFrame(tick); };
    window.PLAY = (from = 0) => { base = from; t0 = performance.now(); playing = true; tick(); };
    window.STOP = () => { playing = false; };
    document.addEventListener("keydown", (e) => { if (e.key === " ") { playing ? window.STOP() : window.PLAY(parseFloat(document.title) || 0); } if (e.key === "ArrowRight") { window.STOP(); const t = (parseFloat(document.title) || 0) + 1; window.SEEK(t); document.title = t.toFixed(1); } if (e.key === "ArrowLeft") { window.STOP(); const t = Math.max(0, (parseFloat(document.title) || 0) - 1); window.SEEK(t); document.title = t.toFixed(1); } });
  });
})();
