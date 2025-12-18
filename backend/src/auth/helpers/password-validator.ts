export interface PasswordStrength {
  isStrong: boolean;
  errors: string[];
  score: number; // 0-100
}

export class PasswordValidator {
  static validate(password: string): PasswordStrength {
    const errors: string[] = [];
    let score = 0;

    // Length check
    if (password.length < 12) {
      errors.push('Must be at least 12 characters');
    } else {
      score += 25;
      if (password.length >= 16) score += 10; // Bonus for longer passwords
    }

    // Uppercase check
    if (!/[A-Z]/.test(password)) {
      errors.push('Must contain at least one uppercase letter');
    } else {
      score += 20;
    }

    // Lowercase check
    if (!/[a-z]/.test(password)) {
      errors.push('Must contain at least one lowercase letter');
    } else {
      score += 20;
    }

    // Number check
    if (!/[0-9]/.test(password)) {
      errors.push('Must contain at least one number');
    } else {
      score += 15;
    }

    // Special character check
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Must contain at least one special character');
    } else {
      score += 15;
    }

    // Common passwords check
    const commonPasswords = [
      'password',
      'password123',
      '123456',
      '12345678',
      'qwerty',
      'admin',
      'letmein',
      'welcome',
      'fleetpass',
    ];

    if (commonPasswords.some((weak) => password.toLowerCase().includes(weak))) {
      errors.push('Common passwords are not allowed');
      score = Math.max(0, score - 50); // Heavy penalty
    }

    // Entropy bonus (variety of characters)
    const uniqueChars = new Set(password.split('')).size;
    if (uniqueChars >= 8) score += 5;

    return {
      isStrong: errors.length === 0,
      errors,
      score: Math.min(100, score),
    };
  }

  static getStrengthLabel(score: number): string {
    if (score >= 90) return 'Very Strong';
    if (score >= 70) return 'Strong';
    if (score >= 50) return 'Moderate';
    if (score >= 30) return 'Weak';
    return 'Very Weak';
  }
}
