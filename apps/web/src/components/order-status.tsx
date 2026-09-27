import { ORDER_PROGRESS, ORDER_STATUS_LABELS, type OrderStatus } from "@kirana/shared";

const TONE: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  PLACED: "bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200",
  PACKED: "bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200",
  OUT_FOR_DELIVERY: "bg-indigo-100 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-200",
  DELIVERED: "bg-green-100 text-green-900 dark:bg-green-950 dark:text-green-200",
  CANCELLED: "bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${TONE[status]}`}>
      {ORDER_STATUS_LABELS[status]}
    </span>
  );
}

/**
 * The four steps of a normal order, with the ones already done marked.
 *
 * A cancelled order gets no progress bar at all — showing it greyed out
 * invites the reading that it is still coming.
 */
export function OrderProgress({ status }: { status: OrderStatus }) {
  if (status === "CANCELLED" || status === "PENDING_PAYMENT") return null;

  const reached = ORDER_PROGRESS.indexOf(status);

  return (
    <ol className="flex items-center gap-1 text-xs">
      {ORDER_PROGRESS.map((step, index) => {
        const done = index <= reached;
        return (
          <li key={step} className="flex flex-1 items-center gap-1">
            <span
              aria-hidden="true"
              className={`h-1.5 flex-1 rounded-full ${
                done ? "bg-green-600" : "bg-gray-200 dark:bg-gray-800"
              }`}
            />
            <span className={done ? "font-medium" : "text-gray-400"}>
              {ORDER_STATUS_LABELS[step]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
