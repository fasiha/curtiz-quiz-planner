'use strict';
const quizzer = require('./index');
const markdown = require('curtiz-parse-markdown');
const test = require('tape');

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

  let db = quizzer.loadQuizzes(cards, {});
  console.log(db);
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