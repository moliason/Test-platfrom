/* @vitest-environment happy-dom */
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import TestPriorityDonutChart from './TestPriorityDonutChart';
import TestProgressColumnChart from './TestProgressColumnChart';
import TestTypesDonutChart from './TestTypesDonutChart';

(globalThis as typeof globalThis & { React: typeof React }).React = React;
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { chartRenders } = vi.hoisted(() => ({ chartRenders: [] as { series?: unknown; type?: string }[] }));

vi.mock('next/dynamic', async () => {
  const ReactModule = await import('react');
  return {
    default: () => (props: { series?: unknown; type?: string }) => {
      chartRenders.push(props);
      return ReactModule.createElement('div');
    },
  };
});

describe('home charts', () => {
  it('renders each ApexChart once with ready-to-use data', async () => {
    chartRenders.length = 0;
    const container = document.createElement('div');
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <>
          <TestProgressColumnChart
            progressSeries={[{ name: 'Passed', data: [2] }]}
            progressCategories={['2026-07-16']}
            theme="light"
          />
          <TestTypesDonutChart
            typesCounts={[{ type: 0, count: 3 }]}
            caseTypes={[{ id: 1, name: '功能', sortOrder: 0, projectId: null }]}
            testTypeMessages={{}}
            theme="light"
          />
          <TestPriorityDonutChart
            priorityCounts={[{ priority: 2, count: 4 }]}
            priorityMessages={{ critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low' }}
            theme="light"
          />
        </>
      );
    });

    expect(chartRenders).toHaveLength(3);
    expect(chartRenders[0]).toMatchObject({ series: [{ name: 'Passed', data: [2] }], type: 'bar' });
    expect(chartRenders[1]).toMatchObject({ series: [3], type: 'donut' });
    expect(chartRenders[2]).toMatchObject({ series: [0, 0, 4, 0], type: 'donut' });
    await act(async () => root.unmount());
  });
});
