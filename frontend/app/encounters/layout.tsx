import Providers from "@/app/encounters/providers";

export default function EncountersLayout({
  children, // will be a page or nested layout
}: {
  children: React.ReactNode;
}) {
  return (
    <section>
      {/* Include shared UI here e.g. a header or sidebar */}

      <Providers>
        <div className="m-5">{children}</div>
      </Providers>
    </section>
  );
}
