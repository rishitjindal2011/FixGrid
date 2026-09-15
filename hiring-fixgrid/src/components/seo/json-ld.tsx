import React from "react";

export function HiringJsonLd() {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": "https://hiring.vytron.me/#website",
        "url": "https://hiring.vytron.me",
        "name": "FixGrid Careers — Verified Hardware Technician & Artisan Bench Exchange",
        "description": "India's certified electronics technician, micro-soldering, and logic board repair bench exchange. Escrow-backed compensation with zero recruiter commissions.",
        "publisher": {
          "@type": "Organization",
          "name": "FixGrid by Vytron",
          "url": "https://fixgrid.vytron.me",
          "logo": {
            "@type": "ImageObject",
            "url": "https://fixgrid.vytron.me/icon.svg"
          }
        },
        "potentialAction": {
          "@type": "SearchAction",
          "target": "https://hiring.vytron.me/jobs?search={search_term_string}",
          "query-input": "required name=search_term_string"
        }
      },
      {
        "@type": "Organization",
        "@id": "https://hiring.vytron.me/#organization",
        "name": "FixGrid Careers",
        "url": "https://hiring.vytron.me",
        "sameAs": [
          "https://fixgrid.vytron.me",
          "https://parts.vytron.me"
        ],
        "description": "National network of physically audited micro-soldering laboratories and certified electronics hardware artisans.",
        "areaServed": {
          "@type": "Country",
          "name": "India"
        }
      },
      {
        "@type": "Service",
        "@id": "https://hiring.vytron.me/#service",
        "name": "Artisan Hardware Bench Placement & Escrow Protocol",
        "provider": {
          "@id": "https://hiring.vytron.me/#organization"
        },
        "serviceType": "Electronics Repair Technician Recruitment & Bench Accreditation",
        "termsOfService": "https://hiring.vytron.me/terms",
        "hasOfferCatalog": {
          "@type": "OfferCatalog",
          "name": "Bench Technical Specializations",
          "itemListElement": [
            {
              "@type": "Offer",
              "itemOffered": {
                "@type": "Service",
                "name": "L3 Micro-Soldering & BGA Chip-Level Repair Bench"
              }
            },
            {
              "@type": "Offer",
              "itemOffered": {
                "@type": "Service",
                "name": "Apple Logic Board & iPhone Diagnostic Specialist"
              }
            },
            {
              "@type": "Offer",
              "itemOffered": {
                "@type": "Service",
                "name": "OLED Cryo Separation & OCA Display Refurbishing"
              }
            },
            {
              "@type": "Offer",
              "itemOffered": {
                "@type": "Service",
                "name": "Gaming Console HDMI 2.1 & GPU Reballing Bench"
              }
            }
          ]
        }
      },
      {
        "@type": "FAQPage",
        "@id": "https://hiring.vytron.me/#faq",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "What is FixGrid Careers and how does the Bench Protocol operate?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "FixGrid Careers is India's verified hardware artisan and electronics repair technician exchange. Unlike generic job portals like Naukri or Indeed, FixGrid connects certified micro-soldering, motherboard diagnostic, and precision hardware artisans directly with physically audited repair laboratories. Technicians retain 100% of their earnings with zero agency deductions, and initial 3-day bench trials are backed by automated platform escrow."
            }
          },
          {
            "@type": "Question",
            "name": "How does the 3-day bench evaluation escrow guarantee protect technicians?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Wages for the 3-day trial are deposited into FixGrid Escrow before the artisan ever sets foot in the workshop. Upon completion of the 3-day bench evaluation, funds are automatically disbursed to the technician's bank account. This eliminates unpaid 'trial days', wage withholding, and unauthorized payroll cuts common in the informal electronics repair sector."
            }
          },
          {
            "@type": "Question",
            "name": "What physical equipment is mandated for FixGrid L3 lab accreditation?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Workshops must provide: a 7X-45X stereomicroscope with LED ring light, calibrated soldering station (JBC C210/C245 or Hakko), programmable hot-air rework station (Quick 861DW or equivalent), ESD grounded matting, and digital schematic software licenses (ZXW Dongle or XinZhiZao)."
            }
          },
          {
            "@type": "Question",
            "name": "Why does FixGrid charge zero recruiter commission to technicians?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Traditional manpower agencies take 15% to 25% of technician wages every month. FixGrid eliminates middlemen entirely, ensuring artisans receive 100% of their negotiated bench compensation."
            }
          },
          {
            "@type": "Question",
            "name": "What hardware skills are required for L1, L2, and L3 technician tiers?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "L1 technicians handle modular display swaps, battery replacements, and camera flex transpositions. L2 covers charging port reconstruction, FPC connector swaps, and diode line testing. L3 requires BGA reballing, PMIC diagnosis, trace jumping under 40x magnification, NAND expansions, and thermal rail triage."
            }
          },
          {
            "@type": "Question",
            "name": "How are workshop owners and repair laboratories audited before posting openings?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "FixGrid field auditors verify physical lab premises, workbench ergonomics, test instrument calibration, commercial registration, and safety equipment. This guarantees artisans join genuine engineering operations, not informal makeshift stalls."
            }
          },
          {
            "@type": "Question",
            "name": "What happens if a workshop attempts to renegotiate compensation after an artisan arrives?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Because the 3-day trial wage is pre-funded into escrow, workshops cannot unilaterally reduce agreed pay rates. Any violation triggers immediate account suspension and release of the escrowed funds to the artisan."
            }
          },
          {
            "@type": "Question",
            "name": "Can technicians from outside metro centers apply for relocation bench seats?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Yes. Workshops across Nehru Place, Lamington Road, and SP Road actively recruit skilled micro-soldering talent nationwide. Openings requiring relocation feature clear accommodation badges and pre-funded travel trial stipends."
            }
          }
        ]
      }
    ]
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}
