import { randomBytes, scrypt, timingSafeEqual } from 'crypto';

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

export function verifyAttendancePin(pin: string, hash: string): Promise<boolean> {
    if (!validateAttendancePin(pin) || !hash || typeof hash !== 'string') {
        return Promise.resolve(false);
    }

    const parts = hash.split('$');
    if (parts.length !== 3 || parts[0] !== 'scrypt') {
        return Promise.resolve(false);
    }

    const salt = parts[1];
    const targetKeyHex = parts[2];

    return new Promise((resolve) => {
        scrypt(pin, salt, KEY_LENGTH, (error, derivedKey) => {
            if (error) {
                resolve(false);
                return;
            }
            const derivedKeyHex = derivedKey.toString('hex');
            const targetBuffer = Buffer.from(targetKeyHex, 'hex');
            const derivedBuffer = Buffer.from(derivedKeyHex, 'hex');
            if (targetBuffer.length !== derivedBuffer.length) {
                resolve(false);
                return;
            }
            resolve(timingSafeEqual(targetBuffer, derivedBuffer));
        });
    });
}

export const attendancePinLength = PIN_LENGTH;
