#!/usr/bin/env python3
"""Gold Hands Painting — car magnets, tees, job-site flag, lawn signs."""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas as pdfcanvas
from reportlab.lib.utils import ImageReader

ROOT = Path(__file__).resolve().parents[1]
PRINT = ROOT / "print"
FONTS = ROOT / "fonts"
LOGO = ROOT / "logo" / "chosen" / "logo-transparent-master.png"

ORANGE = (241, 90, 36)
ORANGE_HOT = (255, 106, 51)
NAVY = (26, 39, 68)
NAVY_DEEP = (14, 22, 40)
PAPER = (243, 241, 236)
WHITE = (255, 255, 255)
MUTED = (75, 85, 104)

PHONE = "(786) 788-8714"
WEB = "goldhandsmia.com"
IG = "@_gold_hands_"
BRAND = "GOLD HANDS PAINTING"
TAG = "Interior & Exterior · Miami"


def font(name: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(FONTS / name), size)


def load_logo() -> Image.Image:
    return Image.open(LOGO).convert("RGBA")


def fit_logo(logo: Image.Image, max_w: int, max_h: int) -> Image.Image:
    r = min(max_w / logo.width, max_h / logo.height)
    return logo.resize((max(1, int(logo.width * r)), max(1, int(logo.height * r))), Image.Resampling.LANCZOS)


def save_rgb(im: Image.Image, path: Path, dpi: int = 300) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if im.mode == "RGBA":
        bg = Image.new("RGB", im.size, WHITE)
        bg.paste(im, mask=im.split()[-1])
        bg.save(path, "PNG", dpi=(dpi, dpi))
    else:
        im.convert("RGB").save(path, "PNG", dpi=(dpi, dpi))


def save_rgba(im: Image.Image, path: Path, dpi: int = 300) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    im.convert("RGBA").save(path, "PNG", dpi=(dpi, dpi))


def center_text(draw: ImageDraw.ImageDraw, text: str, y: int, fnt, fill, canvas_w: int) -> None:
    bbox = draw.textbbox((0, 0), text, font=fnt)
    tw = bbox[2] - bbox[0]
    draw.text(((canvas_w - tw) // 2, y), text, font=fnt, fill=fill)


def make_car_magnets() -> None:
    """Door magnets — common VistaPrint / magnet sizes."""
    logo = load_logo()
    dpi = 150  # large physical size

    specs = [
        ("car-magnet-12x18.png", 12, 18, "vertical"),
        ("car-magnet-18x12.png", 18, 12, "horizontal"),
        ("car-magnet-24x12.png", 24, 12, "wide"),
    ]
    for name, inches_w, inches_h, layout in specs:
        w, h = int(inches_w * dpi), int(inches_h * dpi)
        im = Image.new("RGBA", (w, h), (*NAVY_DEEP, 255))
        d = ImageDraw.Draw(im)
        # accent bars
        bar = max(8, int(0.25 * dpi))
        d.rectangle((0, 0, w, bar), fill=ORANGE)
        d.rectangle((0, h - bar, w, h), fill=ORANGE)

        if layout == "horizontal" or layout == "wide":
            mark = fit_logo(logo, int(h * 0.72), int(h * 0.72))
            im.alpha_composite(mark, (int(0.4 * dpi), (h - mark.height) // 2))
            tx = int(0.4 * dpi) + mark.width + int(0.35 * dpi)
            title = font("Montserrat-ExtraBold.ttf", int(0.85 * dpi if layout == "wide" else 0.7 * dpi))
            sub = font("Montserrat-SemiBold.ttf", int(0.38 * dpi))
            phone_f = font("Montserrat-Bold.ttf", int(0.55 * dpi))
            d.text((tx, int(2.2 * dpi) if layout != "wide" else int(2.4 * dpi)), "GOLD HANDS", font=title, fill=WHITE)
            d.text((tx, int(3.2 * dpi) if layout != "wide" else int(3.5 * dpi)), "PAINTING", font=title, fill=ORANGE_HOT)
            d.text((tx, int(4.6 * dpi) if layout != "wide" else int(5.0 * dpi)), TAG, font=sub, fill=(180, 190, 210))
            d.text((tx, int(6.0 * dpi) if layout != "wide" else int(6.8 * dpi)), PHONE, font=phone_f, fill=WHITE)
            d.text((tx, int(7.2 * dpi) if layout != "wide" else int(8.2 * dpi)), WEB, font=sub, fill=(200, 210, 230))
        else:
            # vertical 12x18
            mark = fit_logo(logo, int(9.5 * dpi), int(9.5 * dpi))
            im.alpha_composite(mark, ((w - mark.width) // 2, int(1.0 * dpi)))
            title = font("Montserrat-ExtraBold.ttf", int(0.7 * dpi))
            sub = font("Montserrat-SemiBold.ttf", int(0.35 * dpi))
            phone_f = font("Montserrat-Bold.ttf", int(0.55 * dpi))
            center_text(d, "GOLD HANDS", int(11.2 * dpi), title, WHITE, w)
            center_text(d, "PAINTING", int(12.1 * dpi), title, ORANGE_HOT, w)
            center_text(d, PHONE, int(13.5 * dpi), phone_f, WHITE, w)
            center_text(d, WEB, int(14.5 * dpi), sub, (200, 210, 230), w)
            center_text(d, "Free Estimate", int(15.5 * dpi), sub, ORANGE_HOT, w)

        out = PRINT / "magnets" / name
        save_rgb(im, out, dpi=dpi)
        # PDF page matching physical inches
        pdf = PRINT / "magnets" / name.replace(".png", ".pdf")
        c = pdfcanvas.Canvas(str(pdf), pagesize=(inches_w * inch, inches_h * inch))
        c.drawImage(ImageReader(str(out)), 0, 0, width=inches_w * inch, height=inches_h * inch)
        c.save()


def make_tshirts() -> None:
    """Front chest + back print art (transparent + navy/white shirt previews)."""
    logo = load_logo()
    dpi = 300

    # FRONT — centered chest logo ~10" wide print file
    front_w = int(10 * dpi)
    front_h = int(11 * dpi)
    front = Image.new("RGBA", (front_w, front_h), (0, 0, 0, 0))
    mark = fit_logo(logo, int(8.5 * dpi), int(8.5 * dpi))
    front.alpha_composite(mark, ((front_w - mark.width) // 2, int(0.2 * dpi)))
    d = ImageDraw.Draw(front)
    # small wordmark under logo optional — keep logo only for clean DTG
    save_rgba(front, PRINT / "tshirts" / "tshirt-front-print-transparent.png", dpi)

    # FRONT with phone line for promotional tees
    front2 = front.copy()
    d2 = ImageDraw.Draw(front2)
    f = font("Montserrat-Bold.ttf", int(0.35 * dpi))
    # draw text in navy for light shirts
    center_text(d2, PHONE, int(9.5 * dpi), f, NAVY, front_w)
    center_text(d2, WEB, int(10.1 * dpi), font("Montserrat-SemiBold.ttf", int(0.28 * dpi)), MUTED, front_w)
    save_rgba(front2, PRINT / "tshirts" / "tshirt-front-print-with-contact.png", dpi)

    # BACK — full back print ~14" wide
    back_w = int(14 * dpi)
    back_h = int(16 * dpi)
    back = Image.new("RGBA", (back_w, back_h), (0, 0, 0, 0))
    mark = fit_logo(logo, int(11 * dpi), int(11 * dpi))
    back.alpha_composite(mark, ((back_w - mark.width) // 2, int(0.4 * dpi)))
    d = ImageDraw.Draw(back)
    title = font("Montserrat-ExtraBold.ttf", int(0.7 * dpi))
    sub = font("Montserrat-Bold.ttf", int(0.45 * dpi))
    small = font("Montserrat-SemiBold.ttf", int(0.32 * dpi))
    # For dark shirts use white text versions separately
    center_text(d, "GOLD HANDS PAINTING", int(12.0 * dpi), title, NAVY, back_w)
    center_text(d, PHONE, int(13.1 * dpi), sub, ORANGE, back_w)
    center_text(d, "Miami-Dade & Broward · Free Estimate", int(14.0 * dpi), small, MUTED, back_w)
    center_text(d, WEB, int(14.8 * dpi), small, NAVY, back_w)
    save_rgba(back, PRINT / "tshirts" / "tshirt-back-print-light-shirt.png", dpi)

    # Dark shirt (white/orange text) version
    back_dark = Image.new("RGBA", (back_w, back_h), (0, 0, 0, 0))
    back_dark.alpha_composite(mark, ((back_w - mark.width) // 2, int(0.4 * dpi)))
    d = ImageDraw.Draw(back_dark)
    center_text(d, "GOLD HANDS PAINTING", int(12.0 * dpi), title, WHITE, back_w)
    center_text(d, PHONE, int(13.1 * dpi), sub, ORANGE_HOT, back_w)
    center_text(d, "Miami-Dade & Broward · Free Estimate", int(14.0 * dpi), small, (200, 210, 230), back_w)
    center_text(d, WEB, int(14.8 * dpi), small, WHITE, back_w)
    save_rgba(back_dark, PRINT / "tshirts" / "tshirt-back-print-dark-shirt.png", dpi)

    # Mockup previews on navy / white shirts (flat)
    for color, cname, back_art in (
        (NAVY_DEEP, "navy", back_dark),
        (WHITE, "white", back),
        ((40, 40, 40), "black", back_dark),
    ):
        # simple tee silhouette rectangle
        mock_w, mock_h = 1200, 1400
        mock = Image.new("RGBA", (mock_w, mock_h), (230, 230, 230, 255))
        d = ImageDraw.Draw(mock)
        # shirt body
        body = Image.new("RGBA", (mock_w, mock_h), (0, 0, 0, 0))
        bd = ImageDraw.Draw(body)
        bd.rounded_rectangle((220, 180, 980, 1280), radius=40, fill=(*color, 255))
        # sleeves
        bd.polygon([(220, 220), (80, 360), (180, 420), (220, 360)], fill=(*color, 255))
        bd.polygon([(980, 220), (1120, 360), (1020, 420), (980, 360)], fill=(*color, 255))
        # neck hole
        bd.ellipse((520, 160, 680, 280), fill=(230, 230, 230, 255))
        mock = Image.alpha_composite(mock, body)

        # front art scaled
        art = fit_logo(logo, 420, 420)
        mock.alpha_composite(art, ((mock_w - art.width) // 2, 360))
        save_rgb(mock, PRINT / "tshirts" / f"tshirt-mockup-front-{cname}.png", dpi=150)

        # back mockup
        mock2 = Image.new("RGBA", (mock_w, mock_h), (230, 230, 230, 255))
        mock2 = Image.alpha_composite(mock2, body)
        art2 = back_art.resize((int(back_art.width * 0.22), int(back_art.height * 0.22)), Image.Resampling.LANCZOS)
        mock2.alpha_composite(art2, ((mock_w - art2.width) // 2, 320))
        save_rgb(mock2, PRINT / "tshirts" / f"tshirt-mockup-back-{cname}.png", dpi=150)


def make_feather_flag() -> None:
    """Street / job-site feather (blade) flag artwork — tall print file."""
    logo = load_logo()
    # Common printable feather flag art ~2.5 ft x 10 ft at 100 dpi (manageable)
    dpi = 100
    w, h = int(2.5 * 12 * dpi), int(10 * 12 * dpi)  # 30" x 120"
    im = Image.new("RGBA", (w, h), (*NAVY_DEEP, 255))
    d = ImageDraw.Draw(im)
    # orange top + bottom bands
    d.rectangle((0, 0, w, int(0.6 * 12 * dpi)), fill=ORANGE)
    d.rectangle((0, h - int(0.8 * 12 * dpi), w, h), fill=ORANGE)

    mark = fit_logo(logo, int(w * 0.82), int(w * 0.82))
    im.alpha_composite(mark, ((w - mark.width) // 2, int(1.2 * 12 * dpi)))

    title = font("Montserrat-ExtraBold.ttf", int(0.55 * w / 6))
    phone_f = font("Montserrat-Bold.ttf", int(0.42 * w / 6))
    sub = font("Montserrat-SemiBold.ttf", int(0.32 * w / 6))
    mid_y = int(5.0 * 12 * dpi)
    center_text(d, "GOLD HANDS", mid_y, title, WHITE, w)
    center_text(d, "PAINTING", mid_y + int(0.85 * 12 * dpi), title, ORANGE_HOT, w)
    center_text(d, "NOW WORKING HERE", mid_y + int(1.9 * 12 * dpi), sub, (200, 210, 230), w)
    center_text(d, PHONE, mid_y + int(2.7 * 12 * dpi), phone_f, WHITE, w)
    center_text(d, "Free Estimate", mid_y + int(3.5 * 12 * dpi), sub, ORANGE_HOT, w)
    center_text(d, WEB, h - int(0.42 * 12 * dpi), sub, WHITE, w)

    # soft taper hint (right edge fade) for feather shape preview — keep rectangular for printers
    out = PRINT / "flags" / "feather-flag-30x120-inches.png"
    save_rgb(im, out, dpi=dpi)

    # also a shorter teardrop/feather 24x72 for smaller kits
    w2, h2 = int(24 * dpi), int(72 * dpi)
    im2 = Image.new("RGBA", (w2, h2), (*NAVY, 255))
    d2 = ImageDraw.Draw(im2)
    d2.rectangle((0, 0, w2, int(0.5 * 12 * dpi)), fill=ORANGE)
    d2.rectangle((0, h2 - int(0.6 * 12 * dpi), w2, h2), fill=ORANGE)
    mark2 = fit_logo(logo, int(w2 * 0.78), int(w2 * 0.78))
    im2.alpha_composite(mark2, ((w2 - mark2.width) // 2, int(0.9 * 12 * dpi)))
    title2 = font("Montserrat-ExtraBold.ttf", int(0.09 * w2))
    phone2 = font("Montserrat-Bold.ttf", int(0.075 * w2))
    sub2 = font("Montserrat-SemiBold.ttf", int(0.055 * w2))
    y = int(3.5 * 12 * dpi)
    center_text(d2, "GOLD HANDS", y, title2, WHITE, w2)
    center_text(d2, "PAINTING", y + int(0.65 * 12 * dpi), title2, ORANGE_HOT, w2)
    center_text(d2, "WE'RE ON SITE", y + int(1.5 * 12 * dpi), sub2, (200, 210, 230), w2)
    center_text(d2, PHONE, y + int(2.2 * 12 * dpi), phone2, WHITE, w2)
    center_text(d2, "Free Estimate", y + int(2.9 * 12 * dpi), sub2, ORANGE_HOT, w2)
    # footer text fully inside orange bar
    center_text(d2, WEB, h2 - int(0.38 * 12 * dpi), sub2, WHITE, w2)
    save_rgb(im2, PRINT / "flags" / "feather-flag-24x72-inches.png", dpi=dpi)

    # PDF for shop upload
    for png, iw, ih in (
        (PRINT / "flags" / "feather-flag-30x120-inches.png", 30, 120),
        (PRINT / "flags" / "feather-flag-24x72-inches.png", 24, 72),
    ):
        pdf = png.with_suffix(".pdf")
        c = pdfcanvas.Canvas(str(pdf), pagesize=(iw * inch, ih * inch))
        c.drawImage(ImageReader(str(png)), 0, 0, width=iw * inch, height=ih * inch)
        c.save()


def make_lawn_signs() -> None:
    """Small lawn / job-site Coroplast signs with H-stake."""
    logo = load_logo()
    dpi = 150

    # Classic 18x24
    for name, iw, ih, headline in (
        ("lawn-sign-18x24-working-here.png", 18, 24, "WE'RE WORKING HERE"),
        ("lawn-sign-12x18-working-here.png", 12, 18, "PAINTING IN PROGRESS"),
        ("lawn-sign-18x24-free-estimate.png", 18, 24, "FREE ESTIMATE"),
    ):
        w, h = int(iw * dpi), int(ih * dpi)
        im = Image.new("RGBA", (w, h), (*PAPER, 255))
        d = ImageDraw.Draw(im)
        top = int(1.1 * dpi)
        d.rectangle((0, 0, w, top), fill=NAVY)
        d.rectangle((0, h - top, w, h), fill=ORANGE)

        # header on navy
        head_f = font("Montserrat-Bold.ttf", int(0.38 * dpi if iw >= 18 else 0.32 * dpi))
        # white text centered in top bar
        bbox = d.textbbox((0, 0), "GOLD HANDS PAINTING", font=head_f)
        tw = bbox[2] - bbox[0]
        d.text(((w - tw) // 2, int(0.35 * dpi)), "GOLD HANDS PAINTING", font=head_f, fill=WHITE)

        mark = fit_logo(logo, int(w * 0.62), int(w * 0.62))
        im.alpha_composite(mark, ((w - mark.width) // 2, int(1.5 * dpi)))

        title = font("Montserrat-ExtraBold.ttf", int(0.7 * dpi if iw >= 18 else 0.55 * dpi))
        phone_f = font("Montserrat-Bold.ttf", int(0.65 * dpi if iw >= 18 else 0.5 * dpi))
        sub = font("Montserrat-SemiBold.ttf", int(0.38 * dpi if iw >= 18 else 0.32 * dpi))

        y = int((1.5 * dpi) + mark.height + 0.25 * dpi)
        # wrap long headlines
        center_text(d, headline, y, title, NAVY, w)
        center_text(d, PHONE, y + int(1.1 * dpi), phone_f, ORANGE, w)
        center_text(d, WEB, y + int(1.9 * dpi), sub, NAVY, w)

        # footer
        foot = font("Montserrat-Bold.ttf", int(0.4 * dpi))
        bbox = d.textbbox((0, 0), "Call Today", font=foot)
        tw = bbox[2] - bbox[0]
        d.text(((w - tw) // 2, h - int(0.75 * dpi)), "Call Today", font=foot, fill=WHITE)

        out = PRINT / "lawn-signs" / name
        save_rgb(im, out, dpi=dpi)
        pdf = out.with_suffix(".pdf")
        c = pdfcanvas.Canvas(str(pdf), pagesize=(iw * inch, ih * inch))
        c.drawImage(ImageReader(str(out)), 0, 0, width=iw * inch, height=ih * inch)
        c.save()

    # Double-sided note: same art both sides is fine; provide navy "crew on site" variant
    w, h = int(18 * dpi), int(24 * dpi)
    im = Image.new("RGBA", (w, h), (*NAVY_DEEP, 255))
    d = ImageDraw.Draw(im)
    d.rectangle((0, 0, w, int(0.9 * dpi)), fill=ORANGE)
    d.rectangle((0, h - int(0.9 * dpi), w, h), fill=ORANGE)
    mark = fit_logo(logo, int(10 * dpi), int(10 * dpi))
    im.alpha_composite(mark, ((w - mark.width) // 2, int(1.3 * dpi)))
    title = font("Montserrat-ExtraBold.ttf", int(0.75 * dpi))
    phone_f = font("Montserrat-Bold.ttf", int(0.7 * dpi))
    sub = font("Montserrat-SemiBold.ttf", int(0.4 * dpi))
    center_text(d, "CREW ON SITE", int(12.5 * dpi), title, WHITE, w)
    center_text(d, "Please excuse our progress", int(13.6 * dpi), sub, (180, 190, 210), w)
    center_text(d, PHONE, int(15.0 * dpi), phone_f, ORANGE_HOT, w)
    center_text(d, WEB, int(16.2 * dpi), sub, WHITE, w)
    center_text(d, "Free Written Estimate", h - int(0.55 * dpi), sub, WHITE, w)
    out = PRINT / "lawn-signs" / "lawn-sign-18x24-crew-on-site.png"
    save_rgb(im, out, dpi=dpi)
    c = pdfcanvas.Canvas(str(out.with_suffix(".pdf")), pagesize=(18 * inch, 24 * inch))
    c.drawImage(ImageReader(str(out)), 0, 0, width=18 * inch, height=24 * inch)
    c.save()

    # AFTER painting — leave on lawn when job is finished
    for name, iw, ih in (
        ("lawn-sign-18x24-just-painted.png", 18, 24),
        ("lawn-sign-12x18-just-painted.png", 12, 18),
    ):
        w, h = int(iw * dpi), int(ih * dpi)
        im = Image.new("RGBA", (w, h), (*WHITE, 255))
        d = ImageDraw.Draw(im)
        top = int(1.15 * dpi)
        bot = int(1.35 * dpi)
        d.rectangle((0, 0, w, top), fill=ORANGE)
        d.rectangle((0, h - bot, w, h), fill=NAVY)

        head = font("Montserrat-Bold.ttf", int(0.36 * dpi if iw >= 18 else 0.3 * dpi))
        bbox = d.textbbox((0, 0), "ANOTHER HOME BEAUTIFULLY PAINTED", font=head)
        # may be long — use shorter for small
        top_line = "JUST PAINTED BY" if iw < 18 else "ANOTHER HOME PAINTED BY"
        bbox = d.textbbox((0, 0), top_line, font=head)
        tw = bbox[2] - bbox[0]
        d.text(((w - tw) // 2, int(0.38 * dpi)), top_line, font=head, fill=WHITE)

        mark = fit_logo(logo, int(w * 0.58), int(w * 0.58))
        im.alpha_composite(mark, ((w - mark.width) // 2, int(1.55 * dpi)))

        title = font("Montserrat-ExtraBold.ttf", int(0.72 * dpi if iw >= 18 else 0.55 * dpi))
        phone_f = font("Montserrat-Bold.ttf", int(0.62 * dpi if iw >= 18 else 0.48 * dpi))
        sub = font("Montserrat-SemiBold.ttf", int(0.36 * dpi if iw >= 18 else 0.3 * dpi))
        y = int(1.55 * dpi + mark.height + 0.2 * dpi)
        center_text(d, "GOLD HANDS", y, title, NAVY, w)
        center_text(d, "PAINTING", y + int(0.85 * dpi), title, ORANGE, w)
        center_text(d, "Want yours done next?", y + int(1.85 * dpi), sub, MUTED, w)
        center_text(d, PHONE, y + int(2.55 * dpi), phone_f, ORANGE, w)
        center_text(d, WEB, y + int(3.4 * dpi), sub, NAVY, w)

        foot = font("Montserrat-Bold.ttf", int(0.38 * dpi if iw >= 18 else 0.32 * dpi))
        bbox = d.textbbox((0, 0), "Free Written Estimate", font=foot)
        tw = bbox[2] - bbox[0]
        d.text(((w - tw) // 2, h - int(0.85 * dpi)), "Free Written Estimate", font=foot, fill=WHITE)

        out = PRINT / "lawn-signs" / name
        save_rgb(im, out, dpi=dpi)
        c = pdfcanvas.Canvas(str(out.with_suffix(".pdf")), pagesize=(iw * inch, ih * inch))
        c.drawImage(ImageReader(str(out)), 0, 0, width=iw * inch, height=ih * inch)
        c.save()


def main() -> None:
    for sub in ("magnets", "tshirts", "flags", "lawn-signs"):
        (PRINT / sub).mkdir(parents=True, exist_ok=True)
    print("car magnets...")
    make_car_magnets()
    print("t-shirts...")
    make_tshirts()
    print("flags...")
    make_feather_flag()
    print("lawn signs...")
    make_lawn_signs()
    print("done")


if __name__ == "__main__":
    main()
