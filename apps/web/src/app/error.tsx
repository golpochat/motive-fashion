'use client';

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div>
      <h1 className="font-serif text-4xl">Something went wrong</h1>
      <p className="mt-4 text-ink/70">Please try again, or return to the shop.</p>
      <button type="button" className="mt-6 rounded-full bg-ink px-5 py-2 text-cream" onClick={() => reset()}>
        Retry
      </button>
    </div>
  );
}
