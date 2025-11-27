# Projektzeiterfassung v1.1 - Vollständige Dateiliste

**Stand:** 27. November 2024
**Version:** 1.1

---

## 📦 Core Application Files

### 1. Login
**Datei:** `src/app/login/page.tsx`
**Status:** ✅ Komplett
**Features:** Email-Vorausfüllung, Quick Re-Login, is_active Check

### 2. Register
**Datei:** `src/app/register/page.tsx`
**Status:** ✅ Komplett
**Features:** Zwei-Schritt, Duplikat-Check

### 3. Dashboard
**Datei:** `src/app/dashboard/page.tsx`
**Status:** ✅ Komplett
**Features:** 6 Kacheln, Firmeninfo, Admin-Badge

### 4. Mitarbeiter-Liste
**Datei:** `src/app/mitarbeiter/page.tsx`
**Status:** ✅ Komplett
**Features:** Liste, Einladen, Action-Buttons, Quick Re-Login

### 5. Mitarbeiter-Detail
**Datei:** `src/app/mitarbeiter/detail/page.tsx`
**Status:** ✅ Komplett
**Features:** Erweiterte Profildaten, Bearbeiten

### 6. Projekt-Liste
**Datei:** `src/app/projekte/page.tsx`
**Status:** ✅ Komplett
**Features:** Grid, Erstellen-Modal, Status-Badges

### 7. Projekt-Detail
**Datei:** `src/app/projekte/[id]/page.tsx`
**Status:** ✅ Komplett
**Features:** Anzeigen, Bearbeiten, Löschen, Next.js 16 compatible

---

## 🔌 API Routes

### 1. Mitarbeiter deaktivieren
**Datei:** `src/app/api/employees/deactivate/route.ts`
**Methode:** POST
**Body:** `{ employeeId: string }`

### 2. Mitarbeiter aktivieren
**Datei:** `src/app/api/employees/activate/route.ts`
**Methode:** POST
**Body:** `{ employeeId: string }`

### 3. Mitarbeiter löschen
**Datei:** `src/app/api/employees/delete/route.ts`
**Methode:** POST
**Body:** `{ employeeId: string }`
**Special:** Löscht auch Auth-User mit Service Role Key

---

## 🗄️ Database Schema Files

### 1. Erweiterte User Profiles
**Datei:** `mitarbeiter-deaktivieren-schema.sql`
**Erstellt:** is_active, deactivated_at, deactivated_by

### 2. Projekte Schema
**Datei:** `projekte-schema.sql`
**Erstellt:** projects, project_assignments Tabellen

---

## 🛠️ Configuration Files

### 1. Middleware
**Datei:** `src/middleware.ts`
**Features:** Route Protection, Session Check

### 2. Supabase Client
**Datei:** `src/lib/supabase/client.ts`
**Type:** Browser Client

### 3. Supabase Server
**Datei:** `src/lib/supabase/server.ts`
**Type:** Server Client mit Cookies

### 4. Environment Variables
**Datei:** `.env.local`
```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

---

## 📝 Documentation Files

### 1. Pflichtenheft v1.1
**Datei:** `PFLICHTENHEFT-v1_1.md`
**Inhalt:** Komplette Projekt-Dokumentation

### 2. Diese Dateiliste
**Datei:** `DATEILISTE-v1_1.md`
**Inhalt:** Übersicht aller Dateien

---

## 🚀 Installation Checklist

### Phase 1: Grundsetup
- [ ] Repository klonen
- [ ] `pnpm install`
- [ ] `.env.local` erstellen
- [ ] Supabase Projekt erstellen

### Phase 2: Datenbank
- [ ] companies Tabelle erstellen
- [ ] user_profiles Tabelle erstellen
- [ ] Erweiterte user_profiles Felder hinzufügen
- [ ] projects Tabelle erstellen
- [ ] project_assignments Tabelle erstellen
- [ ] RLS deaktivieren (Development)

### Phase 3: API Routes
- [ ] `/api/employees/deactivate/route.ts` erstellen
- [ ] `/api/employees/activate/route.ts` erstellen
- [ ] `/api/employees/delete/route.ts` erstellen

### Phase 4: Pages
- [ ] `/login/page.tsx` aktualisieren (Quick Re-Login)
- [ ] `/mitarbeiter/page.tsx` aktualisieren (Actions)
- [ ] `/mitarbeiter/detail/page.tsx` erstellen
- [ ] `/projekte/page.tsx` erstellen
- [ ] `/projekte/[id]/page.tsx` erstellen

### Phase 5: Testing
- [ ] Registrierung testen
- [ ] Login testen
- [ ] MA-Einladung mit Quick Re-Login testen
- [ ] MA bearbeiten/deaktivieren/löschen testen
- [ ] Projekt erstellen testen
- [ ] Projekt bearbeiten/löschen testen

---

## 🎯 Quick Start Commands

```bash
# Development starten
pnpm dev

# Cache löschen (bei Problemen)
rm -rf .next && pnpm dev

# Dependencies installieren
pnpm install

# TypeScript Check
pnpm tsc --noEmit

# Build für Production
pnpm build
```

---

## 📊 File Statistics

**Total Files:** ~20
**Lines of Code:** ~3.500
**Components:** 8 Pages
**API Routes:** 3
**Database Tables:** 4
**SQL Scripts:** 2

---

## ✅ Completion Status

| Feature | Status | Files |
|---------|--------|-------|
| Authentifizierung | ✅ | 3 |
| Dashboard | ✅ | 1 |
| Mitarbeiterverwaltung | ✅ | 5 |
| Projektverwaltung | ✅ | 2 |
| API Routes | ✅ | 3 |
| Middleware | ✅ | 1 |
| Datenbank | ✅ | 2 SQL |

---

## 🔗 Important Links

- Next.js Docs: https://nextjs.org/docs
- Supabase Docs: https://supabase.com/docs
- Tailwind CSS: https://tailwindcss.com/docs

---

**Ende der Dateiliste - Version 1.1**