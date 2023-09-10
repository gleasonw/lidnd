import Providers from "@/app/encounters/providers";
import Link from "next/link";

export default function EncountersLayout({
  children, // will be a page or nested layout
}: {
  children: React.ReactNode;
}) {
  return (
    <section>
      {/* Include shared UI here e.g. a header or sidebar */}
      <nav className="border-b">
        <Link href="/encounters" className="p-5">
          Encounters
        </Link>
      </nav>
      <Providers>{children}</Providers>
    </section>
  );
}
