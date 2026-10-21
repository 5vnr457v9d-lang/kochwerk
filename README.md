# Kochwerk

Lokales digitales Kochbuch als installierbare PWA.

## Funktionen

- Rezepte erstellen, bearbeiten, duplizieren und löschen
- Frei anlegbare Kochbücher; mehrere Bücher pro Rezept
- Jede beliebige Zutatenmenge direkt ändern und alle übrigen Mengen proportional berechnen
- Rezeptbilder, Favoriten, Suche und Druckansicht
- IndexedDB auf dem jeweiligen Gerät; keine Rezept-Cloud
- JSON-Sicherungen exportieren und ergänzend importieren
- Service Worker für die Offline-Nutzung nach erfolgreichem Laden
- Kochmodus zum Wachhalten des Bildschirms mit bestätigter Statusanzeige

## GitHub Pages aktivieren

In Settings → Pages „Deploy from a branch“, Branch `main` und Ordner `/(root)` wählen und speichern. Danach die von GitHub angezeigte HTTPS-Adresse in Safari öffnen und über Teilen → Zum Home-Bildschirm installieren. Die App über ihr Symbol öffnen und „Offline bereit“ abwarten.

## Daten und Sicherungen

Persönliche Rezepte und Bilder liegen im Browser und werden nicht in dieses Repository hochgeladen. Regelmäßig unter „Daten & App“ eine Sicherung exportieren. Unterschiedliche Geräte und Browser haben getrennte Sammlungen.

Im geöffneten Rezept kann jede Zutatenmenge direkt geändert werden. Die übrigen Mengen werden daraus proportional anhand der Originalmengen berechnet. Auch ein Wechsel zu einer anderen Zutat ist möglich. „Originalmengen“ setzt die Ansicht zurück. Die gespeicherten Originalmengen bleiben unverändert; zum dauerhaften Ändern des Grundrezepts dient der Rezepteditor. Zutaten mit Originalmenge 0 bleiben 0 und können nicht als Berechnungsgrundlage verwendet werden. Back-, Gar- und Reifezeiten werden nicht automatisch skaliert. Vorhandene Rezepte und Sicherungen bleiben lesbar.

## Prüfung

61 automatisierte fachliche und simulierte Offline-Tests bestanden; beide statischen Starthelfer auf Linux geprüft. Installation, interaktive Bedienung und tatsächlicher Offline-Neustart auf einem echten iPhone sind noch nicht praktisch bestätigt.

Aktueller Quellcode und Tests liegen in diesem Repository.

## Entwicklertests

Mit Node.js 22 oder neuer: `node --test tests/*.test.js`. Die Tests prüfen die Rechenregeln, den Wechsel der Bezugszutat, vorhandene Sicherungen und den Offline-Cache in einer simulierten Umgebung. Es werden keine zusätzlichen Pakete benötigt.

## Kochmodus

Oben „Kochmodus starten“ wählen. Erst die Meldung „Bildschirm bleibt an, solange Kochwerk sichtbar ist“ bestätigt einen aktiven Screen Wake Lock. Der Modus bleibt beim Wechsel zwischen Rezepten aktiv und kann mit „Kochmodus beenden“ ausgeschaltet werden. Er gilt für die aktuelle App-Sitzung und startet nach vollständigem Schließen nicht automatisch.

Beim Wechsel in den Hintergrund wird die Sperre freigegeben; beim Zurückkehren in die sichtbare App wird sie erneut angefordert, sofern der Kochmodus noch eingeschaltet ist. Beendet iOS das Wachhalten, erscheint ein Hinweis mit „Erneut aktivieren“. Auch fehlende Unterstützung oder eine Ablehnung werden angezeigt; es gibt keine versteckten Videos oder anderen Umgehungen.

Home-Bildschirm-Apps unterstützen Screen Wake Lock auf iOS/iPadOS seit 18.4. Stromsparmodus, niedriger Akkustand und Systemrichtlinien können eine Sperre verhindern oder beenden. Manuelles Sperren und ein App-Wechsel lassen sich damit nicht verhindern. Auf einem echten iPhone wurde das Verhalten noch nicht praktisch bestätigt. Nach dem Aktivieren die App mindestens über die eingestellte automatische Sperrzeit hinaus unberührt sichtbar lassen und anschließend das Ausschalten prüfen.

Referenzen: [WebKit: Safari 18.4](https://webkit.org/blog/16574/webkit-features-in-safari-18-4/), [MDN: Screen Wake Lock API](https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API).
