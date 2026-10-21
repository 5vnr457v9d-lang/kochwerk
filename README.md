# Kochwerk

Lokales digitales Kochbuch als installierbare PWA.

## Funktionen

- Rezepte erstellen, bearbeiten, duplizieren und löschen
- Frei anlegbare Kochbücher; mehrere Bücher pro Rezept
- Alle Zutaten über genau eine Masterzutat proportional skalieren
- Rezeptbilder, Favoriten, Suche und Druckansicht
- IndexedDB auf dem jeweiligen Gerät; keine Rezept-Cloud
- JSON-Sicherungen exportieren und ergänzend importieren
- Service Worker für die Offline-Nutzung nach erfolgreichem Laden

## GitHub Pages aktivieren

In Settings → Pages „Deploy from a branch“, Branch `main` und Ordner `/(root)` wählen und speichern. Danach die von GitHub angezeigte HTTPS-Adresse in Safari öffnen und über Teilen → Zum Home-Bildschirm installieren. Die App über ihr Symbol öffnen und „Offline bereit“ abwarten.

## Daten und Sicherungen

Persönliche Rezepte und Bilder liegen im Browser und werden nicht in dieses Repository hochgeladen. Regelmäßig unter „Daten & App“ eine Sicherung exportieren. Unterschiedliche Geräte und Browser haben getrennte Sammlungen.

Die Master-Zielmenge ändert nur die aktuelle Ansicht. Originalmengen bleiben unverändert. Back-, Gar- und Reifezeiten werden nicht automatisch skaliert.

## Prüfung

41 automatisierte fachliche und simulierte Offline-Tests bestanden; beide statischen Starthelfer auf Linux geprüft. Installation, interaktive Bedienung und tatsächlicher Offline-Neustart auf einem echten iPhone sind noch nicht praktisch bestätigt.

Vollständiges Entwicklungspaket einschließlich Tests und Starthelfern: Kochwerk-PWA.zip aus dem zugehörigen Projekt.
