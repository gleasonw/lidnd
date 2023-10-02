import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const user = await verifyDiscordToken();
  if (user) {
    return NextResponse.next();
  } else {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
}

export async function verifyDiscordToken() {
  const cookieStore = cookies();
  const token = cookieStore.get("token")?.value;
  const response = await fetch("https://discord.com/api/users/@me", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (response.status === 200) {
    return (await response.json()) as unknown;
  } else {
    console.log(await response.json());
    return null;
  }
}

export const config = {
  matcher: ["/dashboard", "/"],
};
