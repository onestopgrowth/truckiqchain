"use client";

import * as React from "react";

type Item = {
  id: string;
  status: string;
  loads?: {
    title?: string | null;
    origin_city?: string | null;
    origin_state?: string | null;
    destination_city?: string | null;
    destination_state?: string | null;
  } | null;
};

const statusColor: Record<string, string> = {
  rejected:
    "bg-red-100 text-red-700 border border-red-300 dark:bg-red-600/20 dark:text-red-300 dark:border-red-700",
  requested:
    "bg-amber-100 text-amber-700 border border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-700",
  accepted:
    "bg-blue-100 text-blue-700 border border-blue-300 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-700",
  booked:
    "bg-green-100 text-green-700 border border-green-300 dark:bg-green-600/20 dark:text-green-300 dark:border-green-700",
  in_transit:
    "bg-purple-100 text-purple-700 border border-purple-300 dark:bg-purple-600/20 dark:text-purple-300 dark:border-purple-700",
  delivered:
    "bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-600/20 dark:text-slate-300 dark:border-slate-700",
  completed:
    "bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-600/20 dark:text-slate-300 dark:border-slate-700",
  cancelled:
    "bg-red-100 text-red-700 border border-red-300 dark:bg-red-600/20 dark:text-red-300 dark:border-red-700",
};

const FILTERS = [
  "all",
  "requested",
  "accepted",
  "booked",
  "in_transit",
  "delivered",
  "completed",
  "rejected",
];

export default function CarrierRecentAssignments({ items }: { items: Item[] }) {
  const [filter, setFilter] = React.useState<string>("all");
  const filtered = React.useMemo(
    () => (filter === "all" ? items : items.filter((i) => i.status === filter)),
    [items, filter]
  );
  const counts = React.useMemo(() => {
    const c: Record<string, number> = Object.fromEntries(
      FILTERS.map((f) => [f, 0])
    ) as any;
    for (const it of items) c[it.status] = (c[it.status] || 0) + 1;
    c.all = items.length;
    return c as Record<string, number>;
  }, [items]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 text-xs">
        {FILTERS.map((f) => (
          <button
            key={f}
            className={`px-2 py-1 rounded border ${
              filter === f ? "bg-muted" : "bg-background"
            }`}
            onClick={() => setFilter(f)}
          >
            {f.replace("_", " ")} ({counts[f] || 0})
          </button>
        ))}
      </div>
      {!filtered.length ? (
        <p className="text-sm text-muted-foreground">No recent assignments.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {filtered.map((a) => {
            const l = a.loads || ({} as any);
            const lane =
              l?.title ||
              `${l?.origin_city ?? "?"}, ${l?.origin_state ?? "?"} → ${
                l?.destination_city ?? "?"
              }, ${l?.destination_state ?? "?"}`;
            const pill = statusColor[a.status] || statusColor["requested"];
            // Local state for status update
            const [status, setStatus] = React.useState(a.status);
            async function act(action: string) {
              const res = await fetch(`/api/assignments/${a.id}/status`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action }),
              });
              if (res.ok) {
                const json = await res.json();
                setStatus(json.status);
              }
            }
            return (
              <li
                key={a.id}
                className="flex items-center justify-between gap-3 border rounded px-3 py-2"
              >
                <span className="truncate">{lane}</span>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] rounded-full px-2 py-0.5 ${statusColor[status] || pill}`}>
                    {status.replace("_", " ")}
                  </span>
                  {/* Action buttons for each status */}
                  {status === "requested" && (
                    <>
                      <button className="text-xs px-2 py-1 rounded bg-green-600 text-white cursor-pointer hover:bg-green-700 transition" onClick={() => act("accept")}>Approve</button>
                      <button className="text-xs px-2 py-1 rounded bg-red-600 text-white cursor-pointer hover:bg-red-700 transition" onClick={() => act("reject")}>Reject</button>
                    </>
                  )}
                  {status === "accepted" && (
                    <button className="text-xs px-2 py-1 rounded bg-blue-600 text-white cursor-pointer hover:bg-blue-700 transition" onClick={() => act("book")}>Accept Assignment</button>
                  )}
                  {status === "booked" && (
                    <button className="text-xs px-2 py-1 rounded bg-purple-600 text-white cursor-pointer hover:bg-purple-700 transition" onClick={() => act("start")}>Start Transit</button>
                  )}
                  {status === "in_transit" && (
                    <button className="text-xs px-2 py-1 rounded bg-slate-600 text-white cursor-pointer hover:bg-slate-700 transition" onClick={() => act("deliver")}>Mark Delivered</button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
