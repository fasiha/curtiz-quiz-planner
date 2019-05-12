"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const curtiz_utils_1 = require("curtiz-utils");
const ebisu = __importStar(require("./ebisu"));
exports.DEFAULT_EBISU_ALPHA_BETA = 2;
exports.DEFAULT_EBISU_HALFLIFE_HOURS = 0.25;
function initQuizDb({ globalToLocalsMap, localToGlobalMap, keyToEbisuMap, keyToQuizzableMap, keyTree }) {
    return {
        globalToLocalsMap: globalToLocalsMap || new Map(), localToGlobalMap: localToGlobalMap || new Map(),
        keyToEbisuMap: keyToEbisuMap || new Map(), keyToQuizzableMap: keyToQuizzableMap || new Map(),
        keyTree: keyTree || []
    };
}
exports.initQuizDb = initQuizDb;
function fillToString(fill) {
    let pieces = ['@fill'].concat(fill.contexts);
    let nblank = 0;
    pieces.forEach((piece, i) => {
        if (!piece) {
            pieces[i] = (fill.clozes[nblank++] || []).join(' @ ');
        }
    });
    return pieces.map(s => s || '');
}
function addQuizzableToMaps(q, { keyToQuizzableMap, globalToLocalsMap, localToGlobalMap, keyTree }) {
    let allKeysFound = [];
    const push = (vkey, o) => {
        const key = JSON.stringify(vkey);
        if (!keyToQuizzableMap.has(key)) {
            allKeysFound.push(key);
        }
        keyToQuizzableMap.set(key, o);
    };
    const graphPush = (vglobal, vlocal) => {
        const global = JSON.stringify(vglobal);
        const local = JSON.stringify(vlocal);
        globalToLocalsMap.set(global, (globalToLocalsMap.get(global) || []).concat(local));
        localToGlobalMap.set(local, global);
    };
    const top = [q.prompt, ...q.responses];
    push(top, q);
    for (let fill of (q.fills || [])) {
        push(top.concat(fillToString(fill)), fill);
    }
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
    if (allKeysFound.length > 0) {
        keyTree.push(allKeysFound);
    }
}
function loadQuizzes(qs, quizDb) {
    for (const q of qs) {
        addQuizzableToMaps(q, quizDb);
    }
}
exports.loadQuizzes = loadQuizzes;
function whichToQuiz({ keyToEbisuMap, keyToQuizzableMap }, date) {
    let ret = { quiz: undefined, key: '' };
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
exports.whichToQuiz = whichToQuiz;
function updateQuiz(result, key, { keyToEbisuMap, globalToLocalsMap, localToGlobalMap }, date) {
    date = date || new Date();
    const updater = (key, passive = false) => {
        let e = keyToEbisuMap.get(key);
        if (!e) {
            return;
        }
        if (passive) {
            ebisu.passiveUpdate(e, date);
        }
        else {
            ebisu.update(e, result, date);
        }
    };
    updater(key);
    for (const local of (globalToLocalsMap.get(key) || [])) {
        updater(local);
    }
    const parent = localToGlobalMap.get(key);
    if (parent) {
        // ah, this was a local (with sentence fill-in-the-blank) flashcard for this word. Passive-update
        updater(parent, true);
        // then active-update all other locals
        for (const child of (globalToLocalsMap.get(parent) || [])) {
            updater(child);
        }
    }
}
exports.updateQuiz = updateQuiz;
function learnQuizzes(keys, { keyToEbisuMap }, date, opts = {}) {
    date = date || new Date();
    for (const [kidx, key] of curtiz_utils_1.enumerate(keys)) {
        if (!keyToEbisuMap.has(key)) {
            const scalar = (opts.halflifeScales && opts.halflifeScales[kidx]) || opts.halflifeScale || 1;
            const e = ebisu.defaultEbisu(scalar * exports.DEFAULT_EBISU_HALFLIFE_HOURS, opts.alphaBeta || exports.DEFAULT_EBISU_ALPHA_BETA, date);
            keyToEbisuMap.set(key, e);
        }
    }
}
exports.learnQuizzes = learnQuizzes;
