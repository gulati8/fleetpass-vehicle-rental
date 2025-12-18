import { registerDecorator, ValidationOptions } from 'class-validator';

export function IsStrongPassword(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isStrongPassword',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        validate(value: any) {
          if (typeof value !== 'string') return false;

          // Minimum 12 characters (NIST recommends 8+, we go higher for security)
          if (value.length < 12) return false;

          // At least one uppercase letter
          if (!/[A-Z]/.test(value)) return false;

          // At least one lowercase letter
          if (!/[a-z]/.test(value)) return false;

          // At least one number
          if (!/[0-9]/.test(value)) return false;

          // At least one special character
          if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value))
            return false;

          // Check against common weak passwords
          const commonPasswords = [
            'password',
            'password123',
            '123456',
            '12345678',
            'qwerty',
            'qwerty123',
            'admin',
            'admin123',
            'letmein',
            'welcome',
            'welcome123',
            'fleetpass',
            'fleetpass123',
          ];

          if (
            commonPasswords.some((weak) => value.toLowerCase().includes(weak))
          ) {
            return false;
          }

          return true;
        },
        defaultMessage() {
          return 'Password must be at least 12 characters long and contain: uppercase letter, lowercase letter, number, and special character. Common passwords are not allowed.';
        },
      },
    });
  };
}
