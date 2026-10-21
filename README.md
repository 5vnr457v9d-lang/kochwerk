# Kochwerk

Lokales digitales Kochbuch als installierbare PWA.

## Funktionen

- Rezepte erstellen, bearbeiten, duplizieren und löschen
- Frei anlegbare Kochbücher; mehrere Bücher pro Rezept
- Jede beliebige Zutatenmenge direkt ändern und alle übrigen Mengen proportional berechnen
- Rezeptbilder, Favoriten, Suche und Druckansicht
- Kreuz in der Suchleiste bei nichtleerem Text: leert die Suche, aktualisiert die Ergebnisse und setzt den Fokus zurück ins Suchfeld; Kochbuchfilter und Sortierung bleiben erhalten
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

73 automatisierte fachliche und simulierte Offline-Tests bestanden; beide statischen Starthelfer auf Linux geprüft. Die Tests simulieren Wake-Lock- und Offline-Lebenszyklen. Ein automatisierter Test auf echten iPhones oder Android-Geräten wurde nicht durchgeführt.

Aktueller Quellcode und Tests liegen in diesem Repository.

## Entwicklertests

Mit Node.js 22 oder neuer: `node --test tests/*.test.js`. Die Tests prüfen die Rechenregeln, den Wechsel der Bezugszutat, vorhandene Sicherungen und den Offline-Cache in einer simulierten Umgebung. Es werden keine zusätzlichen Pakete benötigt.

## Automatisches Bildschirm-Wachhalten

Kochwerk fordert beim Öffnen automatisch einen Screen Wake Lock an. Es gibt dafür keinen Schalter. Die Statusmeldung „Bildschirm bleibt an, solange Kochwerk sichtbar ist“ wird erst nach einer erfolgreichen Bestätigung durch das Gerät angezeigt.

Die erste Anfrage erfolgt nach dem Laden der lokalen Daten und der ersten Darstellung. Die zusätzlichen Start-Timer aus Version 1.2.2 sowie der Focus-Handler wurden entfernt. Im Hintergrund wird die Sperre freigegeben; beim Zurückkehren wird sie erneut angefordert. Wird die automatische Anfrage abgelehnt, kann ein normaler Tap in die App einen neuen Versuch auslösen. Dieser Versuch erfolgt synchron im abgeschlossenen Klick-Ereignis, nicht beim ersten Touchkontakt (`pointerdown`). Wiederholte Eingaben werden auf einen Versuch pro Sekunde begrenzt. Es gibt keine zeitgesteuerte Wiederholungsschleife und keinen zusätzlichen Schalter.

Die Kopfzeile reserviert feste Zeilen für Offline- und Wachhalten-Status. Dadurch ändern unterschiedliche Statusmeldungen nicht mehr die Position des Inhalts. Unter „Daten & App“ wird die installierte Quellcode-Version angezeigt.

Die Tests prüfen insbesondere die Reihenfolge Erstaufbau → Anfrage, Touchanfang → abgeschlossener Tap, einen Tap vor dem ersten Bild sowie Hintergrund/Rückkehr. Eine Browser- oder iPhone-Messung des Ruckelns konnte in dieser Umgebung nicht durchgeführt werden.

Home-Bildschirm-Apps unterstützen Screen Wake Lock auf iOS/iPadOS seit 18.4. Stromsparmodus, niedriger Akkustand oder Systemrichtlinien können das Wachhalten verhindern oder beenden; dann erscheint ein Hinweis. Manuelles Sperren lässt sich nicht verhindern. Der Nutzer hat das Wachhalten auf dem iPhone nach Bedienung bestätigt; Version 1.2.2 wurde anschließend als Regression mit ausbleibendem Wachhalten und Ruckeln gemeldet. Die Korrektur in 1.2.3 muss auf dem iPhone noch praktisch überprüft werden.

Referenzen: [WebKit: Safari 18.4](https://webkit.org/blog/16574/webkit-features-in-safari-18-4/), [MDN: Screen Wake Lock API](https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API).

## Plattformen

Kochwerk verwendet Webstandards und ist für aktuelle Browser auf iPhone/iPad, Android und Desktop ausgelegt. Chrome unter Android unterstützt Screen Wake Lock; Home-Bildschirm-Apps auf iOS/iPadOS benötigen dafür mindestens 18.4. Installation, Dateiauswahl und Systemfreigaben unterscheiden sich je nach Browser. Geräte- und Browsereinstellungen können das Wachhalten verhindern. Eine vollständige Geräte- und Browser-Testmatrix liegt nicht vor. Rezepte und Bilder bleiben lokal je Browser und Gerät; ein Gerätewechsel erfolgt über Export/Import und synchronisiert nicht automatisch.

Referenz: [Chrome: Screen Wake Lock](https://developer.chrome.com/docs/capabilities/web-apis/wake-lock).
