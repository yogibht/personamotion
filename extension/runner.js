(async () => {
  // Load CSS
  const cssURL = chrome.runtime.getURL('persona/view/styling.css');
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = cssURL;
  document.head.appendChild(link);

  const envURL = chrome.runtime.getURL('env.json');
  const envResponse = await fetch(envURL);
  const ENV = await envResponse.json();

  const workerURL = chrome.runtime.getURL('compute/worker.js');
  const workerFetchResponse = await fetch(workerURL);
  const workerCode = await workerFetchResponse.text();
  const workerBlob = new Blob([workerCode], { type: 'application/javascript' });
  const worker = new Worker(URL.createObjectURL(workerBlob));

  const modelURL = chrome.runtime.getURL('models/persona.glb');

  startPersonaMotion({
    worker,
    modelURL,
    ENV
  });
})();
