'use strict';
const quizzer = require('./index');
const markdown = require('curtiz-parse-markdown');
const test = require('tape');
const relativeError = (actual, expected) => Math.abs((actual - expected) / expected);

test('init', t => {
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
- @ 湯婆婆 @ ゆばーば    @pos noun-proper-name-general
`;
  let cards = markdown.textToCards(s);
  let db = quizzer.initQuizDb({});
  quizzer.loadQuizzes(cards, db);
  // console.log(db);
  t.ok(db);
  t.ok(db.keyToQuizzableMap);
  t.ok(db.globalToLocalsMap);
  t.ok(db.localToGlobalMap);

  const isClozeOrCard = q => q.prompt || q.clozes;
  for (let [key, q] of db.keyToQuizzableMap) {
    t.equal('string', typeof key);
    t.ok(isClozeOrCard(q));
  }

  for (let [local, global] of db.localToGlobalMap) {
    t.ok(db.globalToLocalsMap.has(global));
    t.ok((db.globalToLocalsMap.get(global) || []).indexOf(local) >= 0);
  }

  for (let [global, locals] of db.globalToLocalsMap) {
    for (let local of locals) {
      t.ok(db.localToGlobalMap.has(local));
      t.equal(db.localToGlobalMap.get(local), global);
    }
  }

  {
    let qs = new Set(db.keyToQuizzableMap.values());
    for (let card of cards) { t.ok(qs.has(card)); }
  }
  t.end();
});

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
  let cards = markdown.textToCards(s);
  let db = quizzer.initQuizDb({});
  quizzer.loadQuizzes(cards, db);

  let keys = db.keyTree[0];

  const hl = quizzer.DEFAULT_EBISU_HALFLIFE_HOURS;
  const ab = quizzer.DEFAULT_EBISU_ALPHA_BETA;
  const myAlphaBeta = 3;
  const date = new Date();

  quizzer.learnQuizzes(keys.slice(0, 3), db, date, {halflifeScale: 1.5, alphaBeta: myAlphaBeta});
  t.equal(db.keyToEbisuMap.size, 3);
  for (const ebisu of db.keyToEbisuMap.values()) {
    t.deepEqual(ebisu.model, [myAlphaBeta, myAlphaBeta, hl * 1.5]);
    t.equal(ebisu.lastDate, date);
  }

  quizzer.learnQuizzes([keys[3], keys[4]], db, undefined, {halflifeScales: [2, 3]});
  for (const [key, ebisu] of db.keyToEbisuMap) {
    if (key === keys[3] || key === keys[4]) {
      if (key === keys[3]) {
        t.deepEqual(ebisu.model, [ab, ab, hl * 2]);
      } else {
        t.deepEqual(ebisu.model, [ab, ab, hl * 3]);
      }
      t.notEqual(ebisu.lastDate, date);
    }
  }

  quizzer.learnQuizzes([keys[5]], db);
  {
    const ebisu = db.keyToEbisuMap.get(keys[5]);
    t.ok(ebisu);
    t.deepEqual(ebisu.model, [ab, ab, hl]);
    t.notEqual(ebisu.lastDate, date);
  }

  t.end();
});

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
    t.ok(db.keyToEbisuMap.has(q.key));
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
    const globalEbisu = db.keyToEbisuMap.get(key);
    t.equal(globalEbisu.lastDate, newDate);
    t.ok(relativeError(globalEbisu.model[0], 3) < 1e-6);
    t.ok(relativeError(globalEbisu.model[1], 2) < 1e-6);
  }

  // confirm that the local quiz was updated the same way too, since quizzing the global (without any context) is harder
  // than quizzing local (with fill-in-the-blank reading)
  const locals = db.globalToLocalsMap.get(key);
  t.equal(locals.length, 1);
  {
    const localEbisu = db.keyToEbisuMap.get(locals[0]);
    t.equal(localEbisu.lastDate, newDate);
    t.ok(relativeError(localEbisu.model[0], 3) < 1e-6);
    t.ok(relativeError(localEbisu.model[1], 2) < 1e-6);
  }

  t.end();
});
