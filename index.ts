import {Card, Cloze as Fill} from 'curtiz-parse-markdown';

import * as ebisu from './ebisu';

function fillToString(fill: Fill): string[] {
  let pieces = ['@fill' as string | null].concat(fill.contexts);
  let nblank = 0;
  pieces.forEach((piece, i) => {
    if (!piece) { pieces[i] = (fill.clozes[nblank++] || []).join(' @ '); }
  });
  return pieces.map(s => s || '');
}

function addQuizzableToMaps(
    q: Card,
    keyToQuizzableMap: Map<string, Card|Fill>,
    globalToLocalsMap: Map<string, string[]>,
    localToGlobalMap: Map<string, string>,
) {
  const push = (vkey: string[], o: Card|Fill) => keyToQuizzableMap.set(JSON.stringify(vkey), o);
  const graphPush = (vglobal: string[], vlocal: string[]) => {
    const global = JSON.stringify(vglobal);
    const local = JSON.stringify(vlocal);
    globalToLocalsMap.set(global, (globalToLocalsMap.get(global) || []).concat(local))
    localToGlobalMap.set(local, global);
  };
  const top = [q.prompt, ...q.responses];

  push(top, q);
  for (let fill of (q.fills || [])) { push(top.concat(fillToString(fill)), fill); }
  for (let flash of (q.flashs || [])) {
    const global = [flash.prompt, ...flash.responses];
    push(global, flash);
    const local = top.concat('@flash', ...global);
    for (let fill of (flash.fills || [])) {
      const totalLocal = local.concat(fillToString(fill));
      push(totalLocal, fill);
      graphPush(global, totalLocal);
    }
  }
}

export function loadQuizzes(qs: Card[], {keyToQuizzableMap, globalToLocalsMap, localToGlobalMap}: {
  keyToQuizzableMap?: Map<string, Card|Fill>,
  globalToLocalsMap?: Map<string, string[]>,
  localToGlobalMap?: Map<string, string>
}) {
  let k2q: Map<string, Card|Fill> = keyToQuizzableMap || new Map();
  let g2l: Map<string, string[]> = globalToLocalsMap || new Map();
  let l2g: Map<string, string> = localToGlobalMap || new Map();
  for (const q of qs) { addQuizzableToMaps(q, k2q, g2l, l2g) }
  return {keyToQuizzableMap: k2q, globalToLocalsMap: g2l, localToGlobalMap: l2g};
}

export function whichToQuiz(
    keyToEbisu: Map<string, ebisu.Ebisu>,
    keyToQuizzableMap: Map<string, Card|Fill>,
    date?: Date,
) {
  let ret = {quiz: undefined as undefined | Card | Fill, key: ''};
  let lowestPrecall = Infinity;
  date = date || new Date();
  for (let [key, q] of keyToQuizzableMap) {
    let e = keyToEbisu.get(key);
    if (e) {
      const precall = ebisu.predict(e, date);
      if (precall < lowestPrecall) {
        lowestPrecall = precall;
        ret.quiz = q;
        ret.key = key;
      }
    }
  }
  return ret;
}

export function updateQuiz(
    result: boolean,
    key: string,
    keyToEbisu: Map<string, ebisu.Ebisu>,
    globalToLocalsMap: Map<string, string[]>,
    localToGlobalMap: Map<string, string>,
    date?: Date,
) {
  date = date || new Date();
  const updater = (key: string, passive: boolean = false) => {
    let e = keyToEbisu.get(key);
    if (!e) { throw new Error('key not found in Ebisu table'); }
    if (passive) {
      ebisu.passiveUpdate(e, date);
    } else {
      ebisu.update(e, result, date);
    }
  };

  updater(key);
  for (const local of (globalToLocalsMap.get(key) || [])) { updater(local); }

  const parent = localToGlobalMap.get(key);
  if (parent) {
    // ah, this was a local (with sentence fill-in-the-blank) flashcard for this word. Passive-update
    updater(parent, true);

    // then active-update all other locals
    for (const child of (globalToLocalsMap.get(parent) || [])) { updater(child); }
  }
}
