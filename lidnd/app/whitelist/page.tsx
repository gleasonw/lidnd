import { logOut } from "@/app/encounters/actions";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import Link from "next/link";

export default function WhitelistPage() {
  return (
    <section className="flex flex-col items-center pt-10 text-2xl gap-10">
      <span>{"You're not yet whitelisted."}</span>
      <Link
        href="https://discord.gg/Vuv7cBUQKG"
        target="_blank"
        className="underline"
      >
        If you want to help test the app in its early days, join the Discord
        here.
      </Link>
      <form action={logOut}>
        <Button type="submit" className="flex gap-5">
          Log out
          <LogOut />
        </Button>
      </form>
    </section>
  );
}
