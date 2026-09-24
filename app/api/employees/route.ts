import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { hashAttendancePin, validateAttendancePin } from '@/lib/employee-pin';

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

async function requireAdmin() {
    const session = await getSession();
    return session?.role === 'admin';
}

export async function GET() {
    if (!(await requireAdmin())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const employees = await prisma.employee.findMany({
        select: employeeSelect,
        orderBy: [{ isActive: 'desc' }, { employeeCode: 'asc' }],
    });
    return NextResponse.json(employees.map(toPublicEmployee));
}

export async function POST(request: Request) {
    if (!(await requireAdmin())) {
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

        let attendancePinHash: string | undefined;
        if (body.pin !== undefined && body.pin !== '') {
            if (!validateAttendancePin(body.pin)) {
                return NextResponse.json({ error: 'PINは4桁の数字で入力してください。' }, { status: 400 });
            }
            attendancePinHash = await hashAttendancePin(body.pin);
        }

        const employee = await prisma.employee.create({
            data: {
                employeeCode,
                name,
                locationId,
                employmentType,
                isActive: body.isActive !== false,
                ...(attendancePinHash ? { attendancePinHash } : {}),
            },
            select: employeeSelect,
        });
        return NextResponse.json(toPublicEmployee(employee), { status: 201 });
    } catch (error: any) {
        if (error?.code === 'P2002') {
            return NextResponse.json({ error: 'その社員コードはすでに使用されています。' }, { status: 409 });
        }
        console.error('Employee create error:', error);
        return NextResponse.json({ error: '従業員の登録に失敗しました。' }, { status: 500 });
    }
}
