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
exports.ebisu = ebisu;
function addEmptyEbisus(graph) { return Object.assign({}, graph, { ebisus: new Map() }); }
exports.addEmptyEbisus = addEmptyEbisus;
exports.DEFAULT_EBISU_ALPHA_BETA = 2;
exports.DEFAULT_EBISU_HALFLIFE_HOURS = 0.25;
function whichToQuiz({ ebisus, nodes }, { date, details } = {}) {
    let quiz;
    let lowestPrecall = Infinity;
    date = date || new Date();
    if (details) {
        details.out = [];
    }
    for (const [key, e] of ebisus) {
        const precall = ebisu.predict(e, date);
        if (precall < lowestPrecall) {
            lowestPrecall = precall;
            quiz = nodes.get(key);
        }
        if (details) {
            details.out.push({ key, precall, model: e.model, date });
        }
    }
    return quiz;
}
exports.whichToQuiz = whichToQuiz;
function updateQuiz(result, key, { ebisus, edges }, { date, callback } = {}) {
    date = date || new Date();
    const updater = (key, passive = false) => {
        let e = ebisus.get(key);
        if (!e) {
            return;
        }
        if (passive) {
            ebisu.passiveUpdate(e, date);
        }
        else {
            ebisu.update(e, result, date);
        }
        if (callback) {
            callback(key, e);
        }
    };
    updater(key);
    const children = edges.get(key);
    if (children) {
        for (const child of children) {
            updater(child, true);
        }
    }
}
exports.updateQuiz = updateQuiz;
function learnQuizzes(key, { ebisus }, { date, halflife, alphaBeta } = {}) {
    if (!ebisus.has(key)) {
        date = date || new Date();
        halflife = halflife || exports.DEFAULT_EBISU_HALFLIFE_HOURS;
        const e = ebisu.defaultEbisu(halflife, alphaBeta || exports.DEFAULT_EBISU_ALPHA_BETA, date);
        ebisus.set(key, e);
    }
}
exports.learnQuizzes = learnQuizzes;
