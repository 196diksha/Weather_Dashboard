const FIVE_MINUTES = 5 * 60 * 1000;
const responseCache = new Map();

function createUrl(base, params) {
  const url = new URL(base);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });
  return url.toString();
}

async function fetchJson(url) {
  const cached = responseCache.get(url);
  const now = Date.now();

  if (cached && now - cached.timestamp < FIVE_MINUTES) {
    return cached.data;
  }

  const response = await fetch(url);
  if (!response.ok) {
    let reason = '';

    try {
      const errorPayload = await response.json();
      reason = errorPayload?.reason || '';
    } catch {
      reason = '';
    }

    throw new Error(
      `Open-Meteo request failed: ${response.status}${reason ? ` - ${reason}` : ''}`,
    );
  }

  const data = await response.json();
  responseCache.set(url, { timestamp: now, data });
  return data;
}

export async function reverseGeocode(latitude, longitude) {
  const url = createUrl('https://geocoding-api.open-meteo.com/v1/reverse', {
    latitude,
    longitude,
    count: 1,
    language: 'en',
    format: 'json',
  });

  const data = await fetchJson(url);
  const place = data?.results?.[0];

  if (!place) {
    return 'Detected Location';
  }

  const parts = [place.name, place.admin1, place.country].filter(Boolean);
  return parts.join(', ');
}

export async function fetchCurrentAndHourlyWeather(latitude, longitude) {
  const weatherUrl = createUrl('https://api.open-meteo.com/v1/forecast', {
    latitude,
    longitude,
    current: 'temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m',
    hourly:
      'temperature_2m,relative_humidity_2m,precipitation,visibility,wind_speed_10m,precipitation_probability,uv_index',
    daily:
      'temperature_2m_max,temperature_2m_min,precipitation_sum,uv_index_max,sunrise,sunset,wind_speed_10m_max,precipitation_probability_max',
    timezone: 'auto',
    past_days: 7,
    forecast_days: 7,
  });

  const airUrl = createUrl('https://air-quality-api.open-meteo.com/v1/air-quality', {
    latitude,
    longitude,
    hourly:
      'us_aqi,pm10,pm2_5,carbon_monoxide,carbon_dioxide,nitrogen_dioxide,sulphur_dioxide',
    timezone: 'auto',
    past_days: 7,
    forecast_days: 7,
  });

  const [weather, air] = await Promise.all([fetchJson(weatherUrl), fetchJson(airUrl)]);
  return { weather, air };
}

export async function fetchHistoricalWeather(latitude, longitude, startDate, endDate) {
  const weatherUrl = createUrl('https://archive-api.open-meteo.com/v1/archive', {
    latitude,
    longitude,
    start_date: startDate,
    end_date: endDate,
    daily:
      'temperature_2m_mean,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_sum,wind_speed_10m_max,wind_direction_10m_dominant',
    timezone: 'auto',
  });

  const airUrl = createUrl('https://air-quality-api.open-meteo.com/v1/air-quality', {
    latitude,
    longitude,
    start_date: startDate,
    end_date: endDate,
    hourly: 'pm10,pm2_5',
    timezone: 'auto',
  });

  const [weather, air] = await Promise.all([fetchJson(weatherUrl), fetchJson(airUrl)]);
  return { weather, air };
}
