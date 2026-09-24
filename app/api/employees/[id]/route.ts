import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const employeeSelect = {
    id: true,
    employeeCode: true,
    name: true,
    locationId: true,
    employmentType: true,
    isActive: true,
    attendancePinHash: true,
    createdAt: true,
    updatedAt: true,
    location: {
        select: { id: true, name: true, type: true }
    },
} as const;

function toPublicEmployee(employee: any) {
    const { attendancePinHash, ...publicEmployee } = employee;
    return { ...publicEmployee, pinConfigured: Boolean(attendancePinHash) };
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
    const session = await getSession();
    if (session?.role !== 'admin') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    try {
        const body = await request.json();
        const employeeCode = typeof body.employeeCode === 'string' ? body.employeeCode.trim() : '';
        const name = typeof body.name === 'string' ? body.name.trim() : '';
        const locationId = typeof body.locationId === 'string' ? body.locationId : '';
        const employmentType = typeof body.employmentType === 'string' && body.employmentType.trim()
            ? body.employmentType.trim()
            : null;

        if (!employeeCode || !name || !locationId) {
            return NextResponse.json({ error: '社員コード、氏名、所属拠点は必須です。' }, { status: 400 });
        }

        const location = await prisma.location.findUnique({ where: { id: locationId } });
        if (!location || !['店舗', '工場'].includes(location.type)) {
            return NextResponse.json({ error: '有効な店舗または工場を選択してください。' }, { status: 400 });
        }

        const employee = await prisma.employee.update({
            where: { id: params.id },
            data: {
                employeeCode,
                name,
                locationId,
                employmentType,
                ...(typeof body.isActive === 'boolean' ? { isActive: body.isActive } : {}),
            },
            select: employeeSelect,
        });
        return NextResponse.json(toPublicEmployee(employee));
    } catch (error: any) {
        if (error?.code === 'P2002') {
            return NextResponse.json({ error: 'その社員コードはすでに使用されています。' }, { status: 409 });
        }
        if (error?.code === 'P2025') {
            return NextResponse.json({ error: '従業員が見つかりません。' }, { status: 404 });
        }
        console.error('Employee update error:', error);
        return NextResponse.json({ error: '従業員の更新に失敗しました。' }, { status: 500 });
    }
}
