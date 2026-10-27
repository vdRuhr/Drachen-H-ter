// Die Geschichte: Gespräche, Truhen, Tore, Bosskampf und Ende.
import { S } from './gfx/sprites.js';
import { ITEMS, FUNKI_LEVELS } from './data.js';
import { TILE, pick } from './util.js';

const FUNKI = () => S.funki[0].right[0];

export class Story {
  constructor(game) {
    this.g = game;
  }

  // -------------------------------------------------------------- Figuren
  async talk(npc) {
    const g = this.g, f = g.save.flags;
    const say = (pages) => g.say(npc.name, pages, npc.portrait);
    const choose = (text, choices) => g.choose(npc.name, text, choices, npc.portrait);
    const name = g.save.name;

    switch (npc.id) {
      case 'uhu': {
        if (!f.metUhu) {
          await say([
            `Ah, *${name}*! Gut, dass du da bist. Hast du es schon gehört?`,
            'Der Steinkoloss *Gorm* hat den *Kristall des Wissens* aus unserem Dorf gestohlen!',
            'Seitdem liegt *Aurelia*, unsere große Drachenmutter, in einem tiefen Zauberschlaf.',
            'Nur der Kristall kann sie wecken. Gorm versteckt sich in der *alten Ruine* hinter dem Flüsterwald.',
            'Aber hör gut zu: In unserer Welt ist *Wissen* echte Magie!',
            'Jede richtige Antwort gibt deinem kleinen Drachen *Funki* neue Kraft. Lass es uns gleich ausprobieren – drei Fragen!',
          ]);
          let ok = 0;
          for (let i = 1; i <= 3; i++) {
            const r = await g.askQuestion({ title: `🦉 Uhus Prüfung (${i}/3)`, cancellable: false });
            if (r.correct) ok++;
          }
          await say([ok === 3 ? 'Wunderbar, alles richtig! Du bist ein echtes Köpfchen!' : ok > 0 ? `${ok} von 3 richtig – gut gemacht!` : 'Keine Sorge – Fehler sind zum Lernen da. Die Aufgaben kommen später nochmal!']);
          f.metUhu = true;
          g.funki.place(g.player.x, g.player.y);
          g.learnSpell('fire');
          await say([
            'Sieh nur, Funki ist aufgewacht! Er kann jetzt *Feuerbälle* spucken.',
            'Tippe auf den Knopf *🔥*, um zu zaubern. Jeder Zauber kostet *MP* – und eine richtige Antwort!',
            'Je mehr Fragen du *hintereinander* richtig beantwortest, desto stärker werden deine Zauber.',
            'Mit dem *Schwert* (⚔️) kämpfst du. Warte, bis die Leiste *100%* zeigt – dann trifft dein Schlag am stärksten!',
            'Besuch auch *Oma Kräuter* rechts im Dorf. Sie kennt einen Heilzauber. Und dann: auf in den Flüsterwald!',
          ]);
          g.saveGame();
          return;
        }
        const c = await choose('Was möchtest du tun?', ['📚 Übungsrunde (5 Fragen)', '⚙️ Fächer & Klasse einstellen', '📖 Lernbuch ansehen', '💡 Einen Tipp, bitte!', 'Tschüss!']);
        if (c === 0) await this.practice(npc);
        else if (c === 1) await g.screens.showSettings();
        else if (c === 2) await g.screens.showBook();
        else if (c === 3) await say(this.tip());
        return;
      }
      case 'oma': {
        if (!g.save.spells.includes('heal')) {
          await say([
            'Hallo, mein Schatz! Du willst also gegen Gorm ziehen? Dann brauchst du meinen *Heilzauber*.',
            'Aber erst eine kleine Frage – Zauberei braucht einen wachen Kopf!',
          ]);
          for (;;) {
            const r = await g.askQuestion({ title: '🌿 Omas Frage', cancellable: false });
            if (r.correct) break;
            await say(['Fast! Versuch es gleich noch einmal.']);
          }
          g.learnSpell('heal');
          await say(['Prima! Jetzt kennst du *Heilung* 💚. Damit kannst du dich jederzeit selbst heilen.']);
          g.saveGame();
          return;
        }
        const p = g.player;
        if (p.hp < p.maxHp || p.mp < p.maxMp) {
          await say(['Du siehst müde aus. Komm, ich päppel dich auf!']);
          g.healFull();
          g.sound.play('heal');
          await say(['So, alles wieder gut! 🍵']);
        } else {
          await say([pick([
            'Iss genug Obst, Kind! 🍎',
            g.funki.level >= 2 ? 'Funki ist ja schon wieder gewachsen! Du lernst bestimmt fleißig.' : 'Funki ist noch so klein … Jede richtige Antwort lässt ihn wachsen!',
            'Wenn du mal nicht weiterweißt: Professor Uhu hilft immer gern.',
          ])]);
        }
        return;
      }
      case 'kurt': {
        for (;;) {
          const opts = Object.entries(ITEMS).map(([, it]) => `${it.icon} ${it.name} – ${it.price} Taler`);
          const c = await choose(`Willkommen bei Kurt! Was darf's sein? Du hast *${g.save.coins} Taler*.`, [...opts, 'Nichts, danke.']);
          const ids = Object.keys(ITEMS);
          if (c >= ids.length) {
            await say(['Bis bald! Und immer schön rechnen – auch beim Wechselgeld! 😄']);
            return;
          }
          const id = ids[c], it = ITEMS[id];
          if (g.save.coins >= it.price) {
            g.save.coins -= it.price;
            g.save.items[id] = (g.save.items[id] || 0) + 1;
            g.sound.play('coin');
            await say([`Bitte schön: ein *${it.name}*! ${g.save.coins} Taler bleiben übrig.`]);
          } else {
            await say(['Oh, dafür reichen deine Taler leider nicht. Bei Monstern, in Büschen und an Rätselsteinen findest du welche!']);
          }
        }
      }
      case 'bruno':
        if (!f.metUhu) await say(['Halt, junger Drachenhüter! *Professor Uhu* will dich dringend sprechen.', 'Sein blauer Turm steht links oben im Dorf.']);
        else if (!f.bossDone) await say(['Der Flüsterwald liegt gleich hinter mir. Pass gut auf dich auf!']);
        else await say(['Ein Held! Ganz Drachenwinkel ist stolz auf dich!']);
        return;
      case 'lia':
        await say([pick([
          'Wusstest du? Wenn du *mehrere Fragen hintereinander* richtig beantwortest, werden deine Zauber stärker!',
          'Im Gebüsch findet man manchmal *Taler* – einfach mit dem Schwert hineinhauen!',
          'Die *Drachenstatuen* speichern dein Spiel und heilen dich.',
          'Ich übe jeden Tag das Einmaleins. Mein Lieblingsergebnis ist 7 · 8 = 56!',
        ])]);
        return;
      case 'finn':
        await say([pick([
          'Ich hab gesehen, wie Funki einen Schmetterling gejagt hat. Haha!',
          'Falsche Antworten sind nicht schlimm – die Aufgabe kommt später nochmal, dann weißt du es!',
          'Im Wald gibt es *Rätselsteine*. Wer ihre Frage löst, bekommt Taler!',
          'Gorm ist riesig! Aber Zauber machen seinem Schild zu schaffen, sagt mein Opa.',
        ])]);
        return;
      default:
        await say(['Hallo!']);
    }
  }

  async practice(npc) {
    const g = this.g;
    let ok = 0, asked = 0;
    for (let i = 1; i <= 5; i++) {
      const r = await g.askQuestion({ title: `📚 Übungsrunde (${i}/5)`, subtitle: 'Jede richtige Antwort bringt 2 Taler.' });
      if (r.cancelled) break;
      asked++;
      if (r.correct) ok++;
    }
    if (!asked) return;
    const coins = ok * 2;
    g.save.coins += coins;
    if (coins) g.sound.play('coin');
    await g.say(npc.name, [`Du hast *${ok} von ${asked}* richtig! Dafür bekommst du *${coins} Taler*.`], npc.portrait);
  }

  tip() {
    const g = this.g, f = g.save.flags;
    const lv = g.funki.level;
    const nextAt = FUNKI_LEVELS[lv];
    const funkiInfo = nextAt !== undefined
      ? `Funki ist auf Stufe *${lv}*. Noch *${nextAt - g.save.learn.correct}* richtige Antworten, dann wächst er weiter!`
      : `Funki ist schon auf der höchsten Stufe *${lv}*. Unglaublich!`;
    let hint;
    if (!g.save.spells.includes('heal')) hint = '*Oma Kräuter* kennt einen Heilzauber. Ihr grünes Haus steht rechts oben im Dorf.';
    else if (!f.waldtor) hint = 'Das *Wissenstor* im Norden des Flüsterwalds öffnet sich nur für *3 richtige Antworten*.';
    else if (!f.bossDone) hint = 'Gorms *Kristallschild* hält Schwerthiebe ab. Brich ihn mit *Zaubern*, dann greif mit dem Schwert an!';
    else hint = 'Du hast Aurelia gerettet! Übe weiter, damit Funki noch größer wird.';
    const spells = g.save.spells.includes('bolt') ? [] : ['Wenn Funki *Stufe 3* erreicht, lernt er den Zauber *Blitz* ⚡!'];
    return [hint, funkiInfo, ...spells];
  }

  // -------------------------------------------------------------- Dinge
  async use(prop) {
    const g = this.g;
    switch (prop.kind) {
      case 'sign':
      case 'house':
      case 'well':
        await g.say(null, prop.text);
        return;
      case 'statue':
        g.healFull();
        g.save.respawn = { map: g.world.id, x: prop.x, y: prop.y + 14 };
        g.sound.play('save');
        g.saveGame();
        await g.say(null, ['Die Drachenstatue leuchtet warm. Du fühlst dich erfrischt. ✨', 'Dein Spielstand wurde *gespeichert*.']);
        return;
      case 'chest':
        await this.chest(prop);
        return;
      case 'riddle':
        await this.riddle(prop);
        return;
      case 'gate':
        await this.gate(prop);
        return;
      case 'aurelia':
        if (g.save.flags.aureliaAwake) {
          await g.say('Aurelia', [
            `Danke, ${g.save.name}! Dank deines Wissens bin ich wieder wach.`,
            'Übe weiter fleißig – dann wird Funki eines Tages ein großer, starker Drache, so wie ich!',
          ]);
        } else {
          await g.say(null, ['Aurelia, die große Drachenmutter, schläft tief und fest. Ein dunkler Zauber liegt auf ihr …',
            g.save.flags.metUhu ? 'Der *Kristall des Wissens* könnte sie wecken.' : 'Vielleicht weiß *Professor Uhu* Rat.']);
        }
        return;
      default:
        return;
    }
  }

  async chest(prop) {
    const g = this.g, o = prop.data;
    if (g.save.opened[o.id]) {
      await g.say(null, ['Die Truhe ist leer.']);
      return;
    }
    if (o.quiz) {
      await g.say(null, ['Eine *Rätseltruhe*! Sie öffnet sich nur für eine richtige Antwort.']);
      const r = await g.askQuestion({ title: '🧰 Rätseltruhe', subtitle: 'Antworte richtig, um die Truhe zu öffnen.' });
      if (r.cancelled) return;
      if (!r.correct) {
        await g.say(null, ['Die Truhe bleibt verschlossen. Versuch es gleich noch einmal!']);
        return;
      }
    }
    g.save.opened[o.id] = true;
    g.sound.play('chest');
    if (o.coins) {
      g.save.coins += o.coins;
      await g.say(null, [`Du findest *${o.coins} Taler*! 🪙`]);
    } else {
      const it = ITEMS[o.item];
      g.save.items[o.item] = (g.save.items[o.item] || 0) + o.n;
      await g.say(null, [`Du findest *${o.n}× ${it.name}* ${it.icon}!`]);
    }
    g.saveGame();
  }

  async riddle(prop) {
    const g = this.g, w = g.world;
    if (w.usedRiddles.has(prop.id)) {
      await g.say(null, ['Der Rätselstein schweigt. Komm später wieder!']);
      return;
    }
    await g.say(null, ['Ein *Rätselstein*. In ihn ist eine Frage gemeißelt …']);
    const r = await g.askQuestion({ title: '🪨 Rätselstein', subtitle: 'Richtig geantwortet? Dann gibt es 10 Taler!' });
    if (r.cancelled) return;
    w.usedRiddles.add(prop.id);
    if (r.correct) {
      g.save.coins += 10;
      g.sound.play('coin');
      await g.say(null, ['Der Stein leuchtet hell! Du bekommst *10 Taler*.']);
    } else {
      await g.say(null, ['Der Stein grummelt leise. Versuch es ein andermal!']);
    }
  }

  async gate(prop) {
    const g = this.g, o = prop.data;
    if (g.save.flags[o.id]) return;
    const c = await g.choose(null, `Das *Wissenstor* ist mit Runen versiegelt. Beantworte *${o.need} Fragen richtig*, um es zu öffnen!`, ['Los geht\'s!', 'Später']);
    if (c !== 0) return;
    let ok = 0;
    while (ok < o.need) {
      const r = await g.askQuestion({ title: `🔮 Wissenstor (${ok}/${o.need} richtig)`, subtitle: 'Jede richtige Antwort löst eine Rune.' });
      if (r.cancelled) {
        await g.say(null, ['Die Runen leuchten wieder auf. Komm zurück, wenn du bereit bist!']);
        return;
      }
      if (r.correct) ok++;
    }
    g.save.flags[o.id] = true;
    g.world.setSolid(o.tx + 1, o.ty, 0);
    prop.talk = null;
    g.sound.play('gate');
    g.shake(5);
    g.banner.show('Das Tor ist offen!<small>Dahinter liegt die alte Ruine …</small>', 2400);
    g.saveGame();
  }

  // -------------------------------------------------------------- Ereignisse
  async blockedExit() {
    const g = this.g;
    await g.say('Wache Bruno', ['Halt! *Professor Uhu* will dich zuerst sprechen. Sein blauer Turm steht links oben im Dorf.'], S.bruno.down[0]);
    g.player.y += 14;
    g.player.dir = 'down';
  }

  async trigger(t) {
    const g = this.g;
    if (t.id === 'bossArena') {
      const boss = g.world.boss;
      if (!boss || boss.awake || boss.dead) return;
      g.sound.stopMusic();
      g.shake(6);
      g.sound.play('stomp');
      await g.wait(500);
      await g.say('Gorm', ['GRRROOOAAARRR! Wer stört meine Ruhe?', 'Den Kristall des Wissens bekommst du nie! Mein *Kristallschild* hält jedes Schwert ab!']);
      await g.say('Funki', ['*Tipp:* Sein Schild hält Schwerthiebe ab. Mit *Zaubern* (🔥 ⚡) können wir ihn zerbrechen – dann schnell mit dem Schwert zuschlagen!'], FUNKI());
      boss.awake = true;
      g.sound.music('boss');
    }
  }

  async bossDefeated() {
    const g = this.g;
    g.sound.stopMusic();
    await g.wait(1200);
    g.sound.play('fanfare');
    g.banner.show('Gorm ist besiegt!', 2400);
    await g.wait(1400);
    g.sound.music('ruine');
  }

  async crystal() {
    const g = this.g;
    g.sound.play('fanfare');
    await g.say(null, ['Du hast den *Kristall des Wissens* gefunden! ✨', 'Er funkelt in allen Farben. Schnell zurück zu Aurelia!']);
    g.save.flags.crystal = true;
    await g.changeMap('dorf', 16 * TILE, 14.6 * TILE, 'up');
    await g.wait(400);
    await g.say(null, ['Du hältst den Kristall in die Höhe. Ein warmes Licht hüllt Aurelia ein …']);
    g.save.flags.aureliaAwake = true;
    g.sound.play('levelup');
    g.shake(4);
    await g.wait(900);
    await g.say('Aurelia', [
      `*${g.save.name}*, du hast mich gerettet!`,
      'Nicht mit Kraft allein – sondern mit deinem *Wissen*. Das ist die stärkste Magie von allen.',
      'Funki und ich sind sehr stolz auf dich. ❤️',
    ]);
    g.saveGame();
    await g.screens.showEnding();
  }

  async playerDown() {
    const g = this.g;
    await g.wait(1100);
    await g.say(null, ['Du bist erschöpft … Funki bringt dich in Sicherheit.']);
    const r = g.save.respawn;
    g.player.revive();
    await g.changeMap(r.map, r.x, r.y, 'down');
  }
}
