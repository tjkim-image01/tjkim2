"""tj003 효과음(tj002 것 재사용) 합성 (numpy) → 05_제작소스/04_음악효과음/sfx/<이름>.wav (48kHz 모노)
rip(종이 찢기) whoosh(휙) pop(뽁) thud(툭) stamp(쾅 도장) ding(띵) flutter(팔랑) boom(펑) plane(비행기) rise(풍선 상승) boing(띠용)
실행: /Users/jatu/app/youtube3/.venv-tts/bin/python 05_sfx.py
"""
import wave
from pathlib import Path
import numpy as np
SR = 48000
OUT = Path(__file__).resolve().parents[2] / "05_제작소스/04_음악효과음/sfx"; OUT.mkdir(parents=True, exist_ok=True)
rng = np.random.default_rng(7)
T = lambda d: np.arange(int(SR * d)) / SR
noise = lambda d: rng.standard_normal(int(SR * d))

def lp(x, a):  # 1차 저역통과 (a 0~1, 작을수록 어두움)
    y = np.empty_like(x); s = 0.0
    for i, v in enumerate(x): s += a * (v - s); y[i] = s
    return y

def bp(x, lo, hi):
    return lp(x, hi) - lp(x, lo)

def env(n, att, dec):
    t = np.arange(n) / SR
    return np.minimum(1, t / max(att, 1e-4)) * np.exp(-t / dec)

def save(name, x):
    x = x / (np.abs(x).max() + 1e-9) * 0.9
    fade = min(len(x), int(SR * 0.01)); x[-fade:] *= np.linspace(1, 0, fade)
    with wave.open(str(OUT / f"{name}.wav"), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((x * 32767).astype(np.int16).tobytes())

# 종이 찢기: 거친 크래클 노이즈 버스트
d = 0.42; n = noise(d); crack = (rng.random(len(n)) < 0.02) * rng.standard_normal(len(n)) * 4
save("rip", bp(n + crack, 0.08, 0.6) * env(len(n), 0.01, 0.16) * (0.6 + 0.4 * np.sin(T(d) * 2 * np.pi * 37) ** 2))
# 휙: 밴드 이동 노이즈
d = 0.45; t = T(d); n = noise(d); a = 0.03 + 0.25 * np.sin(np.pi * t / d)
y = np.empty_like(n); s = 0.0
for i, v in enumerate(n): s += a[i] * (v - s); y[i] = s
save("whoosh", y * np.sin(np.pi * t / d) ** 2)
# 뽁: 빠르게 떨어지는 사인
d = 0.14; t = T(d); f = 900 * np.exp(-t * 30) + 250
save("pop", np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(t), 0.002, 0.04))
# 툭: 낮은 사인 + 클릭
d = 0.25; t = T(d)
save("thud", np.sin(2 * np.pi * (110 * np.exp(-t * 8) + 50) * t) * env(len(t), 0.001, 0.07) + lp(noise(d), 0.3) * env(len(t), 0.0005, 0.01) * 0.6)
# 쾅 도장: 붐 + 노이즈
d = 0.5; t = T(d)
save("stamp", np.sin(2 * np.pi * (140 * np.exp(-t * 14) + 45) * t) * env(len(t), 0.001, 0.12) + lp(noise(d), 0.25) * env(len(t), 0.001, 0.05) * 0.9)
# 띵: 벨
d = 1.3; t = T(d)
save("ding", (np.sin(2 * np.pi * 1318 * t) + 0.5 * np.sin(2 * np.pi * 2637 * t) + 0.25 * np.sin(2 * np.pi * 3950 * t)) * env(len(t), 0.002, 0.35))
# 팔랑: 진폭 변조 밴드 노이즈
d = 1.0; t = T(d)
save("flutter", bp(noise(d), 0.05, 0.4) * (0.5 + 0.5 * np.sin(2 * np.pi * 11 * t + np.sin(2 * np.pi * 3 * t))) ** 3 * np.sin(np.pi * t / d))
# 펑: 긴 저역 노이즈 + 서브
d = 1.2; t = T(d)
save("boom", lp(noise(d), 0.04) * env(len(t), 0.003, 0.3) * 3 + np.sin(2 * np.pi * (70 * np.exp(-t * 3) + 35) * t) * env(len(t), 0.002, 0.35))
# 비행기: 프로펠러 웅웅 (도플러)
d = 2.4; t = T(d); f = 95 * (1 + 0.12 * np.cos(np.pi * t / d))
saw = 2 * ((np.cumsum(f) / SR) % 1) - 1
save("plane", lp(saw + 0.3 * noise(d), 0.08) * np.sin(np.pi * t / d) ** 1.5 * (0.7 + 0.3 * np.sin(2 * np.pi * 22 * t)))
# 풍선 상승: 위로 미끄러지는 휘슬
d = 0.8; t = T(d); f = 500 + 700 * (t / d) ** 1.5
save("rise", np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / d) * 0.8)
# 띠용
d = 0.7; t = T(d); f = 220 + 120 * np.sin(2 * np.pi * 9 * t) * np.exp(-t * 3)
save("boing", np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(t), 0.003, 0.25))
print(sorted(p.name for p in OUT.glob("*.wav")))
