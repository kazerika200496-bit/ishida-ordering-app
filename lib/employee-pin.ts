import { randomBytes, scrypt } from 'crypto';

const PIN_LENGTH = 4;
const KEY_LENGTH = 64;

export function validateAttendancePin(pin: unknown): pin is string {
    return typeof pin === 'string' && /^\d{4}$/.test(pin);
}

export function hashAttendancePin(pin: string): Promise<string> {
    const salt = randomBytes(16).toString('hex');
    return new Promise((resolve, reject) => {
        scrypt(pin, salt, KEY_LENGTH, (error, derivedKey) => {
            if (error) {
                reject(error);
                return;
            }
            resolve(`scrypt$${salt}$${derivedKey.toString('hex')}`);
        });
    });
}

export const attendancePinLength = PIN_LENGTH;
