import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { getTokyoDateString, roundClockIn, roundClockOut, toAttendanceDate } from '@/lib/attendance-time';

export const dynamic = 'force-dynamic';

function isDateString(value: unknown): value is string {
    return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function dateValue(value: string) {
    return toAttendanceDate(value);
}

async function requireAdmin() {
    const session = await getSession();
    return session?.role === 'admin';
}

const attendanceInclude = {
    employee: { select: { id: true, employeeCode: true, name: true, isActive: true } },
    location: { select: { id: true, name: true, type: true } },
} as const;

export async function GET(request: Request) {
    if (!(await requireAdmin())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const date = new URL(request.url).searchParams.get('date') || getTokyoDateString();
    if (!isDateString(date)) {
        return NextResponse.json({ error: '日付の形式が正しくありません。' }, { status: 400 });
    }

    const records = await prisma.attendanceRecord.findMany({
        where: { date: dateValue(date) },
        include: attendanceInclude,
        orderBy: { employee: { employeeCode: 'asc' } },
    });
    return NextResponse.json(records);
}

export async function POST(request: Request) {
    if (!(await requireAdmin())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    try {
        const body = await request.json();
        const employeeId = typeof body.employeeId === 'string' ? body.employeeId : '';
        const action = body.action;
        const date = body.date || getTokyoDateString();

        if (!employeeId || !['clock-in', 'clock-out'].includes(action) || !isDateString(date)) {
            return NextResponse.json({ error: '従業員、操作、日付を正しく指定してください。' }, { status: 400 });
        }

        const employee = await prisma.employee.findUnique({
            where: { id: employeeId },
            select: { id: true, isActive: true, locationId: true },
        });
        if (!employee) {
            return NextResponse.json({ error: '従業員が登録されていません。' }, { status: 404 });
        }
        if (!employee.isActive) {
            return NextResponse.json({ error: '退職者は新規打刻できません。' }, { status: 400 });
        }

        const recordDate = dateValue(date);
        const existing = await prisma.attendanceRecord.findUnique({
            where: { employeeId_date: { employeeId, date: recordDate } },
        });

        if (action === 'clock-in') {
            if (existing) {
                return NextResponse.json({ error: 'この従業員はすでに出勤済みです。' }, { status: 409 });
            }
            const clockIn = new Date();
            const record = await prisma.attendanceRecord.create({
                data: {
                    employeeId,
                    locationId: employee.locationId,
                    date: recordDate,
                    clockIn,
                    roundedClockIn: roundClockIn(clockIn),
                    status: 'WORKING',
                },
                include: attendanceInclude,
            });
            return NextResponse.json(record, { status: 201 });
        }

        if (!existing) {
            return NextResponse.json({ error: '出勤記録がないため退勤できません。' }, { status: 400 });
        }
        if (!existing.clockIn) {
            return NextResponse.json({ error: '出勤前のため退勤できません。' }, { status: 400 });
        }
        if (existing.clockOut) {
            return NextResponse.json({ error: 'この従業員はすでに退勤済みです。' }, { status: 409 });
        }

        const breakMinutes = body.breakMinutes === undefined ? 0 : Number(body.breakMinutes);
        if (!Number.isInteger(breakMinutes) || breakMinutes < 0) {
            return NextResponse.json({ error: '休憩分数は0以上の整数で入力してください。' }, { status: 400 });
        }

        const clockOut = new Date();
        const record = await prisma.attendanceRecord.update({
            where: { id: existing.id },
            data: {
                clockOut,
                roundedClockOut: roundClockOut(clockOut),
                breakMinutes,
                status: 'COMPLETED',
            },
            include: attendanceInclude,
        });
        return NextResponse.json(record);
    } catch (error: any) {
        if (error?.code === 'P2002') {
            return NextResponse.json({ error: 'この日の勤怠はすでに登録されています。' }, { status: 409 });
        }
        console.error('Attendance API error:', error);
        return NextResponse.json({ error: '勤怠の保存に失敗しました。' }, { status: 500 });
    }
}
