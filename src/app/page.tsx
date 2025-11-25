// src/app/page.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function RootPage() {
  const supabase = await createClient();

  // 1) Ist der User eingeloggt?
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    // NICHT eingeloggt → Zum Login
    return redirect("/login");
  }

  // 2) User IST eingeloggt - prüfe ob bereits Company_Admin
  const { data: companyRelation } = await supabase
    .from("company_users")
    .select("company_id, role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (companyRelation?.company_id) {
    // Hat bereits eine Firma → Direkt zum Dashboard
    return redirect("/dashboard");
  }

  // 3) Noch keine Firma → Setup-Flow starten
  return redirect("/setup/company");
}