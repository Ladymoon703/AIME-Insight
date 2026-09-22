/**
 * ECharts 图表配置构建器（纯函数，返回可序列化的 option 对象）。
 * 服务端构建，客户端 EChart 组件负责渲染。
 * 注意：option 会被序列化传给客户端，因此只能用字符串 formatter，不能含函数。
 */

export type ChartOption = Record<string, unknown>;

export interface FinancialSeries {
  name: string;
  unit: string;
  data: (number | null)[];
}

/** 财务趋势折线图：多系列 + 时间缩放 */
export function buildFinancialLineChart(input: {
  labels: string[];
  series: FinancialSeries[];
}): ChartOption {
  return {
    tooltip: { trigger: "axis" },
    legend: { data: input.series.map((s) => s.name), top: 0 },
    grid: { left: 64, right: 24, top: 36, bottom: 48 },
    xAxis: { type: "category", data: input.labels, boundaryGap: false },
    yAxis: [{ type: "value", name: "金额（亿元）" }],
    dataZoom: [
      { type: "inside", start: 0, end: 100 },
      { type: "slider", start: 0, end: 100, bottom: 6 },
    ],
    series: input.series.map((s) => ({
      name: s.name,
      type: "line",
      smooth: true,
      connectNulls: false,
      data: s.data,
      symbolSize: 6,
    })),
  };
}

/** 同行对比横向柱状图：直接显示数值（值已四舍五入到 2 位） */
export function buildPeerBarChart(input: {
  metricLabel: string;
  unit: string;
  names: string[];
  values: (number | null)[];
}): ChartOption {
  return {
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    grid: { left: 8, right: 60, top: 12, bottom: 24, containLabel: true },
    xAxis: {
      type: "value",
      axisLabel: { formatter: `{value}${input.unit}` },
    },
    yAxis: { type: "category", data: input.names, inverse: true },
    series: [
      {
        name: input.metricLabel,
        type: "bar",
        data: input.values,
        barMaxWidth: 22,
        label: { show: true, position: "right", formatter: `{c}${input.unit}` },
        itemStyle: { color: "#2f6bff", borderRadius: [0, 4, 4, 0] },
      },
    ],
  };
}

/** K 线 + 成交量联动图 */
export function buildKlineChart(input: {
  dates: string[];
  kdata: [number, number, number, number][]; // [open, close, low, high]
  volumes: number[];
}): ChartOption {
  return {
    tooltip: { trigger: "axis", axisPointer: { type: "cross" } },
    axisPointer: { link: [{ xAxisIndex: "all" }] },
    grid: [
      { left: 56, right: 16, top: 16, height: "58%" },
      { left: 56, right: 16, top: "76%", height: "16%" },
    ],
    xAxis: [
      { type: "category", data: input.dates, gridIndex: 0, boundaryGap: false },
      {
        type: "category",
        data: input.dates,
        gridIndex: 1,
        boundaryGap: false,
        axisLabel: { show: false },
      },
    ],
    yAxis: [
      { type: "value", scale: true, gridIndex: 0 },
      { type: "value", gridIndex: 1, axisLabel: { show: false } },
    ],
    dataZoom: [
      { type: "inside", xAxisIndex: [0, 1], start: 40, end: 100 },
      { type: "slider", xAxisIndex: [0, 1], bottom: 4, start: 40, end: 100 },
    ],
    series: [
      {
        name: "K线",
        type: "candlestick",
        data: input.kdata,
        itemStyle: {
          color: "#dc2626",
          color0: "#16a34a",
          borderColor: "#dc2626",
          borderColor0: "#16a34a",
        },
      },
      {
        name: "成交量",
        type: "bar",
        xAxisIndex: 1,
        yAxisIndex: 1,
        data: input.volumes,
        itemStyle: { color: "#94a3b8" },
      },
    ],
  };
}
