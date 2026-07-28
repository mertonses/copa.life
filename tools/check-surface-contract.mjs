import fs from "node:fs";
import assert from "node:assert/strict";

const index=fs.readFileSync("index.html","utf8");
const runtime=fs.readFileSync("src/runtime/surfaceContract.js","utf8");
const palette=fs.readFileSync("src/styles/palette.css","utf8");
const android=fs.readFileSync("src/styles/androidSurfaces.css","utf8");

assert.match(index,/src\/runtime\/surfaceContract\.js/,"global surface contract must load on every platform");
assert.ok(index.indexOf("surfaceContract.js")>index.indexOf("platform.js"),"surface contract must load after platform detection");
assert.match(runtime,/MutationObserver/,"new modal and route surfaces must be audited after DOM mutations");
assert.match(runtime,/data\.copaSurfaceContract|copaSurfaceContract/,"audited nodes need a testable surface marker");
for(const family of ["-modal","-sheet","-card","-panel","-tile","-dock","-notice","-summary"])assert.ok(runtime.includes(family),`missing structural family ${family}`);
assert.match(palette,/--surface-muted:#(?:[0-9A-F]{6})/i,"muted structural surface token must be opaque");
assert.match(palette,/--surface-primary-soft:#(?:[0-9A-F]{6})/i,"soft structural surface token must be opaque");
assert.match(palette,/\[data-copa-opaque-surface="true"\]/,"repaired surfaces need a final opaque paint rule");
assert.match(android,/--android-surface:#[0-9A-F]{6}/i,"Android must retain a concrete WebView fallback");

console.log("Surface contract OK: opaque tokens, dynamic DOM audit and Android fallback are wired globally.");
