var ebisujs = require('ebisu-js');
export interface Ebisu {
  model: number[];
  lastDate: Date;
}
function elapsedHours(prev: Date, curr?: Date) {
  // 36e5 milliseconds per hour
  return ((curr ? curr.valueOf() : Date.now()) - prev.valueOf()) / 36e5;
}
export function predict(ebisu: Ebisu, d?: Date): number {
  return ebisujs.predictRecall(ebisu.model, elapsedHours(ebisu.lastDate, d));
}
export function update(ebisu: Ebisu, result: boolean, d?: Date): Ebisu {
  ebisu.model = ebisujs.updateRecall(ebisu.model, result, elapsedHours(ebisu.lastDate, d));
  ebisu.lastDate = d || new Date();
  return ebisu;
}
export function passiveUpdate(ebisu: Ebisu, d?: Date): Ebisu {
  ebisu.lastDate = d || new Date();
  return ebisu;
}
export function defaultEbisu(expectedHalflife: number = 1, betaAB: number = 3, d?: Date): Ebisu {
  return {model: [betaAB, betaAB, expectedHalflife], lastDate: d || new Date()};
}