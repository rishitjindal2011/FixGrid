import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_ALIGN_VERTICAL, WD_TABLE_ALIGNMENT
from docx.oxml import parse_xml, OxmlElement
from docx.oxml.ns import nsdecls, qn
import os

def create_dossier_docx(output_path):
    doc = docx.Document()

    # Base Page Setup: A4 Portrait, exactly 0.55" top/bottom, 0.65" left/right
    section = doc.sections[0]
    section.page_width = Inches(8.27)
    section.page_height = Inches(11.69)
    section.top_margin = Inches(0.55)
    section.bottom_margin = Inches(0.50)
    section.left_margin = Inches(0.65)
    section.right_margin = Inches(0.65)
    section.header_distance = Inches(0.25)
    section.footer_distance = Inches(0.25)

    # Styles & Fonts
    normal_style = doc.styles['Normal']
    normal_style.font.name = 'Plus Jakarta Sans'
    normal_style.font.size = Pt(9.2)
    normal_style.font.color.rgb = RGBColor(0x37, 0x41, 0x51) # #374151
    normal_style.paragraph_format.line_spacing = 1.35
    normal_style.paragraph_format.space_after = Pt(6)
    normal_style.paragraph_format.space_before = Pt(0)

    # Helper: Set Cell Shading
    def set_cell_bg(cell, hex_color):
        tcPr = cell._tc.get_or_add_tcPr()
        shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{hex_color}"/>')
        tcPr.append(shd)

    # Helper: Set Cell Margins (padding in dxa: 20 dxa = 1 pt)
    def set_cell_padding(cell, top_pt=6, bottom_pt=6, left_pt=8, right_pt=8):
        tcPr = cell._tc.get_or_add_tcPr()
        top_dxa = int(top_pt * 20)
        bot_dxa = int(bottom_pt * 20)
        left_dxa = int(left_pt * 20)
        right_dxa = int(right_pt * 20)
        tcMar = parse_xml(f'<w:tcMar {nsdecls("w")}><w:top w:w="{top_dxa}" w:type="dxa"/><w:bottom w:w="{bot_dxa}" w:type="dxa"/><w:left w:w="{left_dxa}" w:type="dxa"/><w:right w:w="{right_dxa}" w:type="dxa"/></w:tcMar>')
        tcPr.append(tcMar)

    # Helper: Set Cell Borders
    def set_cell_border(cell, top=None, bottom=None, left=None, right=None):
        tcPr = cell._tc.get_or_add_tcPr()
        tcBorders = parse_xml(f'<w:tcBorders {nsdecls("w")}/>')
        for side, b in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
            if b:
                val = b.get('val', 'single')
                sz = b.get('sz', '4')
                color = b.get('color', 'E5E7EB')
                b_elm = parse_xml(f'<w:{side} {nsdecls("w")} w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>')
                tcBorders.append(b_elm)
            else:
                b_elm = parse_xml(f'<w:{side} {nsdecls("w")} w:val="none"/>')
                tcBorders.append(b_elm)
        tcPr.append(tcBorders)

    # Helper: Zero Table Borders
    def clear_table_borders(table):
        tblPr = table._tbl.tblPr
        borders = parse_xml(f'<w:tblBorders {nsdecls("w")}><w:top w:val="none"/><w:left w:val="none"/><w:bottom w:val="none"/><w:right w:val="none"/><w:insideH w:val="none"/><w:insideV w:val="none"/></w:tblBorders>')
        tblPr.append(borders)

    # Helper: Add Banner
    def add_banner(title_text, tag_text):
        tbl = doc.add_table(rows=1, cols=2)
        tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
        clear_table_borders(tbl)
        tbl.rows[0].cells[0].width = Inches(5.3)
        tbl.rows[0].cells[1].width = Inches(1.67)

        set_cell_bg(tbl.rows[0].cells[0], 'F8F5EE')
        set_cell_bg(tbl.rows[0].cells[1], 'F8F5EE')
        set_cell_padding(tbl.rows[0].cells[0], top_pt=5, bottom_pt=5, left_pt=10, right_pt=4)
        set_cell_padding(tbl.rows[0].cells[1], top_pt=5, bottom_pt=5, left_pt=4, right_pt=10)

        p_left = tbl.rows[0].cells[0].paragraphs[0]
        p_left.paragraph_format.space_before = Pt(0)
        p_left.paragraph_format.space_after = Pt(0)
        run_title = p_left.add_run(title_text)
        run_title.font.name = 'Playfair Display'
        run_title.font.size = Pt(13)
        run_title.font.bold = True
        run_title.font.color.rgb = RGBColor(0x5D, 0x56, 0x43) # #5D5643

        p_right = tbl.rows[0].cells[1].paragraphs[0]
        p_right.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        p_right.paragraph_format.space_before = Pt(0)
        p_right.paragraph_format.space_after = Pt(0)
        run_tag = p_right.add_run(tag_text.upper())
        run_tag.font.name = 'Plus Jakarta Sans'
        run_tag.font.size = Pt(7.5)
        run_tag.font.bold = True
        run_tag.font.color.rgb = RGBColor(0x5D, 0x56, 0x43)
        
        # Add slight spacing after table
        sp = doc.add_paragraph()
        sp.paragraph_format.space_before = Pt(0)
        sp.paragraph_format.space_after = Pt(4)
        return tbl

    # Helper: Add Footer
    def add_page_footer(page_num):
        tbl = doc.add_table(rows=1, cols=2)
        tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
        clear_table_borders(tbl)
        tbl.rows[0].cells[0].width = Inches(4.5)
        tbl.rows[0].cells[1].width = Inches(2.47)

        # Top border only
        set_cell_border(tbl.rows[0].cells[0], top={'val': 'single', 'sz': 4, 'color': 'E2E8F0'})
        set_cell_border(tbl.rows[0].cells[1], top={'val': 'single', 'sz': 4, 'color': 'E2E8F0'})
        set_cell_padding(tbl.rows[0].cells[0], top_pt=5, bottom_pt=0, left_pt=0, right_pt=0)
        set_cell_padding(tbl.rows[0].cells[1], top_pt=5, bottom_pt=0, left_pt=0, right_pt=0)

        p1 = tbl.rows[0].cells[0].paragraphs[0]
        p1.paragraph_format.space_before = Pt(0)
        p1.paragraph_format.space_after = Pt(0)
        r1 = p1.add_run("FIXGRID ECOSYSTEM & FIXGRID PROBE")
        r1.font.name = 'Plus Jakarta Sans'
        r1.font.size = Pt(7.5)
        r1.font.bold = True
        r1.font.color.rgb = RGBColor(0x94, 0xA3, 0xB8)

        p2 = tbl.rows[0].cells[1].paragraphs[0]
        p2.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        p2.paragraph_format.space_before = Pt(0)
        p2.paragraph_format.space_after = Pt(0)
        r2 = p2.add_run(f"PAGE {page_num} OF 4")
        r2.font.name = 'Plus Jakarta Sans'
        r2.font.size = Pt(7.5)
        r2.font.bold = True
        r2.font.color.rgb = RGBColor(0x94, 0xA3, 0xB8)

    # =========================================================================
    # PAGE 1
    # =========================================================================
    # Header dots
    p_dots = doc.add_paragraph()
    p_dots.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_dots.paragraph_format.space_before = Pt(10)
    p_dots.paragraph_format.space_after = Pt(2)
    r_dots = p_dots.add_run("●   ●   ●")
    r_dots.font.size = Pt(7)
    r_dots.font.color.rgb = RGBColor(0x8B, 0x5C, 0xF6)

    # Introducing
    p_intro = doc.add_paragraph()
    p_intro.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_intro.paragraph_format.space_before = Pt(0)
    p_intro.paragraph_format.space_after = Pt(0)
    r_intro = p_intro.add_run("Introducing")
    r_intro.font.size = Pt(13)
    r_intro.font.color.rgb = RGBColor(0x4B, 0x55, 0x63)

    # FixGrid Title
    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_title.paragraph_format.space_before = Pt(0)
    p_title.paragraph_format.space_after = Pt(6)
    r_title = p_title.add_run("FixGrid")
    r_title.font.size = Pt(36)
    r_title.font.bold = True
    r_title.font.color.rgb = RGBColor(0x11, 0x18, 0x27)

    # Subtitle Badge Table
    badge_tbl = doc.add_table(rows=1, cols=3)
    badge_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    clear_table_borders(badge_tbl)
    badge_tbl.rows[0].cells[0].width = Inches(1.5)
    badge_tbl.rows[0].cells[1].width = Inches(0.2)
    badge_tbl.rows[0].cells[2].width = Inches(3.2)

    # Pill
    set_cell_bg(badge_tbl.rows[0].cells[0], '111827')
    set_cell_padding(badge_tbl.rows[0].cells[0], top_pt=3, bottom_pt=3, left_pt=8, right_pt=8)
    p_pill = badge_tbl.rows[0].cells[0].paragraphs[0]
    p_pill.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_pill.paragraph_format.space_before = Pt(0)
    p_pill.paragraph_format.space_after = Pt(0)
    r_pill = p_pill.add_run("🌐 www.vytron.me")
    r_pill.font.size = Pt(8)
    r_pill.font.bold = True
    r_pill.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)

    # Right text
    p_subtag = badge_tbl.rows[0].cells[2].paragraphs[0]
    p_subtag.paragraph_format.space_before = Pt(0)
    p_subtag.paragraph_format.space_after = Pt(0)
    r_subtag = p_subtag.add_run("FIXGRID ECOSYSTEM & FIXGRID PROBE")
    r_subtag.font.size = Pt(8.5)
    r_subtag.font.bold = True
    r_subtag.font.color.rgb = RGBColor(0x5D, 0x56, 0x43)

    sp = doc.add_paragraph()
    sp.paragraph_format.space_before = Pt(0)
    sp.paragraph_format.space_after = Pt(4)

    # Executive Summary Banner
    add_banner("Executive Summary", "OVERVIEW")

    p1 = doc.add_paragraph()
    p1.add_run("FixGrid is a revolutionary digital platform designed to bridge the gap between everyday consumers and skilled neighborhood repair professionals. Our core mission is to champion the Right-to-Repair movement and foster a circular economy by making the act of repairing items as secure, transparent, and trustworthy as purchasing new ones. We aim to transform the perception and practice of repair, creating value for consumers, empowering local artisans, and significantly reducing environmental impact.")

    p2 = doc.add_paragraph()
    p2.add_run("To make repairs truly trustworthy in the real world, FixGrid pairs this web platform with a physical invention: the ")
    r_bold = p2.add_run("FixGrid Probe™")
    r_bold.font.bold = True
    p2.add_run(". This handheld smart diagnostic tool helps neighborhood mechanics instantly detect faulty micro-components without expensive lab equipment, captures photo proof of repairs, and issues verified digital warranty seals—ensuring customers are never overcharged and broken electronics are saved from landfills.")

    # 4 Highlights Chips
    chip_tbl = doc.add_table(rows=1, cols=4)
    chip_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    clear_table_borders(chip_tbl)
    chips_data = [
        ("₹1,800", "FRUGAL TOOL BOM"),
        ("5MP Macro", "PHOTO PROOF LENS"),
        ("Dual-Loop QR", "TAMPER WARRANTY"),
        ("Zero E-Waste", "CIRCULAR PLANET")
    ]
    for i, (val, lbl) in enumerate(chips_data):
        c = chip_tbl.rows[0].cells[i]
        c.width = Inches(1.74)
        set_cell_bg(c, 'FAF9F5')
        set_cell_border(c, top={'val':'single','sz':4,'color':'EAE4D5'},
                           bottom={'val':'single','sz':4,'color':'EAE4D5'},
                           left={'val':'single','sz':4,'color':'EAE4D5'},
                           right={'val':'single','sz':4,'color':'EAE4D5'})
        set_cell_padding(c, top_pt=6, bottom_pt=6, left_pt=4, right_pt=4)
        
        p = c.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(1)
        r_v = p.add_run(val)
        r_v.font.size = Pt(11.5)
        r_v.font.bold = True
        r_v.font.color.rgb = RGBColor(0x11, 0x18, 0x27)
        
        p_l = c.add_paragraph()
        p_l.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_l.paragraph_format.space_before = Pt(0)
        p_l.paragraph_format.space_after = Pt(0)
        r_l = p_l.add_run(lbl)
        r_l.font.size = Pt(7.2)
        r_l.font.bold = True
        r_l.font.color.rgb = RGBColor(0x6B, 0x72, 0x80)

    sp2 = doc.add_paragraph()
    sp2.paragraph_format.space_before = Pt(0)
    sp2.paragraph_format.space_after = Pt(4)

    # Problem Statement Banner on Page 1
    add_banner("The Problem Statement — The Throwaway Culture & Climate Paradox", "NATIONAL CHALLENGE")

    p_sub = doc.add_paragraph()
    r_sub = p_sub.add_run("In the following section, we dissect the systemic forces driving modern e-waste accumulation, the breakdown of community artisan economies, and the urgent psychological shift required from consumers.")
    r_sub.font.italic = True
    r_sub.font.size = Pt(8.8)
    r_sub.font.color.rgb = RGBColor(0x6B, 0x72, 0x80)

    # Spacer for Page 1 bottom footer
    p_sp = doc.add_paragraph()
    p_sp.paragraph_format.space_before = Pt(130)
    p_sp.paragraph_format.space_after = Pt(0)

    add_page_footer(1)

    # =========================================================================
    # PAGE 2
    # =========================================================================
    doc.add_page_break()

    p_kicker = doc.add_paragraph()
    p_kicker.paragraph_format.space_before = Pt(0)
    p_kicker.paragraph_format.space_after = Pt(1)
    r_kicker = p_kicker.add_run("SECTION 01 • EMPIRICAL BACKGROUND")
    r_kicker.font.size = Pt(8)
    r_kicker.font.bold = True
    r_kicker.font.color.rgb = RGBColor(0x63, 0x66, 0xF1)

    p_sec2 = doc.add_paragraph()
    p_sec2.paragraph_format.space_before = Pt(0)
    p_sec2.paragraph_format.space_after = Pt(8)
    r_sec2 = p_sec2.add_run("The Problem Statement — The Throwaway Culture & Climate Paradox")
    r_sec2.font.size = Pt(15)
    r_sec2.font.bold = True
    r_sec2.font.color.rgb = RGBColor(0x11, 0x18, 0x27)

    # 2-Column Table for Problem Statement
    p2_tbl = doc.add_table(rows=1, cols=2)
    p2_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    clear_table_borders(p2_tbl)
    p2_tbl.rows[0].cells[0].width = Inches(4.05)
    p2_tbl.rows[0].cells[1].width = Inches(2.92)
    set_cell_padding(p2_tbl.rows[0].cells[0], top_pt=0, bottom_pt=0, left_pt=0, right_pt=10)
    set_cell_padding(p2_tbl.rows[0].cells[1], top_pt=0, bottom_pt=0, left_pt=8, right_pt=0)

    # Left Column
    c_left = p2_tbl.rows[0].cells[0]
    p_l1 = c_left.paragraphs[0]
    p_l1.paragraph_format.space_after = Pt(5)
    p_l1.add_run("The daily reality for most consumers is stark: when everyday electronics like a smartphone, wristwatch, laptop, or home appliance stop working, the immediate impulse is to discard them and order expensive new replacements online. This ingrained habit perpetuates a relentless cycle of consumption, financial waste, and mountains of toxic e-waste.")

    p_l2 = c_left.add_paragraph()
    p_l2.paragraph_format.space_after = Pt(5)
    p_l2.add_run("Consumers are often unaware that a skilled craftsman, potentially just 500 meters away, could repair the device for a fraction of the replacement cost. However, two deep-rooted barriers stop people from choosing repair:")

    p_l3 = c_left.add_paragraph()
    p_l3.paragraph_format.space_after = Pt(4)
    r_v1 = p_l3.add_run("1. The Trust & Visibility Void: ")
    r_v1.font.bold = True
    p_l3.add_run("Local neighborhood repairers lack a digital presence, standardized pricing, and formal warranties. Without guarantees, consumers fear being overcharged or handed sub-standard repairs.")

    p_l4 = c_left.add_paragraph()
    p_l4.paragraph_format.space_after = Pt(3)
    r_v2 = p_l4.add_run("2. The Hardware Diagnostic Void (The Root Technical Barrier):")
    r_v2.font.bold = True

    bullets_left = [
        ("Expensive Lab Equipment: ", "Modern electronics feature microscopic surface-mount components. Professional diagnostic oscilloscopes and inspection microscopes cost upwards of ₹1,00,000 to ₹1,50,000, making them completely unaffordable for roadside repairers."),
        ("Risky Guesswork: ", "Without proper tools, local mechanics are forced to guess faults through trial-and-error. Using crude multimeters can send unintended voltage spikes through delicate chips, accidentally frying otherwise repairable circuit boards."),
        ("Zero Visual Proof: ", "Microscopic cracked solder joints or burned capacitors are invisible to the customer’s naked eye. Because technicians cannot show clear evidence of what is broken, consumers remain suspicious that repairs are exaggerated or fabricated.")
    ]
    for b_title, b_desc in bullets_left:
        p_b = c_left.add_paragraph()
        p_b.paragraph_format.left_indent = Inches(0.18)
        p_b.paragraph_format.space_after = Pt(3.5)
        p_b.add_run("• ").font.bold = True
        r_bt = p_b.add_run(b_title)
        r_bt.font.bold = True
        p_b.add_run(b_desc)

    # Right Column
    c_right = p2_tbl.rows[0].cells[1]
    blocks_right = [
        ("• THE LOST VALUE:", [
            "Thousands of rupees spent buying new devices when only a ₹50 component was faulty.",
            "Skilled local mechanics lose livelihood due to lack of diagnostic tools.",
            "Usable electronics get scrapped prematurely."
        ]),
        ("• THE DIAGNOSTIC & TRUST VOID:", [
            "Lab-grade diagnostic tools cost over ₹1,00,000—out of reach for informal shops.",
            "Trial-and-error testing risks frying sensitive micro-components.",
            "Customers receive no visual proof of damage or genuine warranty."
        ]),
        ("• THE ENVIRONMENTAL CATASTROPHE:", [
            "Mountains of toxic e-waste generated daily.",
            "Huge carbon emissions from manufacturing unnecessary replacements.",
            "The biggest fix: Giving mechanics accessible diagnostic tools and giving customers transparent proof."
        ])
    ]
    for idx, (b_hdr, b_items) in enumerate(blocks_right):
        p_h = c_right.paragraphs[0] if idx == 0 else c_right.add_paragraph()
        p_h.paragraph_format.space_after = Pt(2)
        r_h = p_h.add_run(b_hdr)
        r_h.font.size = Pt(8.5)
        r_h.font.bold = True
        r_h.font.color.rgb = RGBColor(0x11, 0x18, 0x27)
        for item in b_items:
            p_it = c_right.add_paragraph()
            p_it.paragraph_format.left_indent = Inches(0.15)
            p_it.paragraph_format.space_after = Pt(2.5)
            p_it.add_run("○ ").font.size = Pt(7)
            if "The biggest fix:" in item:
                parts = item.split("The biggest fix:")
                r_fix = p_it.add_run("The biggest fix:")
                r_fix.font.bold = True
                p_it.add_run(parts[1])
            else:
                p_it.add_run(item)

    sp_sol = doc.add_paragraph()
    sp_sol.paragraph_format.space_before = Pt(0)
    sp_sol.paragraph_format.space_after = Pt(2)

    # Proposed Solution Banner
    add_banner("The Proposed Solution (FixGrid)", "ECOSYSTEM")

    p_sol1 = doc.add_paragraph()
    p_sol1.add_run("FixGrid addresses these critical issues by building a robust trust infrastructure for local repairs. FixGrid provides a 5-day platform-backed warranty on select categories, and additionally, we prominently display and record the shopkeeper's own extended warranties, fostering builder trust and accountability. Our smart escrow system ensures funds are held securely during the repair process and released only after verified customer satisfaction, eliminating the risk of non-completion or poor workmanship.")

    p_sol2 = doc.add_paragraph()
    p_sol2.add_run("For local technicians, FixGrid acts as a powerful empowerment tool. We provide instant digital storefronts, enabling them to showcase their skills and receive verified ratings from satisfied customers. Access to pro tools and resources further enhances their capabilities. To further incentivize participation, we offer a 5% completed-bill cashback rebate for shopkeepers.")

    p_sp2 = doc.add_paragraph()
    p_sp2.paragraph_format.space_before = Pt(40)
    p_sp2.paragraph_format.space_after = Pt(0)

    add_page_footer(2)

    # =========================================================================
    # PAGE 3
    # =========================================================================
    doc.add_page_break()

    # Hardware Banner
    add_banner("The Physical Invention — FixGrid Probe™ Smart Diagnostic Wand", "HARDWARE INNOVATION")

    p_hw_intro = doc.add_paragraph()
    p_hw_intro.add_run("Local neighborhood mechanics rarely possess costly oscilloscopes or inspection microscopes (which exceed ₹1,50,000). The ")
    r_hw_b = p_hw_intro.add_run("FixGrid Probe™")
    r_hw_b.font.bold = True
    p_hw_intro.add_run(" condenses lab-grade diagnostic intelligence into an intuitive pen-sized wand manufactured for under ")
    r_hw_pr = p_hw_intro.add_run("₹1,800")
    r_hw_pr.font.bold = True
    p_hw_intro.add_run(":")

    # 3 Hardware Bento Cards
    hw_tbl = doc.add_table(rows=1, cols=3)
    hw_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    clear_table_borders(hw_tbl)
    hw_data = [
        ("MICRO-TOUCH SENSING", "1D4ED8", "EFF6FF", "DBEAFE", "Instant Fault Chirp",
         "Mechanic touches probe to circuit traces. Wand tests impedance in milliseconds, beeping and glowing Green (Normal) or Red (Short/Damaged) on an OLED screen."),
        ("MAGNIFIED VISUALS", "7E22CE", "FAF5FF", "F3E8FF", "5MP Macro Photo Proof",
         "Mini 5MP macro camera with ring LEDs snaps high-res magnified photos of burned ICs or cracked joints, beaming the proof straight to customer's phone before repair."),
        ("DIGITAL PASSPORT", "047857", "ECFDF5", "D1FAE5", "Dual-Loop QR Warranty",
         "Prints a physical tamper-evident QR void seal on the chassis. Scanning reveals test readings, before/after photos, and activates a valid 30-day warranty.")
    ]
    for i, (badge, text_c, bg_c, border_c, title, desc) in enumerate(hw_data):
        c = hw_tbl.rows[0].cells[i]
        c.width = Inches(2.32)
        set_cell_bg(c, 'FAFAFA')
        set_cell_border(c, top={'val':'single','sz':4,'color':'E5E7EB'},
                           bottom={'val':'single','sz':4,'color':'E5E7EB'},
                           left={'val':'single','sz':4,'color':'E5E7EB'},
                           right={'val':'single','sz':4,'color':'E5E7EB'})
        set_cell_padding(c, top_pt=7, bottom_pt=7, left_pt=7, right_pt=7)

        # Badge
        p_b = c.paragraphs[0]
        p_b.paragraph_format.space_before = Pt(0)
        p_b.paragraph_format.space_after = Pt(2)
        r_bd = p_b.add_run(badge)
        r_bd.font.size = Pt(6.8)
        r_bd.font.bold = True
        r_bd.font.color.rgb = RGBColor(int(text_c[0:2], 16), int(text_c[2:4], 16), int(text_c[4:6], 16))

        # Title
        p_t = c.add_paragraph()
        p_t.paragraph_format.space_before = Pt(0)
        p_t.paragraph_format.space_after = Pt(2)
        r_t = p_t.add_run(title)
        r_t.font.size = Pt(9.5)
        r_t.font.bold = True
        r_t.font.color.rgb = RGBColor(0x11, 0x18, 0x27)

        # Desc
        p_d = c.add_paragraph()
        p_d.paragraph_format.space_before = Pt(0)
        p_d.paragraph_format.space_after = Pt(0)
        r_d = p_d.add_run(desc)
        r_d.font.size = Pt(8.3)
        r_d.font.color.rgb = RGBColor(0x4B, 0x55, 0x63)

    sp_hw = doc.add_paragraph()
    sp_hw.paragraph_format.space_before = Pt(0)
    sp_hw.paragraph_format.space_after = Pt(4)

    # Tech Specs Box Table
    specs_tbl = doc.add_table(rows=1, cols=1)
    specs_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    clear_table_borders(specs_tbl)
    specs_cell = specs_tbl.rows[0].cells[0]
    specs_cell.width = Inches(6.97)
    set_cell_bg(specs_cell, 'F9FAFB')
    set_cell_border(specs_cell, top={'val':'single','sz':4,'color':'E5E7EB'},
                                bottom={'val':'single','sz':4,'color':'E5E7EB'},
                                left={'val':'single','sz':4,'color':'E5E7EB'},
                                right={'val':'single','sz':4,'color':'E5E7EB'})
    set_cell_padding(specs_cell, top_pt=6, bottom_pt=6, left_pt=10, right_pt=10)

    specs = [
        ("• Scientific Sensing Principle: ", "Uses safe low-voltage in-circuit impedance & diode profiling (<3.3V at <5mA). This eliminates electrostatic discharge (ESD) risks while spotting shorted MLCC capacitors and open traces in smartphones and home appliances."),
        ("• Frugal Bill of Materials (Under ₹1,800): ", "Engineered with an ESP32 dual-core IoT chip, high-gain AD8237 instrumentation amplifier, OV2640 macro sensor, and 0.96\" OLED display—making high-tech diagnosis affordable for any roadside technician."),
        ("• Digital Cloud Backbone: ", "Built with Next.js 16 (App Router), TypeScript, Tailwind CSS, Leaflet Map Engine for neighborhood discovery, and Supabase PostgreSQL with automated escrow releases and tamper-detection triggers.")
    ]
    for idx, (sp_t, sp_d) in enumerate(specs):
        p_sp = specs_cell.paragraphs[0] if idx == 0 else specs_cell.add_paragraph()
        p_sp.paragraph_format.space_before = Pt(0)
        p_sp.paragraph_format.space_after = Pt(3) if idx < 2 else Pt(0)
        r_spt = p_sp.add_run(sp_t)
        r_spt.font.bold = True
        r_spt.font.size = Pt(8.5)
        r_spd = p_sp.add_run(sp_d)
        r_spd.font.size = Pt(8.5)

    sp_tbl = doc.add_paragraph()
    sp_tbl.paragraph_format.space_before = Pt(0)
    sp_tbl.paragraph_format.space_after = Pt(4)

    # Triple Bottom Line Banner
    add_banner("The Triple Bottom Line (Impact Analysis)", "SOCIETAL IMPACT")

    # Triple Bottom Line 3 Columns Table
    triple_tbl = doc.add_table(rows=1, cols=3)
    triple_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    clear_table_borders(triple_tbl)
    triple_data = [
        ("ECONOMIC", "(CONSUMER)", [
            ("Significant Savings: ", "Consumers achieve substantial cost reductions (60–80%) by choosing repair over purchasing new items."),
            ("Value Recovery: ", "Unlocks the inherent value in existing products and prevents wasted family savings."),
            ("Zero Fraud Risk: ", "Micro-camera visual proof and smart escrow eliminate false charges and overpricing.")
        ]),
        ("SOCIAL", "(COMMUNITY)", [
            ("Formal Identity: ", "Provides unorganized local repair heroes with a formal, respected digital presence."),
            ("Reliable Livelihoods: ", "Creates sustainable income streams and dignified work opportunities."),
            ("Community Empowerment: ", "Strengthens local economies, bridges the trust void, and fosters skilled craftsmanship.")
        ]),
        ("ECOLOGICAL", "(PLANET)", [
            ("E-Waste Reduction: ", "Combats the growing problem of toxic electronic and appliance dumping in landfills."),
            ("Carbon Footprint Mitigation: ", "Reduces industrial demand for new manufacturing, lowering global greenhouse emissions."),
            ("Sustainable Habits: ", "Promotes a culture of repair and reuse, the most effective environmental fix at the source.")
        ])
    ]
    for i, (head, sub, pts) in enumerate(triple_data):
        c = triple_tbl.rows[0].cells[i]
        c.width = Inches(2.32)
        set_cell_padding(c, top_pt=0, bottom_pt=0, left_pt=4, right_pt=4)
        
        # Header
        p_hd = c.paragraphs[0]
        p_hd.paragraph_format.space_before = Pt(0)
        p_hd.paragraph_format.space_after = Pt(0)
        r_hd = p_hd.add_run(head)
        r_hd.font.size = Pt(10)
        r_hd.font.bold = True
        r_hd.font.color.rgb = RGBColor(0x11, 0x18, 0x27)

        # Sub
        p_sb = c.add_paragraph()
        p_sb.paragraph_format.space_before = Pt(0)
        p_sb.paragraph_format.space_after = Pt(4)
        r_sb = p_sb.add_run(sub)
        r_sb.font.size = Pt(7.5)
        r_sb.font.bold = True
        r_sb.font.color.rgb = RGBColor(0x6B, 0x72, 0x80)

        for pt_t, pt_d in pts:
            p_pt = c.add_paragraph()
            p_pt.paragraph_format.left_indent = Inches(0.12)
            p_pt.paragraph_format.space_before = Pt(0)
            p_pt.paragraph_format.space_after = Pt(4)
            p_pt.add_run("• ").font.bold = True
            r_ptt = p_pt.add_run(pt_t)
            r_ptt.font.bold = True
            r_ptt.font.size = Pt(8.5)
            r_ptd = p_pt.add_run(pt_d)
            r_ptd.font.size = Pt(8.5)

    p_sp3 = doc.add_paragraph()
    p_sp3.paragraph_format.space_before = Pt(50)
    p_sp3.paragraph_format.space_after = Pt(0)

    add_page_footer(3)

    # =========================================================================
    # PAGE 4
    # =========================================================================
    doc.add_page_break()

    # Top 2 Columns Table: Market Opportunity & Revenue Streams
    p4_tbl = doc.add_table(rows=1, cols=2)
    p4_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    clear_table_borders(p4_tbl)
    p4_tbl.rows[0].cells[0].width = Inches(3.45)
    p4_tbl.rows[0].cells[1].width = Inches(3.52)
    set_cell_padding(p4_tbl.rows[0].cells[0], top_pt=0, bottom_pt=0, left_pt=0, right_pt=10)
    set_cell_padding(p4_tbl.rows[0].cells[1], top_pt=0, bottom_pt=0, left_pt=10, right_pt=0)

    # Left: Market Opportunity
    c_mkt = p4_tbl.rows[0].cells[0]
    p_mkt_h = c_mkt.paragraphs[0]
    p_mkt_h.paragraph_format.space_after = Pt(4)
    r_mh = p_mkt_h.add_run("MARKET OPPORTUNITY")
    r_mh.font.size = Pt(10)
    r_mh.font.bold = True
    r_mh.font.color.rgb = RGBColor(0x11, 0x18, 0x27)

    p_mkt1 = c_mkt.add_paragraph()
    p_mkt1.paragraph_format.space_after = Pt(5)
    p_mkt1.add_run("FixGrid taps into a massive, underserved market: ")
    r_m1 = p_mkt1.add_run("the $15.2 Billion Indian unorganized repair economy")
    r_m1.font.bold = True
    p_mkt1.add_run(". High demand, fragmented supply, and low customer trust have left this space ripe for innovation—FixGrid can bring reliability, transparency, and scalable operations to transform everyday local repairs into a dependable service experience.")

    p_mkt2 = c_mkt.add_paragraph()
    p_mkt2.paragraph_format.space_after = Pt(0)
    p_mkt2.add_run("By coupling software discovery with the FixGrid Probe™ diagnostic wand, FixGrid Probe standardizes repair diagnostic quality across tier-1, tier-2, and rural Indian clusters.")

    # Right: Revenue Streams
    c_rev = p4_tbl.rows[0].cells[1]
    p_rev_h = c_rev.paragraphs[0]
    p_rev_h.paragraph_format.space_after = Pt(3)
    r_rh = p_rev_h.add_run("REVENUE STREAMS")
    r_rh.font.size = Pt(10)
    r_rh.font.bold = True
    r_rh.font.color.rgb = RGBColor(0x11, 0x18, 0x27)

    p_rev_sub = c_rev.add_paragraph()
    p_rev_sub.paragraph_format.space_after = Pt(4)
    r_rs = p_rev_sub.add_run("Our monetization strategy is designed for sustainability and value sharing:")
    r_rs.font.size = Pt(8.6)
    r_rs.font.color.rgb = RGBColor(0x4B, 0x55, 0x63)

    rev_items = [
        ("1. Platform Take-Rate: ", "A competitive 5–8% fee on every verified booking from the customer."),
        ("2. Shop Pro SaaS & Hardware Tier: ", "An optional subscription service for advanced repair professionals at ₹999/month, offering FixGrid Probe firmware updates, warranty management, and storefront analytics."),
        ("3. Customer Care+ Subscription: ", "An optional household repair pass at ₹199/month offering consumers unlimited free FixGrid Probe™ diagnostics, zero platform booking fees, priority turnarounds, and extended 60-day warranty coverage across all home gadgets.")
    ]
    for r_title, r_desc in rev_items:
        p_ri = c_rev.add_paragraph()
        p_ri.paragraph_format.space_after = Pt(3.5)
        r_rt = p_ri.add_run(r_title)
        r_rt.font.bold = True
        r_rt.font.size = Pt(8.6)
        r_rd = p_ri.add_run(r_desc)
        r_rd.font.size = Pt(8.6)
        # Bold the prices
        if "₹999/month" in r_desc:
            pass

    sp_p4 = doc.add_paragraph()
    sp_p4.paragraph_format.space_before = Pt(0)
    sp_p4.paragraph_format.space_after = Pt(4)

    # Conclusion & Roadmap Banner
    add_banner("Conclusion & Roadmap", "FUTURE VISION")

    p_c1 = doc.add_paragraph()
    p_c1.add_run("FixGrid is more than just a platform; it is a movement towards a ")
    r_c1 = p_c1.add_run("sustainable repair economy")
    r_c1.font.bold = True
    p_c1.add_run(". We envision a future where society transitions from a mindless consumption loop to a conscious and responsible approach to product lifecycle management.")

    p_c2 = doc.add_paragraph()
    p_c2.add_run("By empowering local repair heroes with the FixGrid Probe™ handheld diagnostic wand and instilling ironclad trust through digital warranties, we are building a cleaner, more equitable, and more resourceful planet for generations to come. Our roadmap prioritizes pilot testing across 50 neighborhood repair clusters, student community repair drives, and strategic partnerships with municipal e-waste recycling boards to accelerate this vital transformation.")

    # Project FixGrid Center Badge Box
    p_badge_sp = doc.add_paragraph()
    p_badge_sp.paragraph_format.space_before = Pt(12)
    p_badge_sp.paragraph_format.space_after = Pt(0)

    proj_tbl = doc.add_table(rows=1, cols=1)
    proj_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    clear_table_borders(proj_tbl)
    proj_c = proj_tbl.rows[0].cells[0]
    proj_c.width = Inches(2.2)
    set_cell_bg(proj_c, 'F9FAFB')
    set_cell_border(proj_c, top={'val':'single','sz':4,'color':'E5E7EB'},
                            bottom={'val':'single','sz':4,'color':'E5E7EB'},
                            left={'val':'single','sz':4,'color':'E5E7EB'},
                            right={'val':'single','sz':4,'color':'E5E7EB'})
    set_cell_padding(proj_c, top_pt=6, bottom_pt=6, left_pt=12, right_pt=12)

    p_pb1 = proj_c.paragraphs[0]
    p_pb1.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_pb1.paragraph_format.space_before = Pt(0)
    p_pb1.paragraph_format.space_after = Pt(1)
    r_pb1 = p_pb1.add_run("Project FixGrid")
    r_pb1.font.size = Pt(10)
    r_pb1.font.bold = True
    r_pb1.font.color.rgb = RGBColor(0x11, 0x18, 0x27)

    p_pb2 = proj_c.add_paragraph()
    p_pb2.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_pb2.paragraph_format.space_before = Pt(0)
    p_pb2.paragraph_format.space_after = Pt(0)
    r_pb2 = p_pb2.add_run("www.vytron.me")
    r_pb2.font.size = Pt(8.8)
    r_pb2.font.bold = True
    r_pb2.font.color.rgb = RGBColor(0x63, 0x66, 0xF1)

    p_sp4 = doc.add_paragraph()
    p_sp4.paragraph_format.space_before = Pt(120)
    p_sp4.paragraph_format.space_after = Pt(0)

    add_page_footer(4)

    doc.save(output_path)
    print(f"Document saved successfully to: {output_path}")

if __name__ == '__main__':
    out = r'C:\Users\Rishit Jindal\Downloads\FixGrid_Probe_Innovation_Dossier.docx'
    create_dossier_docx(out)
