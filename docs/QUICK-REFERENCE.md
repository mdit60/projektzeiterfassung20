# Projektzeiterfassung - Quick Reference Card

**Version:** 1.2 | **Stand:** 28. November 2024

---

## 🚀 Schnellstart

```bash
# Development starten
cd projektzeiterfassung20
pnpm dev
# → http://localhost:3000
```

---

## 📍 Wichtige URLs

| Seite | URL | Beschreibung |
|-------|-----|--------------|
| Login | `/login` | Anmeldung |
| Register | `/register` | Neue Firma registrieren |
| Dashboard | `/dashboard` | Hauptübersicht |
| Mitarbeiter | `/mitarbeiter` | MA-Verwaltung |
| Projekte | `/projekte` | Projekt-Liste |
| Projekt-Detail | `/projekte/[id]` | APs & Zuordnungen |
| Zeiterfassung | `/zeiterfassung` | Stunden eintragen |

---

## 👥 Rollen & Rechte

| Aktion | Admin | Manager | Employee |
|--------|:-----:|:-------:|:--------:|
| Firma bearbeiten | ✅ | ❌ | ❌ |
| MA einladen | ✅ | ✅ | ❌ |
| MA löschen | ✅ | ❌ | ❌ |
| Projekte erstellen | ✅ | ✅ | ❌ |
| APs verwalten | ✅ | ✅ | ❌ |
| Zeit erfassen | ✅ | ✅ | ✅ |
| Alle MA sehen | ✅ | ✅ | ❌ |

---

## 🗄️ Wichtige Tabellen

| Tabelle | Inhalt |
|---------|--------|
| `companies` | Firmendaten |
| `user_profiles` | Benutzer & Rollen |
| `projects` | Projekte |
| `work_packages` | Arbeitspakete |
| `work_package_assignments` | MA↔AP Zuordnung |
| `time_entries` | Zeiteinträge |
| `public_holidays` | Feiertage |

---

## 🔑 Test-IDs

### Firmen
- **Cubintec:** `4f20d4bc-588d-4291-bc0b-995943533829`
- **Alacsystems:** `4eb7e15c-ff55-40f2-b307-a32f31b0c460`

### Projekt VETIS
- **Project ID:** `389d8eaa-1fe9-4420-9fd5-b0ab7984dd02`

---

## 💡 Häufige SQL-Queries

### Alle Firmen
```sql
SELECT id, name FROM companies;
```

### Mitarbeiter einer Firma
```sql
SELECT name, email, role 
FROM user_profiles 
WHERE company_id = 'COMPANY-ID';
```

### Arbeitspakete eines Projekts
```sql
SELECT code, description 
FROM work_packages 
WHERE project_id = 'PROJECT-ID'
ORDER BY code;
```

### Zeiteinträge eines Monats
```sql
SELECT entry_date, hours, work_package_code
FROM time_entries
WHERE user_profile_id = 'USER-ID'
  AND entry_date >= '2024-11-01'
  AND entry_date <= '2024-11-30';
```

---

## 🐛 Troubleshooting

| Problem | Lösung |
|---------|--------|
| Seite lädt nicht | `rm -rf .next && pnpm dev` |
| TypeScript-Fehler | `pnpm tsc --noEmit` prüfen |
| Auth-Fehler | Browser-Cookies löschen |
| /register → /login | `register/page.tsx` prüfen |

---

## 📁 Wichtige Dateien

```
src/
├── app/
│   ├── register/page.tsx    # Registrierung
│   ├── login/page.tsx       # Login
│   ├── dashboard/page.tsx   # Dashboard
│   ├── mitarbeiter/page.tsx # MA-Liste
│   ├── projekte/page.tsx    # Projekte
│   ├── projekte/[id]/page.tsx # Projekt-Detail
│   └── zeiterfassung/page.tsx # Zeiterfassung
├── lib/supabase/
│   ├── client.ts            # Browser-Client
│   └── server.ts            # Server-Client
└── middleware.ts            # Route Protection
```

---

## 🔧 Environment Variables

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...
```

---

## 📞 Bei Problemen

1. Console-Log im Browser prüfen (F12)
2. Terminal-Output prüfen (npm run dev)
3. Supabase Dashboard → Logs prüfen
4. Cache löschen: `rm -rf .next`

---

**Viel Erfolg! 🎉**
