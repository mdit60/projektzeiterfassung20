"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SetupDonePage() {
  const router = useRouter();

  // Automatische Weiterleitung nach 3 Sekunden
  useEffect(() => {
    const t = setTimeout(() => router.push("/dashboard"), 3000);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <div className="max-w-lg mx-auto mt-20 p-6 border rounded shadow bg-white text-center">
      <h1 className="text-2xl font-semibold mb-4">Setup erfolgreich abgeschlossen!</h1>
      <p className="text-gray-700 mb-6">
        Deine Firma und dein Benutzerkonto wurden erfolgreich eingerichtet.
      </p>

      <div className="flex justify-center mb-4">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="80"
          height="80"
          viewBox="0 0 24 24"
          fill="none"
          stroke="green"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20 6L9 17l-5-5" />
        </svg>
      </div>

      <p className="text-gray-500 mb-6">
        Du wirst gleich automatisch zum Dashboard weitergeleitet…
      </p>

      <button
        onClick={() => router.push("/dashboard")}
        className="w-full bg-black text-white py-2 rounded"
      >
        Jetzt zum Dashboard
      </button>
    </div>
  );
}
