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
    // Instead of always quizzing the lowest probability quiz, it's sometimes nice to mix things up a bit: let's look
    // for a few quizzes with low probability, not just the lowest.
    // Only find a fraction of the total number of quizzes, limited by 20~ish.
    const numItems = Math.min(Math.floor(ebisus.size * .1), 20);
    // If there are very few quizzes, just fall back to finding the lowest-probability quiz.
    if (numItems > 1) {
        const lowest = curtiz_utils_1.partialSort(ebisus.entries(), numItems, ([key, e]) => {
            const precall = ebisu.predict(e, date);
            if (details) {
                details.out.push({ key, precall, model: e.model, date });
            }
            return precall;
        });
        if (lowest.length > 0) {
            // bin the results so we don't randomly pick between a 90% and a 1% probability
            const bins = [1e-3, 1e-2, 1e-1, 5e-1];
            const binned = curtiz_utils_1.binLowest(lowest, bins, (x) => x.y);
            // now pick a random value in the bin
            return nodes.get(binned[Math.floor(Math.random() * binned.length)].x[0]);
        }
    }
    // Find the quiz with the absolute lowest probability of recall
    for (const [key, e] of ebisus) {
        if (!nodes.has(key)) {
            continue;
        } // skip things we've learned but that aren't in any document
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
function learnQuiz(key, { ebisus }, { date, halflife, alphaBeta } = {}) {
    if (!ebisus.has(key)) {
        date = date || new Date();
        halflife = halflife || exports.DEFAULT_EBISU_HALFLIFE_HOURS;
        const e = ebisu.defaultEbisu(halflife, alphaBeta || exports.DEFAULT_EBISU_ALPHA_BETA, date);
        ebisus.set(key, e);
    }
}
exports.learnQuiz = learnQuiz;
