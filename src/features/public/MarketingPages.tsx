import type { RouteViewProps } from "../../app/routes";
import { primaryButtonClass, secondaryButtonClass } from "../shared/buttonClasses";

const navButton = "flex items-center gap-1 text-text-300 hover:text-text-100 transition-colors text-[15px]";
const titleClass = "text-text-100 [letter-spacing:-0.03em] font-ui-serif leading-tight font-medium";
const chromeTitle = "font-display text-text-100 text-center leading-[109%] lining-nums proportional-nums";

function MarketingNav({ onNavigate }: Pick<RouteViewProps, "onNavigate">) {
  const go = () => onNavigate("/task/new");
  return (
    <nav className="fixed left-0 right-0 w-full bg-bg-100 dark:bg-bg-300 z-header">
      <div className="mx-auto flex h-[84px] w-full max-w-[1086px] items-center">
        <a aria-label="Claude" className="flex items-center h-[4.5rem] min-[1104px]:h-[5.25rem] w-[120px]" href="/" />
        <div className="flex items-center gap-4" style={{ marginLeft: 201 }}><button className={navButton} type="button">Meet Claude</button><button className={navButton} type="button">Platform</button><button className={navButton} type="button">Solutions</button><button className={navButton} type="button">Pricing</button><button className={navButton} type="button">Resources</button></div>
        <div className="ml-auto flex items-center gap-3"><a className={secondaryButtonClass} href="https://claude.com/contact-sales" style={{ height: 36, width: 134 }}>Contact sales</a><button className={primaryButtonClass} onClick={go} style={{ height: 36, width: 111 }} type="button">Try Claude</button></div>
      </div>
    </nav>
  );
}

export function DownloadPage({ onNavigate }: RouteViewProps) {
  return (
    <div className="min-h-screen bg-bg-100 text-text-100">
      <MarketingNav onNavigate={onNavigate} />
      <main style={{ paddingTop: 84 }}><section className="mx-auto grid max-w-[1128px] grid-cols-1 gap-16 px-9 py-12 md:grid-cols-2"><div><h1 className={`${titleClass} text-5xl md:text-6xl max-w-lg`}>Meet Claude on your desktop</h1><p className="mt-8 max-w-lg text-xl text-text-300">Always there when you need it—Claude sits quietly in your workflow. No tab-hopping required.</p><div className="mt-10 flex flex-wrap gap-3"><a className={primaryButtonClass} href="/api/desktop/darwin/universal/dmg/latest/redirect" style={{ height: 44 }}>macOS</a><a className={primaryButtonClass} href="/api/desktop/win32/x64/exe/latest/redirect" style={{ height: 44 }}>Windows</a><a className={primaryButtonClass} href="/api/desktop/win32/arm64/exe/latest/redirect" style={{ height: 44 }}>Windows (arm64)</a></div></div><div className="min-h-[420px] rounded-[32px] bg-bg-200" /></section><section className="mx-auto grid max-w-[1128px] grid-cols-1 gap-16 px-9 py-28 md:grid-cols-2"><div className="min-h-[360px] rounded-[32px] bg-bg-200" /><div><h2 className={`${titleClass} text-4xl`}>Claude in your pocket</h2><p className="mt-6 max-w-lg text-xl text-text-300">Conversations follow you. Start a thought here, finish anywhere. Claude remembers where you left off.</p><div className="mt-10 flex flex-wrap gap-3"><a className={primaryButtonClass} href="https://apps.apple.com/us/app/claude-by-anthropic/id6473753684" style={{ height: 44 }}>App Store</a><a className={primaryButtonClass} href="https://play.google.com/store/apps/details?id=com.anthropic.claude" style={{ height: 44 }}>Google Play</a></div></div></section></main>
    </div>
  );
}

function ChromeRiskBar({ installed = false }: { installed?: boolean }) {
  return <div className="sticky top-0 z-50 bg-[#F5DB9A] px-8" style={{ paddingBottom: 16, paddingTop: 16 }}><p className="text-sm leading-[1.4] text-center text-text-100 dark:text-bg-000 mx-auto" style={{ maxWidth: installed ? 768 : 768 }}><span className="font-medium">Research preview:</span> The browser extension is a beta feature with unique risks—stay alert and protect yourself from bad actors. <button className="underline hover:opacity-60 transition-opacity" type="button">Learn how</button></p></div>;
}

export function ChromePage({ onNavigate }: RouteViewProps) {
  return (
    <div className="min-h-screen bg-bg-100 text-text-100"><a aria-label="Claude" className="absolute h-5 w-[93px]" href="/" style={{ left: 32, top: 24 }} />
      <section className="grid grid-cols-1 items-start px-16 lg:grid-cols-2" style={{ minHeight: 864, paddingTop: 148 }}><div><h1 className="font-display text-text-100 md:max-w-[545px] px-4 md:px-0 mx-auto lg:mx-0" style={{ fontSize: 64, lineHeight: "72px" }}>Piloting Claude in Chrome</h1><p className="text-text-100 font-tiempos md:max-w-[545px] px-4 md:px-0 mx-auto lg:mx-0" style={{ fontSize: 26, lineHeight: "39px", marginTop: 38 }}>When AI can interact with web pages, it creates meaningful value, but also opens up new risks. We're releasing Claude in Chrome as a limited research preview to learn from real-world use. Our goal is to explore safe ways for AI to browse the web—not just for our products, but for the entire AI ecosystem.</p><div className="flex gap-2" style={{ marginTop: 38 }}><button className={primaryButtonClass} onClick={() => onNavigate("/chrome/installed")} style={{ height: 44 }} type="button">Meet Claude in Chrome</button><button className={secondaryButtonClass} style={{ height: 44 }} type="button">Read the blog post</button></div></div><div className="min-h-[420px] rounded-[32px] bg-bg-200" /></section>
      <ChromeRiskBar /><section className="px-24 text-center" style={{ paddingBottom: 120, paddingTop: 120 }}><h2 className={chromeTitle} style={{ fontSize: "clamp(36px, 8vw, 50px)", fontWeight: 500 }}>Try Claude in Chrome</h2><p className="text-center mt-3 text-text-300 font-large md:font-large lg:font-xl max-w-sm md:max-w-3xl mx-auto">Now Claude can navigate, click buttons, and fill forms—right in your browser. Max users get early access to test, explore, and share feedback.</p><button className={`${primaryButtonClass} mt-8`} style={{ height: 44 }} type="button">Join the research preview</button></section>
    </div>
  );
}

export function ChromeInstalledPage() {
  return (
    <div className="min-h-screen bg-bg-100 text-text-100"><ChromeRiskBar installed /><a aria-label="Claude" className="absolute h-5 w-[93px]" href="/" style={{ left: 32, top: 76 }} />
      <section className="px-8 text-center" style={{ paddingTop: 108 }}><h1 className="!text-6xl font-display text-center text-text-100 max-w-xl md:max-w-2xl mx-auto px-8 md:px-4 mb-4">Claude’s in your Chrome</h1><p className="font-claude-response-body text-center text-text-300 max-w-lg mx-auto mb-8 mt-6">You’re participating in a research preview. Claude won’t work perfectly or risk-free on all websites or tasks.</p><button className={primaryButtonClass} style={{ height: 44 }} type="button">Try a demo</button></section>
      <section className="px-8 text-center" style={{ paddingTop: 180 }}><h2 className="font-display text-text-100 mb-3">Give Claude a challenge</h2><p className="font-large text-text-300 leading-[140%] text-center max-w-[800px] mx-auto font-normal mb-6 md:mb-12">在开始畅游网络之前，先熟悉一下浏览器扩展。</p><div className="mx-auto max-w-3xl rounded-[32px] border border-border-300 bg-bg-000 p-10"><h3 className="font-large-bold md:font-xl-bold text-text-100">Your inbox is full of meeting RSVPs. Can Claude archive only the RSVPs for you?</h3><div className="mt-8 grid gap-3 text-left text-text-300"><p>Gabe Mulley — Accepted: Team lunch this Friday</p><p>Amol Avasare — Q4 Budget Report</p><p>Please archive only the RSVP emails.</p></div></div></section>
      <section className="px-8 text-center" style={{ paddingBottom: 120, paddingTop: 120 }}><h2 className="font-display text-text-100 mb-3">Ready to roam Chrome?</h2><p className="font-large text-text-300 leading-[140%] text-center max-w-[800px] mx-auto font-normal mt-4 mb-12">We’ve created some starter prompts for you.</p><div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 md:grid-cols-3">{["Find apartments matching preferences", "Archive meeting RSVPs", "Compare return policies"].map((label) => <button className={primaryButtonClass} key={label} style={{ height: 44 }} type="button">Try it</button>)}</div></section>
    </div>
  );
}
