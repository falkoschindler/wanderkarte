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

Ein neuer Termin ist ein neuer Eintrag in `termine.json`;
Einträge ohne `lat`/`lng` erscheinen in der Liste, aber nicht auf der Karte.
