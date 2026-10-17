import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getTokyoDateString, roundClockIn, roundClockOut, toAttendanceDate } from '../lib/attendance-time';

function tokyoTime(date: Date): string {
    return new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Tokyo',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
    }).format(date);
}

test('clock-in rounds up by minute and ignores seconds and milliseconds', () => {
    assert.equal(tokyoTime(roundClockIn(new Date('2026-10-17T08:07:59.999+09:00'))), '08:15');
    assert.equal(tokyoTime(roundClockIn(new Date('2026-10-17T08:15:00.000+09:00'))), '08:15');
    assert.equal(tokyoTime(roundClockIn(new Date('2026-10-17T08:15:37.999+09:00'))), '08:15');
    assert.equal(tokyoTime(roundClockIn(new Date('2026-10-17T08:16:00.000+09:00'))), '08:30');
});

test('clock-out rounds down by minute and ignores seconds and milliseconds', () => {
    assert.equal(tokyoTime(roundClockOut(new Date('2026-10-17T17:52:59.999+09:00'))), '17:45');
    assert.equal(tokyoTime(roundClockOut(new Date('2026-10-17T18:00:00.000+09:00'))), '18:00');
    assert.equal(tokyoTime(roundClockOut(new Date('2026-10-17T18:00:45.999+09:00'))), '18:00');
});

test('attendance day uses the Tokyo calendar date, including around UTC midnight', () => {
    assert.equal(getTokyoDateString(new Date('2026-10-16T14:59:59.999Z')), '2026-10-16');
    assert.equal(getTokyoDateString(new Date('2026-10-16T15:00:00.000Z')), '2026-10-17');
    assert.equal(toAttendanceDate('2026-10-17').toISOString(), '2026-10-17T00:00:00.000Z');
});

test('short shifts can round clock-out to or before rounded clock-in', () => {
    const clockIn = new Date('2026-10-17T08:07:00.000+09:00');
    const beforeClockInBoundary = new Date('2026-10-17T08:14:59.999+09:00');
    const sameBoundary = new Date('2026-10-17T08:15:00.000+09:00');

    assert.equal(tokyoTime(roundClockIn(clockIn)), '08:15');
    assert.equal(tokyoTime(roundClockOut(beforeClockInBoundary)), '08:00');
    assert.ok(roundClockOut(beforeClockInBoundary) < roundClockIn(clockIn));
    assert.equal(tokyoTime(roundClockOut(sameBoundary)), '08:15');
    assert.equal(roundClockOut(sameBoundary).getTime(), roundClockIn(sameBoundary).getTime());
});