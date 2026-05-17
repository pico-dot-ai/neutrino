import Link from "next/link";

export default function LoginPage() {
  return (
    <main style={{ padding: "3rem" }}>
      <h1>Login</h1>
      <p>Implement app-specific login UX here.</p>
      <p>
        <Link href="/admin">Continue to Admin</Link>
      </p>
    </main>
  );
}
