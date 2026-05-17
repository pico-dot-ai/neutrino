import Link from "next/link";

export default function HomePage() {
  return (
    <main style={{ padding: "3rem" }}>
      <h1>Pico App Starter</h1>
      <p>
        This web app should call its own backend, which then calls Neutrino platform
        capabilities.
      </p>
      <p>
        <Link href="/login">Login</Link>
      </p>
    </main>
  );
}
