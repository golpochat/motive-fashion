export default function Loading() {
  return (
    <div className="animate-pulse space-y-6" aria-busy="true" aria-label="Loading">
      <div className="h-10 w-48 rounded-lg bg-ink/10" />
      <div className="h-4 w-72 max-w-full rounded bg-ink/10" />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((key) => (
          <div key={key}>
            <div className="aspect-[3/4] rounded-2xl bg-ink/10" />
            <div className="mt-3 h-4 w-2/3 rounded bg-ink/10" />
            <div className="mt-2 h-3 w-1/3 rounded bg-ink/10" />
          </div>
        ))}
      </div>
    </div>
  );
}
