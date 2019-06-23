import {Quiz, QuizGraph} from 'curtiz-parse-markdown';
import {enumerate} from 'curtiz-utils';

import * as ebisu from './ebisu';

// type QuizGraph = GenericGraph<Quiz>;
export interface KeyToEbisu {
  ebisus: Map<string, ebisu.Ebisu>;
}
export function addEmptyEbisus(graph: QuizGraph): QuizGraph&KeyToEbisu { return {...graph, ebisus: new Map()}; }

export const DEFAULT_EBISU_ALPHA_BETA = 2;
export const DEFAULT_EBISU_HALFLIFE_HOURS = 0.25;

export function whichToQuiz({ebisus, nodes}: KeyToEbisu&QuizGraph, date?: Date): Quiz|undefined {
  let quiz: Quiz|undefined;
  let lowestPrecall = Infinity;
  date = date || new Date();
  for (const [key, e] of ebisus) {
    const precall = ebisu.predict(e, date);
    if (precall < lowestPrecall) {
      lowestPrecall = precall;
      quiz = nodes.get(key);
    }
  }
  return quiz;
}

export function updateQuiz(result: boolean, key: string, {ebisus, edges}: KeyToEbisu&QuizGraph, date?: Date) {
  date = date || new Date();
  const updater = (key: string, passive: boolean = false) => {
    let e = ebisus.get(key);
    if (!e) { return; }
    if (passive) {
      ebisu.passiveUpdate(e, date);
    } else {
      ebisu.update(e, result, date);
    }
  };

  updater(key);
  const children = edges.get(key);
  if (children) {
    for (const child of children) { updater(child, true); }
  }
}

export function learnQuizzes(
    keys: string[]|IterableIterator<string>,
    {ebisus}: KeyToEbisu,
    date?: Date,
    opts: {halflifeScale?: number, halflifeScales?: number[], alphaBeta?: number} = {},
) {
  date = date || new Date();
  for (const [kidx, key] of enumerate(keys)) {
    if (!ebisus.has(key)) {
      const scalar = (opts.halflifeScales && opts.halflifeScales[kidx]) || opts.halflifeScale || 1;
      const e =
          ebisu.defaultEbisu(scalar * DEFAULT_EBISU_HALFLIFE_HOURS, opts.alphaBeta || DEFAULT_EBISU_ALPHA_BETA, date);
      ebisus.set(key, e);
    }
  }
}
