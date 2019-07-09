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
  const date = new Date(Date.now() - 100e3);

  for (const key of allKeys.slice(0, 3)) { quizzer.learnQuiz(key, graph, {date, halflife: 1.5, alphaBeta: ab}); }
  // p(graph);
  t.equal(graph.ebisus.size, 3, 'ebisus size = keys size');

  for (const ebisu of graph.ebisus.values()) {
    t.deepEqual(ebisu.model, [ab, ab, 1.5]);
    t.equal(ebisu.lastDate, date);
  }

  quizzer.learnQuiz(allKeys[3], graph, {halflife: 2, alphaBeta: 4});
  quizzer.learnQuiz(allKeys[4], graph, {halflife: 3, alphaBeta: 5});
  t.equal(graph.ebisus.size, 5);

  for (const [key, ebisu] of graph.ebisus) {
    if (key === allKeys[3] || key === allKeys[4]) {
      if (key === allKeys[3]) {
        t.deepEqual(ebisu.model, [4, 4, 2]);
      } else {
        t.deepEqual(ebisu.model, [5, 5, 3]);
      }
      t.notEqual(ebisu.lastDate, date);
    }
  }

  quizzer.learnQuiz(allKeys[5], graph);
  {
    const ebisu = graph.ebisus.get(allKeys[5]);
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
  let graph = quizzer.addEmptyEbisus(markdown.textToGraph(s));

  {
    const q = quizzer.whichToQuiz(graph);
    t.notok(q);
  }

  let allKeys = flatMap([...graph.raws.values()], set => [...set.values()]);

  let date = new Date();
  quizzer.learnQuiz(allKeys[0], graph);

  {
    const q = quizzer.whichToQuiz(graph, {date: new Date(date.valueOf() + 60 * 15 * 1e3)});
    t.ok(q);
    t.ok(graph.ebisus.has(q.uniqueId));
    t.ok(graph.nodes.has(q.uniqueId));
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
  let graph = quizzer.addEmptyEbisus(markdown.textToGraph(s));
  let allKeys = flatMap([...graph.raws.values()], set => [...set.values()]);
  let date = new Date();
  for (const key of allKeys.slice(0, 5)) { quizzer.learnQuiz(key, graph, {date, alphaBeta: 2}); }
  t.equal(graph.ebisus.size, 5);
  const hl = quizzer.DEFAULT_EBISU_HALFLIFE_HOURS;

  const keyset = graph.raws.get('## @ 千と千尋の神隠し @ せんとちひろのかみがくし');
  t.ok(keyset.size);
  const key = [...keyset.values()][0];
  t.ok(key);
  const newDate = new Date(date.valueOf() + 1000 * 3600 * hl);
  quizzer.updateQuiz(true, key, graph, {date: newDate}); // simulate quiz exactly at halflife

  // confirm the flashcard quiz itself was updated
  {
    const ebisu = graph.ebisus.get(key);
    t.ok(ebisu);
    t.equal(ebisu.lastDate, newDate);
    t.ok(relativeError(ebisu.model[0], 3) < 1e-6);
    t.ok(relativeError(ebisu.model[1], 2) < 1e-6);
  }

  // passive update: same as before
  const childKey = [...graph.raws.get('## @ 千と千尋の神隠し @ せんとちひろのかみがくし\n- @fill と')][0];
  {
    const childEbisu = graph.ebisus.get(childKey);
    t.equal(childEbisu.lastDate, newDate);
    t.ok(relativeError(childEbisu.model[0], 2) < 1e-6);
    t.ok(relativeError(childEbisu.model[1], 2) < 1e-6);
  }

  t.end();
});
