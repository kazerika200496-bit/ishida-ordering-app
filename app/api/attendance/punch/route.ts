import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { validateAttendancePin, verifyAttendancePin } from '@/lib/employee-pin';

export const dynamic = 'force-dynamic';

function getTodayUtcDate(): Date {
    const dateStr = new Date().toISOString().slice(0, 10);
    return new Date(`${dateStr}T00:00:00.000Z`);
}

export async function GET(request: Request) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const locationId = session.locationId || searchParams.get('locationId');

    if (!locationId) {
        return NextResponse.json({ error: '所属店舗・工場が見つかりません。' }, { status: 400 });
    }

    const employees = await prisma.employee.findMany({
        where: {
            locationId,
            isActive: true,
        },
        select: {
            id: true,
            employeeCode: true,
            name: true,
            locationId: true,
            attendancePinHash: true,
        },
        orderBy: { employeeCode: 'asc' },
    });

    const today = getTodayUtcDate();
    const records = await prisma.attendanceRecord.findMany({
        where: {
            locationId,
            date: today,
        },
        select: {
            id: true,
            employeeId: true,
            clockIn: true,
            clockOut: true,
            breakMinutes: true,
            status: true,
        },
    });

    const recordMap = new Map(records.map(r => [r.employeeId, r]));

    const result = employees.map(emp => {
        const rec = recordMap.get(emp.id);
        return {
            id: emp.id,
            employeeCode: emp.employeeCode,
            name: emp.name,
            locationId: emp.locationId,
            pinConfigured: Boolean(emp.attendancePinHash),
            todayStatus: rec ? rec.status : 'NONE',
            clockIn: rec?.clockIn || null,
            clockOut: rec?.clockOut || null,
            breakMinutes: rec?.breakMinutes ?? 0,
        };
    });

    return NextResponse.json(result);
}

export async function POST(request: Request) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { employeeId, pin, action } = body;

        if (typeof employeeId !== 'string' || !employeeId) {
            return NextResponse.json({ error: '従業員IDを指定してください。' }, { status: 400 });
        }

        if (!validateAttendancePin(pin)) {
            return NextResponse.json({ error: 'PINは4桁の数字で入力してください。' }, { status: 400 });
        }

        if (!['clock-in', 'clock-out'].includes(action)) {
            return NextResponse.json({ error: '有効な打刻操作を指定してください。' }, { status: 400 });
        }

        const employee = await prisma.employee.findUnique({
            where: { id: employeeId },
            select: {
                id: true,
                name: true,
                locationId: true,
                isActive: true,
                attendancePinHash: true,
            },
        });

        if (!employee) {
            return NextResponse.json({ error: '従業員が見つかりません。' }, { status: 404 });
        }

        // Security check: restrict punch to employee's assigned location for store user
        if (session.role !== 'admin' && session.locationId !== employee.locationId) {
            return NextResponse.json({ error: '他店舗の従業員は打刻できません。' }, { status: 403 });
        }

        if (!employee.isActive) {
            return NextResponse.json({ error: '退職者は打刻できません。' }, { status: 400 });
        }

        if (!employee.attendancePinHash) {
            return NextResponse.json({ error: 'PINが設定されていません。管理者に設定を依頼してください。' }, { status: 400 });
        }

        const isPinValid = await verifyAttendancePin(pin, employee.attendancePinHash);
        if (!isPinValid) {
            return NextResponse.json({ error: 'PINコードが正しくありません。' }, { status: 401 });
        }

        const today = getTodayUtcDate();
        const existing = await prisma.attendanceRecord.findUnique({
            where: {
                employeeId_date: {
                    employeeId: employee.id,
                    date: today,
                },
            },
        });

        if (action === 'clock-in') {
            if (existing) {
                return NextResponse.json({ error: '本日はすでに出勤記録があります。' }, { status: 409 });
            }

            const record = await prisma.attendanceRecord.create({
                data: {
                    employeeId: employee.id,
                    locationId: employee.locationId,
                    date: today,
                    clockIn: new Date(),
                    status: 'WORKING',
                },
                select: {
                    id: true,
                    employeeId: true,
                    locationId: true,
                    date: true,
                    clockIn: true,
                    clockOut: true,
                    breakMinutes: true,
                    status: true,
                },
            });

            return NextResponse.json(
                { success: true, message: `${employee.name}さん、おはようございます！`, record },
                { status: 201 }
            );
        }

        // action === 'clock-out'
        if (!existing || !existing.clockIn) {
            return NextResponse.json({ error: '出勤記録がないため退勤できません。' }, { status: 400 });
        }

        if (existing.clockOut) {
            return NextResponse.json({ error: '本日はすでに退勤済みです。' }, { status: 409 });
        }

        const breakMinutes = body.breakMinutes === undefined ? 0 : Number(body.breakMinutes);
        if (!Number.isInteger(breakMinutes) || breakMinutes < 0) {
            return NextResponse.json({ error: '休憩分数は0以上の整数で入力してください。' }, { status: 400 });
        }

        const record = await prisma.attendanceRecord.update({
            where: { id: existing.id },
            data: {
                clockOut: new Date(),
                breakMinutes,
                status: 'COMPLETED',
            },
            select: {
                id: true,
                employeeId: true,
                locationId: true,
                date: true,
                clockIn: true,
                clockOut: true,
                breakMinutes: true,
                status: true,
            },
        });

        return NextResponse.json({
            success: true,
            message: `${employee.name}さん、お疲れ様でした！`,
            record,
        });
    } catch (error: any) {
        if (error?.code === 'P2002') {
            return NextResponse.json({ error: '本日はすでに出退勤が登録されています。' }, { status: 409 });
        }
        console.error('Attendance punch error:', error?.message || error);
        return NextResponse.json({ error: '打刻処理に失敗しました。' }, { status: 500 });
    }
}
