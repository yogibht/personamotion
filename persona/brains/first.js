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

    applyHumanFeedback(feedback, decay = 0.95) {  // Slower decay for more persistent effects
      if (![-1, 0, 1].includes(feedback)) {
        console.warn('Feedback should be -1, 0, or 1');
        return;
      }

      // Enhanced feedback parameters
      const FEEDBACK_STRENGTH = 0.5;  // Increased from 0.2 (more impact per feedback)
      const REWARD_RANGE = [0.05, 3.0];  // Wider reward bounds (was [0.1, 2.0])
      const LEARNING_RATE_ADJUSTMENT = feedback > 0 ? 1.5 : 0.6;  // More aggressive adjustment

      // 1. Apply stronger rewards to recent samples (last 10 instead of 5)
      const recentSamples = trainingData.slice(-10);
      recentSamples.forEach((sample, i) => {
        const timeWeight = Math.pow(decay, i);
        const impact = FEEDBACK_STRENGTH * (1 + Math.abs(feedback)); // Non-linear impact
        const newReward = sample.reward + (feedback * impact * timeWeight);

        // Clamp within wider range
        sample.reward = Math.max(REWARD_RANGE[0], Math.min(REWARD_RANGE[1], newReward));
      });

      // 2. Directly modify network parameters with stronger adjustments
      const options = net.trainOpts || {};
      const currentLR = options.learningRate || 0.001;

      if (feedback !== 0) {
        const newLR = currentLR * (feedback > 0 ?
          LEARNING_RATE_ADJUSTMENT :
          1/LEARNING_RATE_ADJUSTMENT);

        options.learningRate = Math.max(0.0003, Math.min(0.003, newLR));
      }

      // 3. Add momentum to weights for positive feedback
      if (feedback > 0) {
        const json = net.toJSON();
        json.layers.forEach(layer => {
          if (layer.weights) {
            layer.weights = layer.weights.map(weights =>
              weights.map(w => w * (1 + 0.05 * Math.random()))
            );
          }
        });
        net.fromJSON(json);
      }

      // 4. Track feedback intensity for visualization
      this.lastFeedback = {
        value: feedback,
        intensity: FEEDBACK_STRENGTH * (1 + Math.abs(feedback)),
        timestamp: Date.now()
      };

      console.log(`Applied STRONG feedback ${feedback}`, {
        learningRate: options.learningRate,
        rewardRange: recentSamples.map(s => s.reward),
        networkImpact: feedback > 0 ? "Boosted weights" : "Normal"
      });
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

    generateGraphData() {
      const json = net.toJSON();
      const graph = { nodes: [], links: [] };
      const nodeIdMap = {}; // {layerIndex: {neuronIndex: graphNodeId}}

      // 1. Create all nodes with direct indexing
      for (let layerIdx = 0; layerIdx < json.layers.length; layerIdx++) {
        const layer = json.layers[layerIdx];
        nodeIdMap[layerIdx] = {};

        // Get sorted neuron indices once
        const neuronIndices = Object.keys(layer)
          .filter(k => !isNaN(k))
          .map(Number)
          .sort((a,b) => a-b);

        for (const neuronIdx of neuronIndices) {
          const neuron = layer[neuronIdx];
          const id = graph.nodes.length;

          graph.nodes.push({
            id,
            layer: layerIdx,
            neuron: neuronIdx,
            bias: neuron.bias,
            activation: neuron.activation || (layerIdx === 0 ? 'input' : 'relu')
          });

          nodeIdMap[layerIdx][neuronIdx] = id;
        }
      }

      // 2. Create links with optimized weight processing
      for (let layerIdx = 1; layerIdx < json.layers.length; layerIdx++) {
        const layer = json.layers[layerIdx];
        const prevLayerSize = Object.keys(json.layers[layerIdx-1]).filter(k => !isNaN(k)).length;

        // Process neurons in order
        const neuronIndices = Object.keys(layer)
          .filter(k => !isNaN(k))
          .map(Number)
          .sort((a,b) => a-b);

        for (const neuronIdx of neuronIndices) {
          const neuron = layer[neuronIdx];
          const targetId = nodeIdMap[layerIdx][neuronIdx];

          // Fast path for dense weight matrices
          if (neuron.weights && Object.keys(neuron.weights).length === prevLayerSize) {
            for (let inputIdx = 0; inputIdx < prevLayerSize; inputIdx++) {
              if (neuron.weights[inputIdx] !== undefined) {
                graph.links.push({
                  source: nodeIdMap[layerIdx-1][inputIdx],
                  target: targetId,
                  weight: neuron.weights[inputIdx]
                });
              }
            }
          }
          // Slow path for sparse connections
          else if (neuron.weights) {
            for (const inputIdx of Object.keys(neuron.weights).map(Number)) {
              graph.links.push({
                source: nodeIdMap[layerIdx-1][inputIdx],
                target: targetId,
                weight: neuron.weights[inputIdx]
              });
            }
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
    if (counter % 60 === 0) {
      const inputToken = Array(128).fill(0).map((_, i) => (i === (counter % 128) ? 1 : 0));
      const outputToken = Array(10).fill(0).map((_, i) => (i === (counter % 10) ? 1 : 0));
      brainInstance.addTrainingData(inputToken, outputToken, `live_${counter}`, 1.0);
    }

    brainInstance.trainStep();

    counter++;
    requestAnimationFrame(startThinking);
  };
  startThinking();

  const ret = {
    brainInstance,
    startThinking
  };

  return ret;
};

window.initiateLeftBrain = initiateLeftBrain;
