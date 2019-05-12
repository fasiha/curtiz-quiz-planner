import {Card, Cloze as Fill} from 'curtiz-parse-markdown';
import {enumerate} from 'curtiz-utils';

import * as ebisu from './ebisu';

interface LocalToFromGlobal {
  globalToLocalsMap: Map<string, string[]>;
  localToGlobalMap: Map<string, string>;
}
interface KeyToEbisu {
  keyToEbisuMap: Map<string, ebisu.Ebisu>;
}
interface KeyToQuiz {
  keyToQuizzableMap: Map<string, Card|Fill>;
}
interface KeyTree {
  keyTree: string[][]; // [[a,b,c], [x,y,z,w], [1,2,3,4,5]]
}
export const DEFAULT_EBISU_ALPHA_BETA = 2;
export const DEFAULT_EBISU_HALFLIFE_HOURS = 0.25;

export function initQuizDb({globalToLocalsMap, localToGlobalMap, keyToEbisuMap, keyToQuizzableMap, keyTree}: {
  globalToLocalsMap?: Map<string, string[]>,
  localToGlobalMap?: Map<string, string>,
  keyToEbisuMap?: Map<string, ebisu.Ebisu>,
  keyToQuizzableMap?: Map<string, Card|Fill>,
  keyTree?: string[][],
}): KeyToQuiz&KeyToEbisu&LocalToFromGlobal&KeyTree {
  return {
    globalToLocalsMap: globalToLocalsMap || new Map(), localToGlobalMap: localToGlobalMap || new Map(),
        keyToEbisuMap: keyToEbisuMap || new Map(), keyToQuizzableMap: keyToQuizzableMap || new Map(),
        keyTree: keyTree || []
  }
}

function fillToString(fill: Fill): string[] {
  let pieces = ['@fill' as string | null].concat(fill.contexts);
  let nblank = 0;
  pieces.forEach((piece, i) => {
    if (!piece) { pieces[i] = (fill.clozes[nblank++] || []).join(' @ '); }
  });
  return pieces.map(s => s || '');
}

function addQuizzableToMaps(
    q: Card, {keyToQuizzableMap, globalToLocalsMap, localToGlobalMap, keyTree}: LocalToFromGlobal&KeyToQuiz&KeyTree) {
  let allKeysFound: string[] = [];
  const push = (vkey: string[], o: Card|Fill) => {
    const key = JSON.stringify(vkey);
    if (!keyToQuizzableMap.has(key)) { allKeysFound.push(key); }
    keyToQuizzableMap.set(key, o);
  };
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
  if (allKeysFound.length > 0) { keyTree.push(allKeysFound); }
}

export function loadQuizzes(qs: Card[], quizDb: LocalToFromGlobal&KeyToQuiz&KeyTree) {
  for (const q of qs) { addQuizzableToMaps(q, quizDb) }
}

export function whichToQuiz({keyToEbisuMap, keyToQuizzableMap}: KeyToEbisu&KeyToQuiz, date?: Date) {
  let ret = {quiz: undefined as undefined | Card | Fill, key: ''};
  let lowestPrecall = Infinity;
  date = date || new Date();
  for (let [key, q] of keyToQuizzableMap) {
    let e = keyToEbisuMap.get(key);
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

export function updateQuiz(result: boolean, key: string,
                           {keyToEbisuMap, globalToLocalsMap, localToGlobalMap}: LocalToFromGlobal&KeyToEbisu,
                           date?: Date) {
  date = date || new Date();
  const updater = (key: string, passive: boolean = false) => {
    let e = keyToEbisuMap.get(key);
    if (!e) { return; }
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

export function learnQuizzes(
    keys: string[]|IterableIterator<string>,
    {keyToEbisuMap}: KeyToEbisu,
    date?: Date,
    opts: {halflifeScale?: number, halflifeScales?: number[], alphaBeta?: number} = {},
) {
  date = date || new Date();
  for (const [kidx, key] of enumerate(keys)) {
    if (!keyToEbisuMap.has(key)) {
      const scalar = (opts.halflifeScales && opts.halflifeScales[kidx]) || opts.halflifeScale || 1;
      const e =
          ebisu.defaultEbisu(scalar * DEFAULT_EBISU_HALFLIFE_HOURS, opts.alphaBeta || DEFAULT_EBISU_ALPHA_BETA, date);
      keyToEbisuMap.set(key, e);
    }
  }
}
