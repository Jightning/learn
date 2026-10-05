/* Keep symbolic work off the reader's thread and bound its running time. */
export function checkFormula(response, value) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./formula-worker.js", import.meta.url), { type: "module" });
    const finish = (result, error) => {
      clearTimeout(timeout);
      worker.terminate();
      if (error) reject(new Error(error)); else resolve(result);
    };
    const timeout = setTimeout(() => finish(null, "Formula checking timed out. Please try again."), 8000);
    worker.onmessage = ({ data }) => finish(data.result, data.error);
    worker.onerror = () => finish(null, "Formula checking could not load. Please try again.");
    worker.postMessage({ response, value });
  });
}
