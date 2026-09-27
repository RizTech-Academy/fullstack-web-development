"use client";

/**
 * An error boundary is safe where a loading boundary is not.
 *
 * `error.tsx` only replaces what it wraps once something has thrown; it does
 * not flush the response early, so it cannot turn a 404 into a 200 the way a
 * `loading.tsx` above this route did. See docs/decisions/0012.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-900 dark:bg-red-950">
      <h1 className="font-semibold">We could not load the products.</h1>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
        This is usually temporary — most often the API is not running. Start it
        with <code className="rounded bg-white px-1 dark:bg-gray-900">npm run dev:api</code>.
      </p>
      {/* Never render error.message in production: it can carry internals. */}
      {process.env.NODE_ENV === "development" && (
        <pre className="mt-3 overflow-x-auto text-xs">{error.message}</pre>
      )}
      <button
        onClick={reset}
        className="mt-4 rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-gray-900"
      >
        Try again
      </button>
    </div>
  );
}
