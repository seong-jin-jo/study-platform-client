#!/usr/bin/env python3
"""Draw red numbered boxes on frontend issue screenshots from a JSON spec."""
import json
import sys
from pathlib import Path

try:
    from PIL import Image, ImageDraw, ImageFont
except ModuleNotFoundError as exc:
    raise SystemExit(
        "Pillow is required. Example:\n"
        "python3 -m venv /tmp/frontend-issue-venv\n"
        "/tmp/frontend-issue-venv/bin/pip install pillow\n"
        "/tmp/frontend-issue-venv/bin/python "
        "skills_context/PERSONAL/frontend-issue-report/scripts/annotate_issue_screenshots.py spec.json"
    ) from exc

FONT_CANDIDATES = [
    "/System/Library/Fonts/AppleSDGothicNeo.ttc",
    "/System/Library/Fonts/Supplemental/AppleGothic.ttf",
    "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
]


def load_font(size: int):
    for font_path in FONT_CANDIDATES:
        if Path(font_path).exists():
            try:
                return ImageFont.truetype(font_path, size)
            except Exception:
                pass
    return ImageFont.load_default()


def rect_from_box(box):
    if "rect" in box:
        x1, y1, x2, y2 = box["rect"]
    else:
        x1, y1 = box["x"], box["y"]
        x2, y2 = x1 + box["w"], y1 + box["h"]
    return [int(round(value)) for value in (x1, y1, x2, y2)]


def annotate(item, font):
    src = Path(item["src"]).expanduser()
    out = Path(item["out"]).expanduser()
    out.parent.mkdir(parents=True, exist_ok=True)

    image = Image.open(src).convert("RGBA")
    draw = ImageDraw.Draw(image)

    for box in item.get("boxes", []):
        ident = str(box["id"])
        x1, y1, x2, y2 = rect_from_box(box)

        for pad in range(5):
            draw.rectangle(
                [x1 - pad, y1 - pad, x2 + pad, y2 + pad],
                outline=(255, 0, 0, 255),
                width=1,
            )

        badge_w, badge_h = 38, 32
        bx = max(4, min(x1 + 4, image.width - badge_w - 4))
        by = max(4, min(y1 + 4, image.height - badge_h - 4))
        draw.rounded_rectangle(
            [bx, by, bx + badge_w, by + badge_h],
            radius=9,
            fill=(255, 0, 0, 235),
        )
        try:
            text_w = draw.textlength(ident, font=font)
        except Exception:
            text_w = len(ident) * 12
        draw.text(
            (bx + (badge_w - text_w) / 2, by - 1),
            ident,
            fill=(255, 255, 255, 255),
            font=font,
        )

    image.convert("RGB").save(out, quality=int(item.get("quality", 95)))
    return out


def main(argv):
    if len(argv) != 2:
        raise SystemExit("Usage: annotate_issue_screenshots.py spec.json")

    spec = json.loads(Path(argv[1]).read_text())
    font = load_font(int(spec.get("badge_font_size", 28)))
    outputs = [annotate(item, font) for item in spec.get("images", [])]
    for output in outputs:
        print(output)


if __name__ == "__main__":
    main(sys.argv)
