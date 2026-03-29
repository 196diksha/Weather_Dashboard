import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchCurrentAndHourlyWeather } from '../api/openMeteo';
import ChartCard from '../components/ChartCard';
import ErrorState from '../components/ErrorState';
import LoadingState from '../components/LoadingState';
import MetricCard from '../components/MetricCard';
import {
  average,
  convertTemp,
  extractDayValues,
  formatValue,
  max,
  pickAtOrNearNoon,
} from '../utils/aggregation';
import { formatDateInput, formatHourLabel, sameDay } from '../utils/dateTime';

function buildSeriesOption({ labels, series, yAxisName }) {
  const labelInterval = labels.length > 12 ? Math.ceil(labels.length / 8) : 0;

  return {
    animation: false,
    grid: { top: 18, right: 20, left: 42, bottom: 52, containLabel: true },
    tooltip: { trigger: 'axis' },
    legend: { show: false },
    xAxis: {
      type: 'category',
      data: labels,
      axisLabel: { interval: labelInterval ? labelInterval - 1 : 0 },
    },
    yAxis: {
      type: 'value',
      name: yAxisName,
      nameLocation: 'middle',
      nameGap: 45,
    },
    dataZoom: [
      { type: 'inside', moveOnMouseMove: true, zoomOnMouseWheel: true },
      { type: 'slider', height: 14, bottom: 14 },
    ],
    series: series.map((entry) => ({
      name: entry.name,
      type: entry.type || 'line',
      data: entry.data,
      showSymbol: false,
      smooth: entry.type !== 'bar',
      lineStyle: { width: 2 },
      itemStyle: { color: entry.color },
      areaStyle: entry.area ? { opacity: 0.12 } : undefined,
      emphasis: { focus: 'series' },
      barMaxWidth: 16,
    })),
  };
}

const today = formatDateInput(new Date());

export default function CurrentWeatherPage({ coords }) {
  const [selectedDate, setSelectedDate] = useState(today);
  const [tempUnit, setTempUnit] = useState('C');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [payload, setPayload] = useState(null);

  const loadData = useCallback(async () => {
    if (!coords) return;

    setLoading(true);
    setError('');

    try {
      const result = await fetchCurrentAndHourlyWeather(coords.latitude, coords.longitude);
      setPayload(result);
    } catch (requestError) {
      setError(requestError.message || 'Could not load weather data.');
    } finally {
      setLoading(false);
    }
  }, [coords]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const availableDates = useMemo(() => payload?.weather?.daily?.time || [], [payload]);

  useEffect(() => {
    if (!availableDates.length) return;
    if (availableDates.includes(selectedDate)) return;

    if (availableDates.includes(today)) {
      setSelectedDate(today);
      return;
    }

    setSelectedDate(availableDates[availableDates.length - 1]);
  }, [availableDates, selectedDate]);

  const derived = useMemo(() => {
    if (!payload) return null;

    const weatherHourly = payload.weather.hourly || {};
    const weatherDaily = payload.weather.daily || {};
    const airHourly = payload.air.hourly || {};

    const dayIndex = weatherDaily.time?.indexOf(selectedDate) ?? -1;
    const weatherTimes = weatherHourly.time || [];
    const airTimes = airHourly.time || [];

    const airByTime = new Map();
    airTimes.forEach((time, index) => {
      airByTime.set(time, {
        usAqi: airHourly.us_aqi?.[index],
        pm10: airHourly.pm10?.[index],
        pm25: airHourly.pm2_5?.[index],
      });
    });

    const rows = [];
    weatherTimes.forEach((time, index) => {
      if (!sameDay(time, selectedDate)) return;
      const pm = airByTime.get(time);

      rows.push({
        timeLabel: formatHourLabel(time),
        temperatureC: weatherHourly.temperature_2m?.[index],
        humidity: weatherHourly.relative_humidity_2m?.[index],
        precipitation: weatherHourly.precipitation?.[index],
        visibility: weatherHourly.visibility?.[index],
        wind: weatherHourly.wind_speed_10m?.[index],
        pm10: pm?.pm10 ?? null,
        pm25: pm?.pm25 ?? null,
      });
    });

    const temperatureAtNoon = pickAtOrNearNoon(
      weatherTimes,
      weatherHourly.temperature_2m,
      selectedDate,
    );

    const isToday = selectedDate === today;
    const currentTempBase = isToday
      ? payload.weather.current?.temperature_2m
      : temperatureAtNoon;

    const humidityValues = rows.map((entry) => entry.humidity);

    const airAqiValues = extractDayValues(airTimes, airHourly.us_aqi, selectedDate);
    const pm10Values = extractDayValues(airTimes, airHourly.pm10, selectedDate);
    const pm25Values = extractDayValues(airTimes, airHourly.pm2_5, selectedDate);
    const coValues = extractDayValues(airTimes, airHourly.carbon_monoxide, selectedDate);
    const co2Values = extractDayValues(airTimes, airHourly.carbon_dioxide, selectedDate);
    const no2Values = extractDayValues(airTimes, airHourly.nitrogen_dioxide, selectedDate);
    const so2Values = extractDayValues(airTimes, airHourly.sulphur_dioxide, selectedDate);

    return {
      rows,
      metrics: {
        tempMin: weatherDaily.temperature_2m_min?.[dayIndex],
        tempMax: weatherDaily.temperature_2m_max?.[dayIndex],
        currentTemp: currentTempBase,
        precipitation: weatherDaily.precipitation_sum?.[dayIndex],
        humidity: average(humidityValues),
        uvIndex: weatherDaily.uv_index_max?.[dayIndex],
        sunrise: weatherDaily.sunrise?.[dayIndex]?.slice(11, 16) || 'N/A',
        sunset: weatherDaily.sunset?.[dayIndex]?.slice(11, 16) || 'N/A',
        windMax: weatherDaily.wind_speed_10m_max?.[dayIndex],
        precipProbabilityMax: weatherDaily.precipitation_probability_max?.[dayIndex],
        aqi: max(airAqiValues),
        pm10: average(pm10Values),
        pm25: average(pm25Values),
        co: average(coValues),
        co2: average(co2Values),
        no2: average(no2Values),
        so2: average(so2Values),
      },
    };
  }, [payload, selectedDate]);

  if (!coords) {
    return <LoadingState message="Requesting your location permission..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadData} />;
  }

  if (loading && !payload) {
    return <LoadingState />;
  }

  if (!derived) {
    return null;
  }

  const rows = derived.rows;
  const m = derived.metrics;

  const tempSymbol = tempUnit === 'C' ? 'deg C' : 'deg F';
  const temperatureSeries = rows.map((entry) => convertTemp(entry.temperatureC, tempUnit));

  const charts = [
    {
      title: `Temperature (${tempSymbol})`,
      yAxis: tempSymbol,
      series: [{ name: 'Temperature', data: temperatureSeries, color: '#0c6cf2', area: true }],
    },
    {
      title: 'Relative Humidity',
      yAxis: '%',
      series: [{ name: 'Humidity', data: rows.map((entry) => entry.humidity), color: '#0c9f89' }],
    },
    {
      title: 'Precipitation',
      yAxis: 'mm',
      series: [{ name: 'Precipitation', type: 'bar', data: rows.map((entry) => entry.precipitation), color: '#1677ff' }],
    },
    {
      title: 'Visibility',
      yAxis: 'm',
      series: [{ name: 'Visibility', data: rows.map((entry) => entry.visibility), color: '#7a52f4' }],
    },
    {
      title: 'Wind Speed (10m)',
      yAxis: 'km/h',
      series: [{ name: 'Wind Speed', data: rows.map((entry) => entry.wind), color: '#f06d25' }],
    },
    {
      title: 'PM10 and PM2.5',
      yAxis: 'ug/m3',
      series: [
        { name: 'PM10', data: rows.map((entry) => entry.pm10), color: '#d93b3b' },
        { name: 'PM2.5', data: rows.map((entry) => entry.pm25), color: '#ff9f1c' },
      ],
    },
  ];

  return (
    <section className="content-stack">
      <div className="control-row">
        <label htmlFor="selectedDate">Selected Date</label>
        <input
          id="selectedDate"
          type="date"
          value={selectedDate}
          min={availableDates[0]}
          max={availableDates[availableDates.length - 1]}
          onChange={(event) => setSelectedDate(event.target.value)}
        />

        <div className="toggle-group" role="radiogroup" aria-label="Temperature unit">
          <button
            type="button"
            className={tempUnit === 'C' ? 'active' : ''}
            onClick={() => setTempUnit('C')}
          >
            Celsius
          </button>
          <button
            type="button"
            className={tempUnit === 'F' ? 'active' : ''}
            onClick={() => setTempUnit('F')}
          >
            Fahrenheit
          </button>
        </div>
      </div>

      <div className="metric-grid">
        <MetricCard title="Temperature Min" value={formatValue(convertTemp(m.tempMin, tempUnit), 1)} unit={tempSymbol} />
        <MetricCard title="Temperature Max" value={formatValue(convertTemp(m.tempMax, tempUnit), 1)} unit={tempSymbol} />
        <MetricCard title="Temperature Current" value={formatValue(convertTemp(m.currentTemp, tempUnit), 1)} unit={tempSymbol} hint={selectedDate === today ? 'Current reading' : 'Nearest noon reading'} />
        <MetricCard title="Precipitation" value={formatValue(m.precipitation, 1)} unit="mm" />
        <MetricCard title="Relative Humidity" value={formatValue(m.humidity, 0)} unit="%" />
        <MetricCard title="UV Index" value={formatValue(m.uvIndex, 1)} />
        <MetricCard title="Sunrise" value={m.sunrise} />
        <MetricCard title="Sunset" value={m.sunset} />
        <MetricCard title="Max Wind Speed" value={formatValue(m.windMax, 1)} unit="km/h" />
        <MetricCard title="Precipitation Probability Max" value={formatValue(m.precipProbabilityMax, 0)} unit="%" />
        <MetricCard title="Air Quality Index (US AQI)" value={formatValue(m.aqi, 0)} />
        <MetricCard title="PM10" value={formatValue(m.pm10, 1)} unit="ug/m3" />
        <MetricCard title="PM2.5" value={formatValue(m.pm25, 1)} unit="ug/m3" />
        <MetricCard title="Carbon Monoxide (CO)" value={formatValue(m.co, 0)} unit="ug/m3" />
        <MetricCard title="Carbon Dioxide (CO2)" value={formatValue(m.co2, 0)} unit="ppm" />
        <MetricCard title="Nitrogen Dioxide (NO2)" value={formatValue(m.no2, 1)} unit="ug/m3" />
        <MetricCard title="Sulphur Dioxide (SO2)" value={formatValue(m.so2, 1)} unit="ug/m3" />
      </div>

      <div className="charts-grid">
        {charts.map((chart) => (
          <ChartCard
            key={chart.title}
            title={chart.title}
            subtitle={`Hourly values for ${selectedDate}`}
            legendItems={chart.series.map((entry) => ({ name: entry.name, color: entry.color }))}
            option={buildSeriesOption({
              labels: rows.map((entry) => entry.timeLabel),
              yAxisName: chart.yAxis,
              series: chart.series,
            })}
            points={rows.length}
          />
        ))}
      </div>
    </section>
  );
}


