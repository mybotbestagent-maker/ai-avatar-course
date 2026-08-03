#!/usr/bin/env python3
"""Generate Gold Hands Painting brand pack: cards, sticker, banner, avatar."""
from __future__ import annotations

import os
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas as pdfcanvas
from reportlab.lib.utils import ImageReader

ROOT = Path(__file__).resolve().parents[1]
EXPORTS = ROOT / "exports"
PRINT = ROOT / "print"
FONTS = ROOT / "fonts"
LOGO = ROOT / "logo" / "chosen" / "logo-transparent-master.png"
if not LOGO.exists():
    LOGO = ROOT / "logo" / "chosen" / "gold-hands-painting-logo-master.png"

ORANGE = (241, 90, 36)
ORANGE_HOT = (255, 106, 51)
NAVY = (26, 39, 68)
NAVY_DEEP = (14, 22, 40)
PAPER = (243, 241, 236)
WHITE = (255, 255, 255)
INK = (16, 24, 40)
MUTED = (75, 85, 104)

PHONE = "(786) 788-8714"
WEB = "goldhandsmia.com"
IG = "@_gold_hands_"
EMAIL = "handymangoldhands@gmail.com"
BRAND = "Gold Hands Painting"
AREA = "Miami-Dade & Broward"


def font(name: str, size: int) -> ImageFont.FreeTypeFont:
    path = FONTS / name
    return ImageFont.truetype(str(path), size)


def load_logo() -> Image.Image:
    return Image.open(LOGO).convert("RGBA")


def fit_logo(logo: Image.Image, max_w: int, max_h: int) -> Image.Image:
    r = min(max_w / logo.width, max_h / logo.height)
    return logo.resize((max(1, int(logo.width * r)), max(1, int(logo.height * r))), Image.Resampling.LANCZOS)


def save_rgb(im: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if im.mode == "RGBA":
        bg = Image.new("RGB", im.size, WHITE)
        bg.paste(im, mask=im.split()[-1])
        bg.save(path, "PNG", dpi=(300, 300))
    else:
        im.convert("RGB").save(path, "PNG", dpi=(300, 300))


def make_avatar() -> None:
    logo = load_logo()
    for size, name in ((1024, "avatar-1024.png"), (512, "avatar-512.png"), (180, "avatar-180.png")):
        canvas = Image.new("RGBA", (size, size), (*NAVY, 255))
        # subtle orange corner glow via gradient-ish circles
        overlay = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        d = ImageDraw.Draw(overlay)
        d.ellipse((-size * 0.2, -size * 0.2, size * 0.7, size * 0.7), fill=(*ORANGE, 40))
        canvas = Image.alpha_composite(canvas, overlay)
        mark = fit_logo(logo, int(size * 0.82), int(size * 0.82))
        x = (size - mark.width) // 2
        y = (size - mark.height) // 2
        canvas.alpha_composite(mark, (x, y))
        save_rgb(canvas, EXPORTS / name)
        canvas.save(EXPORTS / name.replace(".png", "-transparent-bg.png"), "PNG")


def make_sticker() -> None:
    """Die-cut style square sticker with bleed, 3x3 in @300dpi."""
    dpi = 300
    size = 3 * dpi  # trim
    bleed = int(0.125 * dpi)
    canvas_size = size + 2 * bleed
    logo = load_logo()
    for bg_name, bg in (("white", WHITE), ("navy", NAVY), ("paper", PAPER)):
        im = Image.new("RGBA", (canvas_size, canvas_size), (*bg, 255))
        mark = fit_logo(logo, int(size * 0.78), int(size * 0.78))
        x = (canvas_size - mark.width) // 2
        y = (canvas_size - mark.height) // 2 - int(0.08 * dpi)
        im.alpha_composite(mark, (x, y))
        draw = ImageDraw.Draw(im)
        f = font("Montserrat-Bold.ttf", int(0.14 * dpi))
        text = PHONE
        bbox = draw.textbbox((0, 0), text, font=f)
        tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
        color = NAVY if bg_name != "navy" else WHITE
        draw.text(((canvas_size - tw) // 2, canvas_size - bleed - int(0.35 * dpi)), text, font=f, fill=color)
        f2 = font("Montserrat-SemiBold.ttf", int(0.1 * dpi))
        t2 = WEB
        bbox2 = draw.textbbox((0, 0), t2, font=f2)
        tw2 = bbox2[2] - bbox2[0]
        muted = MUTED if bg_name != "navy" else (200, 210, 230)
        draw.text(((canvas_size - tw2) // 2, canvas_size - bleed - int(0.18 * dpi)), t2, font=f2, fill=muted)
        # trim guides layer note in filename
        out = PRINT / f"sticker-3x3-{bg_name}-with-bleed.png"
        save_rgb(im, out)
        # trim-only export
        trim = im.crop((bleed, bleed, bleed + size, bleed + size))
        save_rgb(trim, PRINT / f"sticker-3x3-{bg_name}.png")


def make_banner() -> None:
    """Facebook/cover-ish and print yard-sign style banners."""
    logo = load_logo()

    # Web cover 1500x500
    cover = Image.new("RGBA", (1500, 500), (*NAVY_DEEP, 255))
    d = ImageDraw.Draw(cover)
    d.rectangle((0, 0, 1500, 12), fill=ORANGE)
    d.rectangle((0, 488, 1500, 500), fill=ORANGE)
    mark = fit_logo(logo, 380, 380)
    cover.alpha_composite(mark, (60, (500 - mark.height) // 2))
    title = font("Montserrat-ExtraBold.ttf", 64)
    sub = font("Montserrat-SemiBold.ttf", 28)
    body = font("Montserrat-Medium.ttf", 24)
    d.text((500, 130), "GOLD HANDS PAINTING", font=title, fill=WHITE)
    d.text((500, 220), "Interior & Exterior · Miami-Dade & Broward", font=sub, fill=ORANGE_HOT)
    d.text((500, 280), f"{PHONE}  ·  {WEB}", font=body, fill=(220, 225, 235))
    d.text((500, 330), "Free written estimates  ·  5-year warranty path", font=body, fill=(160, 170, 190))
    save_rgb(cover, PRINT / "banner-social-cover-1500x500.png")

    # Print vinyl banner 36x12 in @150dpi (manageable file)
    dpi = 150
    w, h = 36 * dpi, 12 * dpi
    ban = Image.new("RGBA", (w, h), (*NAVY, 255))
    d = ImageDraw.Draw(ban)
    d.rectangle((0, 0, w, int(0.35 * dpi)), fill=ORANGE)
    d.rectangle((0, h - int(0.35 * dpi), w, h), fill=ORANGE)
    mark = fit_logo(logo, int(9 * dpi), int(9 * dpi))
    ban.alpha_composite(mark, (int(0.6 * dpi), (h - mark.height) // 2))
    title = font("Montserrat-ExtraBold.ttf", int(1.6 * dpi))
    sub = font("Montserrat-SemiBold.ttf", int(0.7 * dpi))
    body = font("Montserrat-Bold.ttf", int(0.85 * dpi))
    left = int(11 * dpi)
    d.text((left, int(2.2 * dpi)), "GOLD HANDS PAINTING", font=title, fill=WHITE)
    d.text((left, int(4.4 * dpi)), "Professional House Painting in Miami", font=sub, fill=ORANGE_HOT)
    d.text((left, int(6.2 * dpi)), PHONE, font=body, fill=WHITE)
    d.text((left, int(7.6 * dpi)), f"{WEB}  ·  Free Estimate", font=sub, fill=(200, 210, 230))
    save_rgb(ban, PRINT / "banner-vinyl-36x12-inches.png")

    # Yard-style vertical 18x24 @150dpi
    dpi = 150
    w, h = 18 * dpi, 24 * dpi
    yard = Image.new("RGBA", (w, h), (*PAPER, 255))
    d = ImageDraw.Draw(yard)
    d.rectangle((0, 0, w, int(1.2 * dpi)), fill=NAVY)
    d.rectangle((0, h - int(1.2 * dpi), w, h), fill=ORANGE)
    mark = fit_logo(logo, int(12 * dpi), int(12 * dpi))
    yard.alpha_composite(mark, ((w - mark.width) // 2, int(2.0 * dpi)))
    title = font("Montserrat-ExtraBold.ttf", int(0.95 * dpi))
    sub = font("Montserrat-Bold.ttf", int(0.7 * dpi))
    small = font("Montserrat-SemiBold.ttf", int(0.45 * dpi))
    # center helpers
    def center_text(text, y, fnt, fill):
        bbox = d.textbbox((0, 0), text, font=fnt)
        tw = bbox[2] - bbox[0]
        d.text(((w - tw) // 2, y), text, font=fnt, fill=fill)

    center_text("INTERIOR & EXTERIOR", int(14.5 * dpi), small, MUTED)
    center_text("FREE ESTIMATE", int(15.6 * dpi), title, NAVY)
    center_text(PHONE, int(17.2 * dpi), sub, ORANGE)
    center_text(WEB, int(18.4 * dpi), small, NAVY)
    center_text("5-Year Warranty Path", int(19.5 * dpi), small, MUTED)
    # fix orange bar - redraw bottom
    d.rectangle((0, h - int(1.2 * dpi), w, h), fill=ORANGE)
    center_text("Call Today", h - int(0.85 * dpi), font("Montserrat-Bold.ttf", int(0.5 * dpi)), WHITE)
    save_rgb(yard, PRINT / "yard-sign-18x24-inches.png")


def make_business_cards() -> None:
    """US standard 3.5x2 with 0.125 bleed @300dpi + PDF."""
    dpi = 300
    trim_w, trim_h = int(3.5 * dpi), int(2 * dpi)
    bleed = int(0.125 * dpi)
    w, h = trim_w + 2 * bleed, trim_h + 2 * bleed
    logo = load_logo()

    # FRONT
    front = Image.new("RGBA", (w, h), (*NAVY_DEEP, 255))
    d = ImageDraw.Draw(front)
    d.rectangle((0, 0, w, int(0.12 * dpi)), fill=ORANGE)
    d.rectangle((0, h - int(0.12 * dpi), w, h), fill=ORANGE)
    mark = fit_logo(logo, int(1.55 * dpi), int(1.55 * dpi))
    front.alpha_composite(mark, (bleed + int(0.12 * dpi), (h - mark.height) // 2))
    title = font("Montserrat-ExtraBold.ttf", int(0.22 * dpi))
    sub = font("Montserrat-SemiBold.ttf", int(0.12 * dpi))
    tiny = font("Montserrat-Medium.ttf", int(0.1 * dpi))
    tx = bleed + int(1.75 * dpi)
    d.text((tx, bleed + int(0.45 * dpi)), "GOLD HANDS", font=title, fill=WHITE)
    d.text((tx, bleed + int(0.72 * dpi)), "PAINTING", font=title, fill=ORANGE_HOT)
    d.text((tx, bleed + int(1.1 * dpi)), "Interior & Exterior", font=sub, fill=(180, 190, 210))
    d.text((tx, bleed + int(1.35 * dpi)), AREA, font=tiny, fill=(140, 150, 170))
    save_rgb(front, PRINT / "business-card-front-with-bleed.png")
    save_rgb(front.crop((bleed, bleed, bleed + trim_w, bleed + trim_h)), PRINT / "business-card-front.png")

    # BACK
    back = Image.new("RGBA", (w, h), (*PAPER, 255))
    d = ImageDraw.Draw(back)
    d.rectangle((0, 0, int(0.18 * dpi), h), fill=ORANGE)
    mark = fit_logo(logo, int(0.85 * dpi), int(0.85 * dpi))
    back.alpha_composite(mark, (w - bleed - mark.width - int(0.1 * dpi), bleed + int(0.08 * dpi)))
    name_f = font("Montserrat-ExtraBold.ttf", int(0.2 * dpi))
    label = font("Montserrat-SemiBold.ttf", int(0.1 * dpi))
    value = font("Montserrat-Bold.ttf", int(0.14 * dpi))
    body = font("Montserrat-Medium.ttf", int(0.11 * dpi))
    x0 = bleed + int(0.35 * dpi)
    y = bleed + int(0.25 * dpi)
    d.text((x0, y), BRAND, font=name_f, fill=NAVY)
    y += int(0.4 * dpi)
    for lab, val in (
        ("CALL", PHONE),
        ("WEB", WEB),
        ("IG", IG),
        ("EMAIL", EMAIL),
    ):
        d.text((x0, y), lab, font=label, fill=ORANGE)
        d.text((x0 + int(0.7 * dpi), y - int(0.02 * dpi)), val, font=value, fill=NAVY)
        y += int(0.28 * dpi)
    d.text((x0, h - bleed - int(0.28 * dpi)), "Free written estimates · Insured crews", font=body, fill=MUTED)
    save_rgb(back, PRINT / "business-card-back-with-bleed.png")
    save_rgb(back.crop((bleed, bleed, bleed + trim_w, bleed + trim_h)), PRINT / "business-card-back.png")

    # PDF for VistaPrint-style upload (trim size pages)
    pdf_path = PRINT / "business-cards-vistaprint.pdf"
    c = pdfcanvas.Canvas(str(pdf_path), pagesize=(3.5 * inch, 2 * inch))
    for img_path in (PRINT / "business-card-front.png", PRINT / "business-card-back.png"):
        c.drawImage(ImageReader(str(img_path)), 0, 0, width=3.5 * inch, height=2 * inch, preserveAspectRatio=False, mask="auto")
        c.showPage()
    c.save()

    # Also with-bleed PDF 3.75 x 2.25
    pdf_bleed = PRINT / "business-cards-with-bleed.pdf"
    c = pdfcanvas.Canvas(str(pdf_bleed), pagesize=(3.75 * inch, 2.25 * inch))
    for img_path in (PRINT / "business-card-front-with-bleed.png", PRINT / "business-card-back-with-bleed.png"):
        c.drawImage(ImageReader(str(img_path)), 0, 0, width=3.75 * inch, height=2.25 * inch, preserveAspectRatio=False, mask="auto")
        c.showPage()
    c.save()


def make_letterhead_sheet() -> None:
    """Simple A4-ish letter / estimate header sheet PNG + PDF letter."""
    dpi = 150
    w, h = int(8.5 * dpi), int(11 * dpi)
    logo = load_logo()
    sheet = Image.new("RGBA", (w, h), (*WHITE, 255))
    d = ImageDraw.Draw(sheet)
    d.rectangle((0, 0, w, int(0.15 * dpi)), fill=ORANGE)
    mark = fit_logo(logo, int(1.8 * dpi), int(1.8 * dpi))
    sheet.alpha_composite(mark, (int(0.5 * dpi), int(0.4 * dpi)))
    title = font("Montserrat-ExtraBold.ttf", int(0.35 * dpi))
    sub = font("Montserrat-Medium.ttf", int(0.16 * dpi))
    d.text((int(2.6 * dpi), int(0.7 * dpi)), "GOLD HANDS PAINTING", font=title, fill=NAVY)
    d.text((int(2.6 * dpi), int(1.2 * dpi)), f"{PHONE}  ·  {WEB}  ·  {AREA}", font=sub, fill=MUTED)
    d.line((int(0.5 * dpi), int(2.4 * dpi), w - int(0.5 * dpi), int(2.4 * dpi)), fill=ORANGE, width=3)
    # footer
    d.rectangle((0, h - int(0.5 * dpi), w, h), fill=NAVY)
    foot = font("Montserrat-SemiBold.ttf", int(0.14 * dpi))
    d.text((int(0.5 * dpi), h - int(0.35 * dpi)), "Rakhimov Enterprise LLC d/b/a Gold Hands Miami", font=foot, fill=WHITE)
    save_rgb(sheet, PRINT / "letterhead-letter.png")
    pdf = PRINT / "letterhead-letter.pdf"
    c = pdfcanvas.Canvas(str(pdf), pagesize=letter)
    c.drawImage(ImageReader(str(PRINT / "letterhead-letter.png")), 0, 0, width=letter[0], height=letter[1])
    c.save()


def main() -> None:
    PRINT.mkdir(parents=True, exist_ok=True)
    EXPORTS.mkdir(parents=True, exist_ok=True)
    print("avatar...")
    make_avatar()
    print("sticker...")
    make_sticker()
    print("banner...")
    make_banner()
    print("business cards...")
    make_business_cards()
    print("letterhead...")
    make_letterhead_sheet()
    print("done")


if __name__ == "__main__":
    main()
