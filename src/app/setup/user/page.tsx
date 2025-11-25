"use client";

import { useEffect, useState } from "react";

export default function SetupUserPage() {
  const [companyExists, setCompanyExists] = useState<boolean | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // Prüfen ob company bereits angelegt wurde
  useEffect(() => {
    async function checkCompany() {
      const res = await fetch("/api/company/me");
      if (!res.ok) {
        setCompanyExists(false);
        return;
      }
      setCompanyExists(true);
    }
    checkCompany();
  }, []);

  async function handleSubmit(e: any) {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    const formData = new FormData(e.target);

    const res = await fetch("/api/employees/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        first_name: formData.get("first_name"),
        last_name: formData.get("last_name"),
        email: formData.get("email"),
        password: formData.get("password"),
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setMessage(data.error || "Fehler beim Erstellen des Benutzers");
      setLoading(false);
      return;
    }

    window.location.href = "/setup/done";
  }

  return (
    <div style={{ padding: "40px", maxWidth: "600px" }}>
      <h1>Benutzerkonto anlegen</h1>
      <p>Erstelle den ersten Benutzer für diese Firma<br />(Rolle: <b>Company Admin</b>).</p>

      {companyExists === false && (
        <p style={{ color: "red", marginTop: "20px" }}>
          Keine Firmenzuordnung gefunden.
        </p>
      )}

      {companyExists && (
        <form onSubmit={handleSubmit} style={{ marginTop: "20px" }}>
          <input
            name="first_name"
            placeholder="Vorname"
            required
            style={{ width: "300px", marginBottom: "10px" }}
          />
          <br />

          <input
            name="last_name"
            placeholder="Nachname"
            required
            style={{ width: "300px", marginBottom: "10px" }}
          />
          <br />

          <input
            name="email"
            type="email"
            placeholder="E-Mail"
            required
            style={{ width: "300px", marginBottom: "10px" }}
          />
          <br />

          <input
            name="password"
            type="password"
            placeholder="Passwort"
            required
            style={{ width: "300px", marginBottom: "20px" }}
          />
          <br />

          <button type="submit" disabled={loading}>
            {loading ? "Wird erstellt..." : "Benutzer erstellen"}
          </button>

          {message && <p style={{ color: "red" }}>{message}</p>}
        </form>
      )}
    </div>
  );
}
