import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { ProgressSeriesType } from '@/types/run';
import { testRunCaseStatus } from '@/config/selection';
import { ChartDataType } from '@/types/chart';
const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

type Props = {
  progressSeries: ProgressSeriesType[];
  progressCategories: string[];
  theme: string | undefined;
};

export default function TestProgressBarChart({ progressSeries, progressCategories, theme }: Props) {
  const chartData = useMemo<ChartDataType>(() => {
    const labelColor = theme === 'light' ? 'black' : 'white';

    return {
      series: progressSeries,
      options: {
        chart: {
          toolbar: {
            show: false,
          },
          stacked: true,
        },
        legend: {
          position: 'right',
          labels: {
            colors: testRunCaseStatus.map(() => labelColor),
          },
        },
        colors: testRunCaseStatus.map((status) => status.chartColor),
        xaxis: {
          type: 'datetime',
          categories: progressCategories,
          labels: {
            style: {
              colors: labelColor,
            },
          },
        },
        tooltip: {
          theme,
        },
      },
    };
  }, [progressSeries, progressCategories, theme]);

  return <Chart options={chartData.options} series={chartData.series} type="bar" width={'100%'} height={'100%'} />;
}
