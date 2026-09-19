import os
import shutil
from PIL import Image
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

# -------------------------------------------------------------
# Color Palette (Silicon Valley / Linear Style)
# -------------------------------------------------------------
BG_COLOR = RGBColor(11, 15, 25)          # Deep Obsidian #0B0F19
CARD_BG = RGBColor(17, 24, 39)           # Dark Slate Glass #111827
CARD_BG_ALT = RGBColor(15, 23, 42)       # Slate 900 #0F172A
CARD_BG_ELEVATED = RGBColor(24, 33, 53)  # Elevated Glass #182135

CYAN = RGBColor(0, 240, 255)             # Electric Cyan #00F0FF
INDIGO = RGBColor(99, 102, 241)          # Royal Indigo #6366F1
EMERALD = RGBColor(16, 185, 129)         # Vibrant Emerald #10B981
CRIMSON = RGBColor(239, 68, 68)          # Crimson Red #EF4444
AMBER = RGBColor(245, 158, 11)           # Solar Amber #F59E0B

TEXT_WHITE = RGBColor(248, 250, 252)     # White #F8FAFC
TEXT_LIGHT = RGBColor(241, 245, 249)     # Slate 100 #F1F5F9
TEXT_BODY = RGBColor(203, 213, 225)      # Slate 300 #CBD5E1
TEXT_MUTED = RGBColor(148, 163, 184)     # Slate 400 #94A3B8
TEXT_DIM = RGBColor(100, 116, 139)       # Slate 500 #64748B
LINE_SUBTLE = RGBColor(30, 41, 59)       # Slate 800 #1E293B

FONT_FAMILY = "Century Gothic"

def create_deck():
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank_layout = prs.slide_layouts[6]

    assets_dir = r"c:\Users\Rishit Jindal\Downloads\FixGrid-main\assets"
    proc_dir = os.path.join(assets_dir, "processed")
    os.makedirs(proc_dir, exist_ok=True)
    out_pptx = r"c:\Users\Rishit Jindal\Downloads\FixGrid-main\FixGrid_Hackathon_Pitch_Deck.pptx"

    def get_cropped_image(source_path, target_ratio, crop_from_top=False):
        """Crops source_path to target_ratio (w/h) and caches in assets/processed/"""
        if not os.path.exists(source_path):
            return None
        fname = os.path.basename(source_path)
        out_name = f"crop_{target_ratio:.2f}_{fname}"
        out_path = os.path.join(proc_dir, out_name)
        try:
            with Image.open(source_path) as img:
                orig_w, orig_h = img.size
                orig_ratio = orig_w / orig_h
                if abs(orig_ratio - target_ratio) < 0.02:
                    return source_path
                if orig_ratio > target_ratio:
                    new_w = int(orig_h * target_ratio)
                    offset = (orig_w - new_w) // 2
                    cropped = img.crop((offset, 0, offset + new_w, orig_h))
                else:
                    new_h = int(orig_w / target_ratio)
                    if crop_from_top:
                        cropped = img.crop((0, 0, orig_w, min(orig_h, new_h)))
                    else:
                        offset = (orig_h - new_h) // 2
                        cropped = img.crop((0, offset, orig_w, offset + new_h))
                cropped.save(out_path, quality=95)
            return out_path
        except Exception as e:
            print(f"Error cropping {source_path}: {e}")
            return source_path

    def init_slide(slide_num_str, is_cover=False):
        slide = prs.slides.add_slide(blank_layout)

        # Background
        bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, Inches(13.333), Inches(7.5))
        bg.fill.solid()
        bg.fill.fore_color.rgb = BG_COLOR
        bg.line.fill.background()

        if is_cover:
            # Landing / Cover slide has its own bespoke navigation bar and layout
            return slide

        # Header Micro-Brand
        tx_hdr = slide.shapes.add_textbox(Inches(0.8), Inches(0.2), Inches(7.0), Inches(0.3))
        tf = tx_hdr.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
        p = tf.paragraphs[0]
        r1 = p.add_run()
        r1.text = "FIXGRID "
        r1.font.name = FONT_FAMILY
        r1.font.size = Pt(9)
        r1.font.bold = True
        r1.font.color.rgb = CYAN
        r2 = p.add_run()
        r2.text = "// UNIVERSAL CIRCULAR TRUST & WARRANTY PLATFORM"
        r2.font.name = FONT_FAMILY
        r2.font.size = Pt(8.5)
        r2.font.color.rgb = TEXT_DIM

        # Slide Number
        tx_num = slide.shapes.add_textbox(Inches(11.5), Inches(0.2), Inches(1.0), Inches(0.3))
        tf2 = tx_num.text_frame
        tf2.margin_left = tf2.margin_top = tf2.margin_right = tf2.margin_bottom = 0
        p2 = tf2.paragraphs[0]
        p2.alignment = PP_ALIGN.RIGHT
        r_num = p2.add_run()
        r_num.text = slide_num_str
        r_num.font.name = FONT_FAMILY
        r_num.font.size = Pt(9.5)
        r_num.font.bold = True
        r_num.font.color.rgb = TEXT_MUTED

        # Subtle Header Line
        line = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.8), Inches(0.55), Inches(11.733), Inches(0.015))
        line.fill.solid()
        line.fill.fore_color.rgb = LINE_SUBTLE
        line.line.fill.background()

        # Footer Left
        tx_ftr = slide.shapes.add_textbox(Inches(0.8), Inches(7.05), Inches(6.0), Inches(0.3))
        tff = tx_ftr.text_frame
        tff.margin_left = tff.margin_top = tff.margin_right = tff.margin_bottom = 0
        pf = tff.paragraphs[0]
        rf1 = pf.add_run()
        rf1.text = "www.vytron.me"
        rf1.font.name = FONT_FAMILY
        rf1.font.size = Pt(8.5)
        rf1.font.color.rgb = CYAN
        rf2 = pf.add_run()
        rf2.text = "  •  Built by Team Vytron"
        rf2.font.name = FONT_FAMILY
        rf2.font.size = Pt(8.5)
        rf2.font.color.rgb = TEXT_DIM

        # Footer Right
        tx_ftr2 = slide.shapes.add_textbox(Inches(7.5), Inches(7.05), Inches(5.0), Inches(0.3))
        tff2 = tx_ftr2.text_frame
        tff2.margin_left = tff2.margin_top = tff2.margin_right = tff2.margin_bottom = 0
        pf2 = tff2.paragraphs[0]
        pf2.alignment = PP_ALIGN.RIGHT
        rf_right = pf2.add_run()
        rf_right.text = "All Categories: Phones • Appliances • Laptops • Bicycles • Watches"
        rf_right.font.name = FONT_FAMILY
        rf_right.font.size = Pt(8.5)
        rf_right.font.color.rgb = TEXT_DIM

        return slide

    def add_card(slide, x, y, w, h, border_color=CYAN, fill_color=CARD_BG, border_width=Pt(1.5), radius=0.05):
        card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, y, w, h)
        card.fill.solid()
        card.fill.fore_color.rgb = fill_color
        if border_color:
            card.line.color.rgb = border_color
            card.line.width = border_width
        else:
            card.line.fill.background()
        if radius is not None:
            try:
                card.adjustments[0] = radius
            except Exception:
                pass
        return card

    def add_headers(slide, tag, title, subtitle):
        tb = slide.shapes.add_textbox(Inches(0.8), Inches(0.72), Inches(11.733), Inches(0.95))
        tf = tb.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0

        # Tag
        p0 = tf.paragraphs[0]
        r0 = p0.add_run()
        r0.text = tag
        r0.font.name = FONT_FAMILY
        r0.font.size = Pt(9)
        r0.font.bold = True
        r0.font.color.rgb = CYAN

        # Title
        p1 = tf.add_paragraph()
        p1.space_before = Pt(3)
        r1 = p1.add_run()
        r1.text = title
        r1.font.name = FONT_FAMILY
        r1.font.size = Pt(21)
        r1.font.bold = True
        r1.font.color.rgb = TEXT_WHITE

        # Subtitle
        if subtitle:
            p2 = tf.add_paragraph()
            p2.space_before = Pt(3)
            r2 = p2.add_run()
            r2.text = subtitle
            r2.font.name = FONT_FAMILY
            r2.font.size = Pt(10.5)
            r2.font.color.rgb = TEXT_MUTED

    def add_browser_frame(slide, x, y, w, h, image_path, url_text="https://www.vytron.me", border_color=CYAN):
        """Creates a realistic, framed desktop browser window with zero corner clipping."""
        # Outer container
        container = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, x, y, w, h)
        container.fill.solid()
        container.fill.fore_color.rgb = CARD_BG_ALT
        container.line.color.rgb = border_color
        container.line.width = Pt(1.5)

        # Title bar
        hbar = Inches(0.38)
        title_bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, x, y, w, hbar)
        title_bar.fill.solid()
        title_bar.fill.fore_color.rgb = CARD_BG_ELEVATED
        title_bar.line.color.rgb = border_color
        title_bar.line.width = Pt(1.0)

        # 3 Window dots
        dot_radius = Inches(0.09)
        y_dot = y + Inches(0.14)
        dot_colors = [CRIMSON, AMBER, EMERALD]
        for i, col in enumerate(dot_colors):
            dot = slide.shapes.add_shape(MSO_SHAPE.OVAL, x + Inches(0.15 + i * 0.16), y_dot, dot_radius, dot_radius)
            dot.fill.solid()
            dot.fill.fore_color.rgb = col
            dot.line.fill.background()

        # URL Bar Pill
        url_x = x + Inches(0.72)
        url_w = w - Inches(0.85)
        url_bar = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, url_x, y + Inches(0.07), url_w, Inches(0.24))
        url_bar.fill.solid()
        url_bar.fill.fore_color.rgb = BG_COLOR
        url_bar.line.color.rgb = LINE_SUBTLE
        url_bar.line.width = Pt(0.75)

        tb_u = slide.shapes.add_textbox(url_x + Inches(0.1), y + Inches(0.075), url_w - Inches(0.2), Inches(0.22))
        tf_u = tb_u.text_frame
        tf_u.margin_left = tf_u.margin_top = tf_u.margin_right = tf_u.margin_bottom = 0
        pu = tf_u.paragraphs[0]
        ru = pu.add_run()
        ru.text = "🔒 " + url_text
        ru.font.name = FONT_FAMILY
        ru.font.size = Pt(8.5)
        ru.font.bold = True
        ru.font.color.rgb = TEXT_LIGHT

        # Viewport Image
        img_pad = Inches(0.02)
        img_x = x + img_pad
        img_y = y + hbar + img_pad
        img_w = w - (img_pad * 2)
        img_h = h - hbar - (img_pad * 2)

        target_ratio = (w / h)
        cropped_path = get_cropped_image(image_path, target_ratio, crop_from_top=True)
        if cropped_path and os.path.exists(cropped_path):
            slide.shapes.add_picture(cropped_path, img_x, img_y, img_w, img_h)

    def add_cad_frame(slide, x, y, w, h, image_path, tag_text="3D CAD DIAGNOSTIC", status_text="VERIFIED 1080P", border_color=CYAN):
        """Creates an elevated technical CAD hardware frame with zero corner clipping."""
        # Outer container
        container = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, x, y, w, h)
        container.fill.solid()
        container.fill.fore_color.rgb = CARD_BG_ALT
        container.line.color.rgb = border_color
        container.line.width = Pt(1.5)

        # Title bar
        hbar = Inches(0.32)
        title_bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, x, y, w, hbar)
        title_bar.fill.solid()
        title_bar.fill.fore_color.rgb = CARD_BG_ELEVATED
        title_bar.line.color.rgb = border_color
        title_bar.line.width = Pt(1.0)

        # Left Tag
        tb_t = slide.shapes.add_textbox(x + Inches(0.15), y + Inches(0.06), w * 0.6, Inches(0.22))
        tf_t = tb_t.text_frame
        tf_t.margin_left = tf_t.margin_top = tf_t.margin_right = tf_t.margin_bottom = 0
        pt = tf_t.paragraphs[0]
        rt = pt.add_run()
        rt.text = "● " + tag_text
        rt.font.name = FONT_FAMILY
        rt.font.size = Pt(8.5)
        rt.font.bold = True
        rt.font.color.rgb = border_color

        # Right Status
        tb_s = slide.shapes.add_textbox(x + w * 0.55, y + Inches(0.06), w * 0.4, Inches(0.22))
        tf_s = tb_s.text_frame
        tf_s.margin_left = tf_s.margin_top = tf_s.margin_right = tf_s.margin_bottom = 0
        ps = tf_s.paragraphs[0]
        ps.alignment = PP_ALIGN.RIGHT
        rs = ps.add_run()
        rs.text = status_text
        rs.font.name = FONT_FAMILY
        rs.font.size = Pt(8)
        rs.font.color.rgb = TEXT_DIM

        # Viewport Image
        img_pad = Inches(0.02)
        img_x = x + img_pad
        img_y = y + hbar + img_pad
        img_w = w - (img_pad * 2)
        img_h = h - hbar - (img_pad * 2)

        target_ratio = (w / h)
        cropped_path = get_cropped_image(image_path, target_ratio, crop_from_top=False)
        if cropped_path and os.path.exists(cropped_path):
            slide.shapes.add_picture(cropped_path, img_x, img_y, img_w, img_h)

    # =========================================================================
    # SLIDE 1: Executive Landing Page Hero (Silicon Valley SaaS Launchpad)
    # =========================================================================
    print("Building Slide 1 (Landing Page Hero) ...")
    s1 = init_slide("01 / 10", is_cover=True)

    # 1. Top Geometric Accent Elements & Kicker (Image 2 style)
    # Dual-tone slanted geometric accent bar
    acc1 = s1.shapes.add_shape(MSO_SHAPE.PARALLELOGRAM, Inches(0.8), Inches(0.68), Inches(0.95), Inches(0.13))
    acc1.fill.solid()
    acc1.fill.fore_color.rgb = INDIGO
    acc1.line.fill.background()

    acc2 = s1.shapes.add_shape(MSO_SHAPE.PARALLELOGRAM, Inches(1.80), Inches(0.68), Inches(0.80), Inches(0.13))
    acc2.fill.solid()
    acc2.fill.fore_color.rgb = EMERALD
    acc2.line.fill.background()

    acc3 = s1.shapes.add_shape(MSO_SHAPE.PARALLELOGRAM, Inches(2.65), Inches(0.68), Inches(0.55), Inches(0.13))
    acc3.fill.solid()
    acc3.fill.fore_color.rgb = CYAN
    acc3.line.fill.background()

    # Kicker / Category tag next to accent bar
    tb_kicker = s1.shapes.add_textbox(Inches(3.35), Inches(0.62), Inches(3.25), Inches(0.24))
    tf_kk = tb_kicker.text_frame
    tf_kk.word_wrap = False
    tf_kk.margin_left = tf_kk.margin_top = tf_kk.margin_right = tf_kk.margin_bottom = 0
    p_kk = tf_kk.paragraphs[0]
    r_kk = p_kk.add_run()
    r_kk.text = "// CIRCULAR HARDWARE OPERATING SYSTEM"
    r_kk.font.name = FONT_FAMILY
    r_kk.font.size = Pt(8.5)
    r_kk.font.bold = True
    r_kk.font.color.rgb = TEXT_DIM

    # 2. Main Title Hierarchy (EXACTLY matching Image 2 reference)
    # "Introducing" in vibrant Emerald / Lime accent
    # "FixGrid." in prominent, commanding bold typography
    tb_title = s1.shapes.add_textbox(Inches(0.8), Inches(1.20), Inches(5.8), Inches(1.65))
    tf_t = tb_title.text_frame
    tf_t.word_wrap = True
    tf_t.margin_left = tf_t.margin_top = tf_t.margin_right = tf_t.margin_bottom = 0

    p_intro = tf_t.paragraphs[0]
    r_intro = p_intro.add_run()
    r_intro.text = "Introducing"
    r_intro.font.name = FONT_FAMILY
    r_intro.font.size = Pt(28)
    r_intro.font.bold = True
    r_intro.font.color.rgb = EMERALD

    p_name = tf_t.add_paragraph()
    p_name.space_before = Pt(4)
    r_n1 = p_name.add_run()
    r_n1.text = "Fix"
    r_n1.font.name = FONT_FAMILY
    r_n1.font.size = Pt(56)
    r_n1.font.bold = True
    r_n1.font.color.rgb = TEXT_WHITE

    r_n2 = p_name.add_run()
    r_n2.text = "Grid."
    r_n2.font.name = FONT_FAMILY
    r_n2.font.size = Pt(56)
    r_n2.font.bold = True
    r_n2.font.color.rgb = CYAN

    # 3. Subtitle / Tagline & Core Mission (Clear, spacious, zero clutter)
    tb_tag = s1.shapes.add_textbox(Inches(0.8), Inches(3.05), Inches(5.8), Inches(1.35))
    tf_tg = tb_tag.text_frame
    tf_tg.word_wrap = True
    tf_tg.margin_left = tf_tg.margin_top = tf_tg.margin_right = tf_tg.margin_bottom = 0

    p_tg = tf_tg.paragraphs[0]
    r_tg1 = p_tg.add_run()
    r_tg1.text = "Repair Over Replace."
    r_tg1.font.name = FONT_FAMILY
    r_tg1.font.size = Pt(22)
    r_tg1.font.bold = True
    r_tg1.font.color.rgb = CYAN

    p_sub = tf_tg.add_paragraph()
    p_sub.space_before = Pt(4)
    r_sub = p_sub.add_run()
    r_sub.text = "Standardizing Trust Across India."
    r_sub.font.name = FONT_FAMILY
    r_sub.font.size = Pt(13.5)
    r_sub.font.bold = True
    r_sub.font.color.rgb = TEXT_LIGHT

    p_desc = tf_tg.add_paragraph()
    p_desc.space_before = Pt(8)
    r_desc = p_desc.add_run()
    r_desc.text = "India's decentralized repair infrastructure standardizing 1.2M neighborhood workshops through double-blind UPI escrow, cryptographic QR warranty passports, and zero-risk payouts."
    r_desc.font.name = FONT_FAMILY
    r_desc.font.size = Pt(10.5)
    r_desc.font.color.rgb = TEXT_MUTED

    # 4. Three Sleek Horizontal Highlight Badges (Clean single row)
    pill_data = [
        ("🛡️  100% UPI Escrow", CYAN, Inches(0.8)),
        ("📜  QR Warranty Passports", INDIGO, Inches(2.76)),
        ("⚡  0% Platform Moat", EMERALD, Inches(4.72))
    ]
    for p_label, p_col, px in pill_data:
        add_card(s1, px, Inches(4.55), Inches(1.88), Inches(0.38), border_color=p_col, fill_color=CARD_BG_ALT, border_width=Pt(1.0), radius=0.2)
        tb_p = s1.shapes.add_textbox(px, Inches(4.61), Inches(1.88), Inches(0.26))
        tf_p = tb_p.text_frame
        tf_p.word_wrap = False
        tf_p.margin_left = tf_p.margin_top = tf_p.margin_right = tf_p.margin_bottom = 0
        pp = tf_p.paragraphs[0]
        pp.alignment = PP_ALIGN.CENTER
        rp = pp.add_run()
        rp.text = p_label
        rp.font.name = FONT_FAMILY
        rp.font.size = Pt(8.5)
        rp.font.bold = True
        rp.font.color.rgb = p_col

    # 5. Presenter / Attribution Block (Bottom Left - EXACTLY matching Image 2)
    # Slanted geometric accent marks
    by_acc1 = s1.shapes.add_shape(MSO_SHAPE.PARALLELOGRAM, Inches(0.8), Inches(5.42), Inches(0.36), Inches(0.34))
    by_acc1.fill.solid()
    by_acc1.fill.fore_color.rgb = INDIGO
    by_acc1.line.fill.background()

    by_acc2 = s1.shapes.add_shape(MSO_SHAPE.PARALLELOGRAM, Inches(1.20), Inches(5.42), Inches(0.24), Inches(0.34))
    by_acc2.fill.solid()
    by_acc2.fill.fore_color.rgb = EMERALD
    by_acc2.line.fill.background()

    tb_by = s1.shapes.add_textbox(Inches(1.58), Inches(5.38), Inches(4.8), Inches(0.38))
    tf_by = tb_by.text_frame
    tf_by.word_wrap = False
    tf_by.margin_left = tf_by.margin_top = tf_by.margin_right = tf_by.margin_bottom = 0
    p_by = tf_by.paragraphs[0]
    r_by = p_by.add_run()
    r_by.text = "BY: TEAM VYTRON"
    r_by.font.name = FONT_FAMILY
    r_by.font.size = Pt(14)
    r_by.font.bold = True
    r_by.font.color.rgb = TEXT_WHITE

    tb_by_sub = s1.shapes.add_textbox(Inches(1.58), Inches(5.78), Inches(4.8), Inches(0.28))
    tf_bys = tb_by_sub.text_frame
    tf_bys.word_wrap = False
    tf_bys.margin_left = tf_bys.margin_top = tf_bys.margin_right = tf_bys.margin_bottom = 0
    p_bys = tf_bys.paragraphs[0]
    r_bys = p_bys.add_run()
    r_bys.text = "Live Production System  •  https://www.vytron.me"
    r_bys.font.name = FONT_FAMILY
    r_bys.font.size = Pt(9.5)
    r_bys.font.bold = True
    r_bys.font.color.rgb = CYAN

    # 6. Right Hero Showcase: Clean, Unobstructed Desktop Browser (No floating overlays)
    img_web_hero = os.path.join(assets_dir, "website_hero_framed.png")
    add_browser_frame(s1, Inches(6.85), Inches(0.55), Inches(5.68), Inches(6.37), img_web_hero, "https://www.vytron.me", CYAN)

    # 3. Modern Landing Page Footer Strip
    tb_ftr_l = s1.shapes.add_textbox(Inches(0.8), Inches(7.08), Inches(6.0), Inches(0.3))
    tf_fl = tb_ftr_l.text_frame
    tf_fl.word_wrap = False
    tf_fl.margin_left = tf_fl.margin_top = tf_fl.margin_right = tf_fl.margin_bottom = 0
    pfl = tf_fl.paragraphs[0]
    r_fl1 = pfl.add_run()
    r_fl1.text = "● LIVE AT WWW.VYTRON.ME"
    r_fl1.font.name = FONT_FAMILY
    r_fl1.font.size = Pt(8.5)
    r_fl1.font.bold = True
    r_fl1.font.color.rgb = CYAN
    r_fl2 = pfl.add_run()
    r_fl2.text = "   •   Built by Team Vytron"
    r_fl2.font.name = FONT_FAMILY
    r_fl2.font.size = Pt(8.5)
    r_fl2.font.color.rgb = TEXT_DIM

    tb_ftr_r = s1.shapes.add_textbox(Inches(7.0), Inches(7.08), Inches(5.533), Inches(0.3))
    tf_fr = tb_ftr_r.text_frame
    tf_fr.word_wrap = False
    tf_fr.margin_left = tf_fr.margin_top = tf_fr.margin_right = tf_fr.margin_bottom = 0
    pfr = tf_fr.paragraphs[0]
    pfr.alignment = PP_ALIGN.RIGHT
    r_fr = pfr.add_run()
    r_fr.text = "ALL CATEGORIES: 📱 PHONES  •  🧺 APPLIANCES  •  💻 COMPUTING  •  🚲 BICYCLES  •  ⌚ WATCHES"
    r_fr.font.name = FONT_FAMILY
    r_fr.font.size = Pt(8.5)
    r_fr.font.color.rgb = TEXT_DIM

    # =========================================================================
    # SLIDE 2: Problem Statement Part 1: The Broken Economics of Repair
    # Taken directly from HACKATHON_SYNOPSIS.md Section 1 & Section 2.1
    # =========================================================================
    print("Building Slide 2 (Problem Statement: Broken Economics) ...")
    s2 = init_slide("02 / 10")
    add_headers(s2, "[ 02 // PROBLEM STATEMENT: THE BROKEN REPAIR ECONOMY ]", "The Broken Economics of Repair & The Trust Deficit", "Consumers replace items fixable for <15% of cost because authorized centers charge 60%–80% while street repair lacks verified trust.")

    # Left Column: 3 Metric Cards (Dense, Zero Empty Space)
    m_cards = [
        ("$15.2B", "THE LEMON MARKET TRAP (AKERLOF'S ASYMMETRY)", "Absence of verifiable trust forces a lose-lose choice: pay 60%–80% device value at authorized monopolies or risk unverified street shops.", "⚖️ Akerlof's Dilemma: Trust deficit drives premature replacement", CYAN),
        ("88%", "CONSUMER TRUST DEFICIT & COUNTERFEIT FEAR", "Consumers dread counterfeit parts, swapped laptop RAM, fake compressor relays, and arbitrary overcharging. Repairs fixable for <15% cost are abandoned out of fear.", "🚨 Acute Information Asymmetry: Zero advance payment protection", CRIMSON),
        ("0 Days", "ZERO POST-REPAIR WARRANTY & RECOURSE", "Offline unorganized repair offers 0 days of warranty. If a repaired motherboard or appliance fails days later, 100% of financial loss is borne by the consumer.", "🔒 Zero Recourse: No escrow vault, no tamper-proof passport", AMBER)
    ]
    y_mc = Inches(1.8)
    for stat, title, desc, tag_info, col in m_cards:
        add_card(s2, Inches(0.8), y_mc, Inches(5.8), Inches(1.45), col, CARD_BG_ALT, radius=0.05)

        tb_s = s2.shapes.add_textbox(Inches(1.06), y_mc + Inches(0.16), Inches(1.62), Inches(1.15))
        tf_s = tb_s.text_frame
        tf_s.word_wrap = True
        tf_s.margin_left = tf_s.margin_top = tf_s.margin_right = tf_s.margin_bottom = 0
        ps = tf_s.paragraphs[0]
        rs = ps.add_run()
        rs.text = stat
        rs.font.name = FONT_FAMILY
        rs.font.size = Pt(26)
        rs.font.bold = True
        rs.font.color.rgb = col

        tb_t = s2.shapes.add_textbox(Inches(2.74), y_mc + Inches(0.14), Inches(3.72), Inches(1.22))
        tf_t = tb_t.text_frame
        tf_t.word_wrap = True
        tf_t.margin_left = tf_t.margin_top = tf_t.margin_right = tf_t.margin_bottom = 0
        p1 = tf_t.paragraphs[0]
        r1 = p1.add_run()
        r1.text = title
        r1.font.name = FONT_FAMILY
        r1.font.size = Pt(10.5)
        r1.font.bold = True
        r1.font.color.rgb = TEXT_WHITE
        p2 = tf_t.add_paragraph()
        p2.space_before = Pt(2)
        r2 = p2.add_run()
        r2.text = desc
        r2.font.name = FONT_FAMILY
        r2.font.size = Pt(8.5)
        r2.font.color.rgb = TEXT_BODY
        p3 = tf_t.add_paragraph()
        p3.space_before = Pt(3)
        r3 = p3.add_run()
        r3.text = tag_info
        r3.font.name = FONT_FAMILY
        r3.font.size = Pt(8)
        r3.font.bold = True
        r3.font.color.rgb = col

        y_mc += Inches(1.65)

    # Right Framed CAD: Exploded Multi-Category Hardware Risk Telemetry
    img_hw = os.path.join(assets_dir, "hardware_exploded.jpg")
    add_cad_frame(s2, Inches(7.0), Inches(1.8), Inches(5.533), Inches(4.8), img_hw, "3D CAD // MULTI-CATEGORY COMPONENT TELEMETRY", "LEMON MARKET ASYMMETRY", CYAN)

    # =========================================================================
    # SLIDE 3: Problem Statement Part 2: The Dual Crisis (Climate & Artisan)
    # Taken directly from HACKATHON_SYNOPSIS.md Section 2.2 & Section 2.3
    # =========================================================================
    print("Building Slide 3 (Problem Statement: Dual Crisis) ...")
    s3 = init_slide("03 / 10")
    add_headers(s3, "[ 03 // PROBLEM STATEMENT: THE DUAL CRISIS ]", "The Climate Paradox & Vanishing Artisan Livelihoods", "India generates 1.71M tonnes of toxic e-waste while 92% of skilled local repair technicians remain digitally invisible.")

    # Left Column: 2 Stacked Crisis Cards (100% Filled, Zero Empty Space)
    # Top Card: Crisis 1 (Environmental Toll from Synopsis 2.3)
    add_card(s3, Inches(0.8), Inches(1.8), Inches(5.8), Inches(2.35), CRIMSON, CARD_BG_ALT, radius=0.04)
    tbc1 = s3.shapes.add_textbox(Inches(1.08), Inches(1.95), Inches(5.3), Inches(1.40))
    tfc1 = tbc1.text_frame
    tfc1.word_wrap = True
    tfc1.margin_left = tfc1.margin_top = tfc1.margin_right = tfc1.margin_bottom = 0

    p1_tag = tfc1.paragraphs[0]
    r1_t = p1_tag.add_run()
    r1_t.text = "⚠️ CRISIS 01: 1.71M TONNES E-WASTE & 80% EMBODIED CARBON LOST"
    r1_t.font.name = FONT_FAMILY
    r1_t.font.size = Pt(10.5)
    r1_t.font.bold = True
    r1_t.font.color.rgb = CRIMSON

    bullets1 = [
        ("3rd Largest Global Producer", "India produces 1.71M+ tonnes e-waste annually; over 95% is handled unsafely in informal toxic dumps."),
        ("80% Embodied Carbon Wasted", "Up to 80% of device lifetime emissions occur during manufacturing; discarding fixable hardware wastes all embodied energy."),
        ("Toxic Heavy Metal Leaching", "Unrecycled electronics and appliances leak lead, mercury & cadmium directly into groundwater and soil tables.")
    ]
    for b_title, b_desc in bullets1:
        pb = tfc1.add_paragraph()
        pb.space_before = Pt(3)
        rb1 = pb.add_run()
        rb1.text = "• " + b_title + ": "
        rb1.font.name = FONT_FAMILY
        rb1.font.size = Pt(9)
        rb1.font.bold = True
        rb1.font.color.rgb = TEXT_LIGHT
        rb2 = pb.add_run()
        rb2.text = b_desc
        rb2.font.name = FONT_FAMILY
        rb2.font.size = Pt(8.5)
        rb2.font.color.rgb = TEXT_BODY

    # Crisis 1 Bottom Metric Banner (Fills bottom void)
    add_card(s3, Inches(1.0), Inches(3.46), Inches(5.4), Inches(0.60), CRIMSON, CARD_BG_ELEVATED, Pt(1), radius=0.06)
    tbc1_bot = s3.shapes.add_textbox(Inches(1.24), Inches(3.54), Inches(5.0), Inches(0.46))
    tfc1_b = tbc1_bot.text_frame
    tfc1_b.word_wrap = True
    tfc1_b.margin_left = tfc1_b.margin_top = tfc1_b.margin_right = tfc1_b.margin_bottom = 0
    p1_b = tfc1_b.paragraphs[0]
    r1_b1 = p1_b.add_run()
    r1_b1.text = "ECOLOGICAL TOLL: 1,710,000+ METRIC TONNES DISCARDED / YEAR"
    r1_b1.font.name = FONT_FAMILY
    r1_b1.font.size = Pt(8.5)
    r1_b1.font.bold = True
    r1_b1.font.color.rgb = CRIMSON
    p1_b2 = tfc1_b.add_paragraph()
    r1_b2 = p1_b2.add_run()
    r1_b2.text = "India 3rd Largest Globally  •  80% Lifetime Carbon Footprint Irretrievably Lost"
    r1_b2.font.name = FONT_FAMILY
    r1_b2.font.size = Pt(8)
    r1_b2.font.color.rgb = TEXT_LIGHT

    # Bottom Card: Crisis 2 (Livelihood Squeeze from Synopsis 2.2)
    add_card(s3, Inches(0.8), Inches(4.35), Inches(5.8), Inches(2.35), AMBER, CARD_BG_ALT, radius=0.04)
    tbc2 = s3.shapes.add_textbox(Inches(1.08), Inches(4.50), Inches(5.3), Inches(1.40))
    tfc2 = tbc2.text_frame
    tfc2.word_wrap = True
    tfc2.margin_left = tfc2.margin_top = tfc2.margin_right = tfc2.margin_bottom = 0

    p2_tag = tfc2.paragraphs[0]
    r2_t = p2_tag.add_run()
    r2_t.text = "📉 CRISIS 02: 92% DIGITALLY INVISIBLE MASTER ARTISANS"
    r2_t.font.name = FONT_FAMILY
    r2_t.font.size = Pt(10.5)
    r2_t.font.bold = True
    r2_t.font.color.rgb = AMBER

    bullets2 = [
        ("92% Lack Digital Presence", "Neighborhood repair craftspeople lack online storefronts, customer booking tools, or search visibility."),
        ("Zero Reputation Ledger", "Years of stellar bench craftsmanship remain unrecorded; a single rumor or customer dispute can ruin a shop."),
        ("Predatory Aggregator Tax", "Monopolistic gig apps extract 25%–30% commissions on technician labor, trapping skilled artisans in gig poverty.")
    ]
    for b_title, b_desc in bullets2:
        pb = tfc2.add_paragraph()
        pb.space_before = Pt(3)
        rb1 = pb.add_run()
        rb1.text = "• " + b_title + ": "
        rb1.font.name = FONT_FAMILY
        rb1.font.size = Pt(9)
        rb1.font.bold = True
        rb1.font.color.rgb = TEXT_LIGHT
        rb2 = pb.add_run()
        rb2.text = b_desc
        rb2.font.name = FONT_FAMILY
        rb2.font.size = Pt(8.5)
        rb2.font.color.rgb = TEXT_BODY

    # Crisis 2 Bottom Metric Banner (Fills bottom void)
    add_card(s3, Inches(1.0), Inches(6.01), Inches(5.4), Inches(0.60), AMBER, CARD_BG_ELEVATED, Pt(1), radius=0.06)
    tbc2_bot = s3.shapes.add_textbox(Inches(1.24), Inches(6.09), Inches(5.0), Inches(0.46))
    tfc2_b = tbc2_bot.text_frame
    tfc2_b.word_wrap = True
    tfc2_b.margin_left = tfc2_b.margin_top = tfc2_b.margin_right = tfc2_b.margin_bottom = 0
    p2_b = tfc2_b.paragraphs[0]
    r2_b1 = p2_b.add_run()
    r2_b1.text = "ARTISAN CRISIS: 92% LACK ANY DIGITAL BOOKING PRESENCE"
    r2_b1.font.name = FONT_FAMILY
    r2_b1.font.size = Pt(8.5)
    r2_b1.font.bold = True
    r2_b1.font.color.rgb = AMBER
    p2_b2 = tfc2_b.add_paragraph()
    r2_b2 = p2_b2.add_run()
    r2_b2.text = "25%–30% Aggregator Commission Drain  •  Zero Verifiable Credit or Reputation History"
    r2_b2.font.name = FONT_FAMILY
    r2_b2.font.size = Pt(8)
    r2_b2.font.color.rgb = TEXT_LIGHT

    # Right Framed CAD: E-Waste Crisis 3D Hardware Mountain
    img_crisis = os.path.join(assets_dir, "crisis_ewaste.jpg")
    add_cad_frame(s3, Inches(6.9), Inches(1.8), Inches(5.633), Inches(4.9), img_crisis, "ECOLOGICAL CATASTROPHE // 1.71M TONNES E-WASTE", "CRITICAL METRIC", CRIMSON)

    # =========================================================================
    # SLIDE 4: The FixGrid Solution (5 Full-Height Vertical Sector Columns)
    # =========================================================================
    print("Building Slide 4 (Solution) ...")
    s4 = init_slide("04 / 10")
    add_headers(s4, "[ 04 // THE FIXGRID SOLUTION ]", "One Universal Platform. Five Everyday Repair Sectors.", "A standardized trust, escrow, and warranty layer powering every category of local repair.")

    col_sectors = [
        ("SECTOR 01", "📱 Mobile", "Smartphones & iPads", [
            ("AMOLED Panels", "Display & glass laminations"),
            ("Battery & PMIC", "Cell & charging IC repair"),
            ("Micro-Solder", "Ultrasonic trace jumpers")
        ], "70% SAVED", "Save ₹15,000+", "⚡ 2–4 Hr Turnaround", "Typical: ₹1,400 (vs ₹18,000 New)", CYAN),

        ("SECTOR 02", "💻 Laptops", "MacBooks & Custom PCs", [
            ("Logic Boards", "Dead power rail & PMIC fixes"),
            ("Keyboards/Hinges", "Chassis rebuilds & ports"),
            ("GPU Rework", "BGA reballing & repasting")
        ], "65% SAVED", "Save ₹35,000+", "⚡ Same Day Bench", "Typical: ₹2,800 (vs ₹45,000 New)", INDIGO),

        ("SECTOR 03", "🧺 Appliances", "Inverter ACs & Fridges", [
            ("Inverter PCBs", "Compressor board surge fixes"),
            ("Freezer Gas", "R600a recovery & thermostats"),
            ("Washers/Motors", "Motor rewinding & panels")
        ], "75% SAVED", "Save ₹22,000+", "⚡ Home Visit Lab", "Typical: ₹1,600 (vs ₹32,000 New)", EMERALD),

        ("SECTOR 04", "🚲 Mobility", "Bicycles & E-Bikes", [
            ("Drivetrains", "Hydraulic bleeding & cassettes"),
            ("E-Bike Motors", "Brushless hub & battery tuning"),
            ("Wheel Truing", "Spoke tension & bracket work")
        ], "60% SAVED", "Save ₹8,000+", "⚡ Rapid Tune-Up", "Typical: ₹850 (vs ₹12,000 New)", AMBER),

        ("SECTOR 05", "⌚ Watches", "Precision Horology", [
            ("Movements", "Teardown & escapement tuning"),
            ("Timing Rig", "Witschi timing beat correction"),
            ("Pressure Seal", "20 ATM testing & sapphire")
        ], "80% SAVED", "Save ₹40,000+", "⚡ Certified Atelier", "Typical: ₹1,200 (vs ₹25,000 New)", RGBColor(168, 85, 247))
    ]

    x_c = Inches(0.8)
    col_width = Inches(2.22)
    gap_c = Inches(0.158)
    for stag, stitle, sfocus, sservices, ssavings, srub, stime, stypical, scol in col_sectors:
        add_card(s4, x_c, Inches(1.8), col_width, Inches(4.95), scol, CARD_BG_ALT, radius=0.04)

        # Header Section
        tb_sh = s4.shapes.add_textbox(x_c + Inches(0.18), Inches(1.98), col_width - Inches(0.36), Inches(0.78))
        tf_sh = tb_sh.text_frame
        tf_sh.word_wrap = True
        tf_sh.margin_left = tf_sh.margin_top = tf_sh.margin_right = tf_sh.margin_bottom = 0
        p0 = tf_sh.paragraphs[0]
        r0 = p0.add_run()
        r0.text = stag
        r0.font.name = FONT_FAMILY
        r0.font.size = Pt(8.5)
        r0.font.bold = True
        r0.font.color.rgb = scol

        p1 = tf_sh.add_paragraph()
        p1.space_before = Pt(2)
        r1 = p1.add_run()
        r1.text = stitle
        r1.font.name = FONT_FAMILY
        r1.font.size = Pt(13)
        r1.font.bold = True
        r1.font.color.rgb = TEXT_WHITE

        p2 = tf_sh.add_paragraph()
        r2 = p2.add_run()
        r2.text = sfocus
        r2.font.name = FONT_FAMILY
        r2.font.size = Pt(8.5)
        r2.font.color.rgb = TEXT_MUTED

        # Divider
        div = s4.shapes.add_shape(MSO_SHAPE.RECTANGLE, x_c + Inches(0.18), Inches(2.80), col_width - Inches(0.36), Inches(0.01))
        div.fill.solid()
        div.fill.fore_color.rgb = LINE_SUBTLE
        div.line.fill.background()

        # Specialties List
        tb_sp = s4.shapes.add_textbox(x_c + Inches(0.18), Inches(2.88), col_width - Inches(0.36), Inches(1.38))
        tf_sp = tb_sp.text_frame
        tf_sp.word_wrap = True
        tf_sp.margin_left = tf_sp.margin_top = tf_sp.margin_right = tf_sp.margin_bottom = 0
        p_hdr = tf_sp.paragraphs[0]
        rh = p_hdr.add_run()
        rh.text = "BENCH SPECIALTIES:"
        rh.font.name = FONT_FAMILY
        rh.font.size = Pt(8)
        rh.font.bold = True
        rh.font.color.rgb = TEXT_DIM

        for svc_t, svc_d in sservices:
            psv = tf_sp.add_paragraph()
            psv.space_before = Pt(3)
            rsv1 = psv.add_run()
            rsv1.text = "• " + svc_t + "\n  "
            rsv1.font.name = FONT_FAMILY
            rsv1.font.size = Pt(8.5)
            rsv1.font.bold = True
            rsv1.font.color.rgb = TEXT_LIGHT
            rsv2 = psv.add_run()
            rsv2.text = svc_d
            rsv2.font.name = FONT_FAMILY
            rsv2.font.size = Pt(8)
            rsv2.font.color.rgb = TEXT_BODY

        # Elevated Value Box (Snugly Fills Bottom of Column)
        y_vbox = Inches(4.32)
        add_card(s4, x_c + Inches(0.10), y_vbox, col_width - Inches(0.20), Inches(2.36), scol, CARD_BG_ELEVATED, Pt(1), radius=0.06)
        tb_vb = s4.shapes.add_textbox(x_c + Inches(0.24), y_vbox + Inches(0.14), col_width - Inches(0.48), Inches(2.10))
        tf_vb = tb_vb.text_frame
        tf_vb.word_wrap = True
        tf_vb.margin_left = tf_vb.margin_top = tf_vb.margin_right = tf_vb.margin_bottom = 0

        pv0 = tf_vb.paragraphs[0]
        rv0 = pv0.add_run()
        rv0.text = ssavings
        rv0.font.name = FONT_FAMILY
        rv0.font.size = Pt(14)
        rv0.font.bold = True
        rv0.font.color.rgb = scol

        pv1 = tf_vb.add_paragraph()
        pv1.space_before = Pt(2)
        rv1 = pv1.add_run()
        rv1.text = srub
        rv1.font.name = FONT_FAMILY
        rv1.font.size = Pt(9.5)
        rv1.font.bold = True
        rv1.font.color.rgb = TEXT_WHITE

        pv2 = tf_vb.add_paragraph()
        pv2.space_before = Pt(3)
        rv2 = pv2.add_run()
        rv2.text = stime
        rv2.font.name = FONT_FAMILY
        rv2.font.size = Pt(8.5)
        rv2.font.bold = True
        rv2.font.color.rgb = EMERALD

        pv3 = tf_vb.add_paragraph()
        pv3.space_before = Pt(2)
        rv3 = pv3.add_run()
        rv3.text = "🛡️ 30–90D Escrow Pass"
        rv3.font.name = FONT_FAMILY
        rv3.font.size = Pt(8.5)
        rv3.font.bold = True
        rv3.font.color.rgb = TEXT_LIGHT

        pv4 = tf_vb.add_paragraph()
        pv4.space_before = Pt(3)
        rv4 = pv4.add_run()
        rv4.text = stypical
        rv4.font.name = FONT_FAMILY
        rv4.font.size = Pt(8)
        rv4.font.color.rgb = TEXT_MUTED

        pv5 = tf_vb.add_paragraph()
        pv5.space_before = Pt(2)
        rv5 = pv5.add_run()
        rv5.text = "Zero Advance Risk • OTP Released"
        rv5.font.name = FONT_FAMILY
        rv5.font.size = Pt(7.5)
        rv5.font.bold = True
        rv5.font.color.rgb = scol

        x_c += col_width + gap_c

    # =========================================================================
    # SLIDE 5: Product Flow & Live Radar Map
    # =========================================================================
    print("Building Slide 5 (Product Flow) ...")
    s5 = init_slide("05 / 10")
    add_headers(s5, "[ 05 // PRODUCT ARCHITECTURE ]", "From Search to Escrow Payout: Complete Peace of Mind", "Powered by live geolocation matching, transparent escrow locking, and OTP release.")

    steps = [
        ("01", "Radar Search Across 29+ Categories", "Locate nearby bench-tested workshops on the live map. Filter by Appliances, Phones, Laptops, Bicycles, or Watches.", CYAN),
        ("02", "Upfront Quote & Escrow Lock", "Itemized diagnostic pricing confirmed upfront. Customer funds deposited into secure UPI Escrow (0% advance risk).", INDIGO),
        ("03", "Physical Testing & OTP Release", "Customer physically inspects and tests the repair. Funds are released only after customer inputs verification OTP.", AMBER),
        ("04", "Instant Payout & Warranty Pass", "Technician receives instant UPI transfer with 0% commission. Customer receives a 30–90 day digital warranty pass.", EMERALD)
    ]

    y_step = Inches(1.8)
    for num, stitle, sdesc, col in steps:
        add_card(s5, Inches(0.8), y_step, Inches(5.8), Inches(1.05), col, CARD_BG_ALT, radius=0.05)

        badge = s5.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(1.05), y_step + Inches(0.2), Inches(0.65), Inches(0.65))
        badge.fill.solid()
        badge.fill.fore_color.rgb = col
        badge.line.fill.background()
        badge.adjustments[0] = 0.18
        btf = badge.text_frame
        btf.margin_left = btf.margin_top = btf.margin_right = btf.margin_bottom = 0
        bp = btf.paragraphs[0]
        bp.alignment = PP_ALIGN.CENTER
        br = bp.add_run()
        br.text = num
        br.font.name = FONT_FAMILY
        br.font.size = Pt(13)
        br.font.bold = True
        br.font.color.rgb = BG_COLOR

        stb = s5.shapes.add_textbox(Inches(1.88), y_step + Inches(0.14), Inches(4.55), Inches(0.8))
        stf = stb.text_frame
        stf.word_wrap = True
        stf.margin_left = stf.margin_top = stf.margin_right = stf.margin_bottom = 0
        sp1 = stf.paragraphs[0]
        sr1 = sp1.add_run()
        sr1.text = stitle
        sr1.font.name = FONT_FAMILY
        sr1.font.size = Pt(11.5)
        sr1.font.bold = True
        sr1.font.color.rgb = TEXT_WHITE
        sp2 = stf.add_paragraph()
        sp2.space_before = Pt(2)
        sr2 = sp2.add_run()
        sr2.text = sdesc
        sr2.font.name = FONT_FAMILY
        sr2.font.size = Pt(9)
        sr2.font.color.rgb = TEXT_BODY

        y_step += Inches(1.22)

    # Right Framed Browser: Live Search Radar Map
    img_web_search = os.path.join(assets_dir, "website_search_framed.png")
    add_browser_frame(s5, Inches(6.9), Inches(1.8), Inches(5.633), Inches(4.8), img_web_search, "https://www.vytron.me/search", CYAN)

    # =========================================================================
    # SLIDE 6: Market Disruption (Aggregator Trap vs FixGrid Model)
    # =========================================================================
    print("Building Slide 6 (Market Disruption) ...")
    s6 = init_slide("06 / 10")
    add_headers(s6, "[ 06 // MARKET DISRUPTION ]", "Transforming Informal Technicians into Thriving Entrepreneurs", "Comparing exploitative corporate aggregator monopolies against FixGrid's partner-first economics.")

    # Left Column (The Aggregator Trap)
    add_card(s6, Inches(0.8), Inches(1.8), Inches(5.7), Inches(4.95), CRIMSON, CARD_BG_ALT, radius=0.04)
    tba1 = s6.shapes.add_textbox(Inches(1.15), Inches(2.05), Inches(5.0), Inches(2.75))
    tfa1 = tba1.text_frame
    tfa1.word_wrap = True
    tfa1.margin_left = tfa1.margin_top = tfa1.margin_right = tfa1.margin_bottom = 0
    p = tfa1.paragraphs[0]
    r = p.add_run()
    r.text = "THE AGGREGATOR TRAP"
    r.font.name = FONT_FAMILY
    r.font.size = Pt(14)
    r.font.bold = True
    r.font.color.rgb = CRIMSON

    p_sub = tfa1.add_paragraph()
    r_sub = p_sub.add_run()
    r_sub.text = "(Urban Company / Local Lead Directories)"
    r_sub.font.name = FONT_FAMILY
    r_sub.font.size = Pt(9.5)
    r_sub.font.italic = True
    r_sub.font.color.rgb = TEXT_MUTED

    negatives = [
        ("25%–30% Heavy Commission", "Extracted directly from the shopkeeper's service labor."),
        ("Disposable Gig Workers", "Technicians treated as anonymous numbers with zero safety net."),
        ("Pay-Per-Lead Bidding War", "Shops spend ₹300–₹500 for cold customer leads."),
        ("Zero Brand Ownership", "Customer belongs to the corporate platform; shop gets zero retention."),
        ("Delayed Cash Payouts", "Funds held for weeks with arbitrary customer chargebacks.")
    ]
    for n_title, n_desc in negatives:
        pp = tfa1.add_paragraph()
        pp.space_before = Pt(7)
        pr1 = pp.add_run()
        pr1.text = "❌ " + n_title + ": "
        pr1.font.name = FONT_FAMILY
        pr1.font.size = Pt(9.5)
        pr1.font.bold = True
        pr1.font.color.rgb = TEXT_LIGHT
        pr2 = pp.add_run()
        pr2.text = n_desc
        pr2.font.name = FONT_FAMILY
        pr2.font.size = Pt(9)
        pr2.font.color.rgb = TEXT_BODY

    # Left Bottom Elevated Economic Box (Snug, Zero Internal Void)
    y_drain = Inches(4.88)
    add_card(s6, Inches(1.0), y_drain, Inches(5.3), Inches(1.77), CRIMSON, CARD_BG_ELEVATED, Pt(1), radius=0.05)
    tb_dr = s6.shapes.add_textbox(Inches(1.26), y_drain + Inches(0.16), Inches(4.8), Inches(1.48))
    tf_dr = tb_dr.text_frame
    tf_dr.word_wrap = True
    tf_dr.margin_left = tf_dr.margin_top = tf_dr.margin_right = tf_dr.margin_bottom = 0

    pdr0 = tf_dr.paragraphs[0]
    rdr0 = pdr0.add_run()
    rdr0.text = "EXTRACTIVE MONOPOLY ECONOMICS"
    rdr0.font.name = FONT_FAMILY
    rdr0.font.size = Pt(8.5)
    rdr0.font.bold = True
    rdr0.font.color.rgb = CRIMSON

    pdr1 = tf_dr.add_paragraph()
    pdr1.space_before = Pt(3)
    rdr1 = pdr1.add_run()
    rdr1.text = "30% CUT ON LABOR  •  ₹18,000–₹35,000 MONTHLY DRAIN"
    rdr1.font.name = FONT_FAMILY
    rdr1.font.size = Pt(11)
    rdr1.font.bold = True
    rdr1.font.color.rgb = TEXT_WHITE

    pdr2 = tf_dr.add_paragraph()
    pdr2.space_before = Pt(3)
    rdr2 = pdr2.add_run()
    rdr2.text = "Technicians absorb 100% of physical tool, shop rent, and warranty risk while corporate aggregators pocket 30% without touching a screwdriver."
    rdr2.font.name = FONT_FAMILY
    rdr2.font.size = Pt(8.5)
    rdr2.font.color.rgb = TEXT_BODY

    pdr3 = tf_dr.add_paragraph()
    pdr3.space_before = Pt(4)
    rdr3 = pdr3.add_run()
    rdr3.text = "OUTCOME: ALIENATED GIG WORKERS  •  DYING INDEPENDENT WORKSHOPS"
    rdr3.font.name = FONT_FAMILY
    rdr3.font.size = Pt(8.5)
    rdr3.font.bold = True
    rdr3.font.color.rgb = CRIMSON

    # Right Column (The FixGrid Partner Model)
    add_card(s6, Inches(6.833), Inches(1.8), Inches(5.7), Inches(4.95), EMERALD, CARD_BG_ALT, radius=0.04)
    tba2 = s6.shapes.add_textbox(Inches(7.183), Inches(2.05), Inches(5.0), Inches(2.75))
    tfa2 = tba2.text_frame
    tfa2.word_wrap = True
    tfa2.margin_left = tfa2.margin_top = tfa2.margin_right = tfa2.margin_bottom = 0
    p = tfa2.paragraphs[0]
    r = p.add_run()
    r.text = "THE FIXGRID PARTNER MODEL"
    r.font.name = FONT_FAMILY
    r.font.size = Pt(14)
    r.font.bold = True
    r.font.color.rgb = EMERALD

    p_sub = tfa2.add_paragraph()
    r_sub = p_sub.add_run()
    r_sub.text = "(Dignity, Fair Economics & Sustainable Growth)"
    r_sub.font.name = FONT_FAMILY
    r_sub.font.size = Pt(9.5)
    r_sub.font.italic = True
    r_sub.font.color.rgb = TEXT_MUTED

    positives = [
        ("0% Commission on Labor", "We do not take a single rupee from hard-earned service labor."),
        ("+5% Completed Job Bonus", "FixGrid pays an extra 5% cashback bonus to shops for verified repairs."),
        ("100% Brand Ownership", "Free digital storefront and direct repeat customer relationships stay with shop."),
        ("Instant UPI Escrow Payout", "Funds released directly into the shopkeeper's bank account upon OTP."),
        ("Platform Warranty Shield", "FixGrid underwrites warranty claims, protecting technicians from part liabilities.")
    ]
    for p_title, p_desc in positives:
        pp = tfa2.add_paragraph()
        pp.space_before = Pt(7)
        pr1 = pp.add_run()
        pr1.text = "✅ " + p_title + ": "
        pr1.font.name = FONT_FAMILY
        pr1.font.size = Pt(9.5)
        pr1.font.bold = True
        pr1.font.color.rgb = TEXT_LIGHT
        pr2 = pp.add_run()
        pr2.text = p_desc
        pr2.font.name = FONT_FAMILY
        pr2.font.size = Pt(9)
        pr2.font.color.rgb = TEXT_BODY

    # Right Bottom Elevated Economic Box (Snug, Zero Internal Void)
    add_card(s6, Inches(7.033), y_drain, Inches(5.3), Inches(1.77), EMERALD, CARD_BG_ELEVATED, Pt(1), radius=0.05)
    tb_pr = s6.shapes.add_textbox(Inches(7.293), y_drain + Inches(0.16), Inches(4.8), Inches(1.48))
    tf_pr = tb_pr.text_frame
    tf_pr.word_wrap = True
    tf_pr.margin_left = tf_pr.margin_top = tf_pr.margin_right = tf_pr.margin_bottom = 0

    ppr0 = tf_pr.paragraphs[0]
    rpr0 = ppr0.add_run()
    rpr0.text = "CIRCULAR PARTNER ECONOMICS"
    rpr0.font.name = FONT_FAMILY
    rpr0.font.size = Pt(8.5)
    rpr0.font.bold = True
    rpr0.font.color.rgb = EMERALD

    ppr1 = tf_pr.add_paragraph()
    ppr1.space_before = Pt(3)
    rpr1 = ppr1.add_run()
    rpr1.text = "0% LABOR TAX  •  100% EARNINGS RETAINED + 5% BONUS"
    rpr1.font.name = FONT_FAMILY
    rpr1.font.size = Pt(11)
    rpr1.font.bold = True
    rpr1.font.color.rgb = TEXT_WHITE

    ppr2 = tf_pr.add_paragraph()
    ppr2.space_before = Pt(3)
    rpr2 = ppr2.add_run()
    rpr2.text = "Technicians earn full income, accumulate verified shop ratings, build localized customer equity, and receive instant digital payments in under 60 seconds."
    rpr2.font.name = FONT_FAMILY
    rpr2.font.size = Pt(8.5)
    rpr2.font.color.rgb = TEXT_BODY

    ppr3 = tf_pr.add_paragraph()
    ppr3.space_before = Pt(4)
    rpr3 = ppr3.add_run()
    rpr3.text = "OUTCOME: EMPOWERED LOCAL ENTREPRENEURS  •  THRIVING COMMUNITIES"
    rpr3.font.name = FONT_FAMILY
    rpr3.font.size = Pt(8.5)
    rpr3.font.bold = True
    rpr3.font.color.rgb = EMERALD

    # =========================================================================
    # SLIDE 7: Measurable Sustainability
    # =========================================================================
    print("Building Slide 7 (Climate Impact) ...")
    s7 = init_slide("07 / 10")
    add_headers(s7, "[ 07 // MEASURABLE SUSTAINABILITY ]", "The Greenest Product Is the One That Is Already Made", "Quantifiable carbon reduction metrics achieved across electronics, computing, and home appliances.")

    # Left Column: 3 Metric Cards (Dense, Zero Empty Space)
    metrics = [
        ("80%", "CO₂ EMISSIONS AVOIDED", "Extending a laptop, smartphone, or refrigerator lifespan by 1–2 years slashes its lifetime carbon footprint by 80% by avoiding new manufacturing.", "🌱 Scope 3 Reduction: Slashing Embedded Carbon", CYAN),
        ("62M", "TONS E-WASTE & APPLIANCES TARGETED", "Directly intercepting salvageable electronics and domestic appliances before they enter toxic, non-degradable landfills.", "♻️ Landfill Interception: Critical Metals Recovery", EMERALD),
        ("100%", "LOCAL CIRCULAR ECONOMY", "Recirculating capital and hardware inside neighborhood communities—every rupee spent on repair stays in the local economy.", "🏙️ Wealth Retention: 100% of Capital Stays Local", INDIGO)
    ]

    y_m = Inches(1.8)
    for num, label, desc, tag_sust, col in metrics:
        add_card(s7, Inches(0.8), y_m, Inches(5.8), Inches(1.45), col, CARD_BG_ALT, radius=0.05)

        tb_num = s7.shapes.add_textbox(Inches(1.08), y_m + Inches(0.16), Inches(1.75), Inches(1.15))
        tf_n = tb_num.text_frame
        tf_n.word_wrap = True
        tf_n.margin_left = tf_n.margin_top = tf_n.margin_right = tf_n.margin_bottom = 0
        pn = tf_n.paragraphs[0]
        rn = pn.add_run()
        rn.text = num
        rn.font.name = FONT_FAMILY
        rn.font.size = Pt(30)
        rn.font.bold = True
        rn.font.color.rgb = col

        tb_txt = s7.shapes.add_textbox(Inches(2.85), y_m + Inches(0.16), Inches(3.60), Inches(1.20))
        tf_t = tb_txt.text_frame
        tf_t.word_wrap = True
        tf_t.margin_left = tf_t.margin_top = tf_t.margin_right = tf_t.margin_bottom = 0
        p1 = tf_t.paragraphs[0]
        r1 = p1.add_run()
        r1.text = label
        r1.font.name = FONT_FAMILY
        r1.font.size = Pt(11)
        r1.font.bold = True
        r1.font.color.rgb = TEXT_WHITE
        p2 = tf_t.add_paragraph()
        p2.space_before = Pt(2)
        r2 = p2.add_run()
        r2.text = desc
        r2.font.name = FONT_FAMILY
        r2.font.size = Pt(9)
        r2.font.color.rgb = TEXT_BODY
        p3 = tf_t.add_paragraph()
        p3.space_before = Pt(3)
        r3 = p3.add_run()
        r3.text = tag_sust
        r3.font.name = FONT_FAMILY
        r3.font.size = Pt(8.5)
        r3.font.bold = True
        r3.font.color.rgb = col

        y_m += Inches(1.65)

    # Right Framed CAD: Translucent Circular Earth Globe
    img_earth = os.path.join(assets_dir, "circular_earth.jpg")
    add_cad_frame(s7, Inches(7.0), Inches(1.8), Inches(5.533), Inches(4.8), img_earth, "SATELLITE TELEMETRY // GLOBAL CIRCULAR IMPACT", "EMERALD NET-ZERO", EMERALD)

    # =========================================================================
    # SLIDE 8: High-Margin Unit Economics
    # =========================================================================
    print("Building Slide 8 (Business Model) ...")
    s8 = init_slide("08 / 10")
    add_headers(s8, "[ 08 // BUSINESS MODEL ]", "High-Margin, Sustainable Economics", "Monetizing trust, supply chain fulfillment, and SaaS tooling without taxing shopkeeper labor.")

    # Left Column: Bespoke Linear-Style Comparison Visual
    add_card(s8, Inches(0.8), Inches(1.8), Inches(5.8), Inches(4.9), CYAN, CARD_BG_ALT, radius=0.04)

    tb_c_hdr = s8.shapes.add_textbox(Inches(1.15), Inches(2.05), Inches(5.1), Inches(0.75))
    tf_ch = tb_c_hdr.text_frame
    tf_ch.word_wrap = True
    tf_ch.margin_left = tf_ch.margin_top = tf_ch.margin_right = tf_ch.margin_bottom = 0
    pch1 = tf_ch.paragraphs[0]
    rch1 = pch1.add_run()
    rch1.text = "TAKE RATE & VALUE CAPTURE"
    rch1.font.name = FONT_FAMILY
    rch1.font.size = Pt(13)
    rch1.font.bold = True
    rch1.font.color.rgb = TEXT_WHITE

    pch2 = tf_ch.add_paragraph()
    pch2.space_before = Pt(2)
    rch2 = pch2.add_run()
    rch2.text = "Comparing exploitative labor commissions against FixGrid's partner-first model."
    rch2.font.name = FONT_FAMILY
    rch2.font.size = Pt(9.5)
    rch2.font.color.rgb = TEXT_MUTED

    benchmarks = [
        ("Aggregator Monopoly (Urban Company / Directories)", "30% Deducted from labor", CRIMSON, 0.95, "30% COMMISSION TAX"),
        ("FixGrid Labor Commission", "0% labor tax + 5% cashback bonus to shop", EMERALD, 1.0, "0% COMMISSION  (+5% BONUS)"),
        ("FixGrid Escrow & Warranty Protection", "Nominal ₹49–₹99 fee per repair booking", CYAN, 0.28, "3%–4% ESCROW FEE"),
        ("B2B Multi-Category Spare Parts", "Direct wholesale component supply margin", INDIGO, 0.52, "12%–15% B2B MARGIN")
    ]

    y_bar = Inches(2.88)
    for b_title, b_sub, b_col, bar_pct, bar_label in benchmarks:
        tb_bt = s8.shapes.add_textbox(Inches(1.15), y_bar, Inches(5.1), Inches(0.35))
        tf_bt = tb_bt.text_frame
        tf_bt.word_wrap = True
        tf_bt.margin_left = tf_bt.margin_top = tf_bt.margin_right = tf_bt.margin_bottom = 0
        pbt = tf_bt.paragraphs[0]
        rbt1 = pbt.add_run()
        rbt1.text = b_title
        rbt1.font.name = FONT_FAMILY
        rbt1.font.size = Pt(10)
        rbt1.font.bold = True
        rbt1.font.color.rgb = TEXT_LIGHT

        track = s8.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(1.15), y_bar + Inches(0.32), Inches(5.1), Inches(0.30))
        track.fill.solid()
        track.fill.fore_color.rgb = CARD_BG_ELEVATED
        track.line.fill.background()
        track.adjustments[0] = 0.15

        fill_w = Inches(5.1 * bar_pct)
        b_fill = s8.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(1.15), y_bar + Inches(0.32), fill_w, Inches(0.30))
        b_fill.fill.solid()
        b_fill.fill.fore_color.rgb = b_col
        b_fill.line.fill.background()
        b_fill.adjustments[0] = 0.15

        tb_bl = s8.shapes.add_textbox(Inches(1.25), y_bar + Inches(0.33), fill_w - Inches(0.2), Inches(0.28))
        tf_bl = tb_bl.text_frame
        tf_bl.word_wrap = False
        tf_bl.margin_left = tf_bl.margin_top = tf_bl.margin_right = tf_bl.margin_bottom = 0
        pbl = tf_bl.paragraphs[0]
        rbl = pbl.add_run()
        rbl.text = bar_label
        rbl.font.name = FONT_FAMILY
        rbl.font.size = Pt(8.5)
        rbl.font.bold = True
        rbl.font.color.rgb = TEXT_WHITE

        y_bar += Inches(0.8)

    tb_cc = s8.shapes.add_textbox(Inches(1.15), Inches(5.95), Inches(5.1), Inches(0.65))
    tf_cc = tb_cc.text_frame
    tf_cc.word_wrap = True
    tf_cc.margin_left = tf_cc.margin_top = tf_cc.margin_right = tf_cc.margin_bottom = 0
    pcc1 = tf_cc.paragraphs[0]
    rcc1 = pcc1.add_run()
    rcc1.text = "PARTNER-FIRST VALUE CREATION"
    rcc1.font.name = FONT_FAMILY
    rcc1.font.size = Pt(8.5)
    rcc1.font.bold = True
    rcc1.font.color.rgb = CYAN
    pcc2 = tf_cc.add_paragraph()
    pcc2.space_before = Pt(2)
    rcc2 = pcc2.add_run()
    rcc2.text = "FixGrid monetizes transaction trust, wholesale parts, and SaaS tooling—never taking a rupee from technician labor."
    rcc2.font.name = FONT_FAMILY
    rcc2.font.size = Pt(9)
    rcc2.font.color.rgb = TEXT_MUTED

    # Right Column: 3 Revenue Stream Cards (Dense, Zero Empty Space)
    streams = [
        ("1. Consumer Escrow & Warranty Fee", "Nominal ₹49–₹99 per booking. Consumers gladly pay a microscopic fee for 100% dispute protection, secure UPI escrow, and guaranteed 30–90 day warranty.", "💎 High-Margin Fee: ₹49–₹99 / Booking  •  94% Checkout Opt-In Rate", CYAN),
        ("2. B2B Multi-Category Spare Parts", "12%–15% wholesale margin on verified phone screens, laptop batteries, compressor relays, and bicycle drivetrains supplied directly to partner shops.", "📦 Wholesale Margin: 12%–15% Gross  •  Sub-0.8% RMA Rate  •  OEM Batch", INDIGO),
        ("3. Shop Pro SaaS Subscriptions", "₹999/month optional premium tier for shops wanting top geographic search ranking, verified gold trust badges, automated CRM, and multi-category inventory.", "🚀 Recurring SaaS: ₹999/Month  •  89% 6-Month Projected Shop Retention", EMERALD)
    ]
    y_str = Inches(1.8)
    for stitle, sdesc, stag, col in streams:
        add_card(s8, Inches(6.833), y_str, Inches(5.7), Inches(1.48), col, CARD_BG_ALT, radius=0.05)
        tb = s8.shapes.add_textbox(Inches(7.15), y_str + Inches(0.16), Inches(5.10), Inches(1.22))
        tf = tb.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
        p1 = tf.paragraphs[0]
        r1 = p1.add_run()
        r1.text = stitle
        r1.font.name = FONT_FAMILY
        r1.font.size = Pt(11.5)
        r1.font.bold = True
        r1.font.color.rgb = TEXT_WHITE
        p2 = tf.add_paragraph()
        p2.space_before = Pt(3)
        r2 = p2.add_run()
        r2.text = sdesc
        r2.font.name = FONT_FAMILY
        r2.font.size = Pt(9)
        r2.font.color.rgb = TEXT_BODY
        p3 = tf.add_paragraph()
        p3.space_before = Pt(4)
        r3 = p3.add_run()
        r3.text = stag
        r3.font.name = FONT_FAMILY
        r3.font.size = Pt(8.5)
        r3.font.bold = True
        r3.font.color.rgb = col
        y_str += Inches(1.65)

    # =========================================================================
    # SLIDE 9: Moat of Trust (3-Tier Architectural Cards, Zero Gaps)
    # =========================================================================
    print("Building Slide 9 (Moat of Trust) ...")
    s9 = init_slide("09 / 10")
    add_headers(s9, "[ 09 // DEFENSIVE MOAT ]", "Why FixGrid Wins: The Moat of Trust", "Four structural competitive advantages that create an insurmountable barrier to entry.")

    moats_data = [
        ("Platform Warranty", "Offline unorganized repair shops offer 0 days warranty; we make repair as safe as buying new.", [
            ("Central Trust Reserve", "FixGrid underwrites parts claims"),
            ("Digital Pass QR", "Tamper-proof repair passport"),
            ("30–90D Guarantee", "Zero-risk customer assurance"),
            ("Reserve Backing", "15% GMV central escrow pool")
        ], CYAN, "30–90 Days", "vs. 0 Days Offline", "🛡️ Cryptographic QR Passport"),

        ("Smart Escrow Hold", "Customer funds remain safely locked in escrow until in-person physical inspection and OTP release.", [
            ("UPI Escrow Vault", "Zero advance payment extortion"),
            ("Physical OTP Release", "Customer tests before paying"),
            ("Dispute Shield", "Instant fair platform arbitration"),
            ("Release Trigger", "Physical inspection & cryptographic OTP")
        ], INDIGO, "100% Escrow", "Zero Advance Risk", "🔒 0% Advance Customer Risk"),

        ("0% Fee + 5% Bonus", "By giving technicians 100% of labor fees plus a 5% bonus, shopkeepers actively route clients to FixGrid.", [
            ("Zero Labor Tax", "100% of labor kept by technician"),
            ("+5% Cash Cashback", "Bonus for on-time verified fixes"),
            ("Storefront Equity", "Shops build repeat customer retention"),
            ("Shop Incentive", "Technicians earn ₹4,500+ extra monthly")
        ], EMERALD, "0% Labor Tax", "+5% Partner Cashback", "⚡ Instant UPI Bank Settlement"),

        ("Climate Credentials", "Real-time carbon savings certificates issued per repair. Empowers consumers & corporate ESG.", [
            ("CO₂ Avoidance Math", "Proprietary lifecycle carbon engine"),
            ("Scope 3 Ledgers", "Verified enterprise decarb data"),
            ("Green Badges", "Public ESG sustainability certificates"),
            ("Decarb Ledger", "Verified ISO 14040 lifecycle engine")
        ], AMBER, "Scope 3 Impact", "Live Decarb Badges", "🌱 Verifiable ESG Sustainability")
    ]

    x_m = Inches(0.8)
    col_wm = Inches(2.75)
    for mtitle, mdesc, march, col, b_stat, b_sub, b_verif in moats_data:
        add_card(s9, x_m, Inches(1.8), col_wm, Inches(4.95), col, CARD_BG_ALT, radius=0.04)

        # Top Section: Title & Concept
        tb_mh = s9.shapes.add_textbox(x_m + Inches(0.20), Inches(1.98), col_wm - Inches(0.40), Inches(1.10))
        tf_mh = tb_mh.text_frame
        tf_mh.word_wrap = True
        tf_mh.margin_left = tf_mh.margin_top = tf_mh.margin_right = tf_mh.margin_bottom = 0

        p0 = tf_mh.paragraphs[0]
        r0 = p0.add_run()
        r0.text = "MOAT PILLAR"
        r0.font.name = FONT_FAMILY
        r0.font.size = Pt(8.5)
        r0.font.bold = True
        r0.font.color.rgb = col

        p1 = tf_mh.add_paragraph()
        p1.space_before = Pt(2)
        r1 = p1.add_run()
        r1.text = mtitle
        r1.font.name = FONT_FAMILY
        r1.font.size = Pt(13)
        r1.font.bold = True
        r1.font.color.rgb = TEXT_WHITE

        p2 = tf_mh.add_paragraph()
        p2.space_before = Pt(3)
        r2 = p2.add_run()
        r2.text = mdesc
        r2.font.name = FONT_FAMILY
        r2.font.size = Pt(8.5)
        r2.font.color.rgb = TEXT_BODY

        # Middle Section: Elevated Architectural Box (Fills Middle Void)
        y_arch = Inches(3.15)
        add_card(s9, x_m + Inches(0.12), y_arch, col_wm - Inches(0.24), Inches(2.05), col, CARD_BG_ELEVATED, Pt(1), radius=0.05)
        tb_ma = s9.shapes.add_textbox(x_m + Inches(0.26), y_arch + Inches(0.16), col_wm - Inches(0.52), Inches(1.78))
        tf_ma = tb_ma.text_frame
        tf_ma.word_wrap = True
        tf_ma.margin_left = tf_ma.margin_top = tf_ma.margin_right = tf_ma.margin_bottom = 0

        pa0 = tf_ma.paragraphs[0]
        ra0 = pa0.add_run()
        ra0.text = "DEFENSIVE MECHANISM:"
        ra0.font.name = FONT_FAMILY
        ra0.font.size = Pt(8)
        ra0.font.bold = True
        ra0.font.color.rgb = col

        for arch_t, arch_d in march:
            pa = tf_ma.add_paragraph()
            pa.space_before = Pt(3)
            ra1 = pa.add_run()
            ra1.text = "• " + arch_t + ": "
            ra1.font.name = FONT_FAMILY
            ra1.font.size = Pt(8.5)
            ra1.font.bold = True
            ra1.font.color.rgb = TEXT_LIGHT
            ra2 = pa.add_run()
            ra2.text = arch_d
            ra2.font.name = FONT_FAMILY
            ra2.font.size = Pt(8)
            ra2.font.color.rgb = TEXT_BODY

        # Bottom Section: Metric Stat Box (Snugly fills bottom)
        y_pill = Inches(5.28)
        add_card(s9, x_m + Inches(0.12), y_pill, col_wm - Inches(0.24), Inches(1.40), col, CARD_BG_ELEVATED, Pt(1), radius=0.05)

        tb_p = s9.shapes.add_textbox(x_m + Inches(0.26), y_pill + Inches(0.16), col_wm - Inches(0.52), Inches(1.16))
        tf_p = tb_p.text_frame
        tf_p.word_wrap = True
        tf_p.margin_left = tf_p.margin_top = tf_p.margin_right = tf_p.margin_bottom = 0

        pp1 = tf_p.paragraphs[0]
        rp1 = pp1.add_run()
        rp1.text = b_stat
        rp1.font.name = FONT_FAMILY
        rp1.font.size = Pt(15)
        rp1.font.bold = True
        rp1.font.color.rgb = col

        pp2 = tf_p.add_paragraph()
        pp2.space_before = Pt(3)
        rp2 = pp2.add_run()
        rp2.text = b_sub
        rp2.font.name = FONT_FAMILY
        rp2.font.size = Pt(9.5)
        rp2.font.bold = True
        rp2.font.color.rgb = TEXT_WHITE

        pp3 = tf_p.add_paragraph()
        pp3.space_before = Pt(3)
        rp3 = pp3.add_run()
        rp3.text = b_verif
        rp3.font.name = FONT_FAMILY
        rp3.font.size = Pt(8)
        rp3.font.bold = True
        rp3.font.color.rgb = TEXT_LIGHT

        pp4 = tf_p.add_paragraph()
        pp4.space_before = Pt(2)
        rp4 = pp4.add_run()
        rp4.text = "Tamper-Proof Platform Backing"
        rp4.font.name = FONT_FAMILY
        rp4.font.size = Pt(7.5)
        rp4.font.color.rgb = col

        x_m += Inches(2.99)

    # =========================================================================
    # SLIDE 10: Vision, Live Website & Conclusion
    # =========================================================================
    print("Building Slide 10 (Vision & Live Website) ...")
    s10 = init_slide("10 / 10")
    add_headers(s10, "[ 10 // THE FUTURE OF REPAIR ]", "Fixing Devices & Appliances. Empowering Artisans. Healing Earth.", "A production-tested circular platform architected for nationwide multi-category scale.")

    # Left Column
    tb_end = s10.shapes.add_textbox(Inches(0.8), Inches(1.8), Inches(5.8), Inches(3.05))
    tf_end = tb_end.text_frame
    tf_end.word_wrap = True
    tf_end.margin_left = tf_end.margin_top = tf_end.margin_right = tf_end.margin_bottom = 0

    p_stack = tf_end.paragraphs[0]
    r_st = p_stack.add_run()
    r_st.text = "PRODUCTION STACK:  NEXT.JS 16  •  SUPABASE  •  UPI ESCROW  •  RIGHT TO REPAIR"
    r_st.font.name = FONT_FAMILY
    r_st.font.size = Pt(9)
    r_st.font.bold = True
    r_st.font.color.rgb = CYAN

    impacts = [
        ("💰 For Consumers", "Save ₹25,000+ yearly across phones, appliances, and laptops with complete peace of mind, upfront itemized pricing, and guaranteed warranty.", "💎 Value: Upfront itemized quotes • ₹25,000+ saved yearly • 30–90D warranty", CYAN),
        ("🏪 For Technicians", "Dignified digital livelihood with 0% commission, free SEO storefront, and repeat customer retention across all 5 sectors.", "🛠️ Value: 0% labor commission • Free SEO digital storefront • 100% direct clients", INDIGO),
        ("🌍 For Earth", "Diverting 62M tons of electronics and domestic appliances from landfills—one circular repair at a time.", "🌱 Value: 62M tons diverted • Slashing 80% upstream manufacturing footprint", EMERALD)
    ]
    for ititle, idesc, itag, icol in impacts:
        p_t = tf_end.add_paragraph()
        p_t.space_before = Pt(8)
        rt1 = p_t.add_run()
        rt1.text = ititle
        rt1.font.name = FONT_FAMILY
        rt1.font.size = Pt(11.5)
        rt1.font.bold = True
        rt1.font.color.rgb = icol

        p_d = tf_end.add_paragraph()
        p_d.space_before = Pt(2)
        rt2 = p_d.add_run()
        rt2.text = idesc
        rt2.font.name = FONT_FAMILY
        rt2.font.size = Pt(9)
        rt2.font.color.rgb = TEXT_BODY

        p_tag = tf_end.add_paragraph()
        p_tag.space_before = Pt(2)
        rt3 = p_tag.add_run()
        rt3.text = itag
        rt3.font.name = FONT_FAMILY
        rt3.font.size = Pt(8)
        rt3.font.bold = True
        rt3.font.color.rgb = icol

    # Bottom CTA Box on Left (Aligned with Framed Browser on Right)
    add_card(s10, Inches(0.8), Inches(4.98), Inches(5.8), Inches(1.72), CYAN, CARD_BG_ALT, radius=0.04)
    tb_cta = s10.shapes.add_textbox(Inches(1.10), Inches(5.15), Inches(5.2), Inches(1.45))
    tf_cta = tb_cta.text_frame
    tf_cta.word_wrap = True
    tf_cta.margin_left = tf_cta.margin_top = tf_cta.margin_right = tf_cta.margin_bottom = 0

    pc1 = tf_cta.paragraphs[0]
    rc1 = pc1.add_run()
    rc1.text = "JOIN THE FIXGRID REPAIR REVOLUTION"
    rc1.font.name = FONT_FAMILY
    rc1.font.size = Pt(11)
    rc1.font.bold = True
    rc1.font.color.rgb = CYAN

    pc2 = tf_cta.add_paragraph()
    pc2.space_before = Pt(3)
    rc2 = pc2.add_run()
    rc2.text = "Live Working Platform: "
    rc2.font.name = FONT_FAMILY
    rc2.font.size = Pt(11)
    rc2.font.color.rgb = TEXT_LIGHT
    rc2_link = pc2.add_run()
    rc2_link.text = "www.vytron.me"
    rc2_link.font.name = FONT_FAMILY
    rc2_link.font.size = Pt(11)
    rc2_link.font.bold = True
    rc2_link.font.color.rgb = TEXT_WHITE

    pc3 = tf_cta.add_paragraph()
    pc3.space_before = Pt(3)
    rc3 = pc3.add_run()
    rc3.text = "Built by Team Vytron • Core Architecture & Engineering"
    rc3.font.name = FONT_FAMILY
    rc3.font.size = Pt(9.5)
    rc3.font.color.rgb = TEXT_LIGHT

    pc4 = tf_cta.add_paragraph()
    pc4.space_before = Pt(3)
    rc4 = pc4.add_run()
    rc4.text = "⚡ DECENTRALIZED CIRCULAR HARDWARE INFRASTRUCTURE"
    rc4.font.name = FONT_FAMILY
    rc4.font.size = Pt(8.5)
    rc4.font.bold = True
    rc4.font.color.rgb = EMERALD

    pc5 = tf_cta.add_paragraph()
    pc5.space_before = Pt(2)
    rc5 = pc5.add_run()
    rc5.text = "All 5 Repair Sectors Live: Phones • Laptops • Appliances • Bicycles • Watches"
    rc5.font.name = FONT_FAMILY
    rc5.font.size = Pt(8)
    rc5.font.color.rgb = TEXT_MUTED

    # Right Framed Browser: Live Appliance & Refrigerator Workshop Profile
    img_web_appliance = os.path.join(assets_dir, "website_shop_detail.png")
    add_browser_frame(s10, Inches(6.9), Inches(1.8), Inches(5.633), Inches(4.9), img_web_appliance, "https://www.vytron.me/expert/coolbreeze-fridge-hvac-experts", EMERALD)

    # -------------------------------------------------------------
    # Save Presentation
    # -------------------------------------------------------------
    print(f"Saving presentation to {out_pptx} ...")
    prs.save(out_pptx)
    print("SUCCESS: Bespoke Multi-Category Framed Deck created successfully!")

if __name__ == "__main__":
    create_deck()
