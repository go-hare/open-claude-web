/**
 * Official ft (cc989143e): Claude in Chrome settings — gated by pt() =
 * public_api_crochet && (claude_pro || claude_max). Without account settings
 * mutation arms, ship the official header shell only (no invented toggles).
 */
export function BrowserExtensionSettings() {
  return (
    <main className="flex flex-col gap-7 pb-10">
      <section className="mb-xl last:mb-0">
        <div className="space-y-3">
          <div className="h-[60px] w-[60px]" aria-hidden="true" />
          <h3 className="text-heading-semibold text-primary">Claude in Chrome settings</h3>
          <p className="text-footnote text-secondary">
            Manage how Claude uses the Chrome extension. Settings sync from your account when available.
          </p>
        </div>
      </section>
    </main>
  );
}
