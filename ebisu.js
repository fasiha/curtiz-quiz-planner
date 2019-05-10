"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ebisujs = require('ebisu-js');
function elapsedHours(prev, curr) {
    // 36e5 milliseconds per hour
    return ((curr ? curr.valueOf() : Date.now()) - prev.valueOf()) / 36e5;
}
function predict(ebisu, d) {
    return ebisujs.predictRecall(ebisu.model, elapsedHours(ebisu.lastDate, d));
}
exports.predict = predict;
function update(ebisu, result, d) {
    ebisu.lastDate = d || new Date();
    ebisu.model = ebisujs.updateRecall(ebisu.model, result, elapsedHours(ebisu.lastDate, ebisu.lastDate));
    return ebisu;
}
exports.update = update;
function passiveUpdate(ebisu, d) {
    ebisu.lastDate = d || new Date();
    return ebisu;
}
exports.passiveUpdate = passiveUpdate;
function defaultEbisu(expectedHalflife = 1, betaAB = 3, d) {
    return { model: [betaAB, betaAB, expectedHalflife], lastDate: d || new Date() };
}
exports.defaultEbisu = defaultEbisu;
