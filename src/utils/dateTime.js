const IST_OFFSET_SECONDS = 5.5 * 60 * 60;

function to2(value) {
  return String(value).padStart(2, '0');
}

export function formatDateInput(date) {
  const year = date.getFullYear();
  const month = to2(date.getMonth() + 1);
  const day = to2(date.getDate());
  return `${year}-${month}-${day}`;
}

export function shiftDays(date, delta) {
  const clone = new Date(date);
  clone.setDate(clone.getDate() + delta);
  return clone;
}

export function getDefaultHistoryRange() {
  const end = new Date();
  const start = shiftDays(end, -30);

  return {
    startDate: formatDateInput(start),
    endDate: formatDateInput(end),
  };
}

export function enforceRangeLimit(startDate, endDate) {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);

  if (start > end) {
    return { startDate: endDate, endDate: startDate };
  }

  const maxRangeDays = 365 * 2;
  const days = Math.round((end - start) / 86400000);

  if (days <= maxRangeDays) {
    return { startDate, endDate };
  }

  const adjustedStart = new Date(end);
  adjustedStart.setDate(adjustedStart.getDate() - maxRangeDays);

  return {
    startDate: formatDateInput(adjustedStart),
    endDate,
  };
}

function parseNoZoneIso(isoText) {
  const [datePart, timePart] = isoText.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute] = (timePart || '00:00').split(':').map(Number);

  return { year, month, day, hour, minute };
}

export function convertLocationTimeToIST(isoText, locationOffsetSeconds = 0) {
  if (!isoText) {
    return { label: 'N/A', minutesOfDay: null };
  }

  const parsed = parseNoZoneIso(isoText);
  const utcMillis =
    Date.UTC(parsed.year, parsed.month - 1, parsed.day, parsed.hour, parsed.minute) -
    locationOffsetSeconds * 1000;

  const istDate = new Date(utcMillis + IST_OFFSET_SECONDS * 1000);
  const istHour = istDate.getUTCHours();
  const istMinute = istDate.getUTCMinutes();

  return {
    label: `${to2(istHour)}:${to2(istMinute)} IST`,
    minutesOfDay: istHour * 60 + istMinute,
  };
}

export function formatHourLabel(isoText) {
  return isoText?.slice(11, 16) || '--:--';
}

export function formatDateLabel(isoText) {
  const [year, month, day] = isoText.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function sameDay(isoText, dateInput) {
  return typeof isoText === 'string' && isoText.startsWith(dateInput);
}
