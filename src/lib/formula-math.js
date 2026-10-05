import { create, parseDependencies, simplifyDependencies, rationalizeDependencies,
  sqrtDependencies, absDependencies, sinDependencies, cosDependencies, tanDependencies,
  expDependencies, logDependencies, eDependencies, piDependencies, addDependencies,
  subtractDependencies, multiplyDependencies, divideDependencies, powDependencies,
  unaryMinusDependencies, unaryPlusDependencies, derivativeDependencies } from "mathjs/number";

// An isolated instance avoids math.js's default approximate identity comparisons.
export const formulaMath = create({
  ...parseDependencies, ...simplifyDependencies, ...rationalizeDependencies,
  ...sqrtDependencies, ...absDependencies, ...sinDependencies, ...cosDependencies,
  ...tanDependencies, ...expDependencies, ...logDependencies, ...eDependencies, ...piDependencies,
  ...addDependencies, ...subtractDependencies, ...multiplyDependencies, ...divideDependencies,
  ...powDependencies, ...unaryMinusDependencies, ...unaryPlusDependencies, ...derivativeDependencies
}, { relTol: Number.MIN_VALUE, absTol: 0 });

