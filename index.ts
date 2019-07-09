import {Quiz, QuizGraph} from 'curtiz-parse-markdown';
import {enumerate} from 'curtiz-utils';

import * as ebisu from './ebisu';

export {ebisu};
export interface KeyToEbisu {
  ebisus: Map<string, ebisu.Ebisu>;
}
export function addEmptyEbisus(graph: QuizGraph): QuizGraph&KeyToEbisu { return {...graph, ebisus: new Map()}; }

export const DEFAULT_EBISU_ALPHA_BETA = 2;
export const DEFAULT_EBISU_HALFLIFE_HOURS = 0.25;

export type WhichToQuizOpts =
    Partial<{date: Date, details: {out: {key?: string, precall?: number, model?: number[], date?: Date}[]}}>;
export function whichToQuiz({ebisus, nodes}: KeyToEbisu&QuizGraph, {date, details}: WhichToQuizOpts = {}): Quiz|
    undefined {
  let quiz: Quiz|undefined;
  let lowestPrecall = Infinity;
  date = date || new Date();
  if (details) { details.out = []; }
  for (const [key, e] of ebisus) {
    const precall = ebisu.predict(e, date);
    if (precall < lowestPrecall) {
      lowestPrecall = precall;
      quiz = nodes.get(key);
    }
    if (details) { details.out.push({key, precall, model: e.model, date}); }
  }
  return quiz;
}

export type UpdateQuizOpts = Partial<{date: Date, callback: (key: string, ebisu: ebisu.Ebisu) => any}>;
export function updateQuiz(result: boolean, key: string, {ebisus, edges}: KeyToEbisu&QuizGraph,
                           {date, callback}: UpdateQuizOpts = {}) {
  date = date || new Date();
  const updater = (key: string, passive: boolean = false) => {
    let e = ebisus.get(key);
    if (!e) { return; }
    if (passive) {
      ebisu.passiveUpdate(e, date);
    } else {
      ebisu.update(e, result, date);
    }
    if (callback) { callback(key, e); }
  };

  updater(key);
  const children = edges.get(key);
  if (children) {
    for (const child of children) { updater(child, true); }
  }
}

export type LearnQuizOpts = Partial<{date: Date, halflife: number, alphaBeta: number}>;
export function learnQuiz(key: string, {ebisus}: KeyToEbisu, {date, halflife, alphaBeta}: LearnQuizOpts = {}) {
  if (!ebisus.has(key)) {
    date = date || new Date();
    halflife = halflife || DEFAULT_EBISU_HALFLIFE_HOURS;
    const e = ebisu.defaultEbisu(halflife, alphaBeta || DEFAULT_EBISU_ALPHA_BETA, date);
    ebisus.set(key, e);
  }
}
