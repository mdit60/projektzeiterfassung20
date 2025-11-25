// src/app/api/company/create/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();

    // 1) Session holen
    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();

    if (sessionError || !sessionData.session) {
      return NextResponse.json(
        { error: "Nicht eingeloggt." },
        { status: 401 }
      );
    }

    const user = sessionData.session.user;

    // 2) JSON Body lesen
    const formData = await req.json();
    
    console.log("Received data:", formData);

    // 3) DUPLIKAT-PRÜFUNG
    // Prüfung 1: USt-ID bereits vorhanden?
    if (formData.vat_id) {
      const { data: existingByVatId } = await supabase
        .from("companies")
        .select("id, name")
        .eq("vat_id", formData.vat_id)
        .maybeSingle();

      if (existingByVatId) {
        return NextResponse.json(
          { 
            error: "Firma bereits registriert", 
            details: `Eine Firma mit der USt-ID "${formData.vat_id}" ist bereits registriert (${existingByVatId.name}).`
          },
          { status: 409 }
        );
      }
    }

    // Prüfung 2: Firmenname bereits vorhanden? (case-insensitive)
    const { data: existingByName } = await supabase
      .from("companies")
      .select("id, name, vat_id")
      .ilike("name", formData.name)
      .maybeSingle();

    if (existingByName) {
      return NextResponse.json(
        { 
          error: "Firma bereits registriert", 
          details: `Eine Firma mit dem Namen "${existingByName.name}" ist bereits registriert (USt-ID: ${existingByName.vat_id || 'nicht angegeben'}).`
        },
        { status: 409 }
      );
    }

    // 4) Firma in DB anlegen
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .insert({
        name: formData.name,
        street: formData.street,
        house_number: formData.house_number,
        zip: formData.zip,
        city: formData.city,
        state_code: formData.state_code,
        country: formData.country || "DE",
        legal_form: formData.legal_form || null,
        trade_register_city: formData.trade_register_city || null,
        trade_register_number: formData.trade_register_number || null,
        vat_id: formData.vat_id || null,
        industry_wz_code: formData.industry_wz_code || null,
        industry_description: formData.industry_description || null,
        email: formData.email || null,
        website: formData.website || null,
      })
      .select()
      .single();

    if (companyError) {
      console.error("Company Insert Error:", companyError);
      return NextResponse.json(
        { 
          error: "Fehler beim Erstellen der Firma.", 
          details: companyError.message,
          hint: companyError.hint,
          code: companyError.code
        },
        { status: 500 }
      );
    }

    console.log("Company created:", company);

    // 5) Company_Admin zuordnen
    const { error: adminError } = await supabase
      .from("company_users")
      .insert({
        company_id: company.id,
        user_id: user.id,
        role: "company_admin"
      });

    if (adminError) {
      console.error("Admin Insert Error:", adminError);
      return NextResponse.json(
        {
          error: "Firma erstellt, aber Company_Admin konnte nicht angelegt werden.",
          details: adminError.message
        },
        { status: 500 }
      );
    }

    // 6) Erfolg
    return NextResponse.json({
      success: true,
      company_id: company.id,
      message: "Firma erfolgreich angelegt!"
    });

  } catch (error: any) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Unerwarteter Fehler", details: error.message },
      { status: 500 }
    );
  }
}