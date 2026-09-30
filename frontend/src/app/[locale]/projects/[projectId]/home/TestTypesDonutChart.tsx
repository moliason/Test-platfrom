import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { testTypes } from '@/config/selection';
import { CaseTypeOption, TestTypeMessages } from '@/types/testType';
import { CaseTypeCountType, ChartDataType } from '@/types/chart';
const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

type Props = {
  typesCounts: CaseTypeCountType[];
  caseTypes: CaseTypeOption[];
  testTypeMessages: TestTypeMessages;
  theme: string | undefined;
};

export default function TestTypesDonutChart({ typesCounts, caseTypes, testTypeMessages, theme }: Props) {
  const chartData = useMemo<ChartDataType>(() => {
    const series = caseTypes.map((entry) => {
      const found = typesCounts.find((count) => count.type === entry.sortOrder);
      return found ? found.count : 0;
    });
    const labels = caseTypes.map((entry) => {
      const builtInType = testTypes[entry.sortOrder];
      return builtInType ? (testTypeMessages[builtInType.uid] ?? builtInType.label) : entry.name;
    });
    const colors = caseTypes.map((entry) => testTypes[entry.sortOrder]?.chartColor ?? '#71717a');

    return {
      series,
      options: {
        labels,
        colors,
        legend: {
          labels: {
            colors: caseTypes.map(() => (theme === 'light' ? 'black' : 'white')),
          },
        },
      },
    };
  }, [typesCounts, caseTypes, theme, testTypeMessages]);

  return <Chart options={chartData.options} series={chartData.series} type="donut" width={'100%'} height={'100%'} />;
}
