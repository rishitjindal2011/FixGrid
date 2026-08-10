"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { type TimeSeriesPoint } from "@/lib/dashboard/analytics";

export function AnalyticsCharts({ data }: { data: TimeSeriesPoint[] }) {
  // Format dates for display
  const formattedData = useMemo(() => {
    return data.map((d) => {
      const dateObj = new Date(d.date);
      return {
        ...d,
        displayDate: dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        gmvPounds: d.gmv / 100,
        feesPounds: d.fees / 100,
      };
    });
  }, [data]);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-machined border border-hairline bg-chalk p-5 shadow-bench">
        <h3 className="mb-4 font-display text-sm uppercase tracking-wide text-enamel">
          New Signups (30 days)
        </h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={formattedData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis
                dataKey="displayDate"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "#64748B" }}
                minTickGap={20}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "#64748B" }}
                allowDecimals={false}
              />
              <Tooltip
                cursor={{ fill: "#F1F5F9" }}
                contentStyle={{ borderRadius: "4px", border: "1px solid #E2E8F0", fontSize: "14px" }}
              />
              <Bar dataKey="customers" name="Customers" stackId="a" fill="#1E293B" radius={[0, 0, 0, 0]} />
              <Bar dataKey="experts" name="Experts" stackId="a" fill="#0EA5E9" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-machined border border-hairline bg-chalk p-5 shadow-bench">
        <h3 className="mb-4 font-display text-sm uppercase tracking-wide text-enamel">
          Revenue (30 days)
        </h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={formattedData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorGmv" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1E293B" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="#1E293B" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorFees" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#059669" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis
                dataKey="displayDate"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "#64748B" }}
                minTickGap={20}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "#64748B" }}
                tickFormatter={(val) => `£${val}`}
              />
              <Tooltip
                contentStyle={{ borderRadius: "4px", border: "1px solid #E2E8F0", fontSize: "14px" }}
                formatter={(value: number) => [`£${value.toFixed(2)}`, undefined]}
              />
              <Area
                type="monotone"
                dataKey="gmvPounds"
                name="Gross Volume"
                stroke="#1E293B"
                fillOpacity={1}
                fill="url(#colorGmv)"
              />
              <Area
                type="monotone"
                dataKey="feesPounds"
                name="Platform Fees"
                stroke="#059669"
                fillOpacity={1}
                fill="url(#colorFees)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
