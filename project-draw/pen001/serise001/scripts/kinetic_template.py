#!/usr/bin/env python3
"""Render animated, one-line Korean typography subtitles for jatu002."""

from __future__ import annotations

import bisect
import argparse
import math
import re
import shutil
import subprocess
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parent
SCRIPT_DIR = ROOT / "대본"
OUT_DIR = ROOT / "result" / ".typography"
OUTPUT_VIDEO = OUT_DIR / "subtitles-alpha.mov"
FONT_PATH = "/System/Library/Fonts/AppleSDGothicNeo.ttc"

WIDTH, HEIGHT = 720, 300
FPS = 24
INTRO_SECONDS = 2.0
BASE_SIZE = 45
MAX_LINE_WIDTH = 640
TEXT_TOP = 72

BASE_COLOR = (255, 250, 236)
ACTIVE_COLOR = (255, 214, 56)
OUTLINE = (6, 28, 76)
SHADOW = (0, 0, 0)
ACCENT = (247, 76, 42)

SCENES = [
    "S01", "S02", "S03", "S04A", "S04B", "S05", "S06A", "S06B",
    "S07", "S08A", "S08B", "S09", "S10", "S11",
]

KEYWORD_FRAGMENTS = (
    "부자", "용돈", "은행", "통장", "오만", "동전", "돈", "돕", "사업자",
    "카드값", "탈무드", "생업", "도둑질", "사랑", "벌어", "버는", "늘어",
)


@dataclass
class Event:
    start: float
    end: float
    words: list[str]
    active: int
    keyword: bool


def media_duration(path: Path) -> float:
    value = subprocess.check_output(
        [
            "ffprobe", "-v", "error", "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1", str(path),
        ],
        text=True,
    )
    return float(value.strip())


def visible_length(word: str) -> float:
    core = re.sub(r"[^0-9A-Za-z가-힣]", "", word)
    weight = max(1.0, len(core) * 0.78 + 0.45)
    if re.search(r"[,.?!\"']$", word):
        weight += 0.45
    return weight


def normalized(word: str) -> str:
    return re.sub(r"[^0-9A-Za-z가-힣]", "", word)


def is_keyword(word: str) -> bool:
    clean = normalized(word)
    return any(fragment in clean for fragment in KEYWORD_FRAGMENTS)


@lru_cache(maxsize=64)
def font(size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(FONT_PATH, size, index=14)


def text_width(draw: ImageDraw.ImageDraw, text: str, chosen_font) -> int:
    box = draw.textbbox((0, 0), text, font=chosen_font, stroke_width=0)
    return box[2] - box[0]


def split_chunks(words: list[str], draw: ImageDraw.ImageDraw) -> list[tuple[int, int]]:
    chunks: list[tuple[int, int]] = []
    start = 0
    base = font(BASE_SIZE)
    while start < len(words):
        end = start + 1
        while end <= len(words):
            candidate = " ".join(words[start:end])
            if text_width(draw, candidate, base) > MAX_LINE_WIDTH and end > start + 1:
                end -= 1
                break
            if end == len(words):
                break
            end += 1
        chunks.append((start, end))
        start = end
    return chunks


def build_events() -> tuple[list[Event], float]:
    scratch = ImageDraw.Draw(Image.new("RGB", (8, 8)))
    events: list[Event] = []
    cursor = INTRO_SECONDS
    for scene in SCENES:
        scene_text = (SCRIPT_DIR / f"{scene}.txt").read_text(encoding="utf-8").strip()
        words = scene_text.split()
        duration = media_duration(SCRIPT_DIR / f"{scene}.mp3")
        weights = [visible_length(word) for word in words]
        unit = duration / sum(weights)
        chunks = split_chunks(words, scratch)
        chunk_for_word: dict[int, tuple[int, int]] = {}
        for start, end in chunks:
            for index in range(start, end):
                chunk_for_word[index] = (start, end)
        for word_index, weight in enumerate(weights):
            start_index, end_index = chunk_for_word[word_index]
            word_duration = weight * unit
            events.append(Event(
                start=cursor,
                end=cursor + word_duration,
                words=words[start_index:end_index],
                active=word_index - start_index,
                keyword=is_keyword(words[word_index]),
            ))
            cursor += word_duration
    return events, cursor


def ease_out_back(value: float) -> float:
    c1 = 1.70158
    c3 = c1 + 1
    x = value - 1
    return 1 + c3 * x * x * x + c1 * x * x


def active_scale(progress: float, keyword: bool) -> float:
    if keyword:
        if progress < 0.30:
            return 0.55 + 0.95 * ease_out_back(progress / 0.30)
        if progress < 0.52:
            return 1.50 - 0.27 * ((progress - 0.30) / 0.22)
        return 1.23
    if progress < 0.25:
        return 0.82 + 0.32 * ease_out_back(progress / 0.25)
    return 1.12


def draw_word(draw, position, text, chosen_font, fill, stroke=5) -> None:
    x, y = position
    draw.text((x + 4, y + 6), text, font=chosen_font, fill=SHADOW,
              stroke_width=stroke + 2, stroke_fill=SHADOW, anchor="lt")
    draw.text((x, y), text, font=chosen_font, fill=fill,
              stroke_width=stroke, stroke_fill=OUTLINE, anchor="lt")


def render_frame(event: Event | None, timestamp: float) -> Image.Image:
    image = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    if event is None:
        return image
    draw = ImageDraw.Draw(image)
    duration = max(0.001, event.end - event.start)
    progress = min(1.0, max(0.0, (timestamp - event.start) / duration))
    reveal = min(1.0, progress / 0.48)
    base = font(BASE_SIZE)
    gap = 12
    widths = [text_width(draw, word, base) for word in event.words]
    total_width = sum(widths) + gap * (len(widths) - 1)
    cursor_x = (WIDTH - total_width) / 2
    chunk_enter = min(1.0, (timestamp - event.start) / 0.16)
    bounce_y = (1.0 - ease_out_back(chunk_enter)) * 18

    for index, word in enumerate(event.words):
        slot_width = widths[index]
        if index < event.active:
            shown = word
            chosen_font = base
            fill = BASE_COLOR
            draw_x = cursor_x
            draw_y = TEXT_TOP
        elif index == event.active:
            count = max(1, math.ceil(len(word) * reveal))
            shown = word[:count]
            scale = active_scale(progress, event.keyword)
            chosen_font = font(max(30, round(BASE_SIZE * scale)))
            active_width = text_width(draw, shown, chosen_font)
            draw_x = cursor_x + (slot_width - active_width) / 2
            draw_y = TEXT_TOP - (chosen_font.size - BASE_SIZE) * 0.65 + bounce_y
            fill = ACTIVE_COLOR
            if event.keyword and progress > 0.08:
                pad_x, pad_y = 13, 7
                box = draw.textbbox((draw_x, draw_y), shown, font=chosen_font,
                                    stroke_width=6, anchor="lt")
                pulse = 3 * math.sin(min(1.0, progress / 0.35) * math.pi)
                draw.rounded_rectangle(
                    (box[0] - pad_x - pulse, box[1] - pad_y - pulse,
                     box[2] + pad_x + pulse, box[3] + pad_y + pulse),
                    radius=18, fill=ACCENT,
                )
        else:
            cursor_x += slot_width + gap
            continue
        draw_word(draw, (draw_x, draw_y), shown, chosen_font, fill)
        cursor_x += slot_width + gap
    return image


def main() -> None:
    global ROOT, SCRIPT_DIR, OUT_DIR, OUTPUT_VIDEO, INTRO_SECONDS, KEYWORD_FRAGMENTS, SCENES
    parser = argparse.ArgumentParser(description="Render one-line kinetic Korean subtitles")
    parser.add_argument("--project-dir", required=True, help="Project directory containing 대본/")
    parser.add_argument("--output", default=None, help="Alpha MOV output path")
    parser.add_argument("--intro-seconds", type=float, default=2.0)
    parser.add_argument("--frame-height", type=int, default=1280)
    parser.add_argument("--position-from-bottom", type=float, default=0.375)
    parser.add_argument("--keywords", default="", help="Comma-separated keyword fragments")
    args = parser.parse_args()

    ROOT = Path(args.project_dir).resolve()
    SCRIPT_DIR = ROOT / "대본"
    OUT_DIR = ROOT / "result" / ".typography"
    OUTPUT_VIDEO = Path(args.output).resolve() if args.output else OUT_DIR / "subtitles-alpha.mov"
    INTRO_SECONDS = args.intro_seconds
    if args.keywords.strip():
        KEYWORD_FRAGMENTS = tuple(item.strip() for item in args.keywords.split(",") if item.strip())
    def scene_key(path: Path):
        match = re.fullmatch(r"([A-Za-z]+)(\d+)([A-Za-z]*)", path.stem)
        return (match.group(1), int(match.group(2)), match.group(3)) if match else (path.stem, 0, "")
    SCENES = [
        path.stem for path in sorted(SCRIPT_DIR.glob("S*.txt"), key=scene_key)
        if path.with_suffix(".mp3").exists()
    ]
    if not SCENES:
        raise FileNotFoundError(f"자막 세그먼트를 찾지 못했습니다: {SCRIPT_DIR}/S*.txt + S*.mp3")

    if OUT_DIR.exists():
        shutil.rmtree(OUT_DIR)
    OUT_DIR.mkdir(parents=True)
    events, total_duration = build_events()
    ends = [event.end for event in events]
    frame_count = math.ceil(total_duration * FPS)
    command = [
        "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
        "-f", "rawvideo", "-pix_fmt", "rgba", "-s", f"{WIDTH}x{HEIGHT}",
        "-r", str(FPS), "-i", "-", "-an", "-c:v", "qtrle",
        "-pix_fmt", "argb", str(OUTPUT_VIDEO),
    ]
    process = subprocess.Popen(command, stdin=subprocess.PIPE)
    assert process.stdin is not None
    try:
        for frame_number in range(frame_count):
            timestamp = frame_number / FPS
            if timestamp < INTRO_SECONDS:
                current = None
            else:
                index = bisect.bisect_right(ends, timestamp)
                current = events[min(index, len(events) - 1)]
            process.stdin.write(render_frame(current, timestamp).tobytes())
    finally:
        process.stdin.close()
    return_code = process.wait()
    if return_code:
        raise SystemExit(return_code)
    subtitle_center_in_strip = TEXT_TOP + BASE_SIZE / 2
    target_center = args.frame_height * (1.0 - args.position_from_bottom)
    overlay_y = round(target_center - subtitle_center_in_strip)
    print(
        f"frames={frame_count} duration={total_duration:.6f} "
        f"output={OUTPUT_VIDEO} overlay_y={overlay_y}"
    )


if __name__ == "__main__":
    main()
