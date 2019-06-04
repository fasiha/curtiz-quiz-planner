'use strict';
const quizzer = require('./index');
const markdown = require('curtiz-parse-markdown');
const test = require('tape');
const {flatMap} = require('lodash');
const relativeError = (actual, expected) => Math.abs((actual - expected) / expected);
const p = x => console.dir(x, {depth: null});

test('learn', t => {
  let s = `## @ 千と千尋の神隠し @ せんとちひろのかみがくし
- @fill と
- @fill の
- @ 千 @ せん    @pos noun-proper-name-firstname @omit [千]と
- @ 千尋 @ ちひろ    @pos noun-proper-name-firstname
- @ 神隠し @ かみがくし    @pos noun-common-general
- @translation @en Spirited Away (film)
## @ このおはなしに出て来る人びと @ このおはなしにでてくるひとびと
- @fill に
- @fill 出て来る @ でてくる
- @ 話 @ はなし    @pos noun-common-verbal_suru @omit はなし
- @ 出る @ でる    @pos verb-general @omit 出
- @ 来る @ くる    @pos verb-bound
- @ 人々 @ ひとびと    @pos noun-common-general @omit 人びと
## @ 湯婆婆 @ ゆばーば
- @ 湯婆婆 @ ゆばーば    @pos noun-proper-name-general`;
  let graph = quizzer.addEmptyEbisus(markdown.textToGraph(s));
  let allKeys = flatMap([...graph.raws.values()], set => [...set.values()]);
  // let baz = [...quizzer.flatMapIterator(graph.raws.values(), set => set.values())];

  const hl = quizzer.DEFAULT_EBISU_HALFLIFE_HOURS;
  const ab = quizzer.DEFAULT_EBISU_ALPHA_BETA;
  const myAlphaBeta = 3;
  const date = new Date();

  quizzer.learnQuizzes(allKeys.slice(0, 3), graph, date, {halflifeScale: 1.5, alphaBeta: myAlphaBeta});
  // p(graph);
  t.equal(graph.ebisus.size, 3, 'ebisus size = keys size');

  for (const ebisu of graph.ebisus.values()) {
    t.deepEqual(ebisu.model, [myAlphaBeta, myAlphaBeta, hl * 1.5]);
    t.equal(ebisu.lastDate, date);
  }

  quizzer.learnQuizzes(allKeys.slice(3, 5), graph, undefined, {halflifeScales: [2, 3]});
  t.equal(graph.ebisus.size, 5);

  for (const [key, ebisu] of graph.ebisus) {
    if (key === allKeys[3] || key === allKeys[4]) {
      if (key === allKeys[3]) {
        t.deepEqual(ebisu.model, [ab, ab, hl * 2]);
      } else {
        t.deepEqual(ebisu.model, [ab, ab, hl * 3]);
      }
      t.notEqual(ebisu.lastDate, date);
    }
  }

  quizzer.learnQuizzes([allKeys[5]], graph);
  {
    const ebisu = graph.ebisus.get(allKeys[5]);
    t.ok(ebisu);
    t.deepEqual(ebisu.model, [ab, ab, hl]);
    t.notEqual(ebisu.lastDate, date);
  }

  t.end();
});
/*
test('which to quiz', t => {
  let s = `## @ 千と千尋の神隠し @ せんとちひろのかみがくし
- @fill と
- @fill の
- @ 千 @ せん    @pos noun-proper-name-firstname @omit [千]と
- @ 千尋 @ ちひろ    @pos noun-proper-name-firstname
- @ 神隠し @ かみがくし    @pos noun-common-general
- @translation @en Spirited Away (film)
## @ このおはなしに出て来る人びと @ このおはなしにでてくるひとびと
- @fill に
- @fill 出て来る @ でてくる
- @ 話 @ はなし    @pos noun-common-verbal_suru @omit はなし
- @ 出る @ でる    @pos verb-general @omit 出
- @ 来る @ くる    @pos verb-bound
- @ 人々 @ ひとびと    @pos noun-common-general @omit 人びと
## @ 湯婆婆 @ ゆばーば
- @ 湯婆婆 @ ゆばーば    @pos noun-proper-name-general`;
  let cards = markdown.textToCards(s);
  let db = quizzer.initQuizDb({});
  quizzer.loadQuizzes(cards, db);

  {
    const q = quizzer.whichToQuiz(db);
    t.notok(q);
  }

  let keys = db.keyTree[0];
  let date = new Date();
  quizzer.learnQuizzes(keys, db);

  {
    const q = quizzer.whichToQuiz(db, new Date(date.valueOf() + 60 * 15 * 1e3));
    t.ok(q.quiz);
    t.ok(q.key);
    t.ok(db.ebisus.has(q.key));
    t.ok(db.keyToQuizzableMap.has(q.key));
    t.equal(db.keyToQuizzableMap.get(q.key), q.quiz);
  }
  t.end();
});

test('update', t => {
  let s = `## @ 千と千尋の神隠し @ せんとちひろのかみがくし
- @fill と
- @fill の
- @ 千 @ せん    @pos noun-proper-name-firstname @omit [千]と
- @ 千尋 @ ちひろ    @pos noun-proper-name-firstname
- @ 神隠し @ かみがくし    @pos noun-common-general
- @translation @en Spirited Away (film)
## @ このおはなしに出て来る人びと @ このおはなしにでてくるひとびと
- @fill に
- @fill 出て来る @ でてくる
- @ 話 @ はなし    @pos noun-common-verbal_suru @omit はなし
- @ 出る @ でる    @pos verb-general @omit 出
- @ 来る @ くる    @pos verb-bound
- @ 人々 @ ひとびと    @pos noun-common-general @omit 人びと
## @ 湯婆婆 @ ゆばーば
- @ 湯婆婆 @ ゆばーば    @pos noun-proper-name-general`;
  let cards = markdown.textToCards(s);
  let db = quizzer.initQuizDb({});
  quizzer.loadQuizzes(cards, db);
  let keys = db.keyTree[0];
  let date = new Date();
  quizzer.learnQuizzes(keys, db, date, {alphaBeta: 2});

  const key = '["千","せん"]';
  const newDate = new Date(date.valueOf() + 1000 * 60 * 15);
  quizzer.updateQuiz(true, key, db, newDate);

  // confirm the flashcard quiz itself was updated
  {
    const globalEbisu = db.ebisus.get(key);
    t.equal(globalEbisu.lastDate, newDate);
    t.ok(relativeError(globalEbisu.model[0], 3) < 1e-6);
    t.ok(relativeError(globalEbisu.model[1], 2) < 1e-6);
  }

  // confirm that the local quiz was updated the same way too, since quizzing the global (without any context) is harder
  // than quizzing local (with fill-in-the-blank reading)
  const locals = db.globalToLocalsMap.get(key);
  t.equal(locals.length, 1);
  {
    const localEbisu = db.ebisus.get(locals[0]);
    t.equal(localEbisu.lastDate, newDate);
    t.ok(relativeError(localEbisu.model[0], 3) < 1e-6);
    t.ok(relativeError(localEbisu.model[1], 2) < 1e-6);
  }

  t.end();
});
*/