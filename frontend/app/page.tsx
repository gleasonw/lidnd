import Image from "next/image";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="flex flex-col">
        Login to Discord here:
        <a
          href={`https://discord.com/oauth2/authorize?client_id=${process.env.CLIENT_ID}&scope=identify&response_type=code`}
        >
          login
        </a>
      </div>
    </main>
  );
}
