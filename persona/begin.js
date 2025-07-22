const startPersonaMotion = async (arguments) => {
  const { worker, modelURL, ENV } = arguments;

  worker.onmessage = (e) => {
    if (e.data.type === 'analysisResult') {
      console.log("Analysis:", e.data.analysis);
      // You could update UI here if desired
    }
  };

  try {
    const { brainInstance } = await initiateLeftBrain();
    await initiateRightBrain();
    const { container, canvas, inputManager } = await renderViewWindow({
        buttonLayout: 'line-right', // or 'arc', 'line-top', etc.
        promptPosition: 'top', // or 'bottom'
        buttonSizePercent: 0.12, // relative to container size
        dummyFunctions: [() => console.log("Button clicked!")],
        ENV
    });
    const newWorld = await world({ brainInstance, canvas, modelURL, ENV });

    window.addEventListener("keyup", async (event) => {
      // const loadedStorageData = await loadData();
      // console.log(loadedStorageData);
      console.log(brainInstance.generateGraphData());
    })
  }
  catch(err){
    console.error(err);
  }
};

window.startPersonaMotion = startPersonaMotion;
