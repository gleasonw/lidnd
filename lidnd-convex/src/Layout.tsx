import { ReactNode } from "react";
import { Link } from "react-router";

export function Layout({
  menu,
  children,
}: {
  menu?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex h-screen w-full flex-col">
      <header className="sticky top-0 z-10 flex h-12 shrink-0 border-b bg-background/80 backdrop-blur">
        <nav className="flex w-full flex-row items-center justify-between gap-6 px-4">
          <Link to="/" className="text-base font-semibold">
            Runsheet
          </Link>
          {menu}
        </nav>
      </header>
      <main className="flex grow flex-col overflow-auto">{children}</main>
    </div>
  );
}
