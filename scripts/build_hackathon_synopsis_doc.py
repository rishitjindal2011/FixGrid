import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_ALIGN_VERTICAL, WD_TABLE_ALIGNMENT
from docx.oxml import parse_xml, OxmlElement
from docx.oxml.ns import nsdecls, qn
import os
import win32com.client

def create_synopsis_doc():
    doc = docx.Document()

    # A4 Page Setup (margins 0.65")
    section = doc.sections[0]
    section.page_width = Inches(8.27)
    section.page_height = Inches(11.69)
    section.top_margin = Inches(0.65)
    section.bottom_margin = Inches(0.60)
    section.left_margin = Inches(0.70)
    section.right_margin = Inches(0.70)

    # Styles
    normal_style = doc.styles['Normal']
    normal_style.font.name = 'Segoe UI'
    normal_style.font.size = Pt(9.5)
    normal_style.font.color.rgb = RGBColor(0x33, 0x41, 0x55) # Slate 700
    normal_style.paragraph_format.line_spacing = 1.3
    normal_style.paragraph_format.space_after = Pt(6)

    def set_cell_bg(cell, hex_color):
        tcPr = cell._tc.get_or_add_tcPr()
        shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{hex_color}"/>')
        tcPr.append(shd)

    def set_cell_padding(cell, top_pt=6, bottom_pt=6, left_pt=8, right_pt=8):
        tcPr = cell._tc.get_or_add_tcPr()
        top_dxa = int(top_pt * 20)
        bot_dxa = int(bottom_pt * 20)
        left_dxa = int(left_pt * 20)
        right_dxa = int(right_pt * 20)
        tcMar = parse_xml(f'<w:tcMar {nsdecls("w")}><w:top w:w="{top_dxa}" w:type="dxa"/><w:bottom w:w="{bot_dxa}" w:type="dxa"/><w:left w:w="{left_dxa}" w:type="dxa"/><w:right w:w="{right_dxa}" w:type="dxa"/></w:tcMar>')
        tcPr.append(tcMar)

    def set_cell_border(cell, top="none", bottom="none", left="none", right="none", color="E2E8F0", sz="4"):
        tcPr = cell._tc.get_or_add_tcPr()
        borders = parse_xml(f'''
            <w:tcBorders {nsdecls("w")}>
                <w:top w:val="{top}" w:sz="{sz}" w:space="0" w:color="{color}"/>
                <w:left w:val="{left}" w:sz="{sz}" w:space="0" w:color="{color}"/>
                <w:bottom w:val="{bottom}" w:sz="{sz}" w:space="0" w:color="{color}"/>
                <w:right w:val="{right}" w:sz="{sz}" w:space="0" w:color="{color}"/>
            </w:tcBorders>
        ''')
        tcPr.append(borders)

    def add_section_header(title, kicker=None):
        if kicker:
            p_k = doc.add_paragraph()
            p_k.paragraph_format.space_before = Pt(12)
            p_k.paragraph_format.space_after = Pt(2)
            run_k = p_k.add_run(kicker.upper())
            run_k.font.size = Pt(8.5)
            run_k.font.bold = True
            run_k.font.color.rgb = RGBColor(0x02, 0x84, 0xC7) # Sky 600

        p = doc.add_paragraph()
        if not kicker:
            p.paragraph_format.space_before = Pt(14)
        else:
            p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(6)
        r = p.add_run(title)
        r.font.size = Pt(14)
        r.font.bold = True
        r.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A) # Slate 900

    # Header Card
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    c = tbl.cell(0, 0)
    c.width = Inches(6.87)
    set_cell_bg(c, "0F172A") # Slate 900
    set_cell_padding(c, top_pt=14, bottom_pt=14, left_pt=16, right_pt=16)

    p_h1 = c.paragraphs[0]
    p_h1.paragraph_format.space_after = Pt(3)
    r_tag = p_h1.add_run("HACKATHON EXECUTIVE SYNOPSIS  •  CIRCULAR ECONOMY & FINTECH")
    r_tag.font.size = Pt(8.5)
    r_tag.font.bold = True
    r_tag.font.color.rgb = RGBColor(0x38, 0xBD, 0xF8) # Cyan

    p_h2 = c.add_paragraph()
    p_h2.paragraph_format.space_after = Pt(4)
    r_main = p_h2.add_run("FixGrid: Decentralized Trust & Warranty Infrastructure")
    r_main.font.size = Pt(20)
    r_main.font.bold = True
    r_main.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)

    p_h3 = c.add_paragraph()
    p_h3.paragraph_format.space_after = Pt(8)
    r_sub = p_h3.add_run("Rewiring the $15.2B Local Repair Economy Through Milestone Smart Escrow & Platform Guarantees")
    r_sub.font.size = Pt(10.5)
    r_sub.font.color.rgb = RGBColor(0x94, 0xA3, 0xB8)

    p_h4 = c.add_paragraph()
    p_h4.paragraph_format.space_after = Pt(0)
    r_url_tag = p_h4.add_run("Live Production Platform: ")
    r_url_tag.font.size = Pt(9.5)
    r_url_tag.font.color.rgb = RGBColor(0xCB, 0xD5, 0xE1)
    r_url = p_h4.add_run("www.vytron.me")
    r_url.font.size = Pt(10)
    r_url.font.bold = True
    r_url.font.color.rgb = RGBColor(0x38, 0xBD, 0xF8)

    # 1. Executive Summary Box
    add_section_header("1. Executive Summary", "Overview")
    tbl_exec = doc.add_table(rows=1, cols=1)
    tbl_exec.alignment = WD_TABLE_ALIGNMENT.CENTER
    c_exec = tbl_exec.cell(0, 0)
    c_exec.width = Inches(6.87)
    set_cell_bg(c_exec, "F8FAFC")
    set_cell_border(c_exec, left="single", color="0284C7", sz="16") # Left thick cyan border
    set_cell_padding(c_exec, top_pt=8, bottom_pt=8, left_pt=12, right_pt=12)

    p_e = c_exec.paragraphs[0]
    p_e.paragraph_format.space_after = Pt(4)
    p_e.add_run("Every year, millions of smartphones, home appliances, wearables, and electronics are discarded prematurely. Consumers spend hundreds of billions of rupees replacing devices that could be repaired for less than 15% of replacement cost. This throwaway cycle is not driven by laziness—it is fueled by an acute ").font.color.rgb = RGBColor(0x1E, 0x29, 0x3B)
    r_bold1 = p_e.add_run("Trust and Information Asymmetry")
    r_bold1.font.bold = True
    p_e.add_run(". Consumers fear arbitrary price-gouging, counterfeit components, component theft, and zero post-repair warranty. Meanwhile, skilled neighborhood technicians—the true frontline artisans of the circular economy—remain digitally invisible and economically vulnerable.")

    p_e2 = c_exec.add_paragraph()
    p_e2.paragraph_format.space_after = Pt(0)
    p_e2.add_run("FixGrid is a full-stack digital platform that bridges this void. By integrating a ").font.color.rgb = RGBColor(0x1E, 0x29, 0x3B)
    r_bold2 = p_e2.add_run("Milestone-Based Smart Escrow Engine, a Platform-Backed 5-Day Guarantee (FixGrid Shield), and Verified Digital Storefronts with Transparent Rate Cards")
    r_bold2.font.bold = True
    p_e2.add_run(", FixGrid transforms fragmented street repairs into an accountable, standardized service experience. Crucially, FixGrid is not a concept: it is fully functional and live in production at ")
    r_live = p_e2.add_run("www.vytron.me")
    r_live.font.bold = True
    r_live.font.color.rgb = RGBColor(0x02, 0x84, 0xC7)
    p_e2.add_run(".")

    # 2. Problem Statement
    add_section_header("2. Problem Statement: The Broken Economics of Repair", "The Crisis")
    p_prob = doc.add_paragraph()
    p_prob.add_run("The modern repair market suffers from the classic ")
    p_prob.add_run("Akerlof 'Market for Lemons'").font.bold = True
    p_prob.add_run(" problem. In the absence of institutional verification, bad actors drive honest craftsmen out of business, forcing consumers into high-waste consumption loops:")

    tbl_prob = doc.add_table(rows=1, cols=3)
    tbl_prob.alignment = WD_TABLE_ALIGNMENT.CENTER
    prob_cards = [
        ("The Consumer Trust Void", "84%", "Fear arbitrary pricing & fake parts", "Consumers avoid local repair due to fear of exorbitant quotes, component swapping, and zero post-repair recourse.", "FEF2F2", "DC2626"),
        ("The Artisan Visibility Crisis", "92%", "Lack digital presence or storefront", "Skilled neighborhood technicians operate < 500m away, but lack web presence, verified reputation ledgers, or formal booking tools.", "FFFBEB", "D97706"),
        ("The Climate & E-Waste Catastrophe", "1.71M+", "Tonnes of e-waste in India yearly", "India is the #3 global e-waste producer. Discarding phones and appliances wastes up to 80% of embodied manufacturing carbon.", "F0FDF4", "059669")
    ]
    for idx, (title, stat, stat_lbl, desc, bg, accent) in enumerate(prob_cards):
        c = tbl_prob.cell(0, idx)
        c.width = Inches(2.29)
        set_cell_bg(c, bg)
        set_cell_border(c, top="single", bottom="single", left="single", right="single", color=accent, sz="6")
        set_cell_padding(c, top_pt=8, bottom_pt=8, left_pt=8, right_pt=8)

        p1 = c.paragraphs[0]
        p1.paragraph_format.space_after = Pt(2)
        r1 = p1.add_run(title)
        r1.font.size = Pt(9.5)
        r1.font.bold = True

        p2 = c.add_paragraph()
        p2.paragraph_format.space_after = Pt(1)
        r2 = p2.add_run(stat)
        r2.font.size = Pt(16)
        r2.font.bold = True
        r2.font.color.rgb = RGBColor.from_string(accent)

        p3 = c.add_paragraph()
        p3.paragraph_format.space_after = Pt(4)
        r3 = p3.add_run(stat_lbl)
        r3.font.size = Pt(8)
        r3.font.color.rgb = RGBColor(0x64, 0x74, 0x8B)

        p4 = c.add_paragraph()
        p4.paragraph_format.space_after = Pt(0)
        r4 = p4.add_run(desc)
        r4.font.size = Pt(8.5)
        r4.font.color.rgb = RGBColor(0x33, 0x41, 0x55)

    # 3. Proposed Solution
    add_section_header("3. The Solution: FixGrid Trust Infrastructure", "Product Architecture")
    p_sol = doc.add_paragraph()
    p_sol.add_run("FixGrid systematically eliminates risk at each stage of the repair lifecycle through four software pillars:")

    tbl_sol = doc.add_table(rows=4, cols=2)
    tbl_sol.alignment = WD_TABLE_ALIGNMENT.CENTER
    sol_rows = [
        ("Pillar 1: Geospatial Discovery & Digital Identity", "Custom Leaflet map engine mapping verified local repairers with transparent diagnostic rate cards, customer ratings, and photo portfolios. Consumers find trusted nearby help in seconds."),
        ("Pillar 2: Milestone-Based Smart Escrow", "Customer payments are secured in the FixGrid Escrow Vault. Funds are NEVER released prematurely; disbursal occurs only after the customer inspects the repair and provides a verified completion OTP."),
        ("Pillar 3: FixGrid Shield Guarantee", "Universal 5-day platform-backed warranty on workmanship, backed by permanent digital records of merchant extended warranties (30/90/180 days) and an impartial dispute resolution protocol."),
        ("Pillar 4: Shop Pro SaaS & 5% Cashback Rebate", "A 5% completed-bill cashback rebate incentivizes offline shops to log all walk-ins on FixGrid. Optional ₹999/mo SaaS tier adds cloud inventory, job ticketing, and automated WhatsApp repair progress alerts.")
    ]
    for idx, (title, desc) in enumerate(sol_rows):
        c_t = tbl_sol.cell(idx, 0)
        c_t.width = Inches(2.3)
        set_cell_bg(c_t, "F1F5F9")
        set_cell_border(c_t, top="single", bottom="single", left="single", right="single", color="CBD5E1", sz="4")
        set_cell_padding(c_t, top_pt=6, bottom_pt=6, left_pt=8, right_pt=8)
        p1 = c_t.paragraphs[0]
        p1.paragraph_format.space_after = Pt(0)
        r1 = p1.add_run(title)
        r1.font.size = Pt(9)
        r1.font.bold = True
        r1.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)

        c_d = tbl_sol.cell(idx, 1)
        c_d.width = Inches(4.57)
        set_cell_bg(c_d, "FFFFFF")
        set_cell_border(c_d, top="single", bottom="single", left="single", right="single", color="CBD5E1", sz="4")
        set_cell_padding(c_d, top_pt=6, bottom_pt=6, left_pt=8, right_pt=8)
        p2 = c_d.paragraphs[0]
        p2.paragraph_format.space_after = Pt(0)
        r2 = p2.add_run(desc)
        r2.font.size = Pt(8.8)
        r2.font.color.rgb = RGBColor(0x33, 0x41, 0x55)

    # 4. Technical Stack & Engineering
    add_section_header("4. Technical Innovation & System Specifications", "Under The Hood")
    p_tech = doc.add_paragraph()
    p_tech.add_run("FixGrid is engineered for low latency, hardened data isolation, and programmatic organic growth:")

    tbl_tech = doc.add_table(rows=3, cols=2)
    tbl_tech.alignment = WD_TABLE_ALIGNMENT.CENTER
    tech_data = [
        ("Frontend & Geospatial Engine", "Next.js 16 (App Router) + TypeScript + Tailwind CSS. Integrates a lightweight Leaflet/OpenStreetMap geospatial query engine for sub-second proximity calculations without high third-party API costs."),
        ("Backend, Database & Security", "Supabase (PostgreSQL) with Row Level Security (RLS) enforcing multi-tenant customer and merchant data isolation. Database Triggers automate escrow state transitions, audit logging, and OTP verification."),
        ("Autonomous Headless SEO CMS (/seo-admin)", "Programmatic landing page synthesis engine generating thousands of localized, long-tail keyword URLs (e.g. 'iPhone screen replacement in [Locality]') driving zero-CAC organic leads directly to local artisans.")
    ]
    for idx, (comp, details) in enumerate(tech_data):
        c1 = tbl_tech.cell(idx, 0)
        c1.width = Inches(2.3)
        set_cell_bg(c1, "F8FAFC")
        set_cell_border(c1, top="single", bottom="single", left="single", right="single", color="E2E8F0", sz="4")
        set_cell_padding(c1, top_pt=6, bottom_pt=6, left_pt=8, right_pt=8)
        p1 = c1.paragraphs[0]
        p1.paragraph_format.space_after = Pt(0)
        r1 = p1.add_run(comp)
        r1.font.size = Pt(9)
        r1.font.bold = True
        r1.font.color.rgb = RGBColor(0x02, 0x84, 0xC7)

        c2 = tbl_tech.cell(idx, 1)
        c2.width = Inches(4.57)
        set_cell_bg(c2, "FFFFFF")
        set_cell_border(c2, top="single", bottom="single", left="single", right="single", color="E2E8F0", sz="4")
        set_cell_padding(c2, top_pt=6, bottom_pt=6, left_pt=8, right_pt=8)
        p2 = c2.paragraphs[0]
        p2.paragraph_format.space_after = Pt(0)
        r2 = p2.add_run(details)
        r2.font.size = Pt(8.8)
        r2.font.color.rgb = RGBColor(0x33, 0x41, 0x55)

    # 5. Market Opportunity & Monetization
    add_section_header("5. Market Opportunity & Revenue Model", "Business Economics")
    p_mkt = doc.add_paragraph()
    p_mkt.add_run("FixGrid targets the ")
    p_mkt.add_run("$15.2 Billion Indian unorganized repair economy").font.bold = True
    p_mkt.add_run(", expected to surge past $25 Billion with national Right-to-Repair mandates. Monetization is achieved via three balanced streams:")

    tbl_rev = doc.add_table(rows=3, cols=2)
    tbl_rev.alignment = WD_TABLE_ALIGNMENT.CENTER
    rev_data = [
        ("Platform Take-Rate (5% – 8%)", "Transaction commission on completed escrow bookings. Covers payment processing, dispute arbitration, and FixGrid Shield warranty insurance."),
        ("Shop Pro SaaS (₹999 / month)", "Optional cloud subscription for busy repair workshops: multi-technician ticketing, automated WhatsApp repair updates, cloud inventory, and priority search badge."),
        ("B2B Certified Spare Parts", "Wholesale supply-chain distribution (parts.vytron.me) connecting member shops to verified OEM-equivalent parts at 10%–18% gross margin.")
    ]
    for idx, (title, desc) in enumerate(rev_data):
        c1 = tbl_rev.cell(idx, 0)
        c1.width = Inches(2.3)
        set_cell_bg(c1, "F8FAFC")
        set_cell_border(c1, top="single", bottom="single", left="single", right="single", color="E2E8F0", sz="4")
        set_cell_padding(c1, top_pt=6, bottom_pt=6, left_pt=8, right_pt=8)
        p1 = c1.paragraphs[0]
        p1.paragraph_format.space_after = Pt(0)
        r1 = p1.add_run(title)
        r1.font.size = Pt(9)
        r1.font.bold = True

        c2 = tbl_rev.cell(idx, 1)
        c2.width = Inches(4.57)
        set_cell_bg(c2, "FFFFFF")
        set_cell_border(c2, top="single", bottom="single", left="single", right="single", color="E2E8F0", sz="4")
        set_cell_padding(c2, top_pt=6, bottom_pt=6, left_pt=8, right_pt=8)
        p2 = c2.paragraphs[0]
        p2.paragraph_format.space_after = Pt(0)
        r2 = p2.add_run(desc)
        r2.font.size = Pt(8.8)

    # 6. Triple Bottom Line Impact
    add_section_header("6. Triple Bottom Line Impact Analysis (ESG)", "Measurable Impact")
    tbl_imp = doc.add_table(rows=3, cols=3)
    tbl_imp.alignment = WD_TABLE_ALIGNMENT.CENTER
    imp_data = [
        ("ECONOMIC (Consumer)", "60% – 80% Savings", "Saves ~₹14,000 annually per urban household vs. buying new replacements. Extends gadget life by 2.5 to 4 years."),
        ("SOCIAL (Artisans)", "+35% – 45% Income", "Brings informal neighborhood repair heroes into the formal digital economy. Portable rating ledger unlocks microcredit."),
        ("ECOLOGICAL (Planet)", "72 kg CO₂e Saved", "Per smartphone repaired; diverts toxic e-waste from informal burning; directly advances UN SDG 12 & SDG 13.")
    ]
    for idx, (dim, stat, desc) in enumerate(imp_data):
        c1 = tbl_imp.cell(idx, 0)
        c1.width = Inches(2.0)
        set_cell_bg(c1, "F1F5F9")
        set_cell_border(c1, top="single", bottom="single", left="single", right="single", color="CBD5E1", sz="4")
        set_cell_padding(c1, top_pt=6, bottom_pt=6, left_pt=8, right_pt=8)
        p1 = c1.paragraphs[0]
        p1.paragraph_format.space_after = Pt(0)
        r1 = p1.add_run(dim)
        r1.font.size = Pt(8.5)
        r1.font.bold = True

        c2 = tbl_imp.cell(idx, 1)
        c2.width = Inches(1.8)
        set_cell_bg(c2, "FFFFFF")
        set_cell_border(c2, top="single", bottom="single", left="single", right="single", color="CBD5E1", sz="4")
        set_cell_padding(c2, top_pt=6, bottom_pt=6, left_pt=8, right_pt=8)
        p2 = c2.paragraphs[0]
        p2.paragraph_format.space_after = Pt(0)
        r2 = p2.add_run(stat)
        r2.font.size = Pt(10.5)
        r2.font.bold = True
        r2.font.color.rgb = RGBColor(0x02, 0x84, 0xC7)

        c3 = tbl_imp.cell(idx, 2)
        c3.width = Inches(3.07)
        set_cell_bg(c3, "FFFFFF")
        set_cell_border(c3, top="single", bottom="single", left="single", right="single", color="CBD5E1", sz="4")
        set_cell_padding(c3, top_pt=6, bottom_pt=6, left_pt=8, right_pt=8)
        p3 = c3.paragraphs[0]
        p3.paragraph_format.space_after = Pt(0)
        r3 = p3.add_run(desc)
        r3.font.size = Pt(8.5)

    # 7. Hackathon Evaluation Alignment & Live Demo
    add_section_header("7. Live Production Verification & Hackathon Edge", "Traction")
    tbl_live = doc.add_table(rows=1, cols=1)
    tbl_live.alignment = WD_TABLE_ALIGNMENT.CENTER
    c_live = tbl_live.cell(0, 0)
    c_live.width = Inches(6.87)
    set_cell_bg(c_live, "0F172A")
    set_cell_padding(c_live, top_pt=10, bottom_pt=10, left_pt=14, right_pt=14)

    p_l1 = c_live.paragraphs[0]
    p_l1.paragraph_format.space_after = Pt(3)
    r_l1 = p_l1.add_run("WHY FIXGRID WINS: WORKING PRODUCTION SOFTWARE")
    r_l1.font.size = Pt(9)
    r_l1.font.bold = True
    r_l1.font.color.rgb = RGBColor(0x34, 0xD3, 0x99) # Emerald

    p_l2 = c_live.add_paragraph()
    p_l2.paragraph_format.space_after = Pt(4)
    r_l2 = p_l2.add_run("Live Platform: ")
    r_l2.font.size = Pt(11)
    r_l2.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
    r_l3 = p_l2.add_run("https://www.vytron.me")
    r_l3.font.size = Pt(11)
    r_l3.font.bold = True
    r_l3.font.color.rgb = RGBColor(0x38, 0xBD, 0xF8)

    p_l4 = c_live.add_paragraph()
    p_l4.paragraph_format.space_after = Pt(0)
    r_l4 = p_l4.add_run("Unlike projects that showcase mockups or Figma prototypes, FixGrid is deployed and fully interactive right now. Anyone can explore verified shops, filter repairs on the live Leaflet map, view rate cards, and test the customer and technician portal flows.")
    r_l4.font.size = Pt(8.8)
    r_l4.font.color.rgb = RGBColor(0x94, 0xA3, 0xB8)

    # Save Word document
    out_docx = os.path.abspath("FixGrid_Hackathon_Synopsis.docx")
    doc.save(out_docx)
    print(f"SUCCESS: Word document generated at: {out_docx}")

    # Convert to PDF via Word COM
    out_pdf = os.path.abspath("FixGrid_Hackathon_Synopsis.pdf")
    try:
        word = win32com.client.Dispatch("Word.Application")
        word.Visible = False
        doc_com = word.Documents.Open(out_docx)
        doc_com.SaveAs(out_pdf, 17) # 17 = wdFormatPDF
        doc_com.Close()
        word.Quit()
        print(f"SUCCESS: PDF synopsis generated at: {out_pdf}")
    except Exception as e:
        print(f"WARNING: PDF conversion error: {e}")

if __name__ == "__main__":
    create_synopsis_doc()
