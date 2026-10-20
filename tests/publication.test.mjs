import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';

const root=new URL('../',import.meta.url);
const read=path=>readFileSync(new URL(path,root),'utf8');
const base='https://bloodyiiblank1.github.io/SteeringBehavioursM2IA2_Casa_2026_2027-main/';

test('un dépôt, deux liens directs distincts dans les deux présentations',()=>{
  for(const file of ['README.md','PROJETS.md']) {
    const text=read(file);
    assert.match(text,/^# Projet : 11 et 12/m);
    for(const folder of ['11-SpaceSurvivors','12-SIMvoiture']) {
      assert.ok(text.includes(`${base}${folder}/`));
      assert.ok(existsSync(new URL(`${folder}/index.html`,root)));
    }
  }
  assert.ok(existsSync(new URL('.nojekyll',root)));
});

for(const folder of ['11-SpaceSurvivors','12-SIMvoiture']) {
  test(`${folder} : entrée autonome et scripts/styles disponibles avec un préfixe GitHub Pages`,()=>{
    const path=`${folder}/index.html`,html=read(path);
    assert.ok(!/http-equiv="refresh"/i.test(html));
    const references=[...html.matchAll(/<(?:script|link)\b[^>]*(?:src|href)="([^"]+)"/g)];
    assert.ok(references.length>5);
    for(const [,ref] of references) {
      if(/^https?:/.test(ref))continue;
      assert.ok(!ref.startsWith('/'),`Pas de chemin absolu hors du dépôt : ${ref}`);
      const url=new URL(ref,new URL(path,root));
      assert.ok(existsSync(url),`Ressource manquante : ${ref}`);
      const hosted=new URL(ref,`${base}${path}`);
      assert.ok(hosted.href.startsWith(base),`Import qui sort du site : ${ref}`);
    }
  });
}

test('SIMvoiture : les cerveaux de démonstration sont publiables sans serveur applicatif',()=>{
  for(const name of ['Atlas','Orion']) {
    const entry=JSON.parse(read(`12-SIMvoiture/brains/${name}.simvoiture.json`));
    assert.equal(entry.format,'SIMvoiture');assert.ok(entry.weights);
  }
  assert.ok(!read('12-SIMvoiture/index.html').includes('localhost'));
});
