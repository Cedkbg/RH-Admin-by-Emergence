# Frontend Status — Emergence DRC

## ✅ DONE
- [x] Sidebar dropdowns for ALL Directions with department lists
- [x] DirectionDepartments component on all 7 dashboards (Tech, RH, Finance, Commercial, Products, Operations, Risk)
- [x] Theme switcher (Light/Dark/System) fully functional
- [x] ThemeProvider wired in main.tsx + anti-FOUC script in index.html
- [x] OrgChart cleaned (removed Services Tech block)
- [x] Type fixes in orgData.ts (manager_id optional)
- [x] App.tsx route /parametres → SettingsPage
- [x] DepartmentPage.tsx filled with content
- [x] Admin.tsx import fix (TechDepartment → Department)
- [x] Settings: Langue / Devise / Fuseau horaire → controlled + persisted in localStorage
- [x] Settings: Notifications toggles → controlled + persisted in localStorage
- [x] Settings: "Enregistrer" button saves everything + shows confirmation toast

## 🟢 NICE TO HAVE (Future)
- [ ] Dynamic page titles per route
- [ ] Breadcrumb navigation
- [ ] Empty states & loading skeletons
- [ ] Real data from Supabase instead of hardcoded KPIs
- [ ] Settings: Password change hooked to auth

