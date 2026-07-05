type SourceRouteBoundaryProps = {
  displayName: string;
  sourceChunk: string;
};

/**
 * Deliberately minimal: when a route has not been faithfully ported from decompiled code,
 * show only source identity. Do not invent UI.
 */
export function SourceRouteBoundary({ displayName, sourceChunk }: SourceRouteBoundaryProps) {
  return (
    <section className="flex min-h-full items-start justify-center bg-bg-100 p-p8">
      <div className="w-full max-w-[44rem] rounded-r6 bg-bg-000 p-p8 text-t8 shadow-[var(--df-shadow-card)]">
        <p className="m-0 text-footnote text-t6">{displayName}</p>
        <h1 className="m-0 mt-p3 text-title text-t9">待按原代码迁移</h1>
        <p className="m-0 mt-p4 text-body text-t7">source: {sourceChunk}</p>
      </div>
    </section>
  );
}
