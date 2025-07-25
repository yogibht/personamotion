const startPersonaMotion = async (arguments) => {
  const { worker, modelURL, ENV } = arguments;

  worker.onmessage = (e) => {
    if (e.data.type === 'analysisResult') {
      console.log("Analysis:", e.data.analysis);
      // You could update UI here if desired
    }
  };

  try {
    const storageData = await loadData();

    const { brainInstance } = await initiateLeftBrain();
    await initiateRightBrain();

    const initialFunctionalState = {
      toggleBrainViz: false
    };
    const { container, canvas, inputManager } = await renderViewWindow({
      storageData,
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
    const newWorld = await world({ storageData, brainInstance, canvas, modelURL, ENV });

    $STATE.subscribe('applyBrainFeedback', (feedback = 0) => {
      // console.log(feedback);
      brainInstance.applyHumanFeedback(feedback);
    });
  }
  catch(err){
    console.error(err);
  }
};

window.startPersonaMotion = startPersonaMotion;
