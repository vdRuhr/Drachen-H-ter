# 🐉 Drachen-Hüter

Ein 2D-Action-Rollenspiel im Stil von **Secret of Mana**, gebaut fürs **iPad** – mit eingebautem Lernen für die Grundschule (Klasse 1–4).

> In Drachenwinkel ist **Wissen echte Magie**: Jeder Zauber wird erst durch eine richtig beantwortete Aufgabe ausgelöst, und jede richtige Antwort lässt den kleinen Drachen **Funki** wachsen.

## Die Geschichte (Kapitel 1)

Der Steinkoloss **Gorm** hat den *Kristall des Wissens* gestohlen. Seitdem liegt die große Drachenmutter **Aurelia** in einem Zauberschlaf. Du bist ein junger Drachenhüter und machst dich mit Funki auf den Weg:

1. **Drachenwinkel** – Professor Uhu prüft dein Wissen und weckt Funki. Oma Kräuter lehrt dich den Heilzauber, Krämer Kurt verkauft Honigbonbons.
2. **Flüsterwald** – Hoppel, Pilzbolde und Summsel, Rätseltruhen, ein Rätselstein und das **Wissenstor** (3 richtige Antworten öffnen es).
3. **Alte Ruine** – dunkle Gänge mit Fackeln, Steinlinge und der Bosskampf gegen **Gorm**, dessen Kristallschild nur Zauber brechen können.

## Was es mit Secret of Mana gemeinsam hat

- Echtzeit-Kampf mit **Aufladeleiste**: Bei 100 % trifft das Schwert am stärksten
- **Ring-Menü** (◎) mit den Ringen Magie, Taschen und System
- Ein **Begleiter** (Funki), der selbstständig mitkämpft
- Pixelgrafik im 16-Bit-Stil aus der 3/4-Draufsicht, Schadenszahlen, Chiptune-Musik
- Alle Grafiken und Klänge werden im Code erzeugt, es gibt keine fremden Bild- oder Audiodateien

## So wird gelernt

| Spielelement | Lernmoment |
|---|---|
| 🔥 Feuerball, 💚 Heilung, ⚡ Blitz | Zauber wirken nur nach einer richtigen Antwort. Mehrere richtige Antworten in Folge verstärken den Zauber. |
| 🐉 Funki | Jede richtige Antwort ist ein Wissensstern, mit dem Funki wächst. Ab Stufe 3 lernt er den Blitz. |
| 🔮 Wissenstor, 🧰 Rätseltruhen, 🪨 Rätselsteine | Zusätzliche Aufgaben mit Belohnung |
| 🦉 Professor Uhu | Übungsrunden, für die es Taler gibt |
| ❌ Fehler | Lösung mit Erklärung und Rechentipp. Die Aufgabe kommt nach ein paar Fragen noch einmal. |
| 📈 Anpassung | Klappt ein Thema gut, werden die Aufgaben schwerer, sonst leichter. |
| 📖 Lernbuch | Trefferquote je Thema und Liste der Aufgaben, die noch schwerfallen (für Eltern) |

**Themen** (unter *Einstellungen* einzeln an- und abschaltbar, die Klassenstufe wählt sie vor):

- **Mathe:** Plus/Minus bis 10, 20, 100 und 1000 · Verdoppeln & Halbieren · Einmaleins (Reihen wählbar) · Geteilt · Mal mit großen Zahlen
- **Deutsch:** Anlaute · Reime · Silben · der/die/das · Gegenteile · Wortarten · Rechtschreibung
- **Englisch:** Tiere · Farben · Zahlen · Essen · Familie & Körper

Weitere Hilfen: 🔊 **Vorlesen** über die Sprachausgabe des iPads (auch automatisch), **Ziffernblock** zum Eintippen von Matheergebnissen. Für die Englisch-Vokabeln wird die Aussprache vorgelesen.

## Auf dem iPad spielen

Das Spiel ist eine reine Web-App (HTML5 + JavaScript, ohne Build-Schritt) und läuft in Safari ab **iPadOS 15**.

### Variante A: über GitHub Pages (empfohlen)

1. Im GitHub-Repository: **Settings → Pages → Build and deployment**
2. *Source*: **Deploy from a branch**, Branch: `main`, Ordner: `/ (root)` → **Save**
3. Nach etwa einer Minute ist das Spiel unter `https://<benutzername>.github.io/Drachen-H-ter/` erreichbar.
4. Auf dem iPad in **Safari** öffnen → **Teilen** → **Zum Home-Bildschirm**.

Danach startet das Spiel wie eine App im Vollbild und funktioniert auch **offline** (über einen Service Worker).

### Variante B: lokal im Heimnetz testen

```bash
python3 -m http.server 8000
```

Dann auf dem iPad `http://<IP-des-Computers>:8000` öffnen. Ohne HTTPS gibt es keinen Offline-Modus, das Spiel selbst läuft aber vollständig.

### Steuerung

| | iPad | Tastatur |
|---|---|---|
| Laufen | linke Bildschirmhälfte: Joystick (erscheint dort, wo der Finger aufsetzt) | Pfeiltasten / WASD |
| Angreifen / Sprechen | ⚔️ (wird zu 💬, wenn jemand vor dir steht) | Leertaste |
| Zaubern (zuletzt benutzter Zauber) | 🔥 | K |
| Ring-Menü | ◎ | Enter / M |

## Für Entwickler

```
index.html            Seite + Oberflächen-Gerüst
css/style.css         Fenster im SNES-Stil, Touch-Knöpfe, Quiz
js/main.js            Spielschleife, Kamera, Zauber, Kartenwechsel
js/story.js           Gespräche, Truhen, Tore, Bosskampf, Ende
js/data.js            Spielwerte (Zauber, Gegner, Stufen) – zum Feintunen
js/learn/questions.js Aufgaben-Generatoren mit Erklärungen  ← neue Themen hier
js/learn/tutor.js     Auswahl, Anpassung, Wiederholung, Statistik
js/world/maps.js      Karten als Textzeichen               ← Level bearbeiten hier
js/world/world.js     Kollision, Objekte, Tiefensortierung, Licht
js/entities/          Spielfigur, Funki, Gegner, Dorfbewohner, Effekte
js/gfx/               Pixelgrafiken, die im Code gezeichnet werden
js/ui/                Dialog, Quiz, Ring-Menü, Einstellungen, Lernbuch
js/audio.js           Soundeffekte und Musik (WebAudio)
sw.js                 Offline-Modus
tests/                Tests für die Aufgaben-Generatoren
```

- **Neues Lernthema:** eine Generator-Funktion in `js/learn/questions.js` schreiben und in `TOPICS` eintragen. Sie liefert `prompt`, `answer`, `choices` und `explain`.
- **Karten ändern:** in `js/world/maps.js` steht jede Kachel als Zeichen, die Legende steht oben in der Datei.
- **Tests:** `node --test` prüft alle Aufgaben-Generatoren und die Wiederholungslogik.
- **Neue Dateien:** Wenn neue Dateien dazukommen, gehören sie in die Liste in `sw.js`, und die Versionsnummer in `CACHE` muss erhöht werden.

## Datenschutz

Alles läuft lokal auf dem Gerät. Spielstand und Lernfortschritt liegen nur im Browser-Speicher (`localStorage`). Das Spiel hat kein Tracking, keine Werbung und keine In-App-Käufe.

## Ideen für weitere Kapitel

- Neue Gebiete (Eiswüste, Vulkan) mit eigenen Zaubern
- Weitere Fächer, z. B. Sachunterricht oder Uhrzeit lesen
- Mehrere Spielstände für Geschwister
- Gegenstände ausrüsten (Schwert, Rüstung) beim Schmied
