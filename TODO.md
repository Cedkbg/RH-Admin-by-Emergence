# 🚀 Plan : Salaire en temps réel basé sur la présence

## Objectif
Afficher le **salaire accumulé en temps réel** dans les blocs de présence et l'historique :
- Salaire qui **monte progressivement** pendant que l'agent pointe
- Calcul : heures travaillées × taux horaire
- Affichage en direct (mise à jour périodique)

## Étapes
1. **Mettre à jour `AgentPresenceBlock.tsx`** — Ajouter le salaire accumulé et le taux horaire dans le bloc
2. **Mettre à jour `AgentPresenceHistory.tsx`** — Ajouter colonne salaire dans le tableau et les stats
3. **Mettre à jour `Presence.tsx`** — Charger les `hourly_rate` des employés et calculer le salaire en direct
4. **Ajouter un compteur en temps réel** — Pour les agents en train de pointer aujourd'hui, calculer le salaire qui s'accumule minute par minute

## Fichiers à modifier
- [ ] `src/components/presence/AgentPresenceBlock.tsx`
- [ ] `src/components/presence/AgentPresenceHistory.tsx`
- [ ] `src/pages/modules/Presence.tsx`

