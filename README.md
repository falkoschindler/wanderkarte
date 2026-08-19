# Müllwandern Münster

Webseite und Karte für die monatlichen Clean-Ups in Münster:
jeden 2. Sonntag im Monat sammeln wir gemeinsam Müll ein.

Live unter <https://falkoschindler.github.io/wanderkarte/> (GitHub Pages, Branch `main`, Verzeichnis `/`).

## ⚠️ Vor dem Umzug auf die richtige Domain: `noindex` entfernen!

In [`index.html`](index.html) steht im `<head>`:

```html
<meta name="robots" content="noindex, nofollow">
```

Damit hält sich die Seite bewusst aus Google & Co. heraus, solange sie nur unter der GitHub-Pages-URL läuft.
**Sobald die Seite auf die eigentliche Domain umzieht, muss diese Zeile weg** —
sonst bleibt die neue Seite dauerhaft unauffindbar, und niemand merkt es,
weil die Seite selbst völlig normal aussieht.

Kurz zum Hintergrund, damit die Entscheidung nachvollziehbar bleibt:

- Eine `robots.txt` in *diesem* Repo würde unter `/wanderkarte/robots.txt` landen und von Crawlern ignoriert.
  Gültig ist nur eine in der Domain-Wurzel, also `https://falkoschindler.github.io/robots.txt`,
  und die käme aus einem separaten Repo `falkoschindler.github.io` und würde dann für *alle* Projektseiten gelten.
- Eigene HTTP-Header (`X-Robots-Tag`) kann GitHub Pages nicht setzen.
- Das Meta-Tag wirkt dagegen unabhängig vom Pfad und betrifft nur dieses Projekt.

Nicht abgedeckt: die Seite bleibt für jeden erreichbar, der die URL kennt,
und die Repo-Seite auf github.com selbst kann weiterhin indexiert werden.

## Landingpage (Platzhalter)

Unter <https://muellwandern-muenster.de/> liegt vorerst nur [`landing/index.html`](landing/index.html):
eine einzelne, statische Datei mit dem nächsten Clean-Up, den restlichen Terminen des Jahres und Links zu Instagram und Mail.
Schriften (Fredoka, Bebas Neue – SIL Open Font License) und das Instagram-Logo sind als data-URIs eingebettet,
die Seite braucht also keine weiteren Dateien und keinen externen Font-Server.

Termine stehen dort zweimal – in der HTML-Liste und im `<script>` –
und werden nicht aus `termine.json` gelesen; beim Nachtragen beide Stellen pflegen.
Vergangene Termine blendet die Seite selbst aus, gibt es keine kommenden mehr, verweist sie auf Instagram.
Impressum und Datenschutzerklärung stecken als aufklappbare Abschnitte in derselben Datei (`#impressum`, `#datenschutz`).
Sobald die Hauptseite fertig ist, ersetzt sie die Landingpage (dann `noindex` entfernen, siehe oben).

## Aufbau

Statische Seite ohne Build-Schritt — einfach [`index.html`](index.html) im Browser öffnen.

| Datei | Inhalt |
| --- | --- |
| [`index.html`](index.html) | Seitenstruktur: Hero, nächster Termin, Ablauf, Karte, Mitmachen, Team, Kontakt |
| [`style.css`](style.css) | Gesamtes Styling |
| [`script.js`](script.js) | Karte (Leaflet, per CDN), Terminliste, Zeitleiste, Ebenen-Umschalter |
| [`termine.json`](termine.json) | Alle Clean-Ups: `date`, `location`, `lat`/`lng`, optional `note` |
| [`glascontainer.json`](glascontainer.json) | Altglascontainer als zuschaltbare Kartenebene: `lat`/`lng`, `ort`, `viertel` |
| [`bilder/`](bilder/) | Fotos der letzten Clean-Ups, Dateiname `YYYY-MM-DD.jpg`, verlinkt in den Karten-Popups |
| [`vendor/leaflet/`](vendor/leaflet/) | Leaflet 1.9.4 (BSD-2-Clause), lokal statt vom CDN – so bleibt der Kachelserver der einzige Drittanbieter |
| [`landing/index.html`](landing/index.html) | Platzhalter-Landingpage für die Domain (siehe oben) |
| [`TODO.md`](TODO.md) | Offene Punkte vor dem Live-Gang der Hauptseite |

Ein neuer Termin ist ein neuer Eintrag in `termine.json`;
Einträge ohne `lat`/`lng` erscheinen in der Liste, aber nicht auf der Karte.

Impressum und Datenschutzerklärung stehen als aufklappbarer Abschnitt am Seitenende (`#impressum`, `#datenschutz`).
Der Hosting-Absatz beschreibt All-Inkl (Ziel-Domain); die GitHub-Pages-Vorschau ist davon nicht erfasst.
