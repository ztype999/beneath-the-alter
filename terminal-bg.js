/* ==========================================================================
   BENEATH THE ALTER — terminal background
   A fixed, full-screen, canvas driven terminal that endlessly generates
   code and repeatedly writes "Beneath the Altar" in many languages.

   - three depth layers (background / middle / foreground)
   - one <canvas>, one requestAnimationFrame loop, no per-line DOM
   - device-pixel-ratio aware, responsive, self contained
   - pointer-events:none, always painted behind the site
   - honours prefers-reduced-motion (static frame) and the FX toggle
   ========================================================================== */
(() => {
'use strict';

const root = document.documentElement;
const wrap = document.getElementById('term-bg');
if (!wrap) return;
const canvas = document.getElementById('term-canvas');
const ctx = canvas && canvas.getContext && canvas.getContext('2d');
if (!ctx) return;

/* ------------------------------------------------------------------ helpers */
const rnd = (a, b) => a + Math.random() * (b - a);
const ri  = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
const pick = a => a[(Math.random() * a.length) | 0];
const isAscii = s => /^[\x20-\x7E]*$/.test(s);

const FONT = 'ui-monospace,SFMono-Regular,"Cascadia Mono",Consolas,"DejaVu Sans Mono","Noto Sans Mono","Liberation Mono",Menlo,monospace';

/* ==========================================================================
   1. MULTILINGUAL DICTIONARY — "Beneath the Altar"
   c = locale, l = language, n = native name, t = translation
   ========================================================================== */
const P = [
{c:'en',l:'English',n:'English',t:'Beneath the Altar'},
{c:'es',l:'Spanish',n:'Español',t:'Bajo el Altar'},
{c:'fr',l:'French',n:'Français',t:'Sous l’Autel'},
{c:'de',l:'German',n:'Deutsch',t:'Unter dem Altar'},
{c:'it',l:'Italian',n:'Italiano',t:"Sotto l'Altare"},
{c:'pt',l:'Portuguese',n:'Português',t:'Sob o Altar'},
{c:'ca',l:'Catalan',n:'Català',t:"Sota l'Altar"},
{c:'gl',l:'Galician',n:'Galego',t:'Baixo o Altar'},
{c:'oc',l:'Occitan',n:'Occitan',t:"Sot l'Altar"},
{c:'eo',l:'Esperanto',n:'Esperanto',t:'Sub la Altaro'},
{c:'la',l:'Latin',n:'Latina',t:'Sub Altare'},
{c:'nl',l:'Dutch',n:'Nederlands',t:'Onder het Altaar'},
{c:'fy',l:'Frisian',n:'Frysk',t:'Under it altar'},
{c:'af',l:'Afrikaans',n:'Afrikaans',t:'Onder die altaar'},
{c:'sv',l:'Swedish',n:'Svenska',t:'Under Altaret'},
{c:'nb',l:'Norwegian',n:'Norsk',t:'Under Alteret'},
{c:'da',l:'Danish',n:'Dansk',t:'Under Alteret'},
{c:'fo',l:'Faroese',n:'Føroyskt',t:'Undir altarinum'},
{c:'is',l:'Icelandic',n:'Íslenska',t:'Undir altarinu'},
{c:'fi',l:'Finnish',n:'Suomi',t:'Alttarin Alla'},
{c:'et',l:'Estonian',n:'Eesti',t:'Altari all'},
{c:'lv',l:'Latvian',n:'Latviešu',t:'Zem altāra'},
{c:'lt',l:'Lithuanian',n:'Lietuvių',t:'Po altoriumi'},
{c:'pl',l:'Polish',n:'Polski',t:'Pod Ołtarzem'},
{c:'cs',l:'Czech',n:'Čeština',t:'Pod oltářem'},
{c:'sk',l:'Slovak',n:'Slovenčina',t:'Pod oltárom'},
{c:'hu',l:'Hungarian',n:'Magyar',t:'Az oltár alatt'},
{c:'sl',l:'Slovenian',n:'Slovenščina',t:'Pod oltarjem'},
{c:'hr',l:'Croatian',n:'Hrvatski',t:'Ispod oltara'},
{c:'sr',l:'Serbian',n:'Српски',t:'Испод олтара'},
{c:'bs',l:'Bosnian',n:'Bosanski',t:'Ispod oltara'},
{c:'mk',l:'Macedonian',n:'Македонски',t:'Под олтарот'},
{c:'bg',l:'Bulgarian',n:'Български',t:'Под олтара'},
{c:'ru',l:'Russian',n:'Русский',t:'Под алтарём'},
{c:'uk',l:'Ukrainian',n:'Українська',t:'Під вівтарем'},
{c:'be',l:'Belarusian',n:'Беларуская',t:'Пад алтаром'},
{c:'kk',l:'Kazakh',n:'Қазақша',t:'Алтардың астында'},
{c:'ky',l:'Kyrgyz',n:'Кыргызча',t:'Алтардын астында'},
{c:'tt',l:'Tatar',n:'Татар теле',t:'Алтарь астында'},
{c:'uz',l:'Uzbek',n:'Oʻzbekcha',t:'Altar ostida'},
{c:'az',l:'Azerbaijani',n:'Azərbaycanca',t:'Altarın altında'},
{c:'tr',l:'Turkish',n:'Türkçe',t:'Altarın Altında'},
{c:'mn',l:'Mongolian',n:'Монгол хэл',t:'Тахилын дор'},
{c:'ka',l:'Georgian',n:'ქართული',t:'საკურთხევლის ქვეშ'},
{c:'hy',l:'Armenian',n:'Հայերեն',t:'Սուրբ Սեղանի Տակ'},
{c:'el',l:'Greek',n:'Ελληνικά',t:'Κάτω από τον Βωμό'},
{c:'ro',l:'Romanian',n:'Română',t:'Sub altarul'},
{c:'sq',l:'Albanian',n:'Shqip',t:'Nën altar'},
{c:'eu',l:'Basque',n:'Euskara',t:'Aldarearen azpian'},
{c:'ga',l:'Irish',n:'Gaeilge',t:'Faoi an altóir'},
{c:'gd',l:'Scottish Gaelic',n:'Gàidhlig',t:'Fo an altòir'},
{c:'cy',l:'Welsh',n:'Cymraeg',t:'O dan yr allor'},
{c:'mt',l:'Maltese',n:'Malti',t:'Taħt l-altar'},
{c:'lb',l:'Luxembourgish',n:'Lëtzebuergesch',t:'Unner dem Altar'},
{c:'br',l:'Breton',n:'Brezhoneg',t:'Dindan an altel'},
{c:'he',l:'Hebrew',n:'עברית',t:'מתחת למזבח'},
{c:'ar',l:'Arabic',n:'العربية',t:'تحت المذبح'},
{c:'fa',l:'Persian',n:'فارسی',t:'زیر مذبح'},
{c:'ur',l:'Urdu',n:'اردو',t:'مذبح کے نیچے'},
{c:'hi',l:'Hindi',n:'हिन्दी',t:'वेदी के नीचे'},
{c:'mr',l:'Marathi',n:'मराठी',t:'वेदीखाली'},
{c:'ne',l:'Nepali',n:'नेपाली',t:'वेदीको तल'},
{c:'bn',l:'Bengali',n:'বাংলা',t:'বেদীর নিচে'},
{c:'pa',l:'Punjabi',n:'ਪੰਜਾਬੀ',t:'ਵੇਦੀ ਹੇਠਾਂ'},
{c:'gu',l:'Gujarati',n:'ગુજરાતી',t:'વેદી નીચે'},
{c:'ta',l:'Tamil',n:'தமிழ்',t:'பலிபீடத்தின் கீழ்'},
{c:'te',l:'Telugu',n:'తెలుగు',t:'బలిపీఠం క్రింద'},
{c:'kn',l:'Kannada',n:'ಕನ್ನಡ',t:'ಬಲಿಪೀಠದ ಕೆಳಗೆ'},
{c:'ml',l:'Malayalam',n:'മലയാളം',t:'ബലിപീടത്തിൻ താഴെ'},
{c:'si',l:'Sinhala',n:'සිංහල',t:'පූජා මේසය යටින්'},
{c:'th',l:'Thai',n:'ไทย',t:'ใต้แท่นบูชา'},
{c:'my',l:'Burmese',n:'မြန်မာဘာသာ',t:'ဘုရားစင် အောက်'},
{c:'zh',l:'Chinese',n:'中文',t:'祭坛之下'},
{c:'zt',l:'Chinese (Trad.)',n:'繁體中文',t:'祭壇之下'},
{c:'ja',l:'Japanese',n:'日本語',t:'祭壇の下'},
{c:'ko',l:'Korean',n:'한국어',t:'제단 아래'},
{c:'vi',l:'Vietnamese',n:'Tiếng Việt',t:'Dưới bàn thờ'},
{c:'id',l:'Indonesian',n:'Bahasa Indonesia',t:'Di bawah altar'},
{c:'ms',l:'Malay',n:'Bahasa Melayu',t:'Di bawah altar'},
{c:'tl',l:'Filipino',n:'Filipino',t:'Sa ilalim ng altar'},
{c:'jw',l:'Javanese',n:'Basa Jawa',t:'Ing ngisor altar'},
{c:'ceb',l:'Cebuano',n:'Cebuano',t:'Ilalom sa altar'},
{c:'sw',l:'Swahili',n:'Kiswahili',t:'Chini ya altare'},
{c:'zu',l:'Zulu',n:'isiZulu',t:'Ngaphansi kwe-altare'},
{c:'xh',l:'Xhosa',n:'isiXhosa',t:'Ngaphantsi kwe-altare'},
{c:'st',l:'Sotho',n:'Sesotho',t:'Ka tlase ho altare'},
{c:'am',l:'Amharic',n:'አማርኛ',t:'በመذባሕ ስር'},
{c:'so',l:'Somali',n:'Soomaali',t:'Ka hooseeya altarka'},
{c:'ht',l:'Haitian Creole',n:'Kreyòl ayisyen',t:'Anba altè'}
];

/* ==========================================================================
   2. FAKE BUT CONVINCING SOURCE CODE (one block per language)
   ========================================================================== */
const PROGS = [
{id:'js',lines:[
'export async function loadPhrase(locale) {',
'  const res = await fetch(`/i18n/${locale}.json`);',
'  if (!res.ok) throw new Error(`missing locale: ${locale}`);',
'  return (await res.json()).phrases.beneathTheAltar;',
'}',
'const seen = new Set();',
'for (const locale of locales) if (!seen.has(locale)) await loadPhrase(locale);',
'export const BUILD = "bta@2.6.1";'
]},
{id:'ts',lines:[
'interface AltarPhrase { locale: string; text: string; conf: number }',
'const registry = new Map<string, AltarPhrase>();',
'export function resolve(locale: string): AltarPhrase | undefined {',
'  return registry.get(locale.trim().toLowerCase());',
'}',
'const res: Response = await fetch(`/api/translate?src=en`);',
'const payload = (await res.json()) as { data: AltarPhrase[] };',
'export type PhraseSet = Record<string, string>;'
]},
{id:'py',lines:[
'import json, os, sys',
'PHRASE_KEY = "beneath_the_altar"',
'def load(path):',
'    with open(path, encoding="utf-8") as fh:',
'        return json.load(fh)',
'locales = sorted(os.listdir("./locales"))',
'print(f"[+] indexed {len(locales)} locales")',
'if __name__ == "__main__":',
'    sys.exit(main(locales))'
]},
{id:'cpp',lines:[
'#include <string>',
'#include <vector>',
'#include <iostream>',
'struct Phrase { std::string locale; std::string text; };',
'std::vector<Phrase> load(const std::string& dir) {',
'    std::vector<Phrase> out;',
'    for (const auto& e : std::filesystem::directory_iterator(dir))',
'        out.push_back(parse(e.path().string()));',
'    return out;',
'}',
'int main() { std::cout << "ready" << std::endl; }'
]},
{id:'cs',lines:[
'using System.Text.Json;',
'namespace Altar.Localization;',
'public sealed class PhraseService',
'{',
'    private readonly Dictionary<string, string> _cache = new();',
'    public async Task<string> ResolveAsync(string locale)',
'    {',
'        if (_cache.TryGetValue(locale, out var hit)) return hit;',
'        var json = await File.ReadAllTextAsync($"./i18n/{locale}.json");',
'        return JsonSerializer.Deserialize<Dictionary<string,string>>(json)!["beneath"];',
'    }',
'}'
]},
{id:'rs',lines:[
'use std::collections::HashMap;',
'#[derive(Debug, Clone)]',
'pub struct Phrase { pub locale: String, pub text: String }',
'pub fn load_dir(path: &str) -> std::io::Result<Vec<Phrase>> {',
'    let mut out = Vec::new();',
'    for entry in std::fs::read_dir(path)? {',
'        let entry = entry?;',
'        out.push(parse(&entry.path())?);',
'    }',
'    Ok(out)',
'}',
'fn main() { println!("{}", load_dir("./locales").unwrap().len()); }'
]},
{id:'go',lines:[
'package main',
'import (',
'    "encoding/json"',
'    "os"',
')',
'type Phrase struct {',
'    Locale string `json:"locale"`',
'    Text   string `json:"text"`',
'}',
'func load(path string) ([]Phrase, error) {',
'    raw, err := os.ReadFile(path)',
'    if err != nil { return nil, err }',
'    var out []Phrase',
'    return out, json.Unmarshal(raw, &out)',
'}'
]},
{id:'java',lines:[
'import java.nio.file.*;',
'import java.util.*;',
'public final class AltarIndex {',
'    private final Map<String, String> cache = new HashMap<>();',
'    public String resolve(String locale) throws Exception {',
'        return cache.computeIfAbsent(locale, this::load);',
'    }',
'    private String load(String locale) {',
'        return Files.readString(Path.of("./i18n/" + locale + ".json"));',
'    }',
'}'
]},
{id:'kt',lines:[
'data class Phrase(val locale: String, val text: String)',
'private val cache = mutableMapOf<String, Phrase>()',
'fun resolve(locale: String): Phrase =',
'    cache.getOrPut(locale) { Phrase(locale, load(locale)) }',
'suspend fun syncAll(locales: List<String>) =',
'    locales.map { async { resolve(it) } }.awaitAll()'
]},
{id:'swift',lines:[
'import Foundation',
'struct Phrase: Codable {',
'    let locale: String',
'    let text: String',
'}',
'func load(locale: String) throws -> Phrase {',
'    let url = URL(fileURLWithPath: "./i18n/\\(locale).json")',
'    let data = try Data(contentsOf: url)',
'    return try JSONDecoder().decode(Phrase.self, from: data)',
'}'
]},
{id:'php',lines:[
'<?php',
'declare(strict_types=1);',
'function load_phrase(string $locale): array {',
'    $path = __DIR__ . "/i18n/{$locale}.json";',
'    if (!is_file($path)) throw new RuntimeException("missing {$locale}");',
'    return json_decode(file_get_contents($path), true, 512, JSON_THROW_ON_ERROR);',
'}',
'$locales = glob(__DIR__ . "/i18n/*.json");',
'foreach ($locales as $l) echo basename($l, ".json"), PHP_EOL;'
]},
{id:'html',lines:[
'<!doctype html>',
'<html lang="en">',
'<head>',
'  <meta charset="utf-8">',
'  <title>Beneath the Alter</title>',
'</head>',
'<body data-state="online">',
'  <main id="phrases"></main>',
'  <script type="module" src="./index.js"></script>',
'</body>',
'</html>'
]},
{id:'css',lines:[
':root { --void: #0c0b0d; --accent: #ff2873; }',
'.terminal {',
'  display: grid;',
'  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));',
'  background: color-mix(in oklab, var(--void) 92%, white);',
'}',
'.terminal::after { content: ""; position: absolute; inset: 0; opacity: .06; }',
'@media (prefers-reduced-motion: reduce) {',
'  .stream { animation: none !important; }',
'}'
]},
{id:'sql',lines:[
'CREATE TABLE IF NOT EXISTS phrases (',
'  id SERIAL PRIMARY KEY,',
'  locale      VARCHAR(16) NOT NULL,',
'  text        TEXT NOT NULL,',
'  confidence  REAL DEFAULT 1.0,',
'  updated_at  TIMESTAMPTZ DEFAULT now()',
');',
'CREATE INDEX idx_phrases_locale ON phrases (locale);',
'SELECT locale, count(*) FROM phrases GROUP BY locale ORDER BY 2 DESC;'
]},
{id:'bash',lines:[
'#!/usr/bin/env bash',
'set -euo pipefail',
'LOCALES=$(find ./i18n -name "*.json" | wc -l)',
'echo "[+] indexed $LOCALES locales"',
'for f in ./i18n/*.json; do',
'  jq -e . "$f" > /dev/null || { echo "bad json: $f"; exit 1; }',
'done',
'./scripts/verify.sh --strict'
]},
{id:'json',lines:[
'{',
'  "build": "bta-web",',
'  "version": "2.6.1",',
'  "locales": [ "en", "es", "fr", "de" ],',
'  "flags": { "i18n": true, "telemetry": false },',
'  "hash": "9f3c1ab2",',
'  "phrases": {},',
'  "updatedAt": "2026-10-05T04:11:52Z"',
'}'
]},
{id:'yaml',lines:[
'apiVersion: bta/v1',
'kind: TranslationJob',
'metadata:',
'  name: beneath-the-altar',
'  labels:',
'    env: production',
'spec:',
'  replicas: 3',
'  strategy: RollingUpdate',
'  locales: 89',
'  concurrency: 8'
]},
{id:'xml',lines:[
'<?xml version="1.0" encoding="UTF-8"?>',
'<translations version="1">',
'  <meta>',
'    <source>en</source>',
'    <generated>2026-10-05T04:11:52Z</generated>',
'  </meta>',
'  <phrase key="beneath_the_altar" count="89" />',
'  <status>COMPLETE</status>',
'</translations>'
]}
];

/* shell commands that kick off each block */
const CMD = [
'$ node ./tools/i18n-sync.mjs --all-locales --quiet',
'$ python3 tools/altar_index.py --scan ./locales --json',
'$ grep -R "Beneath the Altar" ./locales | wc -l',
'$ rg -n "Altar" ./src --glob "!*.min.js"',
'$ cargo run --release --bin altar_translator -- --probe',
'$ go run ./cmd/translate -target "*" -depth 3',
'$ docker compose up -d translate-worker',
'$ psql -U altar -d i18n -c "SELECT count(*) FROM phrases;"',
'$ npm run build:locales && npm run verify:i18n',
'$ make all && ./bta --verify --strict',
'$ tail -f /var/log/bta/translation.log',
'$ ssh deploy@node-07 "systemctl status beneath-the-altar"',
'$ jq -r ".locales[]" package.json',
'$ git log --oneline -n 6 -- locales/',
'$ find ./locales -name "*.json" | sort',
'$ curl -fsS localhost:8080/healthz | jq .',
'$ chmod +x ./BENEATH_THE_ALTAR.exe',
"$ awk '{print $1}' ./index.txt | sort -u",
'$ sudo systemctl restart altar-indexer',
'$ tar -czf locales.tar.gz ./locales && ls -lh'
];

/* terminal responses */
const ST = [
'PROCESS COMPLETE','TRANSLATION FOUND','LANGUAGE DETECTED','SYSTEM ONLINE',
'COMPILING...','BUILD SUCCEEDED','SYNC OK — 0 ERRORS','CACHE WARMED (4096 keys)',
'[ok] checksum verified','done in 1.284s','0 vulnerabilities audited',
'BENEATH_THE_ALTAR.exe','INDEX REBUILT — 89 LOCALES','OK translation pipeline',
'///  phrase checksum 9f3c1ab2  ///','> SEARCHING GLOBAL LANGUAGE DATABASE...',
'> TRANSLATION FOUND','> BENEATH THE ALTAR','> SYSTEM CONTINUES'
];

/* write the phrase in the syntax of the current language */
function phraseLine (id, e) {
  const t = e.t, c = e.c, l = e.l;
  switch (id) {
    case 'js':   return 'const beneathTheAltar = "' + t + '";  // ' + c;
    case 'ts':   return 'const phrase: string = "' + t + '";  // locale: ' + c;
    case 'py':   return 'beneath_the_altar = "' + t + '"  # ' + c + ' · ' + l;
    case 'cpp':  return 'constexpr auto BENEATH = "' + t + '";  // ' + c;
    case 'cs':   return 'public const string BeneathTheAltar = "' + t + '";';
    case 'rs':   return 'const BENEATH: &str = "' + t + '";  // ' + c;
    case 'go':   return 'const beneathTheAltar = "' + t + '" // ' + c;
    case 'java': return 'static final String BENEATH = "' + t + '";';
    case 'kt':   return 'val beneathTheAltar = "' + t + '" // ' + c;
    case 'swift':return 'let beneathTheAltar = "' + t + '"';
    case 'php':  return '$beneathTheAltar = "' + t + '";  // ' + c;
    case 'html': return '<!-- ' + l + ' · Beneath the Altar = ' + t + ' -->';
    case 'css':  return '/* ' + l + ' → ' + t + ' */';
    case 'sql':  return "INSERT INTO phrases(locale,text) VALUES ('" + c + "', '" + t.replace(/'/g, "''") + "');";
    case 'bash': return "printf '%-6s %s\\n' \"" + c + "\" \"" + t + '"';
    case 'json': return '"' + c + '": "' + t + '",';
    case 'yaml': return c + ': "' + t + '"';
    case 'xml':  return '<phrase lang="' + c + '" text="' + t + '"/>';
  }
  return '// ' + l + ': ' + t;
}

function genBlock () {
  const e = pick(P), g = pick(PROGS), out = [];
  if (Math.random() < 0.55) out.push({ t: '──── ' + g.id.toUpperCase() + ' ──── BTA/2.6 ────', k: 'rule' });
  out.push({ t: pick(CMD), k: 'cmd' });
  const n = ri(3, 6), L = g.lines, start = ri(0, Math.max(0, L.length - n));
  for (let i = start; i < Math.min(L.length, start + n); i++) out.push({ t: L[i], k: 'code' });
  if (Math.random() < 0.92) out.push({ t: phraseLine(g.id, e), k: 'phrase' });
  if (Math.random() < 0.5) out.push({ t: '> detected ' + e.c + ' → ' + e.t + '   (conf 0.9' + ri(20, 98) + ')', k: 'out' });
  if (Math.random() < 0.7) out.push({ t: pick(ST), k: 'status' });
  if (Math.random() < 0.35) out.push({ t: '', k: 'blank' });
  return out;
}

/* ==========================================================================
   3. STATE
   ========================================================================== */
let W = 0, H = 0, dpr = 1;
let streams = [], motes = [];
let rafId = 0, lastT = 0, seq = 0, rTimer = 0;
let mode = 'off';
let PX = 0, PY = 0, tPX = 0, tPY = 0;
let GLOW = true, slow = 0;
const mqReduce = matchMedia('(prefers-reduced-motion: reduce)');
const mqTouch  = matchMedia('(hover: none)');

function isMobile () { return W < 760; }

/* ==========================================================================
   4. STREAMS
   ========================================================================== */
function stream (o) {
  return {
    x: o.x, w: o.w, y0: 0, y1: H,
    size: o.size, lh: o.lh, alpha: o.alpha, layer: o.layer,
    speed: o.speed, title: o.title || '',
    lines: [], cur: null, queue: [],
    y: 0, phase: 'enter', typeAt: 0, waitUntil: 0
  };
}

function nextLine (s) {
  if (!s.queue.length) s.queue = genBlock();
  const l = s.queue.shift();
  s.cur = { t: '', full: l.t, k: l.k };
  s.typeAt = 0;
}

function seed (s, staticMode) {
  const need = Math.ceil((s.y1 - s.y0) / s.lh) + 3;
  s.lines = []; s.queue = []; s.cur = null;
  let guard = 0;
  while (s.lines.length < need && guard++ < 300) {
    const b = genBlock();
    for (let i = 0; i < b.length; i++) s.lines.push(b[i]);
  }
  if (s.lines.length > need) s.lines.length = need;
  s.y = s.y1 - (s.lines.length + 1) * s.lh;
  if (staticMode) { s.phase = 'done'; return; }
  nextLine(s);
  s.phase = 'enter';
}

function updateStream (s, dt, now) {
  s.y -= s.speed * dt;
  const minY = s.y0 - s.lh;
  while (s.lines.length && s.y + s.lh < minY) { s.lines.shift(); s.y += s.lh; }
  while (s.lines.length > 240) { s.lines.shift(); s.y += s.lh; }

  if (s.phase === 'done' || !s.cur) return;
  const curTop = s.y + s.lines.length * s.lh;

  if (s.phase === 'enter') {
    if (curTop <= s.y1 - s.lh) { s.phase = 'type'; s.typeAt = now; }
    return;
  }
  if (s.phase === 'type') {
    if (now < s.typeAt) return;
    const step = Math.random() < 0.12 ? ri(2, 4) : 1;
    s.cur.t = s.cur.full.slice(0, Math.min(s.cur.full.length, s.cur.t.length + step));
    s.typeAt = now + rnd(s.layer === 0 ? 16 : 24, s.layer === 0 ? 34 : 54);
    if (s.cur.t.length >= s.cur.full.length) {
      s.phase = 'wait';
      s.waitUntil = now + (Math.random() < 0.14 ? rnd(1200, 2600) : rnd(240, 900));
    }
    return;
  }
  if (s.phase === 'wait' && now >= s.waitUntil) {
    s.lines.push({ t: s.cur.full, k: s.cur.k });
    nextLine(s);
    s.phase = 'enter';
  }
}

/* palette — dim green terminal light, pink for system responses */
function paint (k, A, layer) {
  let col;
  switch (k) {
    case 'cmd':    col = '150,255,185'; break;
    case 'phrase': col = '190,255,210'; break;
    case 'status': col = '255,96,152'; break;
    case 'out':    col = '134,240,186'; break;
    case 'rule':   col = '110,196,152'; break;
    default:       col = '104,206,148';
  }
  let a = A;
  if (k === 'phrase') a = Math.min(0.38, A * 1.6);
  else if (k === 'status') a = Math.min(0.34, A * 1.5);
  else if (k === 'cmd') a = Math.min(0.34, A * 1.35);
  else if (k === 'out') a = Math.min(0.32, A * 1.3);
  else if (k === 'rule') a = Math.min(0.2, A * 1.2);
  ctx.fillStyle = 'rgba(' + col + ',' + a.toFixed(3) + ')';
  if (GLOW && layer === 2 && (k === 'phrase' || k === 'status')) {
    ctx.shadowColor = 'rgba(' + col + ',0.5)';
    ctx.shadowBlur = 9;
  } else if (ctx.shadowBlur) { ctx.shadowBlur = 0; }
}

function drawStream (s) {
  const L = s.lines.length;
  const ox = PX * (2 + s.layer * 5), oy = PY * (1 + s.layer * 3);
  const A = s.alpha;

  ctx.save();
  ctx.beginPath();
  ctx.rect(s.x, s.y0, s.w, s.y1 - s.y0);
  ctx.clip();
  ctx.font = s.size + 'px ' + FONT;
  ctx.textBaseline = 'top';
  ctx.letterSpacing = '0px';

  /* pane gutter */
  if (s.layer > 0) {
    ctx.fillStyle = 'rgba(120,240,170,' + (A * 0.5).toFixed(3) + ')';
    ctx.fillRect(s.x - 11 + ox, s.y0, 1, s.y1 - s.y0);
  }

  let k = null;
  for (let i = 0; i < L; i++) {
    const top = s.y + i * s.lh + oy;
    if (top < s.y0 - s.lh || top > s.y1) continue;
    const line = s.lines[i];
    if (line.t === '') continue;
    if (line.k !== k) { k = line.k; paint(k, A, s.layer); }
    else if (ctx.fillStyle === '') paint(k, A, s.layer);
    ctx.fillText(line.t, s.x + ox, top);
  }

  if (s.cur && s.cur.t && s.phase !== 'done') {
    const curTop = s.y + L * s.lh + oy;
    if (curTop > s.y0 - s.lh && curTop < s.y1) {
      paint(s.cur.k, A, s.layer);
      ctx.fillText(s.cur.t, s.x + ox, curTop);
      if (s.phase === 'type') {
        const w = ctx.measureText(s.cur.t).width;
        ctx.fillRect(s.x + ox + w + 3, curTop + 1, 6, s.size - 2);
      }
    }
  }
  if (ctx.shadowBlur) ctx.shadowBlur = 0;
  ctx.restore();
}

/* ==========================================================================
   5. LAYOUT
   ========================================================================== */
function layout () {
  const mob = W < 760, tab = W >= 760 && W < 1140;
  const list = [];

  if (mob) {
    const bw = W * 0.46;
    [0.02, 0.52].forEach(f => list.push({ x: W * f, w: bw, size: 11, lh: 15, alpha: 0.065, layer: 0, speed: rnd(5, 8) }));
    list.push({ x: W * 0.04, w: W * 0.92, size: 12, lh: 17, alpha: 0.135, layer: 1, speed: rnd(9, 12), title: 'BTA://TRANSLATE.SH' });
    list.push({ x: W * 0.1, w: W * 0.86, size: 12, lh: 18, alpha: 0.22, layer: 2, speed: rnd(13, 16), title: 'ALTAR_INDEX.DB' });
  } else if (tab) {
    const bw = W * 0.3;
    [0.03, 0.36, 0.69].forEach(f => list.push({ x: W * f, w: bw, size: 12, lh: 16, alpha: 0.065, layer: 0, speed: rnd(6, 9) }));
    list.push({ x: W * 0.05, w: W * 0.44, size: 13, lh: 17, alpha: 0.135, layer: 1, speed: rnd(10, 13), title: 'BTA://TRANSLATE.SH' });
    list.push({ x: W * 0.52, w: W * 0.44, size: 13, lh: 18, alpha: 0.22, layer: 2, speed: rnd(15, 19), title: 'ALTAR_INDEX.DB' });
  } else {
    const bw = W * 0.24;
    [0.015, 0.25, 0.485, 0.72].forEach(f => list.push({ x: W * f, w: bw, size: 12, lh: 16, alpha: 0.065, layer: 0, speed: rnd(6, 9) }));
    list.push({ x: W * 0.04, w: W * 0.34, size: 13, lh: 17, alpha: 0.135, layer: 1, speed: rnd(10, 13), title: 'BTA://TRANSLATE.SH' });
    list.push({ x: W * 0.62, w: W * 0.34, size: 13, lh: 17, alpha: 0.135, layer: 1, speed: rnd(11, 14), title: 'TRANSMISSION.LOG' });
    list.push({ x: W * 0.36, w: W * 0.3, size: 13, lh: 18, alpha: 0.22, layer: 2, speed: rnd(15, 20), title: 'ALTAR_INDEX.DB' });
  }

  streams = list.map(o => {
    const s = stream(o);
    seed(s, mode === 'static');
    return s;
  });

  const n = mob ? 16 : 44;
  motes = [];
  for (let i = 0; i < n; i++) motes.push({
    x: Math.random() * W, y: Math.random() * H,
    v: rnd(3, 12), a: rnd(0.05, 0.16), s: Math.random() < 0.16 ? 2 : 1, ph: Math.random() * 6.283
  });
}

function resize () {
  W = wrap.clientWidth || window.innerWidth;
  H = wrap.clientHeight || window.innerHeight;
  dpr = Math.min(window.devicePixelRatio || 1, isMobile() ? 1.5 : 2);
  canvas.width = Math.max(1, Math.round(W * dpr));
  canvas.height = Math.max(1, Math.round(H * dpr));
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.textBaseline = 'top';
  layout();
  if (mode === 'static') drawStatic();
}

/* ==========================================================================
   6. LANGUAGE DETECTED — the dramatic sequence
   ========================================================================== */
const SQ = { on: false, t0: 0, next: 0, chosen: null, cycle: [] };

function shuffle (a) {
  const b = a.slice();
  for (let i = b.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; const t = b[i]; b[i] = b[j]; b[j] = t; }
  return b;
}

function seqPush () {
  const s = streams.find(x => x.layer === 2) || streams[streams.length - 1];
  if (!s || !SQ.chosen) return;
  s.queue.unshift({ t: '> LANGUAGE DETECTED', k: 'status' });
  s.queue.unshift({ t: '> ' + SQ.chosen.t, k: 'phrase' });
}

function updateSeq (now) {
  if (mode !== 'on') return;
  if (!SQ.on) {
    if (now > SQ.next) {
      SQ.on = true; SQ.t0 = now;
      SQ.chosen = pick(P);
      SQ.cycle = shuffle(P).slice(0, 16);
      seqPush();
    }
    return;
  }
  if (now - SQ.t0 > 8600) { SQ.on = false; SQ.next = now + rnd(17000, 30000); }
}

function trackedWidth (text, track) {
  let w = 0;
  for (let i = 0; i < text.length; i++) w += ctx.measureText(text[i]).width + track;
  return w - track;
}

function drawTracked (text, cx, y, track) {
  let x = cx - trackedWidth(text, track) / 2;
  for (let i = 0; i < text.length; i++) {
    const m = ctx.measureText(text[i]).width;
    ctx.fillText(text[i], x, y);
    x += m + track;
  }
}

function drawSeq (now) {
  if (!SQ.on) return;
  const el = now - SQ.t0;
  const rows = [];
  if (el < 1200) rows.push({ t: '> SEARCHING GLOBAL LANGUAGE DATABASE...', c: '150,255,185', a: 0.55 });
  else if (el < 2100) {
    rows.push({ t: '> SEARCHING GLOBAL LANGUAGE DATABASE...', c: '150,255,185', a: 0.38 });
    rows.push({ t: '> TRANSLATION FOUND', c: '255,96,152', a: 0.62 });
  } else if (el < 4400) {
    const i = ((el - 2100) / 135) | 0;
    const p = SQ.cycle[i % SQ.cycle.length];
    rows.push({ t: 'LANGUAGE DETECTED', c: '255,96,152', a: 0.7, track: true });
    rows.push({ t: p.t, c: '210,255,225', a: 0.72, glow: true });
    rows.push({ t: p.l + ' · ' + p.n + ' · ' + p.c, c: '150,235,190', a: 0.45 });
  } else if (el < 7400) {
    rows.push({ t: '> BENEATH THE ALTAR', c: '150,255,185', a: 0.5, track: true });
    rows.push({ t: SQ.chosen.t, c: '215,255,228', a: 0.75, glow: true });
    rows.push({ t: SQ.chosen.l + ' · ' + SQ.chosen.n + ' · ' + SQ.chosen.c, c: '150,235,190', a: 0.5 });
  } else {
    rows.push({ t: '> SYSTEM CONTINUES', c: '255,96,152', a: 0.6, track: true });
    rows.push({ t: '> BENEATH THE ALTAR', c: '150,255,185', a: 0.4, track: true });
  }

  const rh = 18, top = Math.round(H * 0.66) - (rows.length * rh + 26) / 2;
  ctx.save();
  ctx.fillStyle = 'rgba(5,11,7,0.78)';
  ctx.fillRect(0, top, W, rows.length * rh + 26);
  ctx.fillStyle = 'rgba(120,255,170,0.13)';
  ctx.fillRect(0, top, W, 1);
  ctx.fillRect(0, top + rows.length * rh + 25, W, 1);
  ctx.fillStyle = 'rgba(255,40,115,0.6)';
  ctx.fillRect(0, top, 3, rows.length * rh + 26);

  ctx.font = '13px ' + FONT;
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  ctx.letterSpacing = '0px';
  rows.forEach((r, i) => {
    const y = top + 13 + i * rh;
    ctx.fillStyle = 'rgba(' + r.c + ',' + r.a + ')';
    if (r.glow) { ctx.shadowColor = 'rgba(' + r.c + ',0.6)'; ctx.shadowBlur = 12; }
    if (r.track && isAscii(r.t)) drawTracked(r.t, W / 2, y, 2.6);
    else { ctx.textAlign = 'center'; ctx.fillText(r.t, W / 2, y); ctx.textAlign = 'left'; }
    if (ctx.shadowBlur) ctx.shadowBlur = 0;
  });
  ctx.restore();
}

/* ==========================================================================
   7. PARTICLES
   ========================================================================== */
function drawMotes (dt) {
  for (let i = 0; i < motes.length; i++) {
    const p = motes[i];
    p.y -= p.v * dt;
    p.x += Math.sin(seq * 0.0004 + p.ph) * 7 * dt;
    if (p.y < -4) { p.y = H + 4; p.x = Math.random() * W; }
    if (p.x < -4) p.x = W + 4; else if (p.x > W + 4) p.x = -4;
    ctx.fillStyle = 'rgba(160,255,195,' + p.a.toFixed(3) + ')';
    ctx.fillRect(p.x | 0, p.y | 0, p.s, p.s);
  }
}

/* ==========================================================================
   8. LOOP
   ========================================================================== */
function frameLoop (now) {
  rafId = requestAnimationFrame(frameLoop);
  if (!lastT) lastT = now;
  let dt = (now - lastT) / 1000;
  lastT = now;
  if (dt > 0.06) dt = 0.06;
  seq++;

  PX += (tPX - PX) * 0.045;
  PY += (tPY - PY) * 0.045;

  const t0 = now;
  ctx.clearRect(0, 0, W, H);

  for (let i = 0; i < streams.length; i++) updateStream(streams[i], dt, now);
  for (let i = 0; i < streams.length; i++) drawStream(streams[i]);
  drawMotes(dt);
  updateSeq(now);
  drawSeq(now);

  /* adaptive quality: drop a background column and the glow if we lag */
  if (dt * 1000 > 26) slow++; else if (slow > 0) slow--;
  if (slow > 70) {
    slow = 0;
    if (GLOW) GLOW = false;
    else { const i = streams.findIndex(s => s.layer === 0); if (i > -1 && streams.filter(s => s.layer === 0).length > 2) streams.splice(i, 1); }
  }
  void t0;
}

function drawStatic () {
  ctx.clearRect(0, 0, W, H);
  for (let i = 0; i < streams.length; i++) drawStream(streams[i]);
}

function start () { if (!rafId) { lastT = 0; rafId = requestAnimationFrame(frameLoop); } }
function stop () { if (rafId) { cancelAnimationFrame(rafId); rafId = 0; } }

/* ==========================================================================
   9. MODE — reduced motion / FX toggle
   ========================================================================== */
function syncMode () {
  if (mqReduce.matches) {
    mode = 'static';
    wrap.style.display = '';
    stop();
    layout();
    drawStatic();
  } else if (root.dataset.motion === 'off') {
    mode = 'off';
    stop();
    wrap.style.display = 'none';
  } else {
    mode = 'on';
    wrap.style.display = '';
    SQ.next = performance.now() + rnd(6000, 12000);
    layout();
    start();
  }
}

/* ==========================================================================
   10. WIRING
   ========================================================================== */
window.addEventListener('resize', () => {
  if (rTimer) cancelAnimationFrame(rTimer);
  rTimer = requestAnimationFrame(() => { rTimer = 0; resize(); });
}, { passive: true });

window.addEventListener('orientationchange', () => setTimeout(resize, 220), { passive: true });

document.addEventListener('visibilitychange', () => {
  if (document.hidden) stop();
  else if (mode === 'on') start();
});

if (!mqTouch.matches) {
  window.addEventListener('pointermove', e => {
    tPX = (e.clientX / (W || 1) - 0.5) * 2;
    tPY = (e.clientY / (H || 1) - 0.5) * 2;
  }, { passive: true });
}

mqReduce.addEventListener?.('change', syncMode);
try {
  new MutationObserver(syncMode).observe(root, { attributes: true, attributeFilter: ['data-motion'] });
} catch (e) { /* older browsers: FX toggle simply won't restart the loop */ }

resize();
syncMode();
})();
