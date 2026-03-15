import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";
import { parseDateValue } from "../../lib/utils";

interface Review {
  id: string;
  date: string;
  score: number;
  machineType: "DAM" | "JOYSOUND";
}

interface ScoreChartProps {
  machineType: "DAM" | "JOYSOUND";
  reviews: Review[];
}

const COLORS = {
  DAM: "#2563eb",
  JOYSOUND: "#9333ea",
} as const;

interface ChartDataPoint {
  idx: string;
  dateKey: string;
  date: string;
  fullDate: string;
  score: number;
}

const CustomTooltip = ({
  active,
  payload,
  machineType,
}: {
  active?: boolean;
  payload?: Array<{ payload: ChartDataPoint }>;
  machineType: "DAM" | "JOYSOUND";
}) => {
  if (!active || !payload?.[0]?.payload) return null;

  const item = payload[0].payload;

  return (
    <div
      className="rounded-lg border px-3 py-2 text-sm shadow-md"
      style={{
        backgroundColor: "hsl(var(--card))",
        borderColor: "hsl(var(--border))",
        color: "hsl(var(--card-foreground))",
      }}
    >
      <p className="font-medium">{item.fullDate}</p>
      <p style={{ color: COLORS[machineType] }}>
        {machineType}: {item.score.toFixed(3)}
      </p>
    </div>
  );
};

const ScoreChart = ({ machineType, reviews }: ScoreChartProps) => {
  const filteredReviews = reviews
    .filter((review) => review.machineType === machineType)
    .sort((a, b) => parseDateValue(a.date).getTime() - parseDateValue(b.date).getTime());

  if (filteredReviews.length === 0) {
    return null;
  }

  const data = filteredReviews.map((review, index) => {
    const reviewDate = parseDateValue(review.date);
    const dateKey = `${reviewDate.getFullYear()}-${String(reviewDate.getMonth() + 1).padStart(2, "0")}-${String(reviewDate.getDate()).padStart(2, "0")}`;

    return {
      idx: index.toString(),
      dateKey,
      date: reviewDate.toLocaleDateString("ja-JP", {
        month: "short",
        day: "numeric",
      }),
      fullDate: reviewDate.toLocaleDateString("ja-JP"),
      score: review.score,
    };
  });

  const labelIndices = new Set<number>();
  let startIndex = 0;
  while (startIndex < data.length) {
    let endIndex = startIndex;
    while (endIndex < data.length && data[endIndex].dateKey === data[startIndex].dateKey) {
      endIndex++;
    }
    labelIndices.add(Math.floor((startIndex + endIndex - 1) / 2));
    startIndex = endIndex;
  }

  const averageScore =
    filteredReviews.reduce((sum, review) => sum + review.score, 0) / filteredReviews.length;
  const allScores = filteredReviews.map((review) => review.score);
  const minScore = Math.max(0, Math.floor(Math.min(...allScores) - 5));
  const maxScore = Math.min(100, Math.ceil(Math.max(...allScores) + 5));

  return (
    <div className="h-[300px] w-full text-foreground">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 5, right: 15, left: 0, bottom: 5 }}
          barCategoryGap="15%"
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="currentColor"
            opacity={0.15}
            vertical={false}
          />
          <XAxis
            dataKey="idx"
            tick={{ fontSize: 12, fill: "currentColor" }}
            stroke="currentColor"
            opacity={0.5}
            tickLine={false}
            tickFormatter={(idx: string) => {
              const index = parseInt(idx, 10);
              return labelIndices.has(index) ? data[index].date : "";
            }}
          />
          <YAxis
            domain={[minScore, maxScore]}
            tick={{ fontSize: 12, fill: "currentColor" }}
            stroke="currentColor"
            opacity={0.5}
          />
          <Tooltip content={<CustomTooltip machineType={machineType} />} cursor={false} />
          <ReferenceLine
            y={averageScore}
            stroke={COLORS[machineType]}
            strokeDasharray="5 5"
            strokeOpacity={0.4}
          />
          <Bar dataKey="score" radius={[3, 3, 0, 0]}>
            {data.map((entry) => (
              <Cell
                key={entry.idx}
                fill={COLORS[machineType]}
                fillOpacity={0.85}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ScoreChart;
