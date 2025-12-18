# Password Policy

## Requirements

FleetPass enforces strong password requirements for all user accounts:

### Minimum Requirements
- **Length**: At least 12 characters
- **Uppercase**: At least one uppercase letter (A-Z)
- **Lowercase**: At least one lowercase letter (a-z)
- **Numbers**: At least one digit (0-9)
- **Special Characters**: At least one special character (!@#$%^&*()_+-=[]{};"':|,.<>/?)

### Prohibited Passwords
The following are not allowed:
- Common passwords (password, 123456, qwerty, admin, etc.)
- Any password containing "password" or "fleetpass"
- Dictionary words without complexity

## Examples

❌ **Weak Passwords**:
- `password123` (too common)
- `12345678` (no letters or special characters)
- `Fleetpass1` (too short, contains app name)

✅ **Strong Passwords**:
- `MyFleet$Pass2024!`
- `Secure#Rental789`
- `Ve-ry$tr0ng!Pass`

## Frontend Integration

The backend provides a real-time validation endpoint:

```bash
POST /api/v1/auth/validate-password
{
  "password": "test"
}

Response:
{
  "isStrong": false,
  "strength": "Very Weak",
  "score": 15,
  "errors": [
    "Must be at least 12 characters",
    "Must contain at least one uppercase letter",
    ...
  ]
}
```

Use this to provide real-time feedback during registration.

## Security Rationale

### Why 12 Characters?
- NIST recommends minimum 8 characters
- We enforce 12 to provide additional security margin
- Longer passwords exponentially increase brute-force difficulty

### Why Complexity Requirements?
- Prevents simple dictionary attacks
- Forces use of varied character sets
- Increases password entropy

### Why Block Common Passwords?
- Top 10,000 most common passwords account for 90%+ of compromised accounts
- Even complex versions (Password123!) are in breach databases
- Proactive blocking prevents credential stuffing attacks

## Implementation Details

### Custom Validator
The `@IsStrongPassword()` decorator in `SignupDto` enforces all requirements at the validation layer, preventing weak passwords from reaching the database.

### Password Helper
The `PasswordValidator` class provides:
- Detailed validation with specific error messages
- Password strength scoring (0-100)
- Reusable validation logic for password change features

### Frontend Validation Endpoint
The `/auth/validate-password` endpoint allows frontend to provide real-time feedback as users type, improving UX without compromising security.

## Future Enhancements

Consider implementing:
1. **Password History**: Prevent reuse of last 5 passwords
2. **Breach Database Check**: Integration with Have I Been Pwned API
3. **Password Expiry**: Force password rotation every 90 days (for sensitive accounts)
4. **Multi-Factor Authentication**: Additional security layer beyond passwords
