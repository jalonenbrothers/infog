"""Render favicon.svg to a multi-size favicon.ico via Pillow (no external tools)."""
import struct, io, sys

# Draw the coin directly (Pillow has no SVG support): gold disc + inner ring + "£"
from PIL import Image, ImageDraw, ImageFont

SIZES = [16, 32]
GOLD = (184, 134, 11, 255)
GOLD_DARK = (138, 101, 8, 255)
RING = (246, 216, 118, 230)
TEXT = (255, 248, 225, 255)

def draw_coin(size):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    r = size // 2 - max(1, size // 32)
    cx = cy = size // 2
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=GOLD, outline=GOLD_DARK,
              width=max(1, size // 32))
    rx = int(r * 0.66); ry = int(r * 0.75)
    d.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], outline=RING,
              width=max(1, size // 16))
    # £ glyph: try a serif font, fall back to drawing a simple L-with-bar
    fsize = int(size * 0.55)
    font = None
    for path in ["/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf",
                 "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf",
                 "/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf"]:
        try:
            font = ImageFont.truetype(path, fsize)
            break
        except Exception:
            pass
    if font is not None:
        tb = d.textbbox((0, 0), "£", font=font)
        w, h = tb[2] - tb[0], tb[3] - tb[1]
        d.text((cx - w / 2 - tb[0], cy - h / 2 - tb[1]), "£", font=font, fill=TEXT)
    else:
        # crude £ fallback: vertical stroke + two crossbars + hook
        lw = max(1, size // 12)
        x0 = int(size * 0.38); y0 = int(size * 0.28); y1 = int(size * 0.62)
        d.line([x0, y0, x0, y1], fill=TEXT, width=lw)
        d.line([x0, int(size * 0.45), int(size * 0.68), int(size * 0.45)], fill=TEXT, width=lw)
        d.line([x0, int(size * 0.58), int(size * 0.72), int(size * 0.58)], fill=TEXT, width=lw)
    return img

imgs = [draw_coin(s) for s in SIZES]
imgs[1].save(sys.argv[1] if len(sys.argv) > 1 else "favicon.ico",
             format="ICO", sizes=[(s, s) for s in SIZES])
print("wrote ICO with sizes", SIZES)
