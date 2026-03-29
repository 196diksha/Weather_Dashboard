export function average(values) {
  const cleaned = values.filter((value) => Number.isFinite(value));
  if (!cleaned.length) return null;
  const total = cleaned.reduce((sum, value) => sum + value, 0);
  return total / cleaned.length;
}

export function max(values) {
  const cleaned = values.filter((value) => Number.isFinite(value));
  if (!cleaned.length) return null;
  return Math.max(...cleaned);
}

export function sum(values) {
  const cleaned = values.filter((value) => Number.isFinite(value));
  if (!cleaned.length) return null;
  return cleaned.reduce((acc, value) => acc + value, 0);
}

export function pickAtOrNearNoon(times, values, day) {
  if (!times || !values) return null;

  const indexes = [];
  for (let index = 0; index < times.length; index += 1) {
    if (typeof times[index] === 'string' && times[index].startsWith(day)) {
      indexes.push(index);
    }
  }

  if (!indexes.length) return null;

  const targetMinutes = 12 * 60;
  let bestIndex = indexes[0];
  let bestDistance = Number.POSITIVE_INFINITY;

  indexes.forEach((index) => {
    const timePart = times[index].slice(11, 16);
    const [hour, minute] = timePart.split(':').map(Number);
    const currentMinutes = hour * 60 + minute;
    const distance = Math.abs(currentMinutes - targetMinutes);

    if (distance < bestDistance) {
      bestIndex = index;
      bestDistance = distance;
    }
  });

  const value = values[bestIndex];
  return Number.isFinite(value) ? value : null;
}

export function extractDayValues(times = [], values = [], day) {
  const result = [];

  for (let index = 0; index < times.length; index += 1) {
    if (typeof times[index] === 'string' && times[index].startsWith(day)) {
      const value = values[index];
      if (Number.isFinite(value)) {
        result.push(value);
      }
    }
  }

  return result;
}

export function pairDayData(times = [], dataSeries = {}) {
  const map = new Map();

  times.forEach((time, index) => {
    const day = time.slice(0, 10);
    if (!map.has(day)) {
      map.set(day, []);
    }

    const record = { time };
    Object.entries(dataSeries).forEach(([key, values]) => {
      record[key] = values?.[index] ?? null;
    });

    map.get(day).push(record);
  });

  return map;
}

export function convertTemp(value, unit) {
  if (!Number.isFinite(value)) return null;
  return unit === 'F' ? value * (9 / 5) + 32 : value;
}

export function formatValue(value, decimals = 1) {
  if (!Number.isFinite(value)) return 'N/A';
  return value.toFixed(decimals);
}
