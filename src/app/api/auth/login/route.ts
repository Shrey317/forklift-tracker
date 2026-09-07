import { cookies, headers } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { handleRouteError, ApiError, apiSuccess } from '@/lib/errors';
import { loginSchema } from '@/lib/validations/auth';
import { login } from '@/server/services/auth/login';
import { getSessionCookieConfig } from '@/server/services/auth/session';
import { getTrustedClientIp } from '@/server/services/auth/rate-limit';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = loginSchema.parse(body);

    const headerList = await headers(); // Next.js 16 async request API
    const ipAddress = getTrustedClientIp(headerList);

    const result = await login(prisma, username, password, ipAddress);

    if (result.outcome === 'rate_limited') {
      throw new ApiError('RATE_LIMITED', 'Too many login attempts. Try again later.');
    }
    if (result.outcome === 'invalid_credentials') {
      // Deliberately identical whether the username exists or not
      // (Locked Decision #35) — never reveals which usernames are real.
      throw new ApiError('INVALID_CREDENTIALS', 'Invalid username or password.');
    }

    const cookieStore = await cookies();
    const cookieConfig = getSessionCookieConfig();
    cookieStore.set(cookieConfig.name, result.rawToken, {
      httpOnly: cookieConfig.httpOnly,
      secure: cookieConfig.secure,
      sameSite: cookieConfig.sameSite,
      path: cookieConfig.path,
      maxAge: cookieConfig.maxAge,
    });

    return apiSuccess({ role: result.role });
  } catch (error) {
    return handleRouteError(error);
  }
}
