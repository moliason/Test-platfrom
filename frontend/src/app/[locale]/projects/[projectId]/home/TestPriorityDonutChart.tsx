import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { priorities } from '@/config/selection';
import { CasePriorityCountType } from '@/types/chart';
import { PriorityMessages } from '@/types/priority';
import { ChartDataType } from '@/types/chart';
const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

type Props = {
  priorityCounts: CasePriorityCountType[];
  priorityMessages: PriorityMessages;
  theme: string | undefined;
};

export default function TestPriorityDonutChart({ priorityCounts, priorityMessages, theme }: Props) {
  const chartData = useMemo<ChartDataType>(() => {
    const series = priorities.map((_entry, index) => {
      const found = priorityCounts.find((count) => count.priority === index);
      return found ? found.count : 0;
    });

    return {
      series,
      options: {
        labels: priorities.map((entry) => priorityMessages[entry.uid]),
        colors: priorities.map((entry) => entry.chartColor),
        legend: {
          labels: {
            colors: priorities.map(() => (theme === 'light' ? 'black' : 'white')),
          },
        },
      },
    };
  }, [priorityCounts, priorityMessages, theme]);

  return <Chart options={chartData.options} series={chartData.series} type="donut" width={'100%'} height={'100%'} />;
}
