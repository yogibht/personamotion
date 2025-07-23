const RLHFBrain = () => {
  const net = new brain.NeuralNetwork({
    hiddenLayers: [128, 64, 64, 32, 16, 8],
    activation: 'relu'
  });

  const trainingData = [];

  return {
    /**
     * Add training data anytime — live, during loop, etc.
     */
    addTrainingData(input, output, label = null, reward = 1.0) {
      trainingData.push({ input, output, label, reward });
    },

    /**
     * Update reward for any sample
     */
    applyFeedback(index, reward) {
      if (trainingData[index]) {
        trainingData[index].reward = reward;
      }
    },

    /**
     * Train on all current data — safe to call every frame
     */
    trainStep() {
      if (!net || trainingData.length === 0) return;

      const rewards = trainingData.map(d => d.reward ?? 1.0);
      const min = Math.min(...rewards);
      const max = Math.max(...rewards);
      const normalize = r =>
        max !== min ? 0.1 + 0.9 * (r - min) / (max - min) : 1.0;

      for (let i = 0; i < trainingData.length; i++) {
        const sample = trainingData[i];
        const weight = normalize(sample.reward ?? 1.0);

        net.train([{ input: sample.input, output: sample.output }], {
          iterations: 1,
          learningRate: 0.001 * weight,
          errorThresh: 0.05, // ✅ GOOD RANGE: 0.005 – 0.1
          log: false
        });
      }
    },

    /**
     * Predict from token input
     */
    predict(input) {
      return net.run(input);
    },

    /**
     * Export structure for graph rendering
     */
     generateGraphData() {
       const json = net.toJSON();
       const layers = json.layers;
       const activationFn = json.activation || 'sigmoid';
       const graph = {
         nodes: [],
         links: []
       };

       const nodeIndexMap = [];

       // First, create nodes and track nodeId -> index per layer
       layers.forEach((layer, layerIdx) => {
         const size = layer.biases?.length || 0;
         const layerMap = {};

         for (let neuronIdx = 0; neuronIdx < size; neuronIdx++) {
           const id = `L${layerIdx}N${neuronIdx}`;

           graph.nodes.push({
             id,
             layer: layerIdx,
             neuron: neuronIdx,
             bias: layer.biases?.[neuronIdx] ?? null,
             activation: activationFn
           });

           layerMap[neuronIdx] = id;
         }

         nodeIndexMap[layerIdx] = layerMap;
       });

       // Then, create links using weight matrices
       for (let layerIdx = 1; layerIdx < layers.length; layerIdx++) {
         const currentLayer = layers[layerIdx];
         const weights = currentLayer.weights; // shape: [currentNeurons][prevNeurons]

         if (!weights || !weights.length) continue;

         for (let i = 0; i < weights.length; i++) { // current layer neuron
           for (let j = 0; j < weights[i].length; j++) { // previous layer neuron
             graph.links.push({
               source: nodeIndexMap[layerIdx - 1][j],
               target: nodeIndexMap[layerIdx][i],
               weight: weights[i][j]
             });
           }
         }
       }

       return graph;
     }

  };
};

const initiateLeftBrain = async () => {
  const brainInstance = RLHFBrain();

  let counter = 0;
  const startThinking = (now) => {
    // Dynamically add training data every 60 frames
    if (counter % 60 === 0) {
      const inputToken = Array(128).fill(0).map((_, i) => (i === (counter % 128) ? 1 : 0));
      const outputToken = Array(10).fill(0).map((_, i) => (i === (counter % 10) ? 1 : 0));
      brainInstance.addTrainingData(inputToken, outputToken, `live_${counter}`, 1.0);
    }

    // Train every frame
    brainInstance.trainStep();

    // Predict every frame
    const testInput = Array(128).fill(0).map((_, i) => (i === (counter % 128) ? 1 : 0));
    const result = brainInstance.predict(testInput);
    // console.log(`Frame ${counter}`, result);

    counter++;
    requestAnimationFrame(startThinking);
  }
  startThinking();

  const ret = {
    brainInstance,
    startThinking
  };

  return ret;
};

window.initiateLeftBrain = initiateLeftBrain;
