"""tj002 BGM 대체 — Flow Music 이 Aside 어느 계정에도 로그인돼 있지 않아(2026-10-15 확인) 코드로 레트로 스윙을 합성한다.
03_bgm_prompt.md 와 같은 방향: 118 BPM 가벼운 스윙, 워킹 베이스, 브라스 스탭, 비브라폰, 박수, 휘파람 멜로디. 보컬 없음.

실행: /Users/jatu/app/youtube3/.venv-tts/bin/python 02c_bgm_synth.py [초=96]
→ 05_제작소스/04_음악효과음/bgm_flow.wav (48kHz 스테레오) — Flow 곡을 받으면 같은 이름으로 덮어쓴다
"""
import sys, wave
from pathlib import Path
import numpy as np

SR = 48000
DUR = float(sys.argv[1]) if len(sys.argv) > 1 else 96.0
OUT = Path(__file__).resolve().parents[2] / "05_제작소스/04_음악효과음/bgm_flow.wav"
BPM = 118; BEAT = 60 / BPM; BAR = 4 * BEAT; SW = 0.64   # 스윙 비율 (8분음표 앞쪽 길이)
N = int(SR * (DUR + 2))
rng = np.random.default_rng(3)
mid = lambda m: 440 * 2 ** ((m - 69) / 12)


def fft_filter(x, lo=0, hi=SR / 2):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    X[(f < lo) | (f > hi)] = 0
    return np.fft.irfft(X, len(x))


def add(buf, t, sig):
    i = int(t * SR)
    if i >= len(buf): return
    sig = sig[: len(buf) - i]; buf[i:i + len(sig)] += sig


def env(n, a, d, sus=0.0):
    t = np.arange(n) / SR
    return np.minimum(1, t / a) * (sus + (1 - sus) * np.exp(-t / d))


def tone(freq, dur, harm=(1,), amps=(1,), vib=0.0, vibf=5.5):
    t = np.arange(int(dur * SR)) / SR
    ph = 2 * np.pi * freq * (t + (vib / (2 * np.pi * vibf)) * np.sin(2 * np.pi * vibf * t) if vib else t)
    return sum(a * np.sin(h * ph) for h, a in zip(harm, amps))


# F장조 I-vi-ii-V / 브리지 IV-iv-I-V
A = [("F6", [53, 57, 60, 62]), ("Dm7", [50, 53, 57, 60]), ("Gm7", [55, 58, 62, 65]), ("C7", [48, 52, 55, 58])]
B = [("Bb6", [58, 62, 65, 67]), ("Bbm6", [58, 61, 65, 67]), ("F6", [53, 57, 60, 62]), ("C7", [48, 52, 55, 58])]
form = (A * 2 + B + A) * 6
bars = int(DUR / BAR) + 1
bass = np.zeros(N); brass = np.zeros(N); vibes = np.zeros(N); drums = np.zeros(N); whistle = np.zeros(N)
# 멜로디 음형 (박 단위 오프셋, 화음 내 인덱스+옥타브)
MOT = [[(0, 2), (1, 3), (1.5, 2), (2.5, 1), (3, 0)], [(0, 3), (0.5, 2), (1.5, 1), (2, 2), (3, 3)], [(0, 1), (1, 2), (2, 3), (2.5, 2), (3.5, 1)], [(0, 3), (1.5, 2), (2, 1), (3, 0)]]
for k in range(bars):
    name, ch = form[k % len(form)]
    t0 = k * BAR; sect = (k // 8) % 4
    root = ch[0] - 12 if ch[0] >= 53 else ch[0]
    # 워킹 베이스: 근음·3도·5도·경과음
    walk = [root, root + (ch[1] - ch[0]), root + 7, root + (9 if k % 2 else 10)]
    for b, m in enumerate(walk):
        s = tone(mid(m - 12), BEAT * 0.95, (1, 2, 3), (1, 0.5, 0.2)) * env(int(BEAT * 0.95 * SR), 0.004, 0.35)
        add(bass, t0 + b * BEAT, s)
    # 브라스 스탭: 2·4 박 뒷박 (스윙)
    if sect != 0 or k >= 2:
        for b in (1, 3):
            for m in ch:
                n = int(0.22 * SR); t = np.arange(n) / SR
                saw = 2 * ((mid(m) * t) % 1) - 1
                add(brass, t0 + (b + SW) * BEAT, saw * env(n, 0.006, 0.09, 0.2))
    # 비브라폰: 화음 아르페지오 음형 (섹션 1·3), 휘파람 멜로디 (섹션 2·3)
    mot = MOT[k % 4]
    for b, idx in mot:
        tb = t0 + (np.floor(b) + (SW if b % 1 else 0)) * BEAT
        m = ch[idx % 4] + 12
        if sect in (1, 3) or (sect == 0 and k >= 4):
            add(vibes, tb, tone(mid(m), 1.2, (1, 4), (1, 0.15)) * env(int(1.2 * SR), 0.003, 0.5) * (1 + 0.25 * np.sin(2 * np.pi * 6 * np.arange(int(1.2 * SR)) / SR)))
        if sect in (2, 3):
            d = BEAT * 0.9
            add(whistle, tb, tone(mid(m + 12), d, (1,), (1,), vib=0.012) * env(int(d * SR), 0.03, 0.6, 0.6))
    # 박수 2·4, 하이햇 스윙 8분
    for b in range(4):
        if b in (1, 3):
            n = int(0.18 * SR); add(drums, t0 + b * BEAT, rng.standard_normal(n) * env(n, 0.001, 0.035) * 0.9)
        for off in (0, SW):
            n = int(0.06 * SR); add(drums, t0 + (b + off) * BEAT, rng.standard_normal(n) * env(n, 0.0005, 0.012) * (0.35 if off else 0.22))

bass = fft_filter(bass, 30, 900); brass = fft_filter(brass, 150, 2600); drums = fft_filter(drums, 1200, 12000)
vibes = fft_filter(vibes, 200, 6000); whistle = fft_filter(whistle, 300, 5000)
norm = lambda x: x / (np.abs(x).max() + 1e-9)
L = 0.38 * norm(bass) + 0.32 * norm(brass) + 0.3 * norm(vibes) + 0.22 * norm(drums) + 0.28 * norm(whistle)
R = 0.38 * norm(bass) + 0.26 * norm(brass) + 0.36 * norm(vibes) + 0.26 * norm(drums) + 0.24 * norm(whistle)
mix = np.stack([L, R], 1)[: int(DUR * SR)]
fi, fo = int(0.5 * SR), int(3 * SR)
mix[:fi] *= np.linspace(0, 1, fi)[:, None]; mix[-fo:] *= np.linspace(1, 0, fo)[:, None]
mix = mix / np.abs(mix).max() * 0.85
OUT.parent.mkdir(parents=True, exist_ok=True)
with wave.open(str(OUT), "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix * 32767).astype(np.int16).tobytes())
print(OUT, f"{DUR}s")
