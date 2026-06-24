import createIntlMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { routing } from './i18n/routing';

const intlMiddleware = createIntlMiddleware(routing);

function getPathnameWithoutLocale(pathname: string): string {
  for (const locale of routing.locales) {
    if (pathname.startsWith(`/${locale}/`)) {
      return pathname.slice(locale.length + 1);
    }
    if (pathname === `/${locale}`) {
      return '/';
    }
  }
  return pathname;
}

function getLocaleFromPathname(pathname: string): string | undefined {
  for (const locale of routing.locales) {
    if (pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`) {
      return locale;
    }
  }
  return undefined;
}

function localizedPath(path: string, locale: string | undefined): string {
  if (locale && locale !== routing.defaultLocale) {
    return `/${locale}${path}`;
  }
  return path;
}

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const pathnameWithoutLocale = getPathnameWithoutLocale(pathname);
  const locale = getLocaleFromPathname(pathname);
  const token = request.cookies.get('token')?.value;

  const publicAuthRoutes = ['/login', '/register'];
  const isAuthRoute = publicAuthRoutes.includes(pathnameWithoutLocale);

  if (isAuthRoute && token) {
    return NextResponse.redirect(
      new URL(localizedPath('/dashboard', locale), request.url),
    );
  }

  if (!token && !isAuthRoute && pathnameWithoutLocale !== '/') {
    return NextResponse.redirect(
      new URL(localizedPath('/login', locale), request.url),
    );
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
