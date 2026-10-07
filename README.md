# Müllwandern Münster

Webseite und Karte für die monatlichen Clean-Ups in Münster:
jeden 2. Sonntag im Monat sammeln wir gemeinsam Müll ein.

Live unter <https://muellwandern-muenster.de/> (Hosting bei All-Inkl, siehe [Deployment](#deployment)).

## Suchmaschinen

Die Seite ist indexierbar (kein `noindex` mehr).
`index.html` nennt per `<link rel="canonical">` die Domain als einzige gültige Adresse,
falls doch irgendwo eine Kopie auftaucht.
Die frühere Vorschau unter GitHub Pages (`falkoschindler.github.io/wanderkarte/`) ist abgeschaltet,
damit es keinen zweiten, doppelt indexierten Auftritt gibt.
Wird sie wieder eingeschaltet, bleibt der Canonical-Link die einzige Absicherung:
eine wirksame `robots.txt` oder `X-Robots-Tag`-Header lassen sich auf GitHub Pages nicht setzen.

## Landingpage (abgelöst)

[`landing/index.html`](landing/index.html) lag bis zum Umzug als Platzhalter unter der Domain:
eine einzelne, statische Datei mit dem nächsten Clean-Up, den restlichen Terminen des Jahres und Links zu Instagram und Mail.
Seit dem Umzug ersetzt die Hauptseite sie; die Datei wird nicht mehr hochgeladen.

## Aufbau

Statische Seite ohne Build-Schritt.
Zum lokalen Testen über einen Webserver öffnen, z. B. `python3 -m http.server` und dann <http://localhost:8000>;
direkt per `file://` blockiert der Browser das Laden von `termine.json`.
Der CARTO-Key ist nur für die Domain freigeschaltet, lokal bleibt der Kartenhintergrund deshalb grau.

| Datei | Inhalt |
| --- | --- |
| [`index.html`](index.html) | Seitenstruktur: Hero, nächster Termin, Ablauf, Karte, Mitmachen, Team, Kontakt |
| [`style.css`](style.css) | Gesamtes Styling |
| [`script.js`](script.js) | Karte (Leaflet, per CDN), Terminliste, Zeitleiste, Ebenen-Umschalter |
| [`termine.json`](termine.json) | Alle Clean-Ups: `date`, `location`, `lat`/`lng`, optional `note`, `time` sowie `photo`/`post` (Gruppenfoto und Instagram-Beitrag) |
| [`glascontainer.json`](glascontainer.json) | Altglascontainer als zuschaltbare Kartenebene: `lat`/`lng`, `ort`, `viertel` |
| [`bilder/`](bilder/) | Gruppenfotos der Clean-Ups seit April 2023 aus den Instagram-Beiträgen, 4:3 um die Gruppe beschnitten, 540 px, Dateiname `YYYY-MM-DD.jpg`, verlinkt in den Karten-Popups |
| [`team/`](team/) | Porträts für den Team-Abschnitt, quadratisch 320 px, als Kreis angezeigt |
| [`grafik/`](grafik/) | Logo und Müll-Illustrationen vom Flyer als SVG (siehe unten) |
| [`fonts/`](fonts/) | Fredoka und Bebas Neue als WOFF2 (SIL Open Font License), lokal eingebunden |
| [`vendor/leaflet/`](vendor/leaflet/) | Leaflet 1.9.4 (BSD-2-Clause), lokal statt vom CDN – so bleibt der Kachelserver der einzige Drittanbieter |
| [`landing/index.html`](landing/index.html) | Frühere Platzhalter-Landingpage (siehe oben) |
| [`TODO.md`](TODO.md) | Offene Punkte und Ideen |
| [`.htaccess`](.htaccess) | Cache-Header für das Apache-Hosting (siehe unten) |
| [`.githooks/`](.githooks/) | pre-commit-Hook, der die `?v=`-Version in `index.html` hochzählt |
| [`deploy.sh`](deploy.sh) | Upload ins Webroot per rsync über SSH (siehe unten) |

Ein neuer Termin ist ein neuer Eintrag in `termine.json`;
Einträge ohne `lat`/`lng` erscheinen in der Liste, aber nicht auf der Karte.

Impressum und Datenschutzerklärung klappen im Footer aus (`#impressum`, `#datenschutz`).

Die Kartenkacheln kommen von CARTO und brauchen seit 2026 einen API-Key
(`CARTO_KEY` in `script.js`; kostenlos und ohne Account über
[carto.com/basemaps/apikey](https://carto.com/basemaps/apikey), bis 5 Mio. Anfragen im Monat für nicht-kommerzielle Projekte).
Ohne Key liefert CARTO nur ein „API KEY REQUIRED“-Wasserzeichen.

## Caching

`index.html` bindet `style.css?v=…` und `script.js?v=…` mit einem Zeitstempel ein,
damit Browser nach einem Deployment nicht die alte Datei aus dem Cache nehmen.
Der Zeitstempel wird vom Hook [`.githooks/pre-commit`](.githooks/pre-commit) automatisch hochgezählt,
sobald eine der drei Dateien committet wird – einmalig pro Klon aktivieren:

```sh
git config core.hooksPath .githooks
```

`termine.json` und `glascontainer.json` lädt `script.js` mit `cache: 'no-cache'`,
d. h. der Browser fragt den Server jedes Mal nach einer neuen Version (ETag/304) – neue Termine erscheinen sofort.
Fotos, Grafiken und Schriften haben stabile Namen; ändert sich eine Datei inhaltlich, bekommt sie einen neuen Namen.

Auf dem Apache-Hosting setzt [`.htaccess`](.htaccess) die Header:
HTML und JSON `no-cache`, versionierte Assets eine Woche.

## Deployment

[`deploy.sh`](deploy.sh) lädt die Seite per `rsync` über SSH ins Webroot von `muellwandern-muenster.de`:

```sh
./deploy.sh -n   # Probelauf: zeigt nur, was sich ändern würde
./deploy.sh      # hochladen
```

Hochgeladen werden nur `index.html`, `style.css`, `script.js`, `termine.json`, `glascontainer.json`, `.htaccess`
und die Ordner `bilder/`, `team/`, `grafik/`, `fonts/`, `vendor/`.
Innerhalb dieser Ordner löscht `rsync` auch Dateien, die es im Repo nicht mehr gibt;
alles andere im Webroot bleibt unberührt.
Das Skript bricht ab, solange eine dieser Dateien uncommittete Änderungen hat –
live entspricht so immer einem Commit.

Einmalig einrichten:

1. Im All-Inkl-KAS unter *Tools → SSH-Zugänge* SSH aktivieren (ab Tarif PrivatPlus)
   und den eigenen Public Key hinterlegen.
2. Ziel in `.deploy.env` eintragen (steht in `.gitignore`), Benutzer und Pfad wie im KAS angezeigt:

   ```sh
   DEPLOY_TARGET="ssh-w0123456@w0123456.kasserver.com:/www/htdocs/w0123456/muellwandern-muenster.de/"
   ```

## Design

Farben und Schriften folgen der Corporate Identity (`MuellWandern_CI.pdf`):
Grün `#127354`, Salbei `#a7c5a3`, Weiß, Coral `#f66c72`, Peach `#f1a97c`, Purple `#e8b1f8`;
dazu als Flächenfarbe das Creme des Flyers (`#FBF7E6`).
Alle Werte stehen als CSS-Variablen am Anfang von [`style.css`](style.css).
Überschriften in Fredoka (passt zur Logoschrift), Kicker, Daten und Labels in Bebas Neue wie auf dem Flyer.

Logo und Müll-Illustrationen in [`grafik/`](grafik/) sind Vektoren aus `MuellWandern_MS_Support.pdf` (Seite 1):
mit `pdftocairo -svg -x -y -W -H` ausgeschnitten, Hintergrund und Nachbar-Elemente per Skript entfernt,
die großen Textur-Pfade (Körnung) weggelassen und mit `svgo` verkleinert – zusammen rund 100 KB.
Die Karte nutzt dieselben Farben: Grün für vergangene, Coral für geplante Termine, Purple für Altglascontainer.
