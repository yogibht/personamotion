const startPersonaMotion = async (arguments) => {
  const { worker, modelURL, ENV } = arguments;

  worker.onmessage = (e) => {
    if (e.data.type === 'analysisResult') {
      console.log("Analysis:", e.data.analysis);
      // You could update UI here if desired
    }
  };

  try {
    await initiateRightBrain();
    const { container, canvas, inputManager } = await renderViewWindow({
        buttonLayout: 'line-right', // or 'arc', 'line-top', etc.
        promptPosition: 'top', // or 'bottom'
        buttonSizePercent: 0.12, // relative to container size
        dummyFunctions: [() => console.log("Button clicked!")],
        ENV
    });
    const newWorld = await world({ canvas, modelURL, ENV });
  }
  catch(err){
    console.error(err);
  }

  // For Local Storage
  // window.addEventListener("keyup", async (event) => {
  //   const loadedStorageData = await loadData();
  //   console.log(loadedStorageData);
  // })
  // $STATE.subscribe('containerNeedsUpdate', (data)=>{
  //   console.log(data);
  // })
};

window.startPersonaMotion = startPersonaMotion;
