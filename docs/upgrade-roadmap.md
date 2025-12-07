# Upgrade roadmap (smart_farming)

Objectif: etendre la plateforme avec plus de plots (10), des dashboards separes (live, batch/historique), un simulateur plus riche et un agent/ML mieux regle. On implemente par petits incréments pour garder une demo fonctionnelle.

## Phase 0 — Etat des lieux rapide (fait)
- Frontend React (Vite + Tailwind) avec 3 pages: dashboard global, plots, recommandations.
- API dispo: `/api/status/`, `/api/sensor-readings/`, `/api/anomalies/`, `/api/recommendations/` (JWT en place via DRF SimpleJWT, token statique cote frontend pour l'instant).
- ML/Agent: pipeline seuil + isolation forest, regles deterministes (agent) et simulateur Python basique.

## Phase 1 — Dashboards (frontend) et UX
1) Plots: passer a 10 plots, selection plus rapide + filtres par capteur (moisture/temperature/humidity) et plage de temps (client-side, via query `date_from/date_to` quand dispo).  
2) Live anomalies: page dediee pour le flux temps reel (auto-refresh 15–30s), badges de severite, filtre plot/type.  
3) Batch/historique: page dediee pour les anomalies agregees (24h/7j) par plot, type et severite, + histogramme simple.  
4) Alerts: ajout d un volet “danger/historique” (groupes par statut: pending/ack/resolved) et jump vers le plot concerne.  
5) Style: garder le theme existant (fonds clairs, accents emerald), reutiliser les composants cartes/puces.

## Phase 2 — Simulation avancee
- Simulateur Python: 10 plots, cycles diurnes realistes (moisture, temperature, humidity) avec irrigation simulee toutes 12–24h.
- Scenarios d anomalies injectables: drop brusque (>10%/h), spike, drift 24–48h, capteur muet (missing readings).
- Frequence configurable (5–15 min) + modes “stress chaleur” et “irrigation fail”.
- CLI simple: `python scripts/simulator.py --plots 10 --freq 300 --scenario heat_spike`.

## Phase 3 — ML & Agent
- Seuils: ranges par capteur (moisture 45–75, temp 18–28C, humid 45–75) + detection drop >10%/1h et spike >5C.
- Isolation Forest: entrainement sur donnees normales (simu) et persistance du modele; score combine seuil + iso.
- Explicabilite: details `details` enrichis (fenetre, moyenne, delta) pour generer des explications template (agent).
- Tuning: precision/recall/F1 sur jeu synthetique etiquete; rapport de metriques stocke (JSON) pour suivre les reglages.

## Phase 4 — Backend & ops
- API: endpoints pour liste des plots et agrégation anomalies (par plot/severite/jour) pour alimenter les dashboards batch.
- Auth: remplacer le token statique par JWT (SimpleJWT) avec roles (farmer/admin) et permissions basiques.
- Donnees: migration vers Postgres; ajouter index sur timestamp/plot si charge elevee.
- Conteneurs: Dockerfile backend + docker-compose (web, db, redis optionnel, worker Celery); script bootstrap simulateur.

## Livrables intermediaires proposes
- Sprint 1 (frontend): plots x10 + filtres + pages Live/Batch en lecture seule.
- Sprint 2 (simu/ML): simulateur avance + tuning seuil/iso + explications agent enrichies.
- Sprint 3 (backend/ops): endpoints agreges, JWT complet, Postgres + Docker Compose.

## Prochaines actions concretes
1) Mettre a jour la page Plots pour 10 plots + filtres par capteur.  
2) Ajouter deux pages: `Live Anomalies` (flux) et `Batch/Historique` (agreges) en reutilisant `/anomalies/`.  
3) Etendre le simulateur (scenarios) puis boucler sur le tuning des regles agent.  
4) Revenir ensuite sur JWT complet et Docker/Postgres.
