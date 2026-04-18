# Header-Änderungen v7.3.3 - Konkrete Anweisungen

## DATEI 1: src/app/v7/berater/page.tsx (Dashboard)

### Suche den Header (ca. Zeile 126) und ersetze komplett:

**ALT:**
```tsx
<header className="bg-[#0369a1] text-white shadow-lg">
  ... (alles bis </header>)
</header>
```

**NEU:**
```tsx
{/* Header */}
<header className="bg-[#0369a1] shadow-sm">
  <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
    <div className="flex justify-between items-center py-4">
      {/* Links: PZE + Titel */}
      <div className="flex items-center gap-4">
        <div className="bg-white rounded-lg px-3 py-1.5 text-sm font-bold text-[#0369a1]">
          PZE
        </div>
        <div>
          <h1 className="text-lg font-bold text-white">Berater-Portal</h1>
          <p className="text-sm text-blue-200">v7</p>
        </div>
      </div>
      {/* Rechts: Benutzer + Abmelden */}
      <div className="flex items-center gap-4">
        <span className="text-white text-sm">{profile?.display_name || profile?.email}</span>
        <button
          onClick={handleLogout}
          className="text-blue-200 hover:text-white flex items-center gap-1"
          title="Abmelden"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Abmelden
        </button>
      </div>
    </div>
  </div>
</header>
```

---

## DATEI 2: src/app/v7/berater/foerderung/page.tsx (Kundenfirmen)

### Suche den Header (ca. Zeile 641) und ersetze:

**NEU:**
```tsx
{/* Header */}
<header className="bg-[#0369a1] shadow-sm">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div className="flex justify-between items-center py-4">
      {/* Links: Zurück + PZE + Titel */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push('/v7/berater')}
          className="text-blue-200 hover:text-white flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Zurück
        </button>
        <div className="bg-white rounded-lg px-3 py-1.5 text-sm font-bold text-[#0369a1]">
          PZE
        </div>
        <div>
          <h1 className="text-lg font-semibold text-white">Berater-Portal</h1>
          <p className="text-sm text-blue-200">Förderberatung · ZIM / BMBF</p>
        </div>
      </div>
      {/* Rechts: Benutzer + Abmelden */}
      <div className="flex items-center gap-4">
        <span className="text-white text-sm">{userProfile?.display_name}</span>
        <button
          onClick={handleLogout}
          className="text-blue-200 hover:text-white flex items-center gap-1"
          title="Abmelden"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Abmelden
        </button>
      </div>
    </div>
  </div>
</header>
```

### Falls handleLogout nicht existiert, füge diese Funktion hinzu (vor dem return):
```tsx
const handleLogout = async () => {
  await supabase.auth.signOut();
  router.push('/login');
};
```

---

## DATEI 3: src/app/v7/berater/foerderung/firma/[id]/page.tsx (Firmen-Detail)

### Der Header ist bereits geändert - nur Farbe auf #0369a1 prüfen und "Projekt importieren" entfernen.

### Suche nach dem Header (ca. Zeile 1143) - sollte so aussehen:

```tsx
{/* Header - BLAU für Berater */}
<header style={{ backgroundColor: COLORS.beraterPortal }} className="shadow-sm">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div className="flex justify-between items-center py-4">
      {/* Links: Zurück + PZE + Titel */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push('/v7/berater/foerderung')}
          className="text-blue-200 hover:text-white flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Zurück
        </button>
        <div className="bg-white rounded-lg px-3 py-1.5 text-sm font-bold" style={{ color: COLORS.beraterPortal }}>
          PZE
        </div>
        <div>
          <h1 className="text-lg font-semibold text-white">{company.name}</h1>
          <p className="text-sm text-blue-200">
            Förderberatung • {BUNDESLAND_NAMES[company.federal_state || ''] || company.federal_state || 'Kein Bundesland'}
          </p>
        </div>
      </div>
      {/* Rechts: Benutzer + Abmelden */}
      <div className="flex items-center gap-4">
        <span className="text-white text-sm">{userProfile?.display_name || 'Berater'}</span>
        <button
          onClick={() => { supabase.auth.signOut(); router.push('/login'); }}
          className="text-blue-200 hover:text-white flex items-center gap-1"
          title="Abmelden"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Abmelden
        </button>
      </div>
    </div>
  </div>
</header>
```

### "Projekt importieren" Button: 
Entferne aus dem Header und füge stattdessen bei den Tabs oder im Projekte-Tab hinzu.

---

## DATEI 4: src/app/v7/firma/page.tsx (Firmen-Portal)

### Der Header ist bereits korrekt (grün). Nur prüfen ob Abmelden-Button vorhanden.

Der aktuelle Header sollte bereits OK sein mit:
- PZE Badge (grün)
- "Firmen-Portal" Titel
- Firmenname als Untertitel
- Benutzername + Rolle rechts
- Abmelden-Button rechts

---

## ZUSAMMENFASSUNG

Nach allen Änderungen sollte das Layout so sein:

| Seite | Zurück? | Titel | Untertitel |
|-------|---------|-------|------------|
| Berater Dashboard | Nein | Berater-Portal | v7 |
| Förderberatung | → Dashboard | Berater-Portal | Förderberatung · ZIM / BMBF |
| Firmen-Detail | → Förderberatung | {Firmenname} | Förderberatung · {Bundesland} |
| Firmen-Portal | Nein | Firmen-Portal | {Firmenname} |

Alle haben rechts: **Benutzername + Abmelden**
