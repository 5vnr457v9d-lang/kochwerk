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

75 automatisierte fachliche und simulierte Offline-Tests bestanden; beide statischen Starthelfer auf Linux geprüft. Die Tests simulieren Wake-Lock- und Offline-Lebenszyklen. Ein automatisierter Test auf echten iPhones oder Android-Geräten wurde nicht durchgeführt.

Aktueller Quellcode und Tests liegen in diesem Repository.

## Entwicklertests

Mit Node.js 22 oder neuer: `node --test tests/*.test.js`. Die Tests prüfen die Rechenregeln, den Wechsel der Bezugszutat, vorhandene Sicherungen und den Offline-Cache in einer simulierten Umgebung. Es werden keine zusätzlichen Pakete benötigt.

## Automatisches Bildschirm-Wachhalten

Kochwerk fordert beim Öffnen automatisch einen Screen Wake Lock an. Es gibt dafür keinen Schalter. Die Statusmeldung „Bildschirm bleibt an, solange Kochwerk sichtbar ist“ wird erst nach einer erfolgreichen Bestätigung durch das Gerät angezeigt.

Beim Start, nach dem Laden sowie bei der Rückkehr in die App wird das Wachhalten erneut geprüft. Nach einer frühen Ablehnung folgen ohne Bedienung bis zu drei weitere Versuche nach 0,3, 1,2 und 3 Sekunden. Bereits aktives Wachhalten oder eine laufende Anfrage erzeugen keine zusätzliche Anfrage. Im Hintergrund werden geplante Versuche abgebrochen und die Sperre freigegeben; beim Zurückkehren wird sie neu angefordert. Wurde das Wachhalten vom System aufgehoben oder abgelehnt, erfolgt außerdem bei der nächsten normalen Bedienung ein neuer Versuch; wiederholte Eingaben werden auf höchstens einen solchen Versuch je zehn Sekunden begrenzt. Es gibt keine dauernde Abfrageschleife.

Home-Bildschirm-Apps unterstützen Screen Wake Lock auf iOS/iPadOS seit 18.4. Stromsparmodus, niedriger Akkustand oder Systemrichtlinien können das Wachhalten verhindern oder beenden; dann erscheint ein Hinweis. Manuelles Sperren lässt sich nicht verhindern. Der Nutzer hat das Wachhalten auf dem iPhone nach Bedienung bestätigt; der korrigierte Start ohne Bedienung muss dort noch praktisch überprüft werden.

Referenzen: [WebKit: Safari 18.4](https://webkit.org/blog/16574/webkit-features-in-safari-18-4/), [MDN: Screen Wake Lock API](https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API).

## Plattformen

Kochwerk verwendet Webstandards und ist für aktuelle Browser auf iPhone/iPad, Android und Desktop ausgelegt. Chrome unter Android unterstützt Screen Wake Lock; Home-Bildschirm-Apps auf iOS/iPadOS benötigen dafür mindestens 18.4. Installation, Dateiauswahl und Systemfreigaben unterscheiden sich je nach Browser. Geräte- und Browsereinstellungen können das Wachhalten verhindern. Eine vollständige Geräte- und Browser-Testmatrix liegt nicht vor. Rezepte und Bilder bleiben lokal je Browser und Gerät; ein Gerätewechsel erfolgt über Export/Import und synchronisiert nicht automatisch.

Referenz: [Chrome: Screen Wake Lock](https://developer.chrome.com/docs/capabilities/web-apis/wake-lock).
