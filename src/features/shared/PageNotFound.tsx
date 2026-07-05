import { primaryButtonClass } from "./buttonClasses";

export function PageNotFound() {
  return (
    <div className="flex-1 min-h-0 relative flex flex-col overflow-x-clip overflow-y-auto">
      <div className="grid place-content-center min-h-min text-center gap-2 pt-24 pb-32 px-4 mx-auto h-screen w-fit">
        <div className="mb-10 h-[26px] text-center" aria-hidden="true" />
        <h2 className="font-ui-serif text-4xl text-text-200">Page not found</h2>
        <h3 className="font-large text-text-500">Claude can help with many things, but finding this page isn’t one of them.</h3>
        <div className="mx-0 mt-4 min-w-[16rem]">
          <a href="/new" className={primaryButtonClass}>Go back home</a>
        </div>
      </div>
    </div>
  );
}
