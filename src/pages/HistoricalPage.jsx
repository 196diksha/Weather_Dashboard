import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchHistoricalWeather } from '../api/openMeteo';
import ChartCard from '../components/ChartCard';
import ErrorState from '../components/ErrorState';
import LoadingState from '../components/LoadingState';
import MetricCard from '../components/MetricCard';
import { average, formatValue, max, sum } from '../utils/aggregation';
import {
  convertLocationTimeToIST,
  enforceRangeLimit,
  formatDateInput,
  formatDateLabel,
  getDefaultHistoryRange,
} from '../utils/dateTime';

const MAX_RANGE_DAYS = 365 * 2;

function buildCartesianOption({ labels, leftAxisName, series, yAxis, secondaryAxis }) {
  const labelInterval = labels.length > 12 ? Math.ceil(labels.length / 9) : 0;

  return {
    animation: false,
    grid: { top: 18, right: secondaryAxis ? 48 : 20, left: 42, bottom: 52, containLabel: true },
    tooltip: { trigger: 'axis' },
    legend: { show: false },
    xAxis: {
      type: 'category',
      data: labels,
      axisLabel: { interval: labelInterval ? labelInterval - 1 : 0 },
    },
    yAxis: [
      {
        type: 'value',
        name: leftAxisName,
        nameLocation: 'middle',
        nameGap: 45,
        ...(yAxis || {}),
      },
      ...(secondaryAxis
        ? [
            {
              type: 'value',
              name: secondaryAxis.name,
              nameLocation: 'middle',
              nameGap: 40,
              position: 'right',
              min: secondaryAxis.min,
              max: secondaryAxis.max,
            },
          ]
        : []),
    ],
    dataZoom: [
      { type: 'inside', moveOnMouseMove: true, zoomOnMouseWheel: true },
      { type: 'slider', height: 14, bottom: 14 },
    ],
    series: series.map((entry) => ({
      name: entry.name,
      type: entry.type || 'line',
      data: entry.data,
      yAxisIndex: entry.yAxisIndex || 0,
      showSymbol: false,
      smooth: entry.type !== 'bar',
      lineStyle: { width: 2 },
      itemStyle: { color: entry.color },
      areaStyle: entry.area ? { opacity: 0.1 } : undefined,
      barMaxWidth: 18,
      emphasis: { focus: 'series' },
    })),
  };
}

function toCompassDirection(degrees) {
  if (!Number.isFinite(degrees)) return 'N/A';
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(degrees / 45) % 8;
  return dirs[index];
}

function circularMeanDirection(values) {
  const cleaned = values.filter((value) => Number.isFinite(value));
  if (!cleaned.length) return null;

  const radians = cleaned.map((deg) => (deg * Math.PI) / 180);
  const x = radians.reduce((acc, rad) => acc + Math.cos(rad), 0) / cleaned.length;
  const y = radians.reduce((acc, rad) => acc + Math.sin(rad), 0) / cleaned.length;

  let angle = (Math.atan2(y, x) * 180) / Math.PI;
  if (angle < 0) angle += 360;

  return angle;
}

export default function HistoricalPage({ coords }) {
  const defaults = useMemo(() => getDefaultHistoryRange(), []);
  const [startDate, setStartDate] = useState(defaults.startDate);
  const [endDate, setEndDate] = useState(defaults.endDate);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [payload, setPayload] = useState(null);

  const applyRange = useCallback((nextStart, nextEnd) => {
    const limited = enforceRangeLimit(nextStart, nextEnd);
    setStartDate(limited.startDate);
    setEndDate(limited.endDate);
  }, []);

  const loadData = useCallback(async () => {
    if (!coords) return;

    setLoading(true);
    setError('');

    try {
      const result = await fetchHistoricalWeather(coords.latitude, coords.longitude, startDate, endDate);
      setPayload(result);
    } catch (requestError) {
      setError(requestError.message || 'Could not load historical weather data.');
    } finally {
      setLoading(false);
    }
  }, [coords, endDate, startDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const derived = useMemo(() => {
    if (!payload) return null;

    const weatherDaily = payload.weather.daily || {};
    const airHourly = payload.air.hourly || {};

    const airByDay = new Map();

    (airHourly.time || []).forEach((time, index) => {
      const day = time.slice(0, 10);
      if (!airByDay.has(day)) {
        airByDay.set(day, {
          pm10: [],
          pm25: [],
        });
      }

      const bucket = airByDay.get(day);
      bucket.pm10.push(airHourly.pm10?.[index]);
      bucket.pm25.push(airHourly.pm2_5?.[index]);
    });

    const utcOffset = payload.weather.utc_offset_seconds || 0;

    const rows = (weatherDaily.time || []).map((day, index) => {
      const airBucket = airByDay.get(day) || { pm10: [], pm25: [] };
      const sunrise = convertLocationTimeToIST(weatherDaily.sunrise?.[index], utcOffset);
      const sunset = convertLocationTimeToIST(weatherDaily.sunset?.[index], utcOffset);

      return {
        day,
        dayLabel: formatDateLabel(day),
        tempMean: weatherDaily.temperature_2m_mean?.[index],
        tempMax: weatherDaily.temperature_2m_max?.[index],
        tempMin: weatherDaily.temperature_2m_min?.[index],
        precipitation: weatherDaily.precipitation_sum?.[index],
        windSpeedMax: weatherDaily.wind_speed_10m_max?.[index],
        windDirection: weatherDaily.wind_direction_10m_dominant?.[index],
        sunriseMinutes: sunrise.minutesOfDay,
        sunriseLabel: sunrise.label,
        sunsetMinutes: sunset.minutesOfDay,
        sunsetLabel: sunset.label,
        pm10: average(airBucket.pm10),
        pm25: average(airBucket.pm25),
      };
    });

    const dominantDirectionDegrees = circularMeanDirection(rows.map((row) => row.windDirection));

    return {
      rows,
      summary: {
        rangeDays: rows.length,
        precipitationTotal: sum(rows.map((row) => row.precipitation)),
        tempMeanOverall: average(rows.map((row) => row.tempMean)),
        windMaxOverall: max(rows.map((row) => row.windSpeedMax)),
        dominantDirectionDegrees,
        dominantDirectionCardinal: toCompassDirection(dominantDirectionDegrees),
      },
    };
  }, [payload]);

  if (!coords) {
    return <LoadingState message="Requesting your location permission..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadData} />;
  }

  if (loading && !payload) {
    return <LoadingState message="Loading historical dataset..." />;
  }

  if (!derived) {
    return null;
  }

  const rows = derived.rows;
  const labels = rows.map((row) => row.dayLabel);
  const summary = derived.summary;

  const temperatureOption = buildCartesianOption({
    labels,
    leftAxisName: 'deg C',
    series: [
      { name: 'Mean Temp', data: rows.map((row) => row.tempMean), color: '#0b69ee', area: true },
      { name: 'Max Temp', data: rows.map((row) => row.tempMax), color: '#e94e2d' },
      { name: 'Min Temp', data: rows.map((row) => row.tempMin), color: '#26734d' },
    ],
  });

  const sunriseSunsetOption = buildCartesianOption({
    labels,
    leftAxisName: 'IST Time',
    yAxis: {
      min: 0,
      max: 1440,
      axisLabel: {
        formatter: (value) => {
          const h = String(Math.floor(value / 60)).padStart(2, '0');
          const m = String(Math.round(value % 60)).padStart(2, '0');
          return `${h}:${m}`;
        },
      },
    },
    series: [
      { name: 'Sunrise (IST)', data: rows.map((row) => row.sunriseMinutes), color: '#f59e0b' },
      { name: 'Sunset (IST)', data: rows.map((row) => row.sunsetMinutes), color: '#cc5500' },
    ],
  });

  const precipitationOption = buildCartesianOption({
    labels,
    leftAxisName: 'mm',
    series: [{ name: 'Precipitation Total', type: 'bar', data: rows.map((row) => row.precipitation), color: '#2d7ff9' }],
  });

  const windOption = buildCartesianOption({
    labels,
    leftAxisName: 'km/h',
    secondaryAxis: { name: 'deg', min: 0, max: 360 },
    series: [
      { name: 'Max Wind Speed', data: rows.map((row) => row.windSpeedMax), color: '#0ea5a6' },
      {
        name: 'Dominant Wind Direction',
        type: 'bar',
        data: rows.map((row) => row.windDirection),
        color: '#6f42c1',
        yAxisIndex: 1,
      },
    ],
  });

  const airOption = buildCartesianOption({
    labels,
    leftAxisName: 'ug/m3',
    series: [
      { name: 'PM10', data: rows.map((row) => row.pm10), color: '#c62828' },
      { name: 'PM2.5', data: rows.map((row) => row.pm25), color: '#f57c00' },
    ],
  });

  const today = formatDateInput(new Date());

  return (
    <section className="content-stack">
      <div className="control-row range-row">
        <label htmlFor="historyStart">Start Date</label>
        <input
          id="historyStart"
          type="date"
          value={startDate}
          max={today}
          onChange={(event) => applyRange(event.target.value, endDate)}
        />

        <label htmlFor="historyEnd">End Date</label>
        <input
          id="historyEnd"
          type="date"
          value={endDate}
          max={today}
          onChange={(event) => applyRange(startDate, event.target.value)}
        />
      </div>

      <p className="range-note">
        Date range limited to {MAX_RANGE_DAYS} days (2 years). Sunrise and sunset are displayed in IST.
      </p>

      <div className="metric-grid">
        <MetricCard title="Range Length" value={String(summary.rangeDays)} unit="days" />
        <MetricCard title="Total Precipitation" value={formatValue(summary.precipitationTotal, 1)} unit="mm" />
        <MetricCard title="Overall Mean Temp" value={formatValue(summary.tempMeanOverall, 1)} unit="deg C" />
        <MetricCard title="Max Wind Speed" value={formatValue(summary.windMaxOverall, 1)} unit="km/h" />
        <MetricCard
          title="Dominant Wind Direction"
          value={formatValue(summary.dominantDirectionDegrees, 0)}
          unit="deg"
          hint={summary.dominantDirectionCardinal}
        />
      </div>

      <div className="charts-grid">
        <ChartCard
          title="Temperature Trends"
          subtitle={`${startDate} to ${endDate}`}
          legendItems={[
            { name: 'Mean Temp', color: '#0b69ee' },
            { name: 'Max Temp', color: '#e94e2d' },
            { name: 'Min Temp', color: '#26734d' },
          ]}
          option={temperatureOption}
          points={rows.length}
        />
        <ChartCard
          title="Sunrise and Sunset (IST)"
          subtitle={`${startDate} to ${endDate}`}
          legendItems={[
            { name: 'Sunrise (IST)', color: '#f59e0b' },
            { name: 'Sunset (IST)', color: '#cc5500' },
          ]}
          option={sunriseSunsetOption}
          points={rows.length}
        />
        <ChartCard
          title="Precipitation Totals"
          subtitle={`${startDate} to ${endDate}`}
          legendItems={[{ name: 'Precipitation Total', color: '#2d7ff9' }]}
          option={precipitationOption}
          points={rows.length}
        />
        <ChartCard
          title="Wind Speed and Direction"
          subtitle={`${startDate} to ${endDate}`}
          legendItems={[
            { name: 'Max Wind Speed', color: '#0ea5a6' },
            { name: 'Dominant Wind Direction', color: '#6f42c1' },
          ]}
          option={windOption}
          points={rows.length}
        />
        <ChartCard
          title="PM10 and PM2.5 Trends"
          subtitle={`${startDate} to ${endDate}`}
          legendItems={[
            { name: 'PM10', color: '#c62828' },
            { name: 'PM2.5', color: '#f57c00' },
          ]}
          option={airOption}
          points={rows.length}
        />
      </div>
    </section>
  );
}

