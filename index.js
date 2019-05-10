"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const ebisu = __importStar(require("./ebisu"));
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
function addQuizzableToMaps(q, keyToQuizzableMap, globalToLocalsMap, localToGlobalMap) {
    const push = (vkey, o) => keyToQuizzableMap.set(JSON.stringify(vkey), o);
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
}
function loadQuizzes(qs, { keyToQuizzableMap, globalToLocalsMap, localToGlobalMap }) {
    let k2q = keyToQuizzableMap || new Map();
    let g2l = globalToLocalsMap || new Map();
    let l2g = localToGlobalMap || new Map();
    for (const q of qs) {
        addQuizzableToMaps(q, k2q, g2l, l2g);
    }
    return { keyToQuizzableMap: k2q, globalToLocalsMap: g2l, localToGlobalMap: l2g };
}
exports.loadQuizzes = loadQuizzes;
function whichToQuiz(keyToEbisu, keyToQuizzableMap, date) {
    let ret = { quiz: undefined, key: '' };
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
exports.whichToQuiz = whichToQuiz;
function updateQuiz(result, key, keyToEbisu, globalToLocalsMap, localToGlobalMap, date) {
    date = date || new Date();
    const updater = (key, passive = false) => {
        let e = keyToEbisu.get(key);
        if (!e) {
            throw new Error('key not found in Ebisu table');
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
