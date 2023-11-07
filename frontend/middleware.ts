import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const response = await verifyDiscordToken();
  if (response.status === 200) {
    return NextResponse.next();
  } else if (response.status === 403) {
    const url = request.nextUrl.clone();
    url.pathname = "/whitelist";
    return NextResponse.redirect(url);
  } else {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
}

async function fetchWhitelist(): Promise<Set<string>> {
  const response = await fetch(
    "https://raw.githubusercontent.com/gleasonw/dnd-init-tracker/main/whitelist.txt"
  );
  const data = await response.text();
  const whitelist = new Set(data.split("\n"));
  return whitelist;
}

export type DiscordUser = {
  id: number;
  username: string;
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
