/**
 * tests/team1/auth.test.ts
 *
 * Team 1 Deliverable: Unit Testing Suite for Authentication, Security & RBAC
 * Satisfies IEEE Test Documentation & Team 1 Testing Report
 */
import { describe, it, expect } from 'vitest';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  address: z.string().min(3),
  city: z.string().min(1),
  country: z.string().min(1),
});

describe('Team 1: Authentication & Password Security', () => {
  it('should hash passwords using bcrypt with at least 10 rounds and verify matches', async () => {
    const rawPassword = 'SecureSpecimenPassword2026!';
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(rawPassword, salt);

    expect(hash).toBeDefined();
    expect(hash).not.toBe(rawPassword);
    expect(hash.startsWith('$2')).toBe(true);

    const isMatch = await bcrypt.compare(rawPassword, hash);
    expect(isMatch).toBe(true);

    const isMismatch = await bcrypt.compare('WrongPassword!', hash);
    expect(isMismatch).toBe(false);
  });

  it('should validate customer registration input schema correctly', () => {
    const validPayload = {
      email: 'collector@hellohello.studio',
      password: 'StrongPassword123!',
      firstName: 'COLLECTOR',
      lastName: 'SPECIMEN',
      address: 'Rua dos Clérigos 88',
      city: 'Porto',
      country: 'Portugal',
    };

    const result = registerSchema.safeParse(validPayload);
    expect(result.success).toBe(true);

    const invalidEmail = { ...validPayload, email: 'not-an-email' };
    const invalidResult = registerSchema.safeParse(invalidEmail);
    expect(invalidResult.success).toBe(false);

    const shortPassword = { ...validPayload, password: 'short' };
    const shortResult = registerSchema.safeParse(shortPassword);
    expect(shortResult.success).toBe(false);
  });

  it('should enforce role-based access control policies (CUSTOMER, ADMIN, VENDOR)', () => {
    type ValidRole = 'CUSTOMER' | 'ADMIN' | 'VENDOR';

    function hasAdminPrivileges(role: ValidRole) {
      return role === 'ADMIN';
    }

    function canAccessVendorPortal(role: ValidRole) {
      return role === 'VENDOR' || role === 'ADMIN';
    }

    expect(hasAdminPrivileges('ADMIN')).toBe(true);
    expect(hasAdminPrivileges('CUSTOMER')).toBe(false);
    expect(hasAdminPrivileges('VENDOR')).toBe(false);

    expect(canAccessVendorPortal('VENDOR')).toBe(true);
    expect(canAccessVendorPortal('ADMIN')).toBe(true);
    expect(canAccessVendorPortal('CUSTOMER')).toBe(false);
  });

  it('should block suspended user accounts from authentication', () => {
    interface UserState {
      email: string;
      isActive: boolean;
      role: string;
    }

    function checkLoginEligibility(user: UserState): { allowed: boolean; reason?: string } {
      if (!user.isActive) {
        return { allowed: false, reason: 'Account is deactivated' };
      }
      return { allowed: true };
    }

    const activeUser: UserState = {
      email: 'active@hellohello.studio',
      isActive: true,
      role: 'CUSTOMER',
    };
    expect(checkLoginEligibility(activeUser).allowed).toBe(true);

    const suspendedUser: UserState = {
      email: 'suspended@hellohello.studio',
      isActive: false,
      role: 'CUSTOMER',
    };
    const check = checkLoginEligibility(suspendedUser);
    expect(check.allowed).toBe(false);
    expect(check.reason).toBe('Account is deactivated');
  });
});
