/* Loaded lazily: recharts is a large library only needed on the song page. */
import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTranslation } from "react-i18next";
import type { MachineType, ReviewCoreFragment } from "@/gql/graphql";
import { formatDay, shortDay } from "@/lib/dates";
import { MACHINES } from "@/lib/machines";
import { intlLocale } from "@/i18n";
import { DETAIL_PERCENT_FIELDS } from "@/components/reviews/form";

export function ScoreChart({
  machine,
  reviews,
}: {
  machine: MachineType;
  reviews: ReviewCoreFragment[];
}) {
  useTranslation(); // re-render on language change
  const locale = intlLocale();
  const sorted = [...reviews].sort((a, b) =>
    a.date === b.date ? a.createdAt.localeCompare(b.createdAt) : a.date.localeCompare(b.date),
  );
  const data = sorted.map((r, i) => ({
    i: String(i),
    date: r.date,
    label: shortDay(r.date, locale),
    score: r.score,
  }));
  // one label per day, in the middle of that day's bars
  const labelAt = new Set<number>();
  for (let s = 0; s < data.length;) {
    let e = s;
    while (e < data.length && data[e]!.date === data[s]!.date) e++;
    labelAt.add(Math.floor((s + e - 1) / 2));
    s = e;
  }
  const scores = data.map((d) => d.score);
  const average = scores.reduce((a, b) => a + b, 0) / scores.length;
  const color = MACHINES[machine].hex;
  return (
    <div
      className="h-[300px] w-full text-foreground"
      role="img"
      aria-label={`${MACHINES[machine].label}: ${scores.map((s) => s.toFixed(1)).join(", ")}`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 15, left: 0, bottom: 5 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="currentColor"
            opacity={0.15}
            vertical={false}
          />
          <XAxis
            dataKey="i"
            tick={{ fontSize: 12, fill: "currentColor" }}
            tickLine={false}
            tickFormatter={(i: string) => (labelAt.has(Number(i)) ? data[Number(i)]!.label : "")}
          />
          <YAxis
            domain={[
              Math.max(0, Math.floor(Math.min(...scores) - 5)),
              Math.min(100, Math.ceil(Math.max(...scores) + 5)),
            ]}
            tick={{ fontSize: 12, fill: "currentColor" }}
          />
          <Tooltip
            cursor={false}
            content={({ active, payload }) =>
              active && payload?.[0] ? (
                <div className="rounded-md border bg-card px-3 py-2 text-sm shadow">
                  <p className="font-medium">
                    {formatDay((payload[0].payload as { date: string }).date)}
                  </p>
                  <p style={{ color }}>{Number(payload[0].value).toFixed(3)}</p>
                </div>
              ) : null
            }
          />
          <ReferenceLine y={average} stroke={color} strokeDasharray="5 5" strokeOpacity={0.5} />
          <Bar dataKey="score" fill={color} fillOpacity={0.85} radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Average of each breakdown category over the takes that have it. */
export function BreakdownChart({
  machine,
  reviews,
}: {
  machine: MachineType;
  reviews: ReviewCoreFragment[];
}) {
  const { t } = useTranslation("reviews");
  const rows = DETAIL_PERCENT_FIELDS.map((f) => {
    const vals = reviews
      .map((r) => r.details?.[f])
      .filter((v): v is number => typeof v === "number");
    return {
      name: t(`details.${f}`),
      value: vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null,
    };
  }).filter((r) => r.value !== null);
  if (rows.length === 0) return null;
  return (
    <div className="h-[220px] w-full text-foreground">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout="vertical" margin={{ left: 20, right: 20 }}>
          <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12, fill: "currentColor" }} />
          <YAxis
            type="category"
            dataKey="name"
            width={90}
            tick={{ fontSize: 12, fill: "currentColor" }}
          />
          <Tooltip formatter={(v) => Number(v).toFixed(1)} />
          <Bar dataKey="value" fill={MACHINES[machine].hex} radius={[0, 3, 3, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
