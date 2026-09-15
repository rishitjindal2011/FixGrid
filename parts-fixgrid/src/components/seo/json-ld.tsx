import React from "react";

export function PartsJsonLd() {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": "https://parts.vytron.me/#website",
        "url": "https://parts.vytron.me",
        "name": "FixGrid Parts & Supply — Certified Electronics Components & Lab Silicon",
        "description": "Source genuine OEM donor screen pulls, tested PMIC silicon, battery modules, and rework supplies directly from verified repair laboratories across India.",
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
          "target": "https://parts.vytron.me/catalog?search={search_term_string}",
          "query-input": "required name=search_term_string"
        }
      },
      {
        "@type": "Organization",
        "@id": "https://parts.vytron.me/#organization",
        "name": "FixGrid Parts & Supply",
        "url": "https://parts.vytron.me",
        "sameAs": [
          "https://fixgrid.vytron.me",
          "https://hiring.vytron.me"
        ],
        "description": "Certified hardware marketplace connecting verified electronics laboratories and micro-soldering technicians with authentic OEM pulls and tested silicon.",
        "areaServed": {
          "@type": "Country",
          "name": "India"
        }
      },
      {
        "@type": "Service",
        "@id": "https://parts.vytron.me/#service",
        "name": "Bench Hardware Testing & Escrow Logistics",
        "provider": {
          "@id": "https://parts.vytron.me/#organization"
        },
        "serviceType": "Electronics Component Quality Testing, Diode Verification & Escrow Logistics",
        "hasOfferCatalog": {
          "@type": "OfferCatalog",
          "name": "Component Categories",
          "itemListElement": [
            {
              "@type": "Offer",
              "itemOffered": {
                "@type": "Service",
                "name": "Original OEM OLED Screen Pulls (Grade A+)"
              }
            },
            {
              "@type": "Offer",
              "itemOffered": {
                "@type": "Service",
                "name": "0-Cycle Tested Battery Modules with Original BMS"
              }
            },
            {
              "@type": "Offer",
              "itemOffered": {
                "@type": "Service",
                "name": "PMIC & Power Delivery BGA Silicon Chips"
              }
            },
            {
              "@type": "Offer",
              "itemOffered": {
                "@type": "Service",
                "name": "Console HDMI 2.1 Ports & Sub-Board Assemblies"
              }
            }
          ]
        }
      },
      {
        "@type": "FAQPage",
        "@id": "https://parts.vytron.me/#faq",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "What is the difference between an OEM donor pull and an aftermarket clone?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "OEM donor pulls are genuine factory components harvested from authentic devices by certified technicians. Donor pulls preserve original color calibration, cryptographic controller pairing, low thermal dissipation, and authentic silicon die architecture. In contrast, aftermarket clones use reverse-engineered third-party dies that frequently trigger iOS/Android health warnings, battery drain, or sudden failure under thermal load."
            }
          },
          {
            "@type": "Question",
            "name": "How does Advance Fee Local Workshop Pickup work?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "To eliminate travel to an out-of-stock shop or buying broken parts, FixGrid lets you lock the component with a nominal escrow deposit (₹150). You visit the verified workshop bench, test the component under your own multimeter or test jig, and finalize the balance only after confirming functionality."
            }
          },
          {
            "@type": "Question",
            "name": "What escrow guarantees protect pan-India courier shipments?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "For all courier deliveries, funds are never released to the seller upon dispatch. Once the parcel arrives, you receive a full 5-day bench testing window. If the part displays diode short circuits, broken solder pads, or fails triage, you are protected by 100% escrow refund coverage."
            }
          },
          {
            "@type": "Question",
            "name": "How are lab component sellers and repair workshops audited on FixGrid?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "FixGrid field inspectors examine seller premises to verify genuine salvage operations, stereomicroscope inspection stations, anti-static ESD packaging, and authentic part storage. Roadside stalls selling unchecked gray-market batches without diagnostic benches are strictly prohibited."
            }
          },
          {
            "@type": "Question",
            "name": "How does diode mode impedance profiling ensure BGA chips are functional before soldering?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Before wasting technician time reballing and soldering a BGA chip onto a customer board, technicians test ground-referenced pin impedance. Comparing multimeter readings against XinZhiZao or ZXW schematics confirms internal power rails have no shorts to ground."
            }
          },
          {
            "@type": "Question",
            "name": "Can cryptographically paired components like Apple TrueTone and battery BMS be transferred?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Yes. Verified suppliers provide donor assemblies with intact original EEPROM chips and battery BMS boards. Technicians can either use programmers (such as JC V1SE or QianLi iCopy) to transfer calibration serialization or perform tag-on flex transpositions without triggering iOS or Android non-genuine component error warnings."
            }
          },
          {
            "@type": "Question",
            "name": "What is the difference between reballed BGA chips and raw factory pulls?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Raw factory pulls are desoldered directly from donor logic boards and cleaned with ultrasonic solvent. Reballed BGA chips have had old lead-free alloy removed and fresh, perfectly sized solder spheres applied using high-precision stencils, saving hours of bench prep."
            }
          },
          {
            "@type": "Question",
            "name": "Can workshops purchase donor logic boards by scrap weight or only individual components?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "FixGrid supports both individual tested silicon chips and complete donor scrap motherboards. Repair laboratories frequently purchase donor motherboards (such as liquid-damaged MacBook or iPhone boards) to harvest micro-passives, chokes, power ICs, and connector housings that cannot be sourced individually from traditional component distributors."
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
