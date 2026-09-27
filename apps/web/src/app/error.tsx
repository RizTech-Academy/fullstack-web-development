"use client";

/**
 * Must be a client component: it receives a `reset` function and has to hold
 * state across a re-render. It catches errors thrown while rendering this
 * route, which in this application usually means the API is not running.
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
      <h1 className="font-semibold">The shop could not load.</h1>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
        Usually this means the API is not running. Start it with{" "}
        <code className="rounded bg-white px-1 dark:bg-gray-900">npm run dev:api</code>.
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
