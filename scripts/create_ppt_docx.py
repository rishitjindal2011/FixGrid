import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls
import os

slides_data = [
    {
        "num": "01",
        "kicker": "HERO SHOWCASE",
        "title": "FixGrid Probe™: The Complete Ecosystem",
        "subtitle": "A Live Web Platform (fixgrid.vytron.me) & A Frugal Handheld Diagnostic Wand Championing Sustainable Repair Across All 21+ Categories",
        "points": [
            "Live Digital Platform: Search & escrow across 21+ categories (Appliances, Tech, EVs)",
            "Physical Innovation: Under ₹1,800 FixGrid Probe™ sub-junction diagnostic wand",
            "Dual-Loop QR Warranty: Tamper-evident seals with photo proof"
        ],
        "notes": "Welcome. FixGrid Probe unites a live web marketplace with a low-cost physical diagnostic wand, solving both the digital trust void and the technical hardware diagnostic barrier.",
        "image": "slide_images/slide_1.png"
    },
    {
        "num": "02",
        "kicker": "PROBLEM STATEMENT",
        "title": "Problem Statement: The Throwaway Culture & Climate Paradox",
        "subtitle": "Why 78% of repairable gadgets end up in landfills while local artisans lose their livelihoods",
        "points": [
            "The $15.2B Repair Economy is Broken: 78% of consumers discard repairable smartphones, laptops, and appliances into landfills due to fear of arbitrary pricing and technician fraud.",
            "Hardware Diagnostic Barrier: Informal mechanics lack ₹1,50,000 lab oscilloscopes. Trial-and-error multimeters fry delicate microchips, misdiagnosing ₹10 capacitors as dead boards.",
            "Mounting E-Waste Crisis: Millions of tons of toxic e-waste generated annually, leaching lead and cadmium into groundwater while new manufacturing burns carbon."
        ],
        "notes": "Every day, thousands of repairable phones and appliances are thrown away. A ₹50 blown capacitor is declared a dead motherboard because roadside mechanics lack diagnostic tools. FixGrid ends this cycle.",
        "image": "slide_images/slide_2.png"
    },
    {
        "num": "03",
        "kicker": "SOLUTION OVERVIEW",
        "title": "A Two-Pillar Solution: Digital Marketplace + Smart Hardware",
        "subtitle": "Unifying web discovery and escrow governance with hardware circuit precision",
        "points": [
            "Pillar 1 — Live Web Platform (fixgrid.vytron.me): 21+ repair categories, upfront transparent pricing, safe escrow lock, and verified shop credentials.",
            "Pillar 2 — FixGrid Probe™ Multimodal Diagnostic Tool: 0.40V sub-junction divider testing in-circuit without desoldering, 16-bit ADS1115 audio tone buzzer, and ESP32-CAM microscope.",
            "Key Innovation Metrics: ₹1,795 BOM prototype cost, 0.40V safe voltage clamp, Dual-Loop QR digital product passport, supporting Mission LiFE."
        ],
        "notes": "FixGrid Probe merges physics and digital governance. It tests in-circuit at 0.40V without desoldering, snaps macro photos of 0402 SMDs, links to a Dual-Loop QR warranty seal, and acts as a hardware trust-gate releasing escrow.",
        "image": "slide_images/slide_3.png"
    },
    {
        "num": "04",
        "kicker": "HARDWARE INNOVATION",
        "title": "FixGrid Probe™: Lab Diagnostics in a Handheld Wand",
        "subtitle": "Sub-junction in-circuit fault detection with 5MP macro photo evidence under ₹1,800 BOM",
        "points": [
            "Instant Fault Chirp (Micro-Touch Sensing): Rapid impedance testing in milliseconds; beeps and glows Green (Normal) or Red (Fault) on OLED screen without desoldering.",
            "5MP Macro Photo Proof (Magnified Visuals): Integrated macro camera with polarized ring LEDs captures 10x close-up photos of burned ICs or cracked joints, beaming undeniable proof straight to the customer's phone.",
            "Dual-Loop QR Warranty (Digital Passport): Writes a physical tamper-evident holographic QR void seal over the chassis seam, locking in a guaranteed 90-day digital warranty."
        ],
        "notes": "FixGrid Probe provides three capabilities in one wand: micro-touch fault sensing with instant beeps, macro photo proof sent to the phone, and a tamper-evident digital warranty seal.",
        "image": "slide_images/slide_4.png"
    },
    {
        "num": "05",
        "kicker": "LIVE WEB PLATFORM",
        "title": "fixgrid.vytron.me: Consumer Marketplace & Trust Engine",
        "subtitle": "Connecting device owners to verified neighborhood repair artisans with escrow safety",
        "points": [
            "21+ Repair Categories: Smartphones, laptops, home appliances, microwaves, smartwatches, and clean-tech EV battery chargers.",
            "Smart Escrow Safety: 100% upfront payment held securely; released to technician only after hardware test pass and customer sign-off.",
            "Verified Local Directory: Interactive Leaflet map engine finding skilled artisans within 500m to 5km with genuine storefront audits."
        ],
        "notes": "Our live web platform fixgrid.vytron.me is operational with interactive maps, verified expert profiles, upfront pricing, and smart escrow protection across 21 categories.",
        "image": "slide_images/slide_5.png"
    },
    {
        "num": "06",
        "kicker": "VERIFICATION WORKFLOW",
        "title": "Physical & Digital Synergy: The Dual-Loop Warranty",
        "subtitle": "How hardware diagnostics, physical seals, and cloud telemetry ensure 100% accountability",
        "points": [
            "Step 01 — FixGrid Probe Diagnostics Upload: Technician finishes repair; wand syncs passing impedance telemetry and macro photos directly to FixGrid cloud via ESP32 Wi-Fi/BLE.",
            "Step 02 — Physical Holographic Void Seal: Serialized tamper-evident QR void sticker is affixed over the device seam. If tampered with, the pattern breaks.",
            "Step 03 — Customer Smartphone Scan & Warranty Activation: Customer scans QR with any phone camera to view before/after photos and activate an ironclad 90-day warranty certificate."
        ],
        "notes": "This is where the magic happens: the FixGrid Probe hardware records the repair, generates a tamper-evident holographic QR seal, and the customer scans it on their phone to see verified before-and-after photos and activate their warranty.",
        "image": "slide_images/slide_6.png"
    },
    {
        "num": "07",
        "kicker": "IMPACT & SCALABILITY",
        "title": "Tapping the $15.2B Repair Economy",
        "subtitle": "Sustainable monetization that aligns consumer savings, artisan livelihoods, and e-waste reduction",
        "points": [
            "Triple Bottom Line: Consumers save 60–80% vs buying new; local artisans gain respected digital identity; tons of hazardous e-waste prevented at the source.",
            "Stream 1 — Platform Take-Rate: Competitive 5–8% transaction fee on every escrow-verified repair booking.",
            "Stream 2 — Customer Care+ Pass: ₹199/month household subscription with free FixGrid Probe diagnostics & zero booking fees.",
            "Stream 3 — Shop Pro SaaS: ₹999/month repair shop tier for firmware updates, warranty management, and digital CRM.",
            "Stream 4 — B2B Spare Parts: Curated marketplace logistics for verified authentic micro-components."
        ],
        "notes": "Our model creates value for everyone: consumers save money, informal mechanics earn reliable livelihoods, and FixGrid monetizes through transaction fees and subscriptions.",
        "image": "slide_images/slide_7.png"
    },
    {
        "num": "08",
        "kicker": "THE FUTURE ROADMAP",
        "title": "A Movement Towards a Sustainable Repair Economy",
        "subtitle": "Phased scaling from neighborhood repair clusters to nationwide municipal partnerships",
        "points": [
            "Phase 1 (Months 1–6) — Pilot Repair Clusters: Deploy 50 FixGrid Probe units across Mumbai electronics markets; validate web escrow with 1,000+ customer repairs.",
            "Phase 2 (Months 7–12) — Community Drives: Partner with schools and colleges for zero-e-waste community repair clinics; expand Care+ subscription.",
            "Phase 3 (Year 2+) — Municipal Scaling: Integrate with municipal e-waste recycling boards for certified gadget triage; scale frugal hardware tool manufacturing nationwide.",
            "Unified Vision: A world where repair is as trusted, easy, and respected as buying new."
        ],
        "notes": "Thank you. FixGrid and FixGrid Probe demonstrate that with frugal engineering and digital trust, we can empower local artisans, save consumers money, and protect our environment from toxic e-waste.",
        "image": "slide_images/slide_8.png"
    }
]

def build_widescreen_deck_docx(out_path):
    doc = docx.Document()
    sec = doc.sections[0]
    # Standard 16:9 Widescreen Landscape (PowerPoint standard: 13.333" x 7.5")
    sec.page_width = Inches(13.333)
    sec.page_height = Inches(7.5)
    sec.top_margin = Inches(0.2)
    sec.bottom_margin = Inches(0.2)
    sec.left_margin = Inches(0.2)
    sec.right_margin = Inches(0.2)

    for idx, slide in enumerate(slides_data):
        img_path = os.path.abspath(slide['image'])
        if os.path.exists(img_path):
            p = doc.add_paragraph()
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p.paragraph_format.space_before = Pt(0)
            p.paragraph_format.space_after = Pt(0)
            p.paragraph_format.line_spacing = Pt(1)
            r = p.add_run()
            # 11.5" wide -> 6.47" high, leaves 1.03" safety on 7.5" page
            r.add_picture(img_path, width=Inches(11.5))
            
            if idx < len(slides_data) - 1:
                p.add_run().add_break(docx.enum.text.WD_BREAK.PAGE)

    doc.save(out_path)
    print(f"Widescreen Deck DOCX saved to: {out_path}")

def build_executive_dossier_docx(out_path):
    doc = docx.Document()
    sec = doc.sections[0]
    # Standard A4 Portrait for Executive Handout
    sec.page_width = Inches(8.27)
    sec.page_height = Inches(11.69)
    sec.top_margin = Inches(0.5)
    sec.bottom_margin = Inches(0.5)
    sec.left_margin = Inches(0.6)
    sec.right_margin = Inches(0.6)

    # Styles
    normal = doc.styles['Normal']
    normal.font.name = 'Plus Jakarta Sans'
    normal.font.size = Pt(9.5)
    normal.font.color.rgb = RGBColor(0x37, 0x41, 0x51)
    normal.paragraph_format.line_spacing = 1.35
    normal.paragraph_format.space_after = Pt(4)

    # Helpers
    def set_cell_bg(cell, hex_color):
        tcPr = cell._tc.get_or_add_tcPr()
        shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{hex_color}"/>')
        tcPr.append(shd)

    def set_cell_padding(cell, top_pt=5, bottom_pt=5, left_pt=8, right_pt=8):
        tcPr = cell._tc.get_or_add_tcPr()
        top_dxa = int(top_pt * 20)
        bot_dxa = int(bottom_pt * 20)
        left_dxa = int(left_pt * 20)
        right_dxa = int(right_pt * 20)
        tcMar = parse_xml(f'<w:tcMar {nsdecls("w")}><w:top w:w="{top_dxa}" w:type="dxa"/><w:bottom w:w="{bot_dxa}" w:type="dxa"/><w:left w:w="{left_dxa}" w:type="dxa"/><w:right w:w="{right_dxa}" w:type="dxa"/></w:tcMar>')
        tcPr.append(tcMar)

    def clear_table_borders(table):
        tblPr = table._tbl.tblPr
        borders = parse_xml(f'<w:tblBorders {nsdecls("w")}><w:top w:val="none"/><w:left w:val="none"/><w:bottom w:val="none"/><w:right w:val="none"/><w:insideH w:val="none"/><w:insideV w:val="none"/></w:tblBorders>')
        tblPr.append(borders)

    for idx, slide in enumerate(slides_data):
        if idx > 0:
            doc.add_page_break()

        # Top Header Bar
        hdr_tbl = doc.add_table(rows=1, cols=2)
        hdr_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
        clear_table_borders(hdr_tbl)
        hdr_tbl.rows[0].cells[0].width = Inches(5.5)
        hdr_tbl.rows[0].cells[1].width = Inches(1.57)
        set_cell_padding(hdr_tbl.rows[0].cells[0], 0, 2, 0, 0)
        set_cell_padding(hdr_tbl.rows[0].cells[1], 0, 2, 0, 0)

        p_k = hdr_tbl.rows[0].cells[0].paragraphs[0]
        p_k.paragraph_format.space_before = Pt(0)
        p_k.paragraph_format.space_after = Pt(0)
        r_k = p_k.add_run(f"// {slide['num']} • {slide['kicker']}")
        r_k.font.size = Pt(8.5)
        r_k.font.bold = True
        r_k.font.color.rgb = RGBColor(0x02, 0x84, 0xC7) # Cyan Accent

        p_num = hdr_tbl.rows[0].cells[1].paragraphs[0]
        p_num.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        p_num.paragraph_format.space_before = Pt(0)
        p_num.paragraph_format.space_after = Pt(0)
        r_num = p_num.add_run(f"[ {slide['num']} / 08 ]")
        r_num.font.size = Pt(8.5)
        r_num.font.bold = True
        r_num.font.color.rgb = RGBColor(0x64, 0x74, 0x8B)

        # Slide Main Title
        p_t = doc.add_paragraph()
        p_t.paragraph_format.space_before = Pt(2)
        p_t.paragraph_format.space_after = Pt(2)
        r_t = p_t.add_run(slide['title'])
        r_t.font.name = 'Cambria'
        r_t.font.size = Pt(16)
        r_t.font.bold = True
        r_t.font.color.rgb = RGBColor(0x11, 0x18, 0x27)

        # Subtitle
        p_sub = doc.add_paragraph()
        p_sub.paragraph_format.space_before = Pt(0)
        p_sub.paragraph_format.space_after = Pt(8)
        r_sub = p_sub.add_run(slide['subtitle'])
        r_sub.font.size = Pt(9.5)
        r_sub.font.color.rgb = RGBColor(0x64, 0x74, 0x8B)

        # Slide High-Res Visual Preview
        img_path = os.path.abspath(slide['image'])
        if os.path.exists(img_path):
            p_img = doc.add_paragraph()
            p_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p_img.paragraph_format.space_before = Pt(0)
            p_img.paragraph_format.space_after = Pt(8)
            r_img = p_img.add_run()
            # 6.8" wide preview fits nicely on A4 portrait
            r_img.add_picture(img_path, width=Inches(6.8))

        # Key Content Breakdown Card
        box_tbl = doc.add_table(rows=1, cols=1)
        box_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
        clear_table_borders(box_tbl)
        c_box = box_tbl.rows[0].cells[0]
        c_box.width = Inches(7.07)
        set_cell_bg(c_box, 'F8FAFC')
        set_cell_padding(c_box, top_pt=8, bottom_pt=8, left_pt=12, right_pt=12)

        p_bh = c_box.paragraphs[0]
        p_bh.paragraph_format.space_before = Pt(0)
        p_bh.paragraph_format.space_after = Pt(4)
        r_bh = p_bh.add_run("KEY TAKEAWAYS & SLIDE CONTENT")
        r_bh.font.size = Pt(8)
        r_bh.font.bold = True
        r_bh.font.color.rgb = RGBColor(0x02, 0x84, 0xC7)

        for pt_text in slide['points']:
            p_pt = c_box.add_paragraph()
            p_pt.paragraph_format.left_indent = Inches(0.15)
            p_pt.paragraph_format.space_before = Pt(0)
            p_pt.paragraph_format.space_after = Pt(3)
            p_pt.add_run("✓ ").font.bold = True
            r_pt = p_pt.add_run(pt_text)
            r_pt.font.size = Pt(9)

        # Speaker Script / Notes Box
        sp_notes = doc.add_paragraph()
        sp_notes.paragraph_format.space_before = Pt(6)
        sp_notes.paragraph_format.space_after = Pt(2)

        notes_tbl = doc.add_table(rows=1, cols=1)
        notes_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
        clear_table_borders(notes_tbl)
        c_notes = notes_tbl.rows[0].cells[0]
        c_notes.width = Inches(7.07)
        set_cell_bg(c_notes, 'FEF3C7') # Subtle Amber Notes Container
        set_cell_padding(c_notes, top_pt=6, bottom_pt=6, left_pt=10, right_pt=10)

        p_nh = c_notes.paragraphs[0]
        p_nh.paragraph_format.space_before = Pt(0)
        p_nh.paragraph_format.space_after = Pt(2)
        r_nh = p_nh.add_run("🎙️ PRESENTER SCRIPT & TALKING POINTS")
        r_nh.font.size = Pt(7.8)
        r_nh.font.bold = True
        r_nh.font.color.rgb = RGBColor(0x92, 0x40, 0x0E)

        p_nt = c_notes.add_paragraph()
        p_nt.paragraph_format.space_before = Pt(0)
        p_nt.paragraph_format.space_after = Pt(0)
        r_nt = p_nt.add_run(f'"{slide["notes"]}"')
        r_nt.font.size = Pt(8.8)
        r_nt.font.italic = True
        r_nt.font.color.rgb = RGBColor(0x78, 0x35, 0x0F)

        # Bottom Page Footer
        sp_f = doc.add_paragraph()
        sp_f.paragraph_format.space_before = Pt(10)
        sp_f.paragraph_format.space_after = Pt(0)

        f_tbl = doc.add_table(rows=1, cols=2)
        f_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
        clear_table_borders(f_tbl)
        f_tbl.rows[0].cells[0].width = Inches(4.5)
        f_tbl.rows[0].cells[1].width = Inches(2.57)
        set_cell_padding(f_tbl.rows[0].cells[0], 4, 0, 0, 0)
        set_cell_padding(f_tbl.rows[0].cells[1], 4, 0, 0, 0)

        pf1 = f_tbl.rows[0].cells[0].paragraphs[0]
        pf1.paragraph_format.space_before = Pt(0)
        pf1.paragraph_format.space_after = Pt(0)
        rf1 = pf1.add_run("FixGrid Ecosystem • fixgrid.vytron.me")
        rf1.font.size = Pt(7.5)
        rf1.font.bold = True
        rf1.font.color.rgb = RGBColor(0x94, 0xA3, 0xB8)

        pf2 = f_tbl.rows[0].cells[1].paragraphs[0]
        pf2.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        pf2.paragraph_format.space_before = Pt(0)
        pf2.paragraph_format.space_after = Pt(0)
        rf2 = pf2.add_run(f"SLIDE {slide['num']} OF 08")
        rf2.font.size = Pt(7.5)
        rf2.font.bold = True
        rf2.font.color.rgb = RGBColor(0x94, 0xA3, 0xB8)

    doc.save(out_path)
    print(f"Executive Dossier DOCX saved to: {out_path}")

if __name__ == '__main__':
    downloads = r'C:\Users\Rishit Jindal\Downloads'
    out_deck = os.path.join(downloads, 'FixGrid_Presentation_Deck.docx')
    out_exec = os.path.join(downloads, 'FixGrid_Presentation_Executive_Brief.docx')

    build_widescreen_deck_docx(out_deck)
    build_executive_dossier_docx(out_exec)

    # Also save copies in the current project root
    build_widescreen_deck_docx('FixGrid_Presentation_Deck.docx')
    build_executive_dossier_docx('FixGrid_Presentation_Executive_Brief.docx')
