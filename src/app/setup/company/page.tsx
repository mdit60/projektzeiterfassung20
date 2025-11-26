"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CreateCompanyPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    admin_name: "", // NEU: Name des Company-Admins
    name: "",
    street: "",
    house_number: "",
    zip: "",
    city: "",
    state_code: "",
    country: "DE",
    legal_form: "",
    trade_register_city: "",
    trade_register_number: "",
    vat_id: "",
    num_employees: "",
    annual_revenue: "",
    balance_sheet_total: "",
    industry_wz_code: "",
    industry_description: "",
    email: "",
    website: ""
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Zahlen-Felder konvertieren
    const payload = {
      ...form,
      num_employees: form.num_employees ? parseInt(form.num_employees) : undefined,
      annual_revenue: form.annual_revenue ? parseFloat(form.annual_revenue) : undefined,
      balance_sheet_total: form.balance_sheet_total ? parseFloat(form.balance_sheet_total) : undefined,
    };
    
    console.log("Sending payload:", payload);

    try {
      const res = await fetch("/api/company/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Fehler bei der Erstellung.");
        console.error("API Error:", data);
        setLoading(false);
        return;
      }

      console.log("Success:", data);

      // Weiter zu Schritt 2: weitere User anlegen (optional) oder direkt zum Dashboard
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Netzwerkfehler");
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto mt-12 p-6 border rounded shadow bg-white">
      <h1 className="text-2xl font-semibold mb-6">Firma anlegen</h1>
      <p className="text-gray-600 mb-4">Trage hier die grundlegenden Firmendaten ein.</p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form className="space-y-4" onSubmit={handleSubmit}>
        {/* NEU: Admin-Name Feld */}
        <div>
          <label className="block text-sm font-medium">Ihr Name (Company-Admin) *</label>
          <input
            type="text"
            className="mt-1 w-full border rounded px-3 py-2"
            value={form.admin_name}
            onChange={(e) => updateField("admin_name", e.target.value)}
            required
            placeholder="Max Mustermann"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Firmenname *</label>
          <input
            type="text"
            className="mt-1 w-full border rounded px-3 py-2"
            value={form.name}
            onChange={(e) => updateField("name", e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="block text-sm">Straße *</label>
            <input
              className="mt-1 w-full border rounded px-3 py-2"
              value={form.street}
              onChange={(e) => updateField("street", e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm">Hausnr. *</label>
            <input
              className="mt-1 w-full border rounded px-3 py-2"
              value={form.house_number}
              onChange={(e) => updateField("house_number", e.target.value)}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm">PLZ *</label>
            <input
              className="mt-1 w-full border rounded px-3 py-2"
              value={form.zip}
              onChange={(e) => updateField("zip", e.target.value)}
              required
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm">Ort *</label>
            <input
              className="mt-1 w-full border rounded px-3 py-2"
              value={form.city}
              onChange={(e) => updateField("city", e.target.value)}
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm">Bundesland *</label>
          <select
            className="mt-1 w-full border rounded px-3 py-2"
            value={form.state_code}
            onChange={(e) => updateField("state_code", e.target.value)}
            required
          >
            <option value="">Bitte auswählen</option>
            <option value="DE-BW">Baden-Württemberg</option>
            <option value="DE-BY">Bayern</option>
            <option value="DE-BE">Berlin</option>
            <option value="DE-BB">Brandenburg</option>
            <option value="DE-HB">Bremen</option>
            <option value="DE-HH">Hamburg</option>
            <option value="DE-HE">Hessen</option>
            <option value="DE-MV">Mecklenburg-Vorpommern</option>
            <option value="DE-NI">Niedersachsen</option>
            <option value="DE-NW">Nordrhein-Westfalen</option>
            <option value="DE-RP">Rheinland-Pfalz</option>
            <option value="DE-SL">Saarland</option>
            <option value="DE-SN">Sachsen</option>
            <option value="DE-ST">Sachsen-Anhalt</option>
            <option value="DE-SH">Schleswig-Holstein</option>
            <option value="DE-TH">Thüringen</option>
          </select>
        </div>

        <div>
          <label className="block text-sm">Rechtsform</label>
          <select
            className="mt-1 w-full border rounded px-3 py-2"
            value={form.legal_form}
            onChange={(e) => updateField("legal_form", e.target.value)}
          >
            <option value="">Bitte auswählen</option>
            <option value="GmbH">GmbH</option>
            <option value="UG">UG (haftungsbeschränkt)</option>
            <option value="AG">AG</option>
            <option value="KG">KG</option>
            <option value="OHG">OHG</option>
            <option value="GbR">GbR</option>
            <option value="Einzelunternehmen">Einzelunternehmen</option>
          </select>
        </div>

        <div>
          <label className="block text-sm">USt-ID</label>
          <input
            className="mt-1 w-full border rounded px-3 py-2"
            value={form.vat_id}
            onChange={(e) => updateField("vat_id", e.target.value)}
            placeholder="DE123456789"
          />
        </div>

        <div>
          <label className="block text-sm">Email</label>
          <input
            type="email"
            className="mt-1 w-full border rounded px-3 py-2"
            value={form.email}
            onChange={(e) => updateField("email", e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm">Website</label>
          <input
            className="mt-1 w-full border rounded px-3 py-2"
            value={form.website}
            onChange={(e) => updateField("website", e.target.value)}
            placeholder="www.beispiel.de"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm">Handelsregister (Ort)</label>
            <input
              className="mt-1 w-full border rounded px-3 py-2"
              value={form.trade_register_city}
              onChange={(e) => updateField("trade_register_city", e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm">HR-Nummer</label>
            <input
              className="mt-1 w-full border rounded px-3 py-2"
              value={form.trade_register_number}
              onChange={(e) => updateField("trade_register_number", e.target.value)}
            />
          </div>
        </div>

        <h2 className="text-lg font-semibold mt-6">Branche</h2>

        <div>
          <label className="block text-sm">WZ-Code</label>
          <input
            className="mt-1 w-full border rounded px-3 py-2"
            value={form.industry_wz_code}
            onChange={(e) => updateField("industry_wz_code", e.target.value)}
            placeholder="z.B. 026"
          />
        </div>

        <div>
          <label className="block text-sm">Branchenbeschreibung</label>
          <input
            className="mt-1 w-full border rounded px-3 py-2"
            value={form.industry_description}
            onChange={(e) => updateField("industry_description", e.target.value)}
          />
        </div>

        <button
          type="submit"
          className="w-full bg-black text-white py-2 rounded mt-6 hover:bg-gray-800 disabled:bg-gray-400"
          disabled={loading}
        >
          {loading ? "Speichere..." : "Firma anlegen und zum Dashboard"}
        </button>
      </form>
    </div>
  );
}