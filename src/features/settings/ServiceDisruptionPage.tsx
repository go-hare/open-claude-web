export function ServiceDisruptionPage() {
  return (
    <div className="draggable flex h-screen flex-col items-center justify-center px-4 py-10 text-center">
      <div className="flex flex-1 select-text flex-col items-center justify-center gap-2 pb-14">
        <div className="mb-11 mr-px h-7" aria-hidden="true" />
        <h1 className="font-ui-serif text-2xl font-medium sm:text-[2rem]">Claude will return soon</h1>
        <p className="text-text-200 max-w-xl sm:text-lg">
          Claude is currently experiencing a temporary service disruption. We're{" "}
          <a className="inline underline underline-offset-[3px] [&:not(:is(:hover,:focus))]:decoration-[color-mix(in_srgb,currentColor,transparent_60%)] cursor-pointer" href="https://status.anthropic.com/">
            working on it
          </a>
          , please check back soon.
        </p>
        <div className="mt-4 flex gap-2">
          <button className="text-text-200 hover:text-text-100 border-border-300 hover:border-border-200 rounded-lg border px-4 py-2 text-sm transition-colors" onClick={() => window.location.reload()} type="button">Try again</button>
          <button className="text-text-200 hover:text-text-100 border-border-300 hover:border-border-200 rounded-lg border px-4 py-2 text-sm transition-colors" onClick={() => { window.location.pathname = "/"; }} type="button">Go to home</button>
        </div>
      </div>
      <a className="text-text-300 hover:text-text-100" href="https://anthropic.com" title="Learn more about Anthropic"><span className="block h-3 w-[110px]" aria-hidden="true" /></a>
    </div>
  );
}
