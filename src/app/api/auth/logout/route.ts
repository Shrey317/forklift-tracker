import { cookies, headers } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { handleRouteError, apiSuccess } from '@/lib/errors';
import { assertCsrfSafe } from '@/lib/csrf';
import { deleteSessionByToken, getSessionCookieConfig } from '@/server/services/auth/session';

export async function POST() {
  try {
    const headerList = await headers();
    assertCsrfSafe(headerList);

    const cookieStore = await cookies();
    const { name } = getSessionCookieConfig();
    const token = cookieStore.get(name)?.value;

    if (token) {
      await deleteSessionByToken(prisma, token);
    }

    // Clear using the identical name and attributes it was set with for
    // this environment — browsers require an exact attribute match to
    // actually remove a cookie; a mismatched clear silently fails
    // (Section 21).
    const cookieConfig = getSessionCookieConfig();
    cookieStore.set(cookieConfig.name, '', {
      httpOnly: cookieConfig.httpOnly,
      secure: cookieConfig.secure,
      sameSite: cookieConfig.sameSite,
      path: cookieConfig.path,
      maxAge: 0,
    });

    return apiSuccess({ loggedOut: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
