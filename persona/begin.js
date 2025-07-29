const startPersonaMotion = async (arguments) => {
  const { worker, modelURL, ENV } = arguments;

  worker.onmessage = (e) => {
    if (e.data.type === 'analysisResult') {
      console.log("Analysis:", e.data.analysis);
      // You could update UI here if desired
    }
  };

  let storageData, brainInstance;
  try{
    storageData = await loadData();

    const leftBrain = await initiateLeftBrain();
    brainInstance = leftBrain.brainInstance;
    await initiateRightBrain();
  }
  catch(err){
    console.error("Brain load error: ", err);
  }

  try {
    const execFunctions = [
      () => {
        $STATE.set('toggleBrainViz', 'bulb');
      },
      () => {
        $STATE.set('toggleBrainViz', 'galaxy');
      },
      () => {
        $STATE.set('applyBrainFeedback', 1);
      },
      () => {
        $STATE.set('applyBrainFeedback', -1);
      },
      () => {
        const style = UTILITIES.randomInt(1, 16);
        $STATE.set('switchFilterUp', style);
      },
      () => {
        window.open('https://github.com/yogibht/personamotion', '_blank');
      }
    ];

    const buttons = [
      { id: 'brain_btn', icon: '🧠', label: 'brain', linkTo: 'brains' },
      // { id: 'keep_this_btn', icon: '🔥', label: 'keep_this', callbackIndex: 2 },
      // { id: 'no_good_btn', icon: '😭', label: 'no_good', callbackIndex: 3 },
      { id: 'filter_me', icon: '🕶️', label: 'filter_me', callbackIndex: 4 },
      { id: 'code_repo', icon: '📜', label: 'code_repo', callbackIndex: 5 },

      { id: 'brain_first', icon: '💭', label: 'first_brain', linkGroup: 'brains', callbackIndex: 0 },
      { id: 'brain_second', icon: '🌌', label: 'second_brain', linkGroup: 'brains', callbackIndex: 1 },
      { id: 'brain_third', icon: '🌐', label: 'third_brain', linkGroup: 'brains', linkTo: 'brains_remote' },

      { id: 'brain_remote_gemini', icon: '💭', label: 'GEMINI', linkGroup: 'brains_remote', onClick: () => console.log('GEMINI') },
      { id: 'brain_remote_openai', icon: '🎯', label: 'OPENAI', linkGroup: 'brains_remote', onClick: () => console.log('OPENAI') },
    ];

    const { container, canvas, inputManager } = await renderViewWindow({
      execFunctions,
      buttons,
      buttonLayout: 'line-right',
      promptPosition: 'top',
      buttonSizePercent: 0.12,
      ENV
    });

    const newWorld = await worldIllusion({ storageData, brainInstance, canvas, modelURL, ENV });

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
