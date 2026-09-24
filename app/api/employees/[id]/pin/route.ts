import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { hashAttendancePin, validateAttendancePin } from '@/lib/employee-pin';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
    const session = await getSession();
    if (session?.role !== 'admin') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    try {
        const body = await request.json();
        if (!validateAttendancePin(body.pin)) {
            return NextResponse.json({ error: 'PINは4桁の数字で入力してください。' }, { status: 400 });
        }

        await prisma.employee.update({
            where: { id: params.id },
            data: { attendancePinHash: await hashAttendancePin(body.pin) },
        });
        return NextResponse.json({ success: true, pinConfigured: true });
    } catch (error: any) {
        if (error?.code === 'P2025') {
            return NextResponse.json({ error: '従業員が見つかりません。' }, { status: 404 });
        }
        console.error('Employee PIN update error:', error);
        return NextResponse.json({ error: 'PINの設定に失敗しました。' }, { status: 500 });
    }
}
