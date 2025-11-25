"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (res.ok) {
      router.push("/dashboard");
    } else {
      const data = await res.json();
      setError(data.error || "Login failed");
    }
  }

  return (
    <div style={{ maxWidth: 400, margin: "80px auto", fontFamily: "sans-serif" }}>
      <h2>Login</h2>

      {error && (
        <div style={{ color: "red", marginBottom: 10 }}>{error}</div>
      )}

      <form onSubmit={handleLogin}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ width: "100%", padding: 10, marginBottom: 10 }}
        />

        <input
          type="password"
          placeholder="Passwort"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ width: "100%", padding: 10, marginBottom: 20 }}
        />

        <button
          type="submit"
          style={{
            width: "100%",
            padding: 12,
            backgroundColor: "black",
            color: "white",
            border: 0,
            borderRadius: 4,
            cursor: "pointer",
            marginBottom: 20,
          }}
        >
          Login
        </button>
      </form>

      <div style={{ textAlign: "center", marginTop: 20 }}>
        <p style={{ color: "#666", marginBottom: 10 }}>
          Noch keine Firma registriert?
        </p>
        <Link
          href="/setup/company"
          style={{
            display: "inline-block",
            padding: "10px 20px",
            backgroundColor: "#f0f0f0",
            color: "#333",
            textDecoration: "none",
            borderRadius: 4,
            border: "1px solid #ddd",
          }}
        >
          Neue Firma registrieren
        </Link>
      </div>
    </div>
  );
}