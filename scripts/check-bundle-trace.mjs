/**
 * Verifie que les dependances chargees dynamiquement figurent bien dans le
 * tracage de fichiers de Next, donc qu'elles partiront dans les fonctions
 * serverless.
 *
 * Pourquoi : TypeORM charge son pilote par `require('pg')` dynamique. Sans
 * import statique, l'analyse de Next ne le voit pas, la fonction deployee
 * n'embarque pas `pg`, et l'application tombe en production sur
 * `DriverPackageNotInstalledError` — alors que tout marche en local, ou
 * node_modules est present en entier. Ni les tests unitaires, ni les tests
 * d'integration, ni meme `next start` en local ne peuvent attraper cela :
 * seul le contenu du tracage le revele.
 *
 *   npm run build && node scripts/check-bundle-trace.mjs
 */
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

/** Routes a controler, et paquets qui doivent s'y trouver. */
const ATTENDUS = [
  { route: '.next/server/app/api/auth/login/route.js.nft.json', paquets: ['pg', 'typeorm'] },
  { route: '.next/server/app/api/kits/route.js.nft.json', paquets: ['pg', 'typeorm'] },
  { route: '.next/server/app/api/kits/mouvement/route.js.nft.json', paquets: ['pg', 'typeorm'] },
];

const motif = nom => new RegExp(`node_modules[\\\\/]${nom}[\\\\/]`);

let echecs = 0;
for (const { route, paquets } of ATTENDUS) {
  if (!existsSync(route)) {
    console.log(`  ECHEC ${route} — fichier de tracage absent. Lancez d'abord \`npm run build\`.`);
    echecs++;
    continue;
  }
  const fichiers = JSON.parse(readFileSync(route, 'utf8')).files ?? [];
  const manquants = paquets.filter(p => !fichiers.some(f => motif(p).test(f)));
  const nom = path.relative('.next/server/app', route).replace(/[\\/]route\.js\.nft\.json$/, '');
  if (manquants.length) {
    console.log(`  ECHEC ${nom} — absent du bundle : ${manquants.join(', ')}`);
    echecs++;
  } else {
    const compte = paquets.map(p => `${p}=${fichiers.filter(f => motif(p).test(f)).length}`).join(' ');
    console.log(`  OK    ${nom} — ${compte}`);
  }
}

if (echecs > 0) {
  console.log(`\n${echecs} route(s) incomplete(s). La fonction deployee planterait au premier acces base.`);
  process.exit(1);
}
console.log('\nTracage complet : les fonctions embarquent bien leur pilote.');
