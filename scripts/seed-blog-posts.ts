import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/types/database";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    console.error(`\n  Missing ${name}.\n`);
    process.exit(1);
  }
  return value.trim();
}

const SUPABASE_URL = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
const SERVICE_KEY = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient<Database>(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const BLOG_POSTS = [
  {
    title: "10 Essential Signs Your Smartphone Battery Needs Replacing (2026 Guide)",
    slug: "signs-smartphone-battery-replacement",
    status: "published" as const,
    content: `
      <p>Your smartphone is your primary connection to the world, but over time, its battery inevitably degrades. If you find yourself constantly searching for an outlet or carrying a bulky power bank, it might be time for a battery replacement. Instead of spending thousands on a brand new device, replacing the battery is often a cost-effective and environmentally friendly solution.</p>
      
      <h3>1. Rapid Battery Drain</h3>
      <p>The most obvious sign of a degrading battery is a device that goes from 100% to 20% in just a few hours of normal use. While heavy gaming or constant video streaming will naturally drain a battery quickly, everyday tasks like checking emails or sending text messages shouldn't cause significant drops in battery life. If your phone can no longer survive a typical workday without needing a mid-day charge, the battery capacity has likely diminished significantly.</p>
      
      <h3>2. Unexpected Shutdowns</h3>
      <p>Have you ever been using your phone with 30% battery remaining, only to have it suddenly power off? This is a classic symptom of battery wear. As lithium-ion batteries age, their internal resistance increases. When your phone attempts to draw a significant amount of power (such as opening the camera app), the worn-out battery cannot deliver the required voltage, causing the device's protective circuitry to shut down the phone to prevent damage.</p>
      
      <h3>3. Sluggish Performance and Lag</h3>
      <p>Modern smartphone operating systems are designed to manage power intelligently. When a battery is severely degraded, the operating system may automatically throttle the processor's speed to prevent sudden shutdowns and reduce the strain on the battery. If your phone feels noticeably slower, stutters during animations, or takes longer to open apps, the underlying culprit could very well be a failing battery rather than an aging processor.</p>
      
      <h3>4. The Device Overheats During Normal Use</h3>
      <p>It's normal for a smartphone to warm up during intensive tasks or while fast charging. However, if your phone becomes uncomfortably hot to the touch during simple tasks like browsing social media or sitting idle in your pocket, it's a major red flag. A battery that generates excessive heat is working inefficiently and struggling to maintain power output, which is a clear indication that it needs to be replaced.</p>
      
      <h3>5. The Battery Shows Physical Swelling</h3>
      <p>This is the most critical and dangerous sign. If the back panel of your phone appears raised, the screen is bulging, or the phone no longer sits flat on a table, the battery has likely swollen. This happens when the battery cells rupture and release volatile gases. <strong>If you notice a swollen battery, stop using the phone immediately, do not charge it, and take it to a professional repair technician.</strong> A swollen battery poses a significant fire hazard and requires immediate professional attention.</p>
      
      <h3>Conclusion</h3>
      <p>Replacing a smartphone battery is a quick, inexpensive procedure that can breathe new life into a device you already love. If you're experiencing any of these signs, don't rush to buy a new phone. Reach out to a certified local repair expert to get your battery tested and replaced today.</p>
    `,
    meta_title: "Signs Your Phone Battery Needs Replacing | FixGrid",
    meta_description: "Learn the top signs your smartphone battery is dying. Compare local repair shops to find affordable, same-day battery replacement services near you.",
    keywords: ["smartphone repair", "battery replacement", "phone battery dying", "iphone battery", "android battery repair"],
    published_at: new Date().toISOString(),
    author_id: null,
    og_image_url: null,
  },
  {
    title: "How to Choose a Reliable Plumber: A Homeowner's Guide",
    slug: "how-to-choose-reliable-plumber",
    status: "published" as const,
    content: `
      <p>Finding a trustworthy plumber before a pipe bursts can save you thousands of dollars and immense stress. Plumbing issues rarely occur at convenient times, and scrambling to find a professional while water is damaging your floors is a nightmare scenario. Here is how you can ensure you're hiring the right professional for your home.</p>
      
      <h3>Verify Licenses and Insurance</h3>
      <p>The very first thing you should check when hiring a plumber is their credentials. Most jurisdictions require plumbers to be licensed, which demonstrates they have completed the necessary training and understand local building codes. Furthermore, a reliable plumber must carry both liability insurance and worker's compensation. This protects you, the homeowner, from being held financially responsible if the plumber is injured on your property or if their work accidentally causes damage to your home.</p>
      
      <h3>Look for Transparent Pricing</h3>
      <p>Reputable plumbers are upfront about their pricing structure. While it's often difficult to give an exact estimate over the phone without inspecting the issue, a professional should be able to explain how they charge (hourly vs. flat rate) and what their minimum service call fees are. Beware of plumbers who offer estimates that seem significantly lower than competitors; these can often lead to hidden fees and sudden upcharges once the work begins. Always insist on a written estimate before any major work commences.</p>
      
      <h3>Check Reviews and Ask for References</h3>
      <p>In today's digital age, a plumber's reputation is easy to verify. Look beyond the star rating and read actual customer reviews on platforms like Google, Yelp, and local community boards. Pay attention to how the plumber responds to negative reviews—a professional and courteous response indicates good customer service. For larger projects like a bathroom remodel or a main sewer line replacement, don't hesitate to ask the plumber directly for references from past clients.</p>
      
      <h3>Inquire About Warranties and Guarantees</h3>
      <p>A confident and competent plumber will stand behind their work. Ask about the warranties they provide on both the labor and the parts they install. A standard industry warranty is usually 30 to 90 days for labor, and up to a year for parts. Having a solid guarantee ensures that if the repair fails shortly after completion, the plumber will return to fix the issue at no additional cost to you.</p>
      
      <h3>Conclusion</h3>
      <p>Taking the time to research and build a relationship with a reliable plumber pays dividends in the long run. By verifying credentials, checking reviews, and demanding transparent pricing, you can protect your home and your wallet from subpar workmanship.</p>
    `,
    meta_title: "How to Choose a Reliable Plumber Near You | FixGrid",
    meta_description: "Discover exactly what to look for when hiring a plumber. Learn how to verify licenses, compare quotes, and find the best local plumbing experts.",
    keywords: ["find a plumber", "plumbing repair", "hire a plumber", "plumbing services", "local plumbers"],
    published_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
  },
  {
    title: "The Ultimate Guide to Maintaining Your HVAC System",
    slug: "ultimate-hvac-maintenance-guide",
    status: "published" as const,
    content: `
      <p>Heating, ventilation, and air conditioning (HVAC) systems are among the most expensive components of a home. Regular maintenance not only extends the lifespan of your unit but also keeps your energy bills low. Neglecting your HVAC system is akin to never changing the oil in your car—eventually, a catastrophic and costly failure will occur. This comprehensive guide outlines the essential steps to keep your home comfortable year-round.</p>

      <h3>Change Filters Regularly</h3>
      <p>The simplest and most effective maintenance task is changing your air filters every 30 to 90 days. A clogged filter restricts airflow, forcing the system to work harder to push air through the home. This not only increases energy consumption and utility bills but also causes undue wear and tear on the blower motor. For homes with pets or allergy sufferers, high-efficiency pleated filters should be used and changed more frequently.</p>

      <h3>Keep the Outdoor Unit Clear</h3>
      <p>Your outdoor condenser unit requires adequate airflow to dissipate heat effectively. Over time, leaves, dirt, grass clippings, and debris can accumulate around and inside the unit. Make it a habit to inspect the outdoor unit regularly. Maintain a minimum clearance of two feet around the condenser by trimming back bushes and removing vegetation. You can also gently wash the exterior fins with a garden hose (never a pressure washer) to remove accumulated dirt.</p>

      <h3>Inspect and Clean the Ductwork</h3>
      <p>The ductwork is the circulatory system of your HVAC setup. If ducts are leaky, uninsulated, or filled with dust, your system's efficiency will plummet. Have a professional inspect your ductwork every few years for leaks or disconnections, particularly in unconditioned spaces like attics and crawlspaces. Sealing leaks with mastic sealant or metal tape can improve system efficiency by up to 20%.</p>

      <h3>Schedule Bi-Annual Professional Tune-Ups</h3>
      <p>While homeowners can perform basic maintenance, certain tasks require a licensed professional. You should schedule a professional tune-up twice a year: once in the spring for the air conditioning system, and once in the fall for the heating system. A technician will perform critical tasks such as checking refrigerant levels, inspecting electrical connections, lubricating moving parts, and cleaning the evaporator and condenser coils. These proactive inspections catch minor issues before they escalate into major breakdowns during the peak of summer or winter.</p>
      
      <h3>Conclusion</h3>
      <p>Consistent HVAC maintenance is an investment that pays for itself through lower energy bills, fewer emergency repair costs, and a longer lifespan for your equipment. Establish a regular maintenance routine and partner with a trusted local HVAC technician to ensure your home remains an oasis of comfort in every season.</p>
    `,
    meta_title: "HVAC Maintenance Guide: Tips & Advice | FixGrid",
    meta_description: "Learn how to maintain your HVAC system to reduce energy bills and prevent costly breakdowns. Find verified local HVAC technicians for annual tune-ups.",
    keywords: ["HVAC maintenance", "AC repair", "heating repair", "furnace maintenance", "air conditioning"],
    published_at: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
  }
];

async function main() {
  console.log("Seeding blog posts...");
  for (const post of BLOG_POSTS) {
    const { data: existing } = await supabase
      .from("blog_posts")
      .select("id")
      .eq("slug", post.slug)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase.from("blog_posts").update({ ...post, updated_at: new Date().toISOString() }).eq("id", existing.id);
      if (error) {
        console.error(`Failed to update ${post.slug}: `, error);
      } else {
        console.log(`Updated: ${post.slug}`);
      }
    } else {
      const { error } = await supabase.from("blog_posts").insert({
        ...post,
        author_id: null,
        og_image_url: null,
      });
      if (error) {
        console.error(`Failed to insert ${post.slug}: `, error);
      } else {
        console.log(`Created: ${post.slug}`);
      }
    }
  }
  console.log("Done.");
}

main().catch(console.error);
