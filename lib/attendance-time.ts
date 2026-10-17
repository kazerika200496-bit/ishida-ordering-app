const MINUTE_MS = 60_000;
const QUARTER_HOUR_MS = 15 * MINUTE_MS;

export function getTokyoDateString(date: Date = new Date()): string {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Tokyo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
}

export function toAttendanceDate(dateString: string): Date {
    return new Date(`${dateString}T00:00:00.000Z`);
}

function roundToQuarterHour(date: Date, direction: 'up' | 'down'): Date {
    const minuteTimestamp = Math.floor(date.getTime() / MINUTE_MS) * MINUTE_MS;
    const roundedTimestamp = direction === 'up'
        ? Math.ceil(minuteTimestamp / QUARTER_HOUR_MS) * QUARTER_HOUR_MS
        : Math.floor(minuteTimestamp / QUARTER_HOUR_MS) * QUARTER_HOUR_MS;
    return new Date(roundedTimestamp);
}

export function roundClockIn(date: Date): Date {
    return roundToQuarterHour(date, 'up');
}

export function roundClockOut(date: Date): Date {
    return roundToQuarterHour(date, 'down');
}