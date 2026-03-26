from math import cos, pi, sin
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "assets" / "play-store"

BLACK = "#0d0f0d"
WHITE = "#f6f4ef"
MUTED = "#c8c6be"
CARD = "#151915"
GREEN = "#7ddf8b"


def load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf",
    ]
    for candidate in candidates:
        path = Path(candidate)
        if path.exists():
            return ImageFont.truetype(str(path), size)
    return ImageFont.load_default()


def rounded_rectangle(draw: ImageDraw.ImageDraw, box, radius: int, fill, outline=None, width: int = 1):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def draw_logo(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], fg: str = WHITE, bg: str = BLACK):
    left, top, right, bottom = box
    size = min(right - left, bottom - top)
    cx = left + size / 2
    cy = top + size / 2

    ring_width = max(4, round(size * 0.02))
    ring_margin = round(size * 0.03)
    outer_radius = (size / 2) - ring_margin

    draw.ellipse(
        (cx - outer_radius, cy - outer_radius, cx + outer_radius, cy + outer_radius),
        outline=fg,
        width=ring_width,
    )

    total_numbers = 12
    outer_r = size * 0.47
    inner_r = size * 0.38
    tick_width = max(4, round(size * 0.025))
    for i in range(total_numbers):
        angle = (i * 360) / total_numbers
        rad = (angle - 90) * (pi / 180)
        x1 = cx + outer_r * cos(rad)
        y1 = cy + outer_r * sin(rad)
        x2 = cx + inner_r * cos(rad)
        y2 = cy + inner_r * sin(rad)
        draw.line((x1, y1, x2, y2), fill=fg, width=tick_width)

    picker_size = size * 0.66
    picker_radius = picker_size / 2
    draw.ellipse(
        (cx - picker_radius, cy - picker_radius, cx + picker_radius, cy + picker_radius),
        fill=fg,
    )

    notch_width = max(6, round(size * 0.03125))
    notch_height = max(20, round(size * 0.106))
    notch_x = cx - notch_width / 2
    notch_top = cy - picker_radius + (picker_size * 0.05)
    draw.rounded_rectangle(
        (notch_x, notch_top, notch_x + notch_width, notch_top + notch_height),
        radius=max(2, notch_width // 3),
        fill=bg,
    )


def draw_stat_card(draw: ImageDraw.ImageDraw, box, title: str, value: str, accent: str, icon: str):
    x1, y1, x2, y2 = box
    rounded_rectangle(draw, box, radius=28, fill=CARD, outline="#232923", width=2)
    title_font = load_font(24, bold=False)
    value_font = load_font(38, bold=True)
    icon_font = load_font(32, bold=True)

    draw.text((x1 + 28, y1 + 20), title, font=title_font, fill=MUTED)
    draw.text((x1 + 28, y1 + 64), value, font=value_font, fill=WHITE)
    draw.text((x2 - 62, y1 + 22), icon, font=icon_font, fill=accent)

    bar_y = y2 - 28
    draw.rounded_rectangle((x1 + 28, bar_y, x2 - 28, bar_y + 10), radius=5, fill="#242a24")
    draw.rounded_rectangle((x1 + 28, bar_y, x1 + 28 + int((x2 - x1 - 56) * 0.72), bar_y + 10), radius=5, fill=accent)


def create_logo_png():
    size = 512
    image = Image.new("RGB", (size, size), BLACK)
    draw = ImageDraw.Draw(image)

    padding = 52
    draw_logo(draw, (padding, padding, size - padding, size - padding))

    path = OUTPUT_DIR / "play-store-logo.png"
    image.save(path, format="PNG")
    return path


def create_feature_graphic():
    width = 1024
    height = 500
    image = Image.new("RGB", (width, height), BLACK)
    draw = ImageDraw.Draw(image)

    # Left logo block
    halo_box = (58, 74, 406, 422)
    rounded_rectangle(draw, halo_box, radius=44, fill="#101410", outline="#1e241e", width=2)
    draw_logo(draw, (88, 104, 376, 392))

    title_font = load_font(56, bold=True)
    subtitle_font = load_font(24, bold=False)
    tag_font = load_font(22, bold=True)

    draw.text((448, 76), "Safadd", font=title_font, fill=WHITE)
    draw.text((450, 146), "Control simple de gastos", font=subtitle_font, fill=MUTED)

    chip_y = 190
    chips = [("Movimientos", 450, 584), ("Reportes", 596, 714), ("Escaner", 726, 834)]
    for label, x1, x2 in chips:
        rounded_rectangle(draw, (x1, chip_y, x2, chip_y + 42), radius=21, fill="#131813", outline="#262c26", width=2)
        bbox = draw.textbbox((0, 0), label, font=tag_font)
        tw = bbox[2] - bbox[0]
        th = bbox[3] - bbox[1]
        draw.text((x1 + ((x2 - x1) - tw) / 2, chip_y + ((42 - th) / 2) - 2), label, font=tag_font, fill=WHITE)

    draw_stat_card(draw, (448, 252, 642, 424), "Balance", "$ 48.200", GREEN, "$")
    draw_stat_card(draw, (664, 252, 858, 424), "Objetivo", "72%", "#69c9ff", "%")
    draw_stat_card(draw, (880, 252, 1000, 424), "Alertas", "ON", "#ffb86c", "!")

    path = OUTPUT_DIR / "play-store-feature-graphic.png"
    image.save(path, format="PNG")
    return path


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    logo_path = create_logo_png()
    feature_path = create_feature_graphic()
    print(f"created {logo_path}")
    print(f"created {feature_path}")


if __name__ == "__main__":
    main()