import { gradeFormula } from "./formula.js";

self.onmessage = ({ data }) => {
  try { self.postMessage({ result: gradeFormula(data.response, data.value) }); }
  catch (error) { self.postMessage({ error: error instanceof TypeError ? "Formula checking failed. Please try again." : error.message }); }
};
