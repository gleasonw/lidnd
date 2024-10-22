import { DiscordIcon } from "@/app/login/discord";
import "@/app/globals.css";
import Link from "next/link";

export default async function Login(
  props: {
    searchParams: Promise<{ redirect: string }>;
  }
) {
  const searchParams = await props.searchParams;
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="flex flex-col gap-20">
        <h1 className="text-5xl">Welcome to LiDnD.</h1>

        <Link
          className={
            "shadow p-5 rounded-md text-center text-white flex overflow-hidden border-2 hover:bg-gray-200 transition-all"
          }
          href={`/login/discord?redirect=${searchParams.redirect}`}
        >
          <DiscordIcon className="max-w-40" />
        </Link>
      </div>
    </main>
  );
}
