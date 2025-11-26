import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );
    
    // Prüfe ob User eingeloggt ist
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return NextResponse.json(
        { error: 'Nicht eingeloggt. Bitte melden Sie sich zuerst an.' },
        { status: 401 }
      );
    }

    console.log('Authenticated user:', user.id, user.email);

    // Hole die Daten aus dem Request
    const body = await request.json();
    
    console.log('Received company data:', body);

    // 1. Company in der Datenbank erstellen
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .insert([
        {
          name: body.name,
          street: body.street,
          house_number: body.house_number,
          zip: body.zip,
          city: body.city,
          state_code: body.state_code,
          country: body.country || 'DE',
          legal_form: body.legal_form || null,
          trade_register_city: body.trade_register_city || null,
          trade_register_number: body.trade_register_number || null,
          vat_id: body.vat_id || null,
          num_employees: body.num_employees || null,
          annual_revenue: body.annual_revenue || null,
          balance_sheet_total: body.balance_sheet_total || null,
          industry_wz_code: body.industry_wz_code || null,
          industry_description: body.industry_description || null,
          email: body.email || null,
          website: body.website || null,
          admin_id: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (companyError) {
      console.error('Company creation error:', companyError);
      return NextResponse.json(
        { error: companyError.message, details: companyError },
        { status: 500 }
      );
    }

    console.log('Company created successfully:', company);

    // 2. User-Profil als Company-Admin erstellen
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .insert([
        {
          user_id: user.id,
          company_id: company.id,
          role: 'company_admin',
          name: user.user_metadata?.name || body.admin_name || '',
          email: user.email,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (profileError) {
      console.error('User profile creation error:', profileError);
      // Company wurde erstellt, aber Profil nicht - das ist ein Problem
      // Optional: Company wieder löschen oder Fehler zurückgeben
      return NextResponse.json(
        { 
          error: 'Firma wurde erstellt, aber User-Profil konnte nicht angelegt werden.',
          details: profileError 
        },
        { status: 500 }
      );
    }

    console.log('User profile created successfully:', userProfile);

    // 3. User-Metadata in Supabase Auth aktualisieren
    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        company_id: company.id,
        role: 'company_admin'
      }
    });

    if (updateError) {
      console.error('User metadata update error:', updateError);
    }

    return NextResponse.json({ 
      success: true, 
      company,
      userProfile
    });

  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Unbekannter Fehler' },
      { status: 500 }
    );
  }
}