"""
FixGrid — INSPIRE Award MANAK Presentation Dossier PDF Generator (v2)
Clean, modern, humanized aesthetic matching the original PDF layout.
- Problem Statement kept 100% faithful to the original topic.
- Solution & SafeProbe hardware completely humanized (intuitive, jargon-free).
- Beautiful visual hierarchy, generous spacing, soft rounded cards, no ugly tables.
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
)
from reportlab.pdfgen import canvas

PDF_OUTPUT_PATH = r"c:\Users\Rishit Jindal\Downloads\FixGrid-main\FixGrid_Inspire_Award_MANAK_Dossier.pdf"

# --- Curated Design System (Matching the original PDF) ---
COLOR_PILL_BG = colors.HexColor("#F7F4EC")     # Warm beige section header fill
COLOR_PILL_TEXT = colors.HexColor("#433E33")   # Deep elegant serif title color
COLOR_DARK = colors.HexColor("#0F172A")        # Primary dark headings
COLOR_BODY = colors.HexColor("#334155")        # Clean, readable body text
COLOR_MUTED = colors.HexColor("#64748B")       # Subtitles and tags
COLOR_CARD_BG = colors.HexColor("#F8FAFC")     # Soft off-white card fill
COLOR_CARD_BORDER = colors.HexColor("#E2E8F0") # Subtle card border
COLOR_INDIGO = colors.HexColor("#4F46E5")      # Modern electric indigo accent

class NumberedCanvas(canvas.Canvas):
    """Draws subtle running header and footer with total page count."""
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica-Bold", 7.5)
        self.setFillColor(COLOR_MUTED)

        # Top Running Header (Pages 2-4)
        if self._pageNumber > 1:
            self.drawString(42, 805, "INSPIRE AWARD – MANAK INNOVATION DOSSIER")
            self.drawRightString(553, 805, "FIXGRID: TRUST & REPAIR PLATFORM")
            self.setStrokeColor(colors.HexColor("#E2E8F0"))
            self.setLineWidth(0.5)
            self.line(42, 798, 553, 798)

        # Bottom Running Footer
        self.setStrokeColor(colors.HexColor("#E2E8F0"))
        self.setLineWidth(0.5)
        self.line(42, 40, 553, 40)

        self.setFont("Helvetica", 8)
        self.drawString(42, 28, "Innovator: Rishit Jindal  •  FixGrid Cyber-Physical Innovation  •  www.vytron.me")
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(553, 28, page_str)
        self.restoreState()


def create_pill_header(title_text, styles):
    """Creates the warm, elegant rounded section title box from the original PDF."""
    p = Paragraph(f"<b>{title_text}</b>", styles["SectionPillText"])
    t = Table([[p]], colWidths=[511])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), COLOR_PILL_BG),
        ('ROUNDEDCORNERS', [7, 7, 7, 7]),
        ('TOPPADDING', (0, 0), (-1, -1), 7),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 7),
        ('LEFTPADDING', (0, 0), (-1, -1), 14),
        ('RIGHTPADDING', (0, 0), (-1, -1), 14),
    ]))
    return t


def build_pdf():
    doc = SimpleDocTemplate(
        PDF_OUTPUT_PATH,
        pagesize=A4,
        leftMargin=42,
        rightMargin=42,
        topMargin=42,
        bottomMargin=46
    )

    styles = getSampleStyleSheet()

    # --- Typography Styles ---
    styles.add(ParagraphStyle(
        name='MainTitle',
        fontName='Helvetica-Bold',
        fontSize=30,
        leading=34,
        textColor=COLOR_DARK,
        alignment=1 # Center
    ))

    styles.add(ParagraphStyle(
        name='SubTitleBadge',
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=COLOR_MUTED,
        alignment=1
    ))

    styles.add(ParagraphStyle(
        name='SectionPillText',
        fontName='Times-Bold',
        fontSize=13.5,
        leading=17,
        textColor=COLOR_PILL_TEXT
    ))

    styles.add(ParagraphStyle(
        name='HumanBody',
        fontName='Helvetica',
        fontSize=9.4,
        leading=14.4,
        textColor=COLOR_BODY,
        alignment=0 # Left-aligned for natural readability
    ))

    styles.add(ParagraphStyle(
        name='CardTitle',
        fontName='Helvetica-Bold',
        fontSize=9.5,
        leading=12,
        textColor=COLOR_DARK
    ))

    styles.add(ParagraphStyle(
        name='CardBody',
        fontName='Helvetica',
        fontSize=8.3,
        leading=11.8,
        textColor=COLOR_BODY
    ))

    def wrap_card(title, bullets):
        content = [
            Paragraph(f"<b>{title}</b>", styles["CardTitle"]),
            Spacer(1, 4),
            Paragraph(bullets, styles["CardBody"])
        ]
        t = Table([[c] for c in content], colWidths=[205])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), COLOR_CARD_BG),
            ('BOX', (0, 0), (-1, -1), 0.7, COLOR_CARD_BORDER),
            ('ROUNDEDCORNERS', [6, 6, 6, 6]),
            ('TOPPADDING', (0, 0), (-1, -1), 7),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 7),
            ('LEFTPADDING', (0, 0), (-1, -1), 9),
            ('RIGHTPADDING', (0, 0), (-1, -1), 9),
        ]))
        return t

    story = []

    # ═════════════════════════════════════════════════════════════════════
    # PAGE 1: INTRODUCING FIXGRID & EXECUTIVE SUMMARY
    # ═════════════════════════════════════════════════════════════════════
    story.append(Spacer(1, 10))
    story.append(Paragraph("• • •", ParagraphStyle('Dots', fontName='Helvetica-Bold', fontSize=12, textColor=COLOR_INDIGO, alignment=1)))
    story.append(Spacer(1, 2))
    story.append(Paragraph("Introducing", ParagraphStyle('IntroLabel', fontName='Helvetica', fontSize=13, textColor=COLOR_MUTED, alignment=1)))
    story.append(Spacer(1, 2))
    story.append(Paragraph("<b>FixGrid</b>", styles["MainTitle"]))
    story.append(Spacer(1, 4))
    story.append(Paragraph("🌐 www.vytron.me &nbsp;•&nbsp; <b>INSPIRE Award – MANAK Innovation Dossier</b>", styles["SubTitleBadge"]))
    story.append(Spacer(1, 18))

    # Executive Summary Pill
    story.append(create_pill_header("Executive Summary", styles))
    story.append(Spacer(1, 10))
    
    exec_summary = (
        "FixGrid is a revolutionary digital platform designed to bridge the gap between everyday consumers and "
        "skilled neighborhood repair professionals. Our core mission is to champion the Right-to-Repair movement "
        "and foster a circular economy by making the act of repairing items as secure, transparent, and trustworthy "
        "as purchasing new ones. We aim to transform the perception and practice of repair, creating value for consumers, "
        "empowering local artisans, and significantly reducing environmental impact.<br/><br/>"
        "To make repairs truly trustworthy in the real world, FixGrid pairs this web platform with a physical invention: "
        "the <b>FixGrid SafeProbe™</b>. This handheld smart diagnostic tool helps neighborhood mechanics instantly detect "
        "faulty micro-components without expensive lab equipment, captures photo proof of repairs, and issues verified "
        "digital warranty seals—ensuring customers are never overcharged and broken electronics are saved from landfills."
    )
    story.append(Paragraph(exec_summary, styles["HumanBody"]))
    story.append(Spacer(1, 16))

    # The Problem Statement Pill (Header exactly matching original PDF)
    story.append(create_pill_header("The Problem Statement — The Throwaway Culture & Climate Paradox", styles))
    story.append(Spacer(1, 10))

    problem_intro = (
        "The daily reality for most consumers is stark: when everyday items like a wristwatch, shoe sole, phone screen, or appliance "
        "break, the immediate impulse is to discard them and order expensive new replacements online. This ingrained habit "
        "perpetuates a cycle of constant consumption and waste."
    )
    story.append(Paragraph(problem_intro, styles["HumanBody"]))

    story.append(PageBreak())

    # ═════════════════════════════════════════════════════════════════════
    # PAGE 2: THE PROBLEM (UNTOUCHED) & THE PROPOSED SOLUTION (HUMANIZED)
    # ═════════════════════════════════════════════════════════════════════
    # Left Narrative + Right Callouts (100% faithful to original PDF)
    left_problem_narrative = [
        Paragraph(
            "Consumers are often unaware that a skilled local craftsman, potentially just 500 meters away, could repair the "
            "item efficiently for a fraction of the cost of a new one. This represents a significant loss of value for "
            "individuals and a missed opportunity for local economies.",
            styles["HumanBody"]
        ),
        Spacer(1, 8),
        Paragraph(
            "The fundamental issue lies in a <b>trust and visibility void</b>. Local repair workers, the backbone of countless "
            "communities, lack a digital presence. Simultaneously, consumers face apprehension due to arbitrary pricing, "
            "inconsistent quality, and the absence of any guarantee on repair work.",
            styles["HumanBody"]
        ),
        Spacer(1, 8),
        Paragraph(
            "This pervasive throwaway culture contributes directly to an environmental catastrophe. Millions of repairable items "
            "are discarded daily, piling up as toxic e-waste. In parallel, 24/7 manufacturing plants churn out new goods, "
            "burning fossil fuels and exacerbating climate change. The most impactful environmental solution is not just "
            "technological advancement, but a fundamental shift in our throwaway habits.",
            styles["HumanBody"]
        ),
    ]

    c1 = wrap_card(
        "THE LOST VALUE",
        "• Thousands of rupees spent on replacements.<br/>"
        "• Skilled local artisans overlooked.<br/>"
        "• Repairable items become waste."
    )
    c2 = wrap_card(
        "THE TRUST & VISIBILITY VOID",
        "• Local repair workers lack digital presence.<br/>"
        "• Consumers fear arbitrary pricing & no warranty."
    )
    c3 = wrap_card(
        "THE ENVIRONMENTAL CATASTROPHE",
        "• Mountains of e-waste generated daily.<br/>"
        "• High carbon footprint from manufacturing.<br/>"
        "• <b>The biggest fix:</b> Changing our habits."
    )

    right_callouts = [c1, Spacer(1, 5), c2, Spacer(1, 5), c3]

    split_table = Table([[left_problem_narrative, right_callouts]], colWidths=[295, 216])
    split_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
    ]))
    story.append(split_table)
    story.append(Spacer(1, 14))

    # The Proposed Solution Pill
    story.append(create_pill_header("The Proposed Solution (FixGrid + SafeProbe™)", styles))
    story.append(Spacer(1, 9))

    solution_text = (
        "FixGrid addresses these critical issues by building a robust <b>trust infrastructure</b> for local repairs. "
        "FixGrid provides a platform-backed warranty on select categories and permanently records the shopkeeper's own extended "
        "warranties, fostering builder trust and accountability. Our smart escrow system ensures funds are held securely during "
        "the repair process and released only after verified customer satisfaction, eliminating the risk of non-completion or poor workmanship.<br/><br/>"
        "For local technicians, FixGrid acts as a powerful empowerment tool. We provide instant digital storefronts, enabling them "
        "to showcase their skills and receive verified ratings. To further incentivize participation, we offer a 5% completed-bill cashback rebate for shopkeepers.<br/><br/>"
        "<b>The Physical Innovation (The SafeProbe™ Wand):</b> To remove the fear of cheating, we created a low-cost testing tool "
        "for local shops. When touched to a circuit board, it safely tests whether a component is working without needing expensive lab machines. "
        "An onboard zoom camera with LED lights lets the mechanic spot hairline cracks, capture photo proof of the repair for the customer, "
        "and generate a physical QR 'health passport' sticker that anyone can scan with a phone to verify the active 90-day warranty."
    )
    story.append(Paragraph(solution_text, styles["HumanBody"]))

    story.append(PageBreak())

    # ═════════════════════════════════════════════════════════════════════
    # PAGE 3: TRIPLE BOTTOM LINE & SYSTEM ARCHITECTURE
    # ═════════════════════════════════════════════════════════════════════
    story.append(create_pill_header("The Triple Bottom Line (Impact Analysis)", styles))
    story.append(Spacer(1, 8))
    story.append(Paragraph(
        "FixGrid delivers real, practical impact across three vital dimensions: personal financial savings for families, "
        "dignity for local trade workers, and measurable environmental relief for the country.",
        styles["HumanBody"]
    ))
    story.append(Spacer(1, 9))

    # 3 Beautiful Clean Columns matching the original PDF
    def wrap_column(title, subtitle, bullets):
        content = [
            Paragraph(f"<b>{title}</b>", styles["CardTitle"]),
            Paragraph(f"<font color='#4F46E5'><b>{subtitle}</b></font>", ParagraphStyle('Sub', fontName='Helvetica-Bold', fontSize=7.5, leading=9)),
            Spacer(1, 5),
            Paragraph(bullets, styles["CardBody"])
        ]
        t = Table([[c] for c in content], colWidths=[164])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), COLOR_CARD_BG),
            ('BOX', (0, 0), (-1, -1), 0.7, COLOR_CARD_BORDER),
            ('ROUNDEDCORNERS', [6, 6, 6, 6]),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ]))
        return t

    col1 = wrap_column(
        "ECONOMIC",
        "(CONSUMER)",
        "• <b>Significant Savings:</b> Consumers achieve substantial cost reductions by choosing repair over purchasing new items.<br/><br/>"
        "• <b>Value Recovery:</b> Unlocks the inherent value trapped in existing products.<br/><br/>"
        "• <b>Fair Pricing:</b> Upfront diagnostic estimates and escrow protection eliminate repair haggling."
    )

    col2 = wrap_column(
        "SOCIAL",
        "(COMMUNITY)",
        "• <b>Formal Identity:</b> Provides unorganized local repair heroes with a formal digital presence and verified badges.<br/><br/>"
        "• <b>Reliable Livelihoods:</b> Creates sustainable income streams and dignified work opportunities.<br/><br/>"
        "• <b>Affordable Tools:</b> Gives local mechanics smart diagnostic tools for under Rs. 1,800."
    )

    col3 = wrap_column(
        "ECOLOGICAL",
        "(PLANET)",
        "• <b>E-Waste Reduction:</b> Directly combats the growing problem of discarded electronics and household appliances.<br/><br/>"
        "• <b>Carbon Mitigation:</b> Reduces the industrial demand for new manufacturing, lowering carbon emissions.<br/><br/>"
        "• <b>Sustainable Habits:</b> Promotes a culture of repair and reuse at the source."
    )

    triple_table = Table([[col1, col2, col3]], colWidths=[170, 170, 170])
    triple_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
    ]))
    story.append(triple_table)
    story.append(Spacer(1, 14))

    # System Architecture Pill
    story.append(create_pill_header("System Architecture & Technical Specifications", styles))
    story.append(Spacer(1, 9))
    story.append(Paragraph(
        "FixGrid is built on a modern, accessible, and scalable engineering stack:",
        styles["HumanBody"]
    ))
    story.append(Spacer(1, 6))

    arch_bullets = [
        "• <b>Frontend Web App:</b> Built with Next.js 16 and Tailwind CSS for a fast, mobile-friendly experience. Features an interactive local map engine so users can discover open, verified repair shops nearby.",
        "• <b>Backend & Database:</b> Powered by Supabase (PostgreSQL) with automated triggers and secure escrow hold mechanisms that release technician payments only after a successful repair.",
        "• <b>SafeProbe™ Diagnostic Wand:</b> An ESP32 microcontroller paired with a safe low-voltage test probe, a small OLED screen, and an audio buzzer that alerts the technician the moment a short circuit is found.",
        "• <b>Inspection Camera & LED Ring:</b> A micro macro-lens camera that lets technicians view tiny circuit components on their screen and upload photo evidence directly to the customer's repair ticket.",
        "• <b>QR Code 'Device Passport':</b> A waterproof physical sticker placed on the repaired gadget. Anyone can scan it with any smartphone camera to check its active warranty, repair photos, and test history."
    ]

    arch_cards = []
    for bullet in arch_bullets:
        arch_cards.append(Paragraph(bullet, styles["HumanBody"]))
        arch_cards.append(Spacer(1, 4))

    arch_table = Table([[arch_cards]], colWidths=[511])
    arch_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#FFFFFF")),
        ('BOX', (0, 0), (-1, -1), 0.7, colors.HexColor("#CBD5E1")),
        ('ROUNDEDCORNERS', [6, 6, 6, 6]),
        ('TOPPADDING', (0, 0), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 7),
        ('LEFTPADDING', (0, 0), (-1, -1), 12),
        ('RIGHTPADDING', (0, 0), (-1, -1), 12),
    ]))
    story.append(arch_table)

    story.append(PageBreak())

    # ═════════════════════════════════════════════════════════════════════
    # PAGE 4: MARKET OPPORTUNITY, FEASIBILITY & CONCLUSION
    # ═════════════════════════════════════════════════════════════════════
    story.append(create_pill_header("Market Opportunity & Revenue Model", styles))
    story.append(Spacer(1, 8))

    market_left = [
        Paragraph("<b>MARKET OPPORTUNITY</b>", styles["CardTitle"]),
        Spacer(1, 4),
        Paragraph(
            "FixGrid taps into a massive, underserved market: the <b>$15.2 Billion Indian unorganized repair economy</b>. "
            "High demand, fragmented supply, and low customer trust have left this space ripe for innovation. FixGrid "
            "brings reliability, transparency, and scalable tools to transform everyday local repairs into a dependable service experience.",
            styles["HumanBody"]
        ),
        Spacer(1, 6),
        Paragraph(
            "By equipping local mechanics with the affordable SafeProbe tool, we create a decentralized network of verified repair experts, "
            "supporting grassroots self-reliance and small business growth across India.",
            styles["HumanBody"]
        )
    ]

    revenue_right = wrap_card(
        "REVENUE STREAMS",
        "Our monetization strategy is designed for sustainability and value sharing:<br/><br/>"
        "<b>1. Platform Take-Rate:</b> A fair 5%–8% fee on completed bookings.<br/><br/>"
        "<b>2. Shop Pro SaaS Tier:</b> Optional subscription for repair shops at Rs. 999/month for analytics, priority ranking, and workbench tools.<br/><br/>"
        "<b>3. Certified Spare Parts:</b> Curated marketplace for verified, high-quality replacement parts."
    )

    market_table = Table([[market_left, revenue_right]], colWidths=[295, 216])
    market_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
    ]))
    story.append(market_table)
    story.append(Spacer(1, 14))

    # Feasibility Box (Humanized, No Ugly Table!)
    story.append(create_pill_header("Practical Feasibility: Prototype Built for Under Rs. 1,800", styles))
    story.append(Spacer(1, 8))
    feasibility_text = (
        "A key goal of the INSPIRE Award – MANAK is that innovations must be practical, affordable, and easy to build. "
        "The SafeProbe diagnostic wand is assembled entirely from readily available educational components (ESP32 microcontroller, "
        "micro-camera lens, small OLED screen, buzzer, rechargeable battery, and 3D printed casing).<br/><br/>"
        "The entire hardware unit costs approximately <b>Rs. 1,795</b> to build—leaving over 80% of the Rs. 10,000 DST grant "
        "available for field testing, workshop demonstrations, and documentation. This proves the device can be easily mass-adopted "
        "by small repair kiosks in Tier-2 and Tier-3 towns without financial strain."
    )
    story.append(Paragraph(feasibility_text, styles["HumanBody"]))
    story.append(Spacer(1, 14))

    # Conclusion & Roadmap Pill
    story.append(create_pill_header("Conclusion & The INSPIRE MANAK Vision", styles))
    story.append(Spacer(1, 8))

    conclusion_text = (
        "FixGrid is more than just a platform; it is a movement towards a <b>sustainable repair economy</b>. We envision a future "
        "where society transitions from a mindless consumption loop to a conscious and responsible approach to product lifecycle "
        "management. By empowering local repair heroes with simple, smart diagnostic tools and instilling trust in the repair process, "
        "we are building a cleaner, more equitable, and more resourceful planet for generations to come."
    )
    story.append(Paragraph(conclusion_text, styles["HumanBody"]))

    # Build Document
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Successfully generated clean humanized PDF at: {PDF_OUTPUT_PATH}")

if __name__ == "__main__":
    build_pdf()
