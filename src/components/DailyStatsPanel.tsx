import React, { useMemo } from 'react';
import { useSniperStore } from '@/store/sniper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Clock, Calendar } from 'lucide-react';

const ONE_DAY = 24 * 60 * 60 * 1000;
const ONE_WEEK = 7 * ONE_DAY;

export function DailyStatsPanel() {
  const { latestCreatedTokens } = useSniperStore();

  const stats = useMemo(() => {
    const now = Date.now();

    const tokens24h = latestCreatedTokens.filter(
      (t) => now - t.detectedAt <= ONE_DAY
    ).length;

    const tokens7d = latestCreatedTokens.filter(
      (t) => now - t.detectedAt <= ONE_WEEK
    ).length;

    // Calculate hourly distribution for last 24h
    const hourlyCounts = new Array(24).fill(0);
    latestCreatedTokens.forEach((token) => {
      const age = now - token.detectedAt;
      if (age <= ONE_DAY) {
        const hour = Math.floor((ONE_DAY - age) / (60 * 60 * 1000));
        if (hour >= 0 && hour < 24) {
          hourlyCounts[hour]++;
        }
      }
    });

    const maxHourly = Math.max(...hourlyCounts, 1);

    return { tokens24h, tokens7d, hourlyCounts, maxHourly };
  }, [latestCreatedTokens]);

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="h-4 w-4 text-neon-green" />
          新CA统计
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-border/50 bg-background/40 p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Clock className="h-3 w-3" />
              24小时
            </div>
            <div className="text-2xl font-bold text-neon-green">
              {stats.tokens24h}
            </div>
          </div>

          <div className="rounded-lg border border-border/50 bg-background/40 p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Calendar className="h-3 w-3" />
              7天
            </div>
            <div className="text-2xl font-bold text-neon-green">
              {stats.tokens7d}
            </div>
          </div>
        </div>

        {/* Hourly Chart */}
        <div className="space-y-1">
          <div className="text-xs text-muted-foreground">24小时分布</div>
          <div className="flex h-12 items-end gap-[2px]">
            {stats.hourlyCounts.map((count, i) => {
              const height = stats.maxHourly > 0
                ? Math.max((count / stats.maxHourly) * 100, count > 0 ? 10 : 0)
                : 0;

              return (
                <div
                  key={i}
                  className="relative flex-1 rounded-sm bg-neon-green/30 hover:bg-neon-green/50"
                  style={{ height: `${height}%` }}
                  title={`${i}:00 - ${count}个`}
                >
                  {count > 0 && (
                    <div
                      className="absolute -top-4 left-1/2 -translate-x-1/2 text-[9px] text-neon-green"
                    >
                      {count}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-[9px] text-muted-foreground">
            <span>0h</span>
            <span>12h</span>
            <span>24h</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}