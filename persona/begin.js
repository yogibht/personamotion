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

    const initialFunctionalState = {
      toggleBrainViz: false
    };
    const { container, canvas, inputManager } = await renderViewWindow({
      brainInstance,
      buttonLayout: 'line-right', // or 'arc', 'line-top', etc.
      promptPosition: 'top', // or 'bottom'
      buttonSizePercent: 0.12, // relative to container size
      execFunctions: [
        () => {
          $STATE.set('toggleBrainViz', !initialFunctionalState.toggleBrainViz);
          initialFunctionalState.toggleBrainViz = !initialFunctionalState.toggleBrainViz;
        },
        () => {
          $STATE.set('applyBrainFeedback', 1);
        },
        () => {
          $STATE.set('applyBrainFeedback', -1);
        },
        () => {
          const filterStyle = UTILITIES.randomInt(1, 16);
          $STATE.set('switchFilterUp', filterStyle);
        }
      ],
      ENV
    });
    const newWorld = await world({ brainInstance, canvas, modelURL, ENV });

    // window.addEventListener("keyup", async (event) => {
    //   // const loadedStorageData = await loadData();
    //   // console.log(loadedStorageData);
    //   const brainGraph = brainInstance.generateGraphData();
    //   console.log(JSON.stringify(brainGraph), brainGraph);
    // })
  }
  catch(err){
    console.error(err);
  }
};

window.startPersonaMotion = startPersonaMotion;
