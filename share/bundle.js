// Combined at 2025-07-24T07:20:12.283Z
// 14 files


// ====== utilities.js ======
const uuidv4 = ()=>{
    const _M = randomInt(6, 1);
    const _N = ["8", "9", "a", "b"][randomInt(3)];
    const placeholder = `xxxxxxxx-xxxx-${_M}xxx-${_N}xxx-xxxxxxxxxxxx`
    return placeholder.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

const randomInt = (max, min=0, seedstring)=>{
    if(seedstring){
        const randfunc = mulberry32(seedstring);
        const rand = randfunc();
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(rand * (max - min) + min);
    }
    else{
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min) + min);
    }
}

const randomFloat = (max=1.0, min=0.0)=>{
    return Math.random() * (max - min) + min;
}

const generateSeed = (seed_string)=>{
    if(!seed_string){
        seed_string = Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 12);
    }
    const newseed = xmur3(seed_string);
    return newseed();
}

const xmur3 = (seed_string)=>{
    for(var i = 0, h = 1779033703 ^ seed_string.length; i < seed_string.length; i++)
        h = Math.imul(h ^ seed_string.charCodeAt(i), 3432918353),
        h = h << 13 | h >>> 19;
    return function(){
        h = Math.imul(h ^ h >>> 16, 2246822507);
        h = Math.imul(h ^ h >>> 13, 3266489909);
        return (h ^= h >>> 16) >>> 0;
    }
}

const mulberry32 = (a)=>{
    return function() {
      var t = a += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}

const easeIn = (start, end, t) => start + (end - start) * (t * t);

const easeOut = (start, end, t) => start + (end - start) * (1 - (1 - t) * (1 - t));

const easeInOut = (start, end, t) => start + (end - start) * ((t < 0.5) ? (2 * t * t) : (-1 + (4 - 2 * t) * t));

const easeOutQuad = (n)=>{
    return 1 - (1 - n) * (1 - n);
}

const easeOutBounce = (x)=>{
    const n1 = 7.5625;
    const d1 = 2.75;

    if (x < 1 / d1) {
        return n1 * x * x;
    } else if (x < 2 / d1) {
        return n1 * (x -= 1.5 / d1) * x + 0.75;
    } else if (x < 2.5 / d1) {
        return n1 * (x -= 2.25 / d1) * x + 0.9375;
    } else {
        return n1 * (x -= 2.625 / d1) * x + 0.984375;
    }
}

const toRadian = (x)=>{
    return x * Math.PI/180;
}

const toDegree = (x)=>{
    return x * 180/Math.PI;
}

const lerp = (n1, n2, alpha)=>{
    return (1 - alpha) * n1 + alpha * n2;
    // return a + (b - a) * alpha;
}

const clamp = (a, min=0, max=1)=>{
    return Math.min(max, Math.max(min, a));
}

const inverseLerp = (x, y, a)=>{
    return clamp((a - x) / (y - x));
}

const loadResource = (filepath, type="text")=>{
    return new Promise((resolve, reject)=>{
        fetch(filepath, {
            method: "GET",
            mode: "no-cors"
        })
        .then(response=>{
            if(response.ok){
                if(type==="blob") resolve(response.blob());
                else if(type==="json") resolve(response.json());
                else resolve(response.text());
            }
            else reject("Invalid File")
        })
        .then(resData=>{/*console.log(resData);*/})
        .catch((error)=>{
            console.log(error);
            reject(error);
        });
    });
};

const findFPS = ()=> {
	return new Promise((resolve, reject)=>{
		const fpslist = [];
		let count = 250;    // 250 frame sampled
		let then = 0;
		const FPSLoop = (now) => {
			if(count > 0) requestAnimationFrame(FPSLoop);
			else{
				const avgFPS = fpslist.reduce((a, b) => a + b) / fpslist.length;
				resolve(avgFPS);
			}

			now *= 0.001;
			const deltaTime = now - then;
			then = now;
			const fps = 1 / deltaTime;

			fpslist.push(fps);

			count--;
		};
		requestAnimationFrame(FPSLoop);
	});
};

const remoteRequest = async (userdata, APIKEY, URL, model = 'gemini') => {
  try {
    const headers = {
      'Content-Type': 'application/json',
      'X-goog-api-key': APIKEY
    };
    if(model === 'deepseek' || model === 'openai'){
      delete headers['X-goog-api-key'];
      headers['Authorization'] = `Bearer ${APIKEY}`;
    }
    const response = await fetch(URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(userdata)
    });
    if(model === 'gemini'){
      const data = await response.text();
      return data;
    }
    else{
      const data = await response.json();
      return data.response;
    }
  }
  catch(err){
    console.error(err);
  }
};

const BREAKPOINTS = {
    MOBILE: 768,
    TABLET: 1024
};

const checkDeviceType = () => {
    const width = window.innerWidth;

    // Primary width-based checks
    if (width <= BREAKPOINTS.MOBILE) {
        return DEVICETYPES.MOBILE;
    }
    if (width <= BREAKPOINTS.TABLET) {
        return DEVICETYPES.TABLET;
    }
    if (width > BREAKPOINTS.TABLET) {
        return DEVICETYPES.DESKTOP;
    }

    // Fallback to user agent checks
    const ua = navigator.userAgent;
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
        return DEVICETYPES.TABLET;
    }
    if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|OperaMobi/i.test(ua)) {
        return DEVICETYPES.MOBILE;
    }

    return DEVICETYPES.DESKTOP;
};

const DEVICETYPES = {
    DESKTOP: "desktop",
    MOBILE: "mobile"
};

const UTILITIES = {
    uuidv4,
    randomInt,
    randomFloat,
    generateSeed,
    easeIn,
    easeOut,
    easeInOut,
    easeOutQuad,
    easeOutBounce,
    toRadian,
    toDegree,
    lerp,
    clamp,
    inverseLerp,
    loadResource,
    findFPS,
    remoteRequest,
    checkDeviceType,
    DEVICETYPES
};

window.UTILITIES = UTILITIES;


// ====== inputmanager.js ======
const createInputManager = (target = window) => {
    const isMobileDevice = UTILITIES.checkDeviceType() === UTILITIES.DEVICETYPES.MOBILE;

    const callbacks = {
        idle: [],
        click: [],
        rightClick: [],
        drag: [],
        rightClickDrag: [],
        move: [],
        touchStart: [],
        touchMove: [],
        touchEnd: [],
        wheel: []
    };

    let previousPosition = { x: 0, y: 0 };
    let currentPosition = { x: 0, y: 0 };

    const on = (event, callback) => {
        if (callbacks[event]) {
            callbacks[event].push(callback);
        }
    };

    const trigger = (event, data) => {
        if (callbacks[event]) {
            callbacks[event].forEach(callback => callback(data));
        }
    };

    const updatePosition = (event) => {
        previousPosition = { ...currentPosition };
        currentPosition = { x: event.clientX, y: event.clientY };
    };

    const createMouseEventObject = (event) => {
        return {
            previousPosition,
            currentPosition,
            delta: {
                x: currentPosition.x - previousPosition.x,
                y: currentPosition.y - previousPosition.y
            },
            event
        };
    };

    const createWheelEventObject = (event) => {
        let direction = 0;

        if (event.deltaY < 0) direction = 1;
        else if (event.deltaY > 0) direction = -1;

        return {
            deltaY: event.deltaY,
            direction,
            event
        };
    };

    const handleMouseDown = (event) => {
        updatePosition(event);
        if (event.button === 0) {
            trigger('click', createMouseEventObject(event));
        } else if (event.button === 2) {
            trigger('rightClick', createMouseEventObject(event));
        }
    };

    const handleMouseUp = (event) => {
        updatePosition(event);
        if (event.button === 0) {
            trigger('idle', createMouseEventObject(event));
        }
    };

    const handleMouseMove = (event) => {
        updatePosition(event);
        trigger('move', createMouseEventObject(event));
    };

    const handleTouchStart = (event) => {
        const touch = event.touches[0];
        updatePosition(touch);
        trigger('touchStart', createMouseEventObject(touch));
    };

    const handleTouchMove = (event) => {
        const touch = event.touches[0];
        updatePosition(touch);
        trigger('touchMove', createMouseEventObject(touch));
    };

    const handleTouchEnd = (event) => {
        const touch = event.changedTouches[0];
        updatePosition(touch);
        trigger('touchEnd', createMouseEventObject(touch));
    };

    const handleWheel = (event) => {
        trigger('wheel', createWheelEventObject(event));
    };

    // Variables to track swipe gestures
    let touchStartY = 0;
    let touchEndY = 0;

    const handleSwipeStart = (event) => {
        touchStartY = event.touches[0].clientY;
    };

    const handleSwipeMove = (event) => {
        touchEndY = event.touches[0].clientY;
    };

    const handleSwipeEnd = () => {
        const deltaY = touchEndY - touchStartY;
        let direction = 0;
        if (deltaY < 0) {
            direction = 1; // Up
        } else if (deltaY > 0) {
            direction = -1; // Down
        }
        trigger('wheel', { deltaY, direction });
    };

    if (isMobileDevice) {
        target.addEventListener('touchstart', handleTouchStart);
        target.addEventListener('touchmove', handleTouchMove);
        target.addEventListener('touchend', handleTouchEnd);

        // Add swipe gesture handling
        target.addEventListener('touchstart', handleSwipeStart);
        target.addEventListener('touchmove', handleSwipeMove);
        target.addEventListener('touchend', handleSwipeEnd);
    } else {
        target.addEventListener('mousedown', handleMouseDown);
        target.addEventListener('mousemove', handleMouseMove);
        target.addEventListener('mouseup', handleMouseUp);
        target.addEventListener('wheel', handleWheel);
    }

    return {
        on
    };
};

window.createInputManager = createInputManager;


// ====== threehelper.js ======
const createAnimationLoop = (options = {}, callback) => {
  const config = {
    duration: 0,         // 0 = infinite
    fps: 0,             // 0 = uncapped
    frameSkip: 1,       // Call callback every N frames
    ...options
  };

  // Animation state
  const clock = new THREE.Clock();
  let frameCount = 0;
  let startTime = 0;
  let lastFrameTime = 0;
  let rafId = null;
  let isRunning = false;
  const frameDuration = config.fps > 0 ? 1000 / config.fps : 0;

  // Main animation loop
  const loop = (timestamp) => {
    if (!startTime) {
      startTime = timestamp;
      clock.start(); // Start Three.js clock on first frame
    }

    const elapsed = timestamp - startTime;
    const delta = clock.getDelta(); // Three.js delta time
    const elapsedTime = clock.getElapsedTime(); // Three.js elapsed time

    // Duration check
    if (config.duration > 0 && elapsed >= config.duration) {
      stop();
      return;
    }

    // Frame rate control
    const shouldRender =
      (frameDuration === 0 || timestamp - lastFrameTime >= frameDuration) &&
      (frameCount % config.frameSkip === 0);

    if (shouldRender) {
      callback({
        timestamp,
        elapsed,
        frameCount,
        deltaTime: timestamp - lastFrameTime,
        progress: config.duration > 0 ? Math.min(elapsed / config.duration, 1) : null,
        threejs: { // Three.js specific timing
          delta,
          elapsedTime,
          clock
        }
      });
      lastFrameTime = timestamp;
    }

    frameCount++;
    if (isRunning) {
      rafId = requestAnimationFrame(loop);
    }
  };

  // Control methods
  const start = () => {
    if (isRunning) return;
    isRunning = true;
    startTime = 0;
    frameCount = 0;
    clock.start(); // Reset Three.js clock
    rafId = requestAnimationFrame(loop);
  };

  const stop = () => {
    if (!isRunning) return;
    cancelAnimationFrame(rafId);
    isRunning = false;
    clock.stop(); // Stop Three.js clock
  };

  const updateConfig = (newOptions) => {
    Object.assign(config, newOptions);
  };

  return {
    start,
    stop,
    updateConfig,
    get isRunning() { return isRunning; },
    get currentFrame() { return frameCount; },
    get clock() { return clock; } // Expose Three.js clock
  };
}

/*
const anim = createAnimationLoop(
  { fps: 60 },
  ({ elapsed, progress }) => {
    console.log(`Frame at ${elapsed}ms`, progress ? `${(progress * 100).toFixed(1)}%` : '');
  }
);
anim.start();
*/

/*
createAnimationLoop(
  { frameSkip: 3 },
  ({ frameCount }) => console.log(`Frame ${frameCount}`)
).start();
*/

/*
createAnimationLoop(
  { duration: 5000 }, // 5 seconds
  ({ progress }) => {
    console.log(`Progress: ${(progress * 100).toFixed(1)}%`);
  }
).start();
*/

const setupRaycastSelection = (camera, renderer, raycastTarget, onSelect) => {
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  const onPointerDown = (event) => {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(raycastTarget, false);

    if (intersects.length > 0) {
      onSelect(intersects[0], event);
    }
  };

  renderer.domElement.addEventListener('pointerdown', onPointerDown, false);

  return () => {
    renderer.domElement.removeEventListener('pointerdown', onPointerDown, false);
  };
};

const loadGLTFModel = async (url) => {
  const loader = new THREE.GLTFLoader();
  try {
    const gltf = await new Promise((resolve, reject) => {
      loader.load(url, resolve, undefined, reject);
    });
    return gltf;
  } catch (error) {
    console.error('GLTF loading failed:', error);
    throw error;
  }
};

window.setupRaycastSelection = setupRaycastSelection;
window.createAnimationLoop = createAnimationLoop;
window.loadGLTFModel = loadGLTFModel;


// ====== left.js ======
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
      const json = net.toJSON(); // Always get fresh weights
      const layers = json.layers;
      const graph = { nodes: [], links: [] };
      const nodeIndexMap = [];

      // Build nodes
      layers.forEach((layer, layerIdx) => {
        const size = layer.biases?.length || 0;
        const layerMap = {};
        for (let neuronIdx = 0; neuronIdx < size; neuronIdx++) {
          const id = `L${layerIdx}N${neuronIdx}`;
          graph.nodes.push({
            id,
            layer: layerIdx,
            neuron: neuronIdx,
            bias: layer.biases?.[neuronIdx] ?? 0,
            activation: json.activation || 'relu'
          });
          layerMap[neuronIdx] = id;
        }
        nodeIndexMap[layerIdx] = layerMap;
      });

      // Build links with current weights
      for (let layerIdx = 1; layerIdx < layers.length; layerIdx++) {
        const weights = layers[layerIdx].weights;
        if (!weights) continue;
        for (let i = 0; i < weights.length; i++) {
          for (let j = 0; j < weights[i].length; j++) {
            graph.links.push({
              source: nodeIndexMap[layerIdx - 1][j],
              target: nodeIndexMap[layerIdx][i],
              weight: weights[i][j] // ✅ This will be updated
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


// ====== right.js ======
const BONE_DATA = [
  {
    "name": "mixamorigHips",
    "position": { "x": 0, "y": -1.41, "z": -89.72 },
    "parent": "ReeblyArmature"
  },
  {
    "name": "mixamorigSpine",
    "position": { "x": 0, "y": 10.98, "z": -0.67 },
    "parent": "mixamorigHips"
  },
  {
    "name": "mixamorigSpine1",
    "position": { "x": 0, "y": 12.84, "z": 0 },
    "parent": "mixamorigSpine"
  },
  {
    "name": "mixamorigSpine2",
    "position": { "x": 0, "y": 14.67, "z": 0 },
    "parent": "mixamorigSpine1"
  },
  {
    "name": "mixamorigNeck",
    "position": { "x": 0, "y": 16.51, "z": 0 },
    "parent": "mixamorigSpine2"
  },
  {
    "name": "mixamorigHead",
    "position": { "x": 0, "y": 5.90, "z": 1.56 },
    "parent": "mixamorigNeck"
  },
  {
    "name": "mixamorigLeftShoulder",
    "position": { "x": 6.73, "y": 14.51, "z": -0.14 },
    "parent": "mixamorigSpine2"
  },
  {
    "name": "mixamorigLeftArm",
    "position": { "x": 0, "y": 13.91, "z": 0 },
    "parent": "mixamorigLeftShoulder"
  },
  {
    "name": "mixamorigLeftForeArm",
    "position": { "x": 0, "y": 32.69, "z": 0 },
    "parent": "mixamorigLeftArm"
  },
  {
    "name": "mixamorigLeftHand",
    "position": { "x": 0, "y": 27.80, "z": 0 },
    "parent": "mixamorigLeftForeArm"
  },
  {
    "name": "mixamorigRightShoulder",
    "position": { "x": -6.73, "y": 14.51, "z": -0.10 },
    "parent": "mixamorigSpine2"
  },
  {
    "name": "mixamorigRightArm",
    "position": { "x": 0, "y": 13.91, "z": 0 },
    "parent": "mixamorigRightShoulder"
  },
  {
    "name": "mixamorigRightForeArm",
    "position": { "x": 0, "y": 32.69, "z": 0 },
    "parent": "mixamorigRightArm"
  },
  {
    "name": "mixamorigRightHand",
    "position": { "x": 0, "y": 27.79, "z": 0 },
    "parent": "mixamorigRightForeArm"
  },
  {
    "name": "mixamorigLeftUpLeg",
    "position": { "x": 8.19, "y": -6.10, "z": -1.15 },
    "parent": "mixamorigHips"
  },
  {
    "name": "mixamorigLeftLeg",
    "position": { "x": 0, "y": 41.49, "z": 0 },
    "parent": "mixamorigLeftUpLeg"
  },
  {
    "name": "mixamorigLeftFoot",
    "position": { "x": 0, "y": 32.40, "z": 0 },
    "parent": "mixamorigLeftLeg"
  },
  {
    "name": "mixamorigRightUpLeg",
    "position": { "x": -8.19, "y": -6.10, "z": -1.05 },
    "parent": "mixamorigHips"
  },
  {
    "name": "mixamorigRightLeg",
    "position": { "x": 0, "y": 41.49, "z": 0 },
    "parent": "mixamorigRightUpLeg"
  },
  {
    "name": "mixamorigRightFoot",
    "position": { "x": 0, "y": 32.41, "z": 0 },
    "parent": "mixamorigRightLeg"
  }
];

const ANIMATION_INSTRUCTIONS = {
  system: `You are an animation director for a 3D character with a Mixamo-rigged skeleton. You must generate precise animation data in JSON format.

BONE STRUCTURE:
${JSON.stringify(BONE_DATA, null, 2)}

ANIMATION FORMAT REQUIRED:
{
  "animationName": "descriptive_name",
  "duration": 2.0,
  "loop": true/false,
  "chains": {
    "boneName": {
      "x": "(t) => mathematical_expression",
      "y": "(t) => mathematical_expression",
      "z": "(t) => mathematical_expression"
    }
  },
  "motion": {
    "position": {
      "x": "(t) => mathematical_expression",
      "y": "(t) => mathematical_expression",
      "z": "(t) => mathematical_expression"
    },
    "rotation": {
      "x": "(t) => mathematical_expression",
      "y": "(t) => mathematical_expression",
      "z": "(t) => mathematical_expression"
    },
    "scale": {
      "x": "(t) => mathematical_expression",
      "y": "(t) => mathematical_expression",
      "z": "(t) => mathematical_expression"
    }
  }
}

RULES:
- t ranges from 0 to 1 representing animation progress
- Use Math.sin, Math.cos, Math.PI for smooth movements
- Position values are in world units
- Rotation values are in radians
- Scale values are multipliers (1.0 = normal size)
- Only include bones that need to move
- Always provide valid JavaScript expressions as strings

Examples:
- Wave: "Math.sin(t * Math.PI * 2)"
- Bounce: "Math.abs(Math.sin(t * Math.PI * 4))"
- Ease in/out: "0.5 * (1 - Math.cos(t * Math.PI))"

ONLY RESPOND WITH JSON`,

  prompt: (action) => `Create an animation for: "${action}" And your response should be in this schema: { content: $you_response_goes_here, animation: $animationjsondata_as_required_goes_here }`
};

let debug_prompt_count = 0;

const parseFunctionStrings = (obj) => {
  if (!obj || typeof obj !== 'object') return;

  const parseValue = (val) => {
    if (typeof val === 'string' && val.includes('=>')) {
      try {
        const body = val.split('=>')[1].trim();
        return new Function('t', 'return ' + body);
      } catch (e) {
        console.warn('Invalid function string:', val);
        return () => 0;
      }
    }
    return val;
  };

  for (const key in obj) {
    if (typeof obj[key] === 'object') {
      parseFunctionStrings(obj[key]);
    } else {
      obj[key] = parseValue(obj[key]);
    }
  }
};

const callAncestors = async (data) => {
  debug_prompt_count++;

  const promptText = `System Prompt: ${ANIMATION_INSTRUCTIONS.system}\nUser Prompt: \n${ANIMATION_INSTRUCTIONS.prompt(data.prompt)}`;

  const ancestorData = {
    contents: [{
      parts: [{ text: promptText }]
    }]
  };

  try {
    const homecall = await UTILITIES.remoteRequest(ancestorData, data.ENV.API.GEMINI.key, data.ENV.API.GEMINI.url);
    const processedcall = JSON.parse(homecall);
    const response_text = processedcall.candidates[0].content.parts[0].text;

    let animationData = null;
    let AIResponse = null;
    let cleanedText = response_text.trim();

    // Step 1: Remove markdown block fences
    if (cleanedText.startsWith('```json')) cleanedText = cleanedText.slice(7);
    if (cleanedText.endsWith('```')) cleanedText = cleanedText.slice(0, -3);

    // Step 2: Remove newlines inside strings like "(t) => ..."
    cleanedText = cleanedText.replace(/"(.*?)=>[\s\S]*?"/g, (match) => {
      return match.replace(/\n/g, ' ').replace(/\r/g, ' ');
    });

    // Step 3: Remove trailing commas before closing brackets
    cleanedText = cleanedText.replace(/,\s*([}\]])/g, '$1');

    try {
      const maybeJSON = JSON.parse(cleanedText);
      console.log(maybeJSON);
      if (maybeJSON && maybeJSON.animation) {
        parseFunctionStrings(maybeJSON.animation.chains);
        parseFunctionStrings(maybeJSON.animation.motion);
        animationData = maybeJSON.animation;
      }
      if (maybeJSON && maybeJSON.content) {
        AIResponse = maybeJSON.content
      }
    } catch (e) {
      console.warn('Failed to parse JSON animation block:', e);
      console.warn('Problematic cleaned JSON:\n', cleanedText);
    }


    const responseContent = `
      <div style="background-color: #2c3e50;
                  color: #ecf0f1;
                  font-family: 'Arial', sans-serif;
                  padding: 2em;
                  border-radius: 12px;
                  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
                  text-align: center;
                  max-width: 400px;
                  margin: 2em auto;
                  border: 2px solid #3498db;
                  transition: transform 0.2s ease-in-out, background-color 0.2s ease-in-out;">
        <h2 style="margin-top: 0; color: #3498db; text-transform: uppercase; letter-spacing: 2px;">
        Prompt: ${data.prompt}
        </h2>
        <p style="font-size: 1.1em; line-height: 1.6; margin-bottom: 0;">
        ${AIResponse}
        </p>
      </div>
    `;

    $STATE.set('promptResponse', {
      data: response_text,
      html: responseContent,
      animationData
    });

  } catch (err) {
    console.error(err);
  }
};

const initiateRightBrain = async () => {
  const globalData = {
    containerNeedsUpdate: true,
    containerHeight: 0,
    containerWidth: 0,
    toggleUI: false
  };

  for (const key in globalData) {
    $STATE.set(key, globalData[key]);
  }

  $STATE.subscribe('callAncestors', callAncestors);
};

window.initiateRightBrain = initiateRightBrain;


// ====== aesthetics.js ======
const createShaderMaterial = (props) => {
  props = {
    width: 256,
    height: 256,
    ...props
  };

  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0.0 },
      resolution: { value: new THREE.Vector2(props.width, props.height) },
      uStarScrollSpeed: { value: 0.000035 },
      uStarColor: { value: new THREE.Color(1.0, 1.0, 1.0) },
      uBgColorA: { value: new THREE.Color(0.05, 0.0, 0.1) },
      uBgColorB: { value: new THREE.Color(0.0, 0.0, 0.2) },
      uEdgeColor: { value: new THREE.Color(0.9, 0.2, 1.0) },
      uEdgeMin: { value: 0.4 },
      uEdgeMax: { value: 0.5 },
      uEdgePower: { value: 1.0 },
      uEdgePulseSpeed: { value: 3.0 },
      uEnableTravelingPulse: { value: true },
      uPulseDirection: { value: new THREE.Vector3(1, 1, 0) }
    },
    vertexShader: `
      #include <common>
      #include <uv_pars_vertex>
      #include <color_pars_vertex>
      #include <morphtarget_pars_vertex>
      #include <skinning_pars_vertex>
      #include <logdepthbuf_pars_vertex>

      varying vec3 vWorldNormal;
      varying vec3 vWorldPosition;

      void main() {
        #include <begin_vertex>
        #include <morphtarget_vertex>
        #include <skinbase_vertex>
        #include <skinning_vertex>

        vec3 transformedNormal = normalize(normalMatrix * normal);
        vWorldNormal = normalize((modelMatrix * vec4(transformedNormal, 0.0)).xyz);

        vec4 worldPosition = modelMatrix * vec4(transformed, 1.0);
        vWorldPosition = worldPosition.xyz;

        gl_Position = projectionMatrix * viewMatrix * worldPosition;

        #include <logdepthbuf_vertex>
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec2 resolution;
      uniform float uStarScrollSpeed;

      uniform vec3 uStarColor;
      uniform vec3 uBgColorA;
      uniform vec3 uBgColorB;
      uniform vec3 uEdgeColor;
      uniform float uEdgePower;
      uniform float uEdgeMin;
      uniform float uEdgeMax;
      uniform float uEdgePulseSpeed;
      uniform bool uEnableTravelingPulse;
      uniform vec3 uPulseDirection;

      varying vec3 vWorldNormal;
      varying vec3 vWorldPosition;

      #include <common>
      #include <logdepthbuf_pars_fragment>

      float noise(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }

      void main() {
        #include <logdepthbuf_fragment>

        vec2 screenUV = gl_FragCoord.xy / resolution;

        // --- Starfield
        vec2 starUV = screenUV * 60.0 + vec2(uTime * uStarScrollSpeed, uTime * uStarScrollSpeed * 1.2);
        float starMask = step(0.996, noise(starUV));
        vec3 starColor = uStarColor * starMask;

        // --- Background gradient
        vec3 bgColor = mix(uBgColorA, uBgColorB, screenUV.y);

        // --- Edge Rim Detection
        vec3 viewDir = normalize(cameraPosition - vWorldPosition);
        float fresnel = 1.0 - abs(dot(normalize(vWorldNormal), viewDir));
        float edgeMask = pow(smoothstep(uEdgeMin, uEdgeMax, fresnel), uEdgePower);

        // --- Edge Pulse: normal vs traveling
        float basePhase = uTime * uEdgePulseSpeed;
        vec3 dir = normalize(uPulseDirection);
        float directionalPhase = dot(vWorldPosition, dir) * uEdgePulseSpeed;
        float pulse = uEnableTravelingPulse
          ? 0.5 + 0.5 * sin(basePhase + directionalPhase)
          : 0.5 + 0.5 * sin(basePhase);
        edgeMask *= pulse;

        vec3 edgeColor = uEdgeColor * edgeMask;

        // --- Final Composite
        vec3 finalColor = bgColor + starColor + edgeColor;

        gl_FragColor = vec4(finalColor, 1.0);
      }
    `,
    skinning: true,
    morphTargets: true,
    vertexColors: false,
    transparent: false
  });
};

const createDebugMaterial = (baseMaterial) => {
  const hue = Math.random();
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color().setHSL(hue, 0.8, 0.5),
    wireframe: true,
    emissive: new THREE.Color().setHSL(hue, 0.8, 0.2),
    metalness: 0.8,
    roughness: 0.2,
    skinning: baseMaterial.skinning,
    morphTargets: baseMaterial.morphTargets,
    transparent: true,
    opacity: 0.85,
    side: THREE.DoubleSide
  });
};

const createPostProcessingShader = (props) => {
  const {
    width,
    height,
    shader,
    colorMult
  } = props;
  const glslColorMult = `vec3(${colorMult.r.toFixed(1)}, ${colorMult.g.toFixed(1)}, ${colorMult.b.toFixed(1)})`;

  const vertexShaderText = `
    void main() {
      gl_Position = vec4(position, 1.0);
    }
    `;

  const fragmentShaderText = `
    uniform sampler2D tDiffuse;
    uniform float uTime;

    void main() {
        // The resolution must be passed in this specific format.
        vec2 resolution = vec2(${width.toFixed(1)}, ${height.toFixed(1)});

        // Get the UV coordinates for the current pixel.
        vec2 uv = gl_FragCoord.xy / resolution.xy;

        // Sample the color from the input texture at this position.
        vec4 color = texture2D(tDiffuse, uv);

        // Output the color directly to the screen.
        gl_FragColor = color;
    }
    `;

  const fragmentShaderText_grayscale_01 = `
    uniform sampler2D tDiffuse;
    void main() {
      vec2 uv = gl_FragCoord.xy / vec2(${width.toFixed(1)}, ${height.toFixed(1)});
      vec4 color = texture2D(tDiffuse, uv);
      float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
      gl_FragColor = vec4(vec3(gray) * ${glslColorMult}, color.a);
    }
    `;

  const fragmentShaderText_vignette_02 = `
    uniform sampler2D tDiffuse;
      void main() {
        vec2 uv = gl_FragCoord.xy / vec2(${width.toFixed(1)}, ${height.toFixed(1)});
        vec4 color = texture2D(tDiffuse, uv);

        float dist = distance(uv, vec2(0.5));
        float vignette = smoothstep(0.75, 0.45, dist);

        color.rgb = mix(vec3(0.5), color.rgb, 1.2);
        color.rgb *= vignette;

        gl_FragColor = vec4(color.rgb * ${glslColorMult}, color.a);
      }
    `;

  const fragmentShaderText_scanlines_03 = `
    uniform sampler2D tDiffuse;
      void main() {
        vec2 resolution = vec2(${width.toFixed(1)}, ${height.toFixed(1)});
        vec2 uv = gl_FragCoord.xy / resolution;

        float chromaOffset = 1.0 / resolution.x;

        vec4 base = texture2D(tDiffuse, uv);
        float scanline = sin(uv.y * resolution.y * 1.5) * 0.04;

        vec4 color;
        color.r = texture2D(tDiffuse, uv + vec2(chromaOffset, 0.0)).r * ${glslColorMult}.r;
        color.g = base.g * ${glslColorMult}.g;
        color.b = texture2D(tDiffuse, uv - vec2(chromaOffset, 0.0)).b * ${glslColorMult}.b;
        color.a = base.a;

        color.rgb -= scanline;
        gl_FragColor = color;
      }
    `;

  const fragmentShaderText_edgeDetection_04 = `
    uniform sampler2D tDiffuse;
      void main() {
        vec2 resolution = vec2(${width.toFixed(1)}, ${height.toFixed(1)});
        vec2 texel = 1.0 / resolution;
        vec2 uv = gl_FragCoord.xy / resolution;

        float kernelX[9];
        float kernelY[9];

        kernelX[0] = -1.0; kernelX[1] = 0.0; kernelX[2] = 1.0;
        kernelX[3] = -2.0; kernelX[4] = 0.0; kernelX[5] = 2.0;
        kernelX[6] = -1.0; kernelX[7] = 0.0; kernelX[8] = 1.0;

        kernelY[0] = -1.0; kernelY[1] = -2.0; kernelY[2] = -1.0;
        kernelY[3] =  0.0; kernelY[4] =  0.0; kernelY[5] =  0.0;
        kernelY[6] =  1.0; kernelY[7] =  2.0; kernelY[8] =  1.0;

        float sumX = 0.0;
        float sumY = 0.0;
        int i = 0;
        for(int y = -1; y <= 1; y++) {
          for(int x = -1; x <= 1; x++) {
            vec2 offset = vec2(float(x), float(y)) * texel;
            float gray = dot(texture2D(tDiffuse, uv + offset).rgb, vec3(0.299, 0.587, 0.114));
            sumX += gray * kernelX[i];
            sumY += gray * kernelY[i];
            i++;
          }
        }

        float edge = sqrt(sumX * sumX + sumY * sumY);
        float alpha = texture2D(tDiffuse, uv).a;
        gl_FragColor = vec4(vec3(edge) * ${glslColorMult}, alpha);
      }
    `;

  const fragmentShaderText_glow_05 = `
    uniform sampler2D tDiffuse;
      void main() {
        vec2 resolution = vec2(${width.toFixed(1)}, ${height.toFixed(1)});
        vec2 uv = gl_FragCoord.xy / resolution;
        vec4 base = texture2D(tDiffuse, uv);

        // Glow kernel (9-sample blur)
        vec4 glow = vec4(0.0);
        float glowStrength = 1.5;
        float offset = 1.0 / resolution.x;

        for (int x = -1; x <= 1; x++) {
          for (int y = -1; y <= 1; y++) {
            vec2 delta = vec2(float(x), float(y)) * offset;
            glow += texture2D(tDiffuse, uv + delta);
          }
        }

        glow /= 9.0;
        glow.rgb *= glowStrength;
        glow.a = base.a;

        // Mix glow with base color while preserving alpha
        vec3 finalColor = base.rgb + glow.rgb * 0.5;
        gl_FragColor = vec4(finalColor * ${glslColorMult}, base.a);
      }
    `;

  const fragmentShaderText_ASCII_06 = `
    uniform sampler2D tDiffuse;

    float renderGlyph(vec2 uv, float glyphIndex) {
      // uv: local coords in cell (0..1)
      // glyphIndex: float index in range [0..15+]
      float x = uv.x;
      float y = uv.y;

      // Normalize index to 0-1 range
      float i = glyphIndex / 15.0;

      // Compose using sin/cos patterns for different density "glyphs"
      float intensity = 0.0;

      intensity += smoothstep(0.3, 0.7, sin(x * 20.0 + i * 6.2831));  // horizontal lines
      intensity += smoothstep(0.3, 0.7, sin(y * 20.0 + i * 6.2831));  // vertical lines
      intensity += smoothstep(0.2, 0.6, sin((x + y) * 20.0 + i * 12.566)); // diagonal

      intensity = clamp(intensity, 0.0, 1.0);
      return intensity;
    }

    void main() {
      vec2 resolution = vec2(${width.toFixed(1)}, ${height.toFixed(1)});
      vec2 cellSize = vec2(8.0, 12.0); // size of one ASCII character

      // Block/cell UV
      vec2 cellCoord = floor(gl_FragCoord.xy / cellSize);
      vec2 cellOrigin = cellCoord * cellSize;

      // Average brightness in block
      float sum = 0.0;
      for (float y = 0.0; y < cellSize.y; y++) {
        for (float x = 0.0; x < cellSize.x; x++) {
          vec2 sampleUV = (cellOrigin + vec2(x, y)) / resolution;
          vec3 color = texture2D(tDiffuse, sampleUV).rgb;
          sum += dot(color, vec3(0.299, 0.587, 0.114)); // luminance
        }
      }

      float avg = sum / (cellSize.x * cellSize.y);

      // Map brightness to glyph index (0 to 15)
      float glyphIndex = floor(avg * 15.99);

      // Local UV within cell
      vec2 uv = fract(gl_FragCoord.xy / cellSize);

      // Procedural glyph draw
      float glyph = renderGlyph(uv, glyphIndex);

      // Output grayscale with original alpha
      float brightness = clamp(glyph, 0.0, 1.0);
      vec4 orig = texture2D(tDiffuse, gl_FragCoord.xy / resolution);
      gl_FragColor = vec4(vec3(brightness) * ${glslColorMult}, orig.a);
    }
    `;

  const fragmentShaderText_buzzed_07 = `
    uniform sampler2D tDiffuse;
    uniform float uTime;

    void main() {
    vec2 resolution = vec2(${width.toFixed(1)}, ${height.toFixed(1)});
    vec2 uv = gl_FragCoord.xy / resolution;

        // Sample the framebuffer texture
        vec4 color = texture2D(tDiffuse, uv);

        // Add a subtle wave distortion effect
        float wave = sin(uv.x * 10.0 + uTime * 2.0) * 0.01;
        vec2 distortedUV = uv + vec2(wave, wave * 0.5);
        vec4 distortedColor = texture2D(tDiffuse, distortedUV);

        // Mix original and distorted colors
        color = mix(color, distortedColor, 0.3);

        // Add a time-based color shift
        float colorShift = sin(uTime * 1.5) * 0.1 + 0.9;
        color.rgb *= colorShift;

        // Add subtle vignette effect
        float vignette = 1.0 - length(uv - 0.5) * 0.8;
        color.rgb *= vignette;

        gl_FragColor = color;
    }
    `;

  const fragmentShaderText_fireworks_08 = `
    uniform sampler2D tDiffuse;
    uniform float uTime;

    // Simple random function
    float random(vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
    }

    void main() {
    vec2 resolution = vec2(${width.toFixed(1)}, ${height.toFixed(1)});
        vec2 uv = gl_FragCoord.xy / resolution;

        // Sample the original framebuffer
        vec4 original = texture2D(tDiffuse, uv);

        // Fireworks parameters
        float numFireworks = 8.0;
        float particlesPerFirework = 30.0;
        float rocketSpeed = 0.4;
        float particleSpeed = 0.6;
        float sparkleIntensity = 1.5;
        float gravity = 0.8;
        float explosionSize = 0.12;
        float particleSize = 0.004;
        float fadeRate = 2.0;
        float cycleDuration = 6.0;  // Total time for complete fireworks show
        float maxParticleLife = 2.5;  // How long particles stay visible after explosion

        vec3 fireworksColor = vec3(0.0);

        // Only start new cycle when current one is completely finished
        float showCycle = floor(uTime / cycleDuration);
        float cycleTime = mod(uTime, cycleDuration);

        for(float i = 0.0; i < numFireworks; i++) {
            // Unique seed for each firework, changes with each show cycle
            float fireworkSeed = i * 47.123 + showCycle * 13.456;

            // Stagger firework launches within the cycle
            float launchDelay = random(vec2(fireworkSeed)) * 2.0;  // Launch over first 2 seconds
            float fireworkTime = cycleTime - launchDelay;

            // Skip if this firework hasn't launched yet
            if(fireworkTime < 0.0) continue;

            // Launch position
            vec2 launchPos = vec2(0.15 + random(vec2(fireworkSeed + 1.0)) * 0.7, 0.0);

            // Target explosion height
            float targetHeight = 0.6 + random(vec2(fireworkSeed + 2.0)) * 0.3;
            float timeToExplode = targetHeight / rocketSpeed;

            // Firework colors
            vec3 fireworkColor = vec3(
                0.3 + 0.7 * random(vec2(fireworkSeed + 3.0)),
                0.3 + 0.7 * random(vec2(fireworkSeed + 4.0)),
                0.3 + 0.7 * random(vec2(fireworkSeed + 5.0))
            );

            if(fireworkTime < timeToExplode) {
                // ROCKET PHASE: Rising with trail
                vec2 rocketPos = launchPos + vec2(0.0, fireworkTime * rocketSpeed);

                // Main rocket
                float rocketDist = length(uv - rocketPos);
                float rocketIntensity = exp(-rocketDist * 400.0);
                fireworksColor += vec3(1.0, 0.8, 0.2) * rocketIntensity * 2.0;

                // Rocket trail
                for(float t = 1.0; t <= 6.0; t++) {
                    vec2 trailPos = rocketPos - vec2(0.0, t * 0.02);
                    float trailDist = length(uv - trailPos);
                    float trailFade = 1.0 - (t / 6.0);
                    float trailIntensity = exp(-trailDist * 300.0) * trailFade;
                    fireworksColor += vec3(0.8, 0.4, 0.1) * trailIntensity * 0.8;
                }
            }
            else {
                // EXPLOSION PHASE: Particles bursting outward
                float explosionTime = fireworkTime - timeToExplode;
                vec2 explosionCenter = launchPos + vec2(0.0, targetHeight);

                // Don't render if particles have faded completely
                if(explosionTime > maxParticleLife) continue;

                for(float j = 0.0; j < particlesPerFirework; j++) {
                    float particleSeed = fireworkSeed + j * 23.789;

                    // Particle launch angle and speed variation
                    float angle = random(vec2(particleSeed)) * 6.28318;
                    float speedMultiplier = 0.5 + random(vec2(particleSeed + 1.0)) * 0.8;

                    // Initial velocity
                    vec2 initialVel = vec2(cos(angle), sin(angle)) * particleSpeed * speedMultiplier;

                    // Physics: position with gravity
                    vec2 particlePos = explosionCenter +
                                     initialVel * explosionTime * explosionSize -
                                     vec2(0.0, 0.5 * gravity * explosionTime * explosionTime * 0.1);

                    float particleDist = length(uv - particlePos);

                    // Particle fading over time
                    float timeFade = exp(-explosionTime * fadeRate);
                    float distanceFade = exp(-particleDist / particleSize);
                    float intensity = timeFade * distanceFade;

                    // Color variation per particle
                    vec3 particleColor = fireworkColor * (0.8 + 0.4 * random(vec2(particleSeed + 2.0)));

                    // Add sparkle
                    float sparkle = 1.0 + sparkleIntensity * 0.5 * sin(uTime * 12.0 + particleSeed * 8.0);

                    fireworksColor += particleColor * intensity * sparkle;

                    // Bright core
                    float coreIntensity = exp(-particleDist / (particleSize * 0.3)) * timeFade;
                    fireworksColor += vec3(1.0, 1.0, 0.9) * coreIntensity * 0.6;
                }

                // Initial explosion flash
                if(explosionTime < 0.1) {
                    float flashDist = length(uv - explosionCenter);
                    float flashIntensity = exp(-flashDist / (explosionSize * 0.5)) * (1.0 - explosionTime * 10.0);
                    fireworksColor += vec3(1.0, 1.0, 1.0) * flashIntensity * 3.0;
                }
            }
        }

        // Blend fireworks with original content
        // Objects (non-white, non-black, non-transparent pixels) are always in front
        vec3 finalColor = original.rgb;
        float finalAlpha = original.a;

        // Check if pixel is background (white, black, or transparent)
        bool isBackground = (original.a < 0.1) || // transparent
                           (length(original.rgb - vec3(0.0)) < 0.1) || // black
                           (length(original.rgb - vec3(1.0)) < 0.1);   // white

        if(isBackground) {
            // Show fireworks behind background areas
            finalColor += fireworksColor;

            // Calculate fireworks alpha for background areas
            float fireworksAlpha = min(1.0, length(fireworksColor) * 2.0);
            finalAlpha = max(original.a, fireworksAlpha);
        }
        // Objects (colored pixels) stay in front, fireworks are hidden behind them

        gl_FragColor = vec4(finalColor, finalAlpha);
    }
    `;

  const fragmentShaderText_pixelated_09 = `
    uniform sampler2D tDiffuse;
    uniform float uTime;

    void main() {
        // The resolution must be passed in this specific format.
        vec2 resolution = vec2(${width.toFixed(1)}, ${height.toFixed(1)});

        // =========================================================
        // === Variables to control the pixelation effect. Change these values.
        // =========================================================

        // The base size of the pixels. A higher value means fewer, larger pixels.
        const float pixelSize = 5.0;

        // A ratio to stretch pixels non-uniformly (anamorphic).
        // 1.0 = square pixels, > 1.0 = taller pixels, < 1.0 = wider pixels.
        const float anamorphicAspect = 1.0;

        // A subtle, time-based jitter that adds a slight random offset to the grid.
        // 0.0 = perfectly rigid grid, > 0.0 = shaky grid.
        const float jitterAmount = 0.0;

        // A threshold to control a simple black & white dithering effect.
        // 0.0 = disabled, > 0.0 = active.
        const float ditherThreshold = 0.0;

        // =========================================================

        // Get the current UV coordinates.
        vec2 uv = gl_FragCoord.xy / resolution.xy;

        // --- Apply Anamorphic Aspect ---
        vec2 pixelatedUV = gl_FragCoord.xy;
        pixelatedUV.y *= anamorphicAspect;

        // --- Apply Jitter ---
        // A simple noise function to offset the grid slightly over time.
        float jitter = fract(sin(dot(pixelatedUV, vec2(12.9898, 78.233)) + uTime) * 43758.5453);
        pixelatedUV += jitter * jitterAmount;

        // --- Pixelate the UV coordinates ---
        // The core pixelation logic: quantize the coordinates to snap them to a grid.
        pixelatedUV = floor(pixelatedUV / pixelSize) * pixelSize;

        // Revert the anamorphic aspect for correct sampling.
        pixelatedUV.y /= anamorphicAspect;

        // Sample the color at the center of the pixel.
        vec4 finalColor = texture2D(tDiffuse, pixelatedUV / resolution.xy);

        // --- Optional Dithering Effect ---
        if (ditherThreshold > 0.0) {
            float luminance = dot(finalColor.rgb, vec3(0.299, 0.587, 0.114));
            float dither = fract(sin(dot(gl_FragCoord.xy, vec2(52.9898, 98.233))) * 43758.5453);

            if (dither > luminance * ditherThreshold) {
                finalColor.rgb = vec3(0.0); // Or any other color you want for the dithered pixels
            } else {
                finalColor.rgb = vec3(1.0);
            }
        }

        // Preserve the original alpha.
        gl_FragColor = vec4(finalColor.rgb, finalColor.a);
    }
    `;

  const fragmentShaderText_whoami_10 = `
    uniform sampler2D tDiffuse;
    uniform float uTime;

    void main() {
        // The resolution must be passed in this specific format.
        vec2 resolution = vec2(${width.toFixed(1)}, ${height.toFixed(1)});

        // =========================================================
        // === Variables to control the effect. Change these values.
        // =========================================================

        // Controls the density of the glowing grid lines.
        const float gridSize = 30.0;

        // The glow strength of the grid lines.
        const float gridGlow = 0.005;

        // The speed of the flickering scanlines.
        const float flickerSpeed = 5.0;

        // Controls the intensity of the color shift.
        const float colorShiftIntensity = 0.05;

        // =========================================================

        vec2 uv = gl_FragCoord.xy / resolution.xy;
        vec4 originalColor = texture2D(tDiffuse, uv);

        // --- Create a pulsating, glowing grid ---
        vec2 grid = abs(sin(gl_FragCoord.xy / gridSize));
        float gridMask = step(gridGlow, grid.x) * step(gridGlow, grid.y);

        // The grid color is a combination of the original color and a glowing accent.
        vec3 gridColor = mix(vec3(0.0), originalColor.rgb, gridMask);

        // --- Create flickering scanlines ---
        float scanline = sin(gl_FragCoord.y * 1.5 - uTime * flickerSpeed) * 0.1 + 0.1;

        // Apply the scanline flicker to the final color.
        vec3 finalColorRGB = gridColor * scanline;

        // --- Add a subtle holographic color shift and distortion ---
        vec2 shiftedUV = uv;
        shiftedUV.x += sin(uv.y * 10.0 + uTime) * colorShiftIntensity;
        shiftedUV.y += cos(uv.x * 12.0 - uTime) * colorShiftIntensity;

        vec3 shiftedColor = texture2D(tDiffuse, shiftedUV).rgb;

        // Combine everything with the original color.
        finalColorRGB = mix(finalColorRGB, shiftedColor, 0.5);

        // Add a slight greenish tint to make it look more like a hologram.
        finalColorRGB.gb *= 1.2;

        // Maintain the original alpha channel.
        gl_FragColor = vec4(finalColorRGB, originalColor.a);
    }
    `;

  const fragmentShaderText_wavvy_11 = `
    uniform sampler2D tDiffuse;
    uniform float uTime;

    void main() {
        // The resolution must be passed in this specific format.
        vec2 resolution = vec2(${width.toFixed(1)}, ${height.toFixed(1)});

        // Get the UV coordinates for the current pixel.
        vec2 uv = gl_FragCoord.xy / resolution.xy;

        // Center UV around (0,0)
        vec2 centerUV = uv - 0.5;

        // Swirl effect based on radius and time
        float radius = length(centerUV);
        float angle = atan(centerUV.y, centerUV.x) + 0.8 * sin(5.0 * radius - uTime * 2.0);
        vec2 swirlUV = vec2(cos(angle), sin(angle)) * radius;

        // Time-based pixelation warp
        float pixelSize = 0.005 + 0.004 * sin(uTime * 5.0);
        swirlUV = floor(swirlUV / pixelSize) * pixelSize;

        // RGB split warp
        vec2 offset = 0.01 * vec2(sin(uTime * 3.0), cos(uTime * 2.0));

        // Restore UV to [0,1]
        vec2 finalUV = swirlUV + 0.5;

        // Read base color (for alpha channel)
        vec4 baseColor = texture2D(tDiffuse, finalUV);

        // Sample with RGB offset
        vec4 color;
        color.r = texture2D(tDiffuse, finalUV + offset).r;
        color.g = texture2D(tDiffuse, finalUV - offset).g;
        color.b = baseColor.b;
        color.a = baseColor.a; // Preserve original transparency

        // Output the color directly to the screen.
        gl_FragColor = clamp(color, 0.0, 1.0);
    }
    `;

  const fragmentShaderText_fluid_12 = `
    uniform sampler2D tDiffuse;
    uniform float uTime;

    void main() {
        vec2 resolution = vec2(${width.toFixed(1)}, ${height.toFixed(1)});
        vec2 uv = gl_FragCoord.xy / resolution.xy;

        // Cell-based UV displacement grid
        float gridSize = 30.0;
        vec2 cell = floor(uv * gridSize);
        vec2 localUV = fract(uv * gridSize);

        // Jitter per-cell (pseudo-random hash)
        float cellHash = fract(sin(dot(cell, vec2(127.1, 311.7))) * 43758.5453);
        float angle = cellHash * 6.2831 + uTime * 1.5;
        vec2 dir = vec2(cos(angle), sin(angle));

        // Local warping within cell
        vec2 warp = dir * (0.03 * sin(uTime * 5.0 + length(localUV - 0.5) * 10.0));

        // Slit-scan slice effect (time stutters by Y)
        float sliceOffset = 0.01 * sin(uTime * 10.0 + uv.y * 100.0);

        // Final UV
        vec2 distortedUV = uv + warp;
        distortedUV.x += sliceOffset;

        // Transparency-safe sample
        vec4 src = texture2D(tDiffuse, distortedUV);

        gl_FragColor = src;
    }

    `;

  const fragmentShaderText_bouncy_13 = `
    uniform sampler2D tDiffuse;
    uniform float uTime;

    void main() {
        vec2 resolution = vec2(${width.toFixed(1)}, ${height.toFixed(1)});
        vec2 uv = gl_FragCoord.xy / resolution.xy;

        // Center UV around 0
        vec2 centered = uv - 0.5;

        // Radial wobble distortion
        float dist = length(centered);
        float ripple = sin(20.0 * dist - uTime * 6.0) * 0.01;
        vec2 rippleUV = uv + normalize(centered) * ripple;

        // Time-space vortex flow
        vec2 swirl = rippleUV;
        float flow = sin(uTime + rippleUV.x * 20.0) * 0.005;
        swirl.x += flow;
        swirl.y += 0.005 * sin(2.0 * uTime + rippleUV.y * 40.0);

        // RGB curl separation using sine/atan hacks
        float angleShift = 0.02 * sin(uTime * 4.0);
        vec2 curlR = swirl + angleShift * vec2(-centered.y, centered.x);
        vec2 curlG = swirl;
        vec2 curlB = swirl - angleShift * vec2(centered.y, -centered.x);

        // Grab alpha once
        float alpha = texture2D(tDiffuse, swirl).a;

        // Sample R/G/B from offset UVs
        vec4 color;
        color.r = texture2D(tDiffuse, curlR).r;
        color.g = texture2D(tDiffuse, curlG).g;
        color.b = texture2D(tDiffuse, curlB).b;
        color.a = alpha;

        // Reflective pulse: boost at center
        float pulse = 1.0 + 0.3 * cos(uTime * 6.0) * exp(-8.0 * dist);
        color.rgb *= pulse;

        gl_FragColor = clamp(color, 0.0, 1.0);
    }
    `;

  const fragmentShaderText_ethereal_14 = `
    uniform sampler2D tDiffuse;
    uniform float uTime;

    void main() {
        vec2 resolution = vec2(${width.toFixed(1)}, ${height.toFixed(1)});
        vec2 uv = gl_FragCoord.xy / resolution.xy;

        // Looping progress (0 → 1 over 10 seconds)
        float rawProgress = mod(uTime * 0.1, 1.0);
        float progress = clamp((rawProgress - 0.2) / 0.6, 0.0, 1.0);

        // Vertical disintegration factor
        float verticalFactor = smoothstep(0.0, 1.0, 1.0 - uv.y);
        float localProgress = clamp(progress - verticalFactor + 0.5, 0.0, 1.0);

        // Pixelation size per block
        float maxPixelSize = 20.0;
        float pixelSize = mix(1.0, maxPixelSize, localProgress);

        // Upward drift based on progress
        float riseAmount = mix(0.0, 0.2, localProgress);
        vec2 offsetUV = uv;
        offsetUV.y -= riseAmount * localProgress;

        // ✨ Progressive jitter: starts at 0, grows with localProgress
        float rowSeed = floor(uv.y * resolution.y / pixelSize);
        float jitterStrength = 0.05 * localProgress;
        float xJitter = jitterStrength * sin(rowSeed * 13.37 + uTime * 2.0);
        offsetUV.x += xJitter;

        // Snap to pixel grid
        vec2 pixelUV = floor(offsetUV * resolution / pixelSize) * pixelSize;
        pixelUV /= resolution;

        // Sample pixelated color
        vec4 color = texture2D(tDiffuse, pixelUV);

        // Earlier and steeper fadeout
        float fadeOut = smoothstep(0.3, 0.7, localProgress);
        color.a *= pow(1.0 - fadeOut, 4.0);

        gl_FragColor = color;
    }
    `;

  const fragmentShaderText_dropletimpact_15 = `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    bool coloredRipples = false;
    bool enableCaustics = true;

    // === Hash function ===
    float hash(float x) {
        return fract(sin(x * 127.1 + 311.7) * 43758.5453123);
    }

    // === Random color from drop index ===
    vec3 getDropColor(float dropIndex, float time) {
        float base = hash(dropIndex * 13.37);
        float hueShift = mod(base + time * 0.1, 1.0);

        float r = abs(hueShift * 6.0 - 3.0) - 1.0;
        float g = 2.0 - abs(hueShift * 6.0 - 2.0);
        float b = 2.0 - abs(hueShift * 6.0 - 4.0);

        return clamp(vec3(r, g, b), 0.0, 1.0) * mix(0.6, 1.3, hash(dropIndex + 9.9));
    }

    void main() {
        vec2 resolution = vec2(${width.toFixed(1)}, ${height.toFixed(1)});
        vec2 uv = gl_FragCoord.xy / resolution.xy;

        // === Config ===
        float dropDuration = 4.0;
        float rippleTightness = 40.0;
        float rippleSpeed = 0.5;
        float rippleStrength = 0.05;
        float rippleSpacing = 0.1;
        float visibleRadius = 1.0;
        int rippleCount = 1;

        // Drop timing
        float dropIndex = floor(uTime / dropDuration);
        float dropTime = mod(uTime, dropDuration);
        float dropProgress = dropTime / dropDuration;

        // Drop center
        vec2 dropCenter = vec2(
            mix(0.2, 0.8, hash(dropIndex + 10.1)),
            mix(0.2, 0.8, hash(dropIndex + 23.7))
        );

        vec2 diff = uv - dropCenter;
        float dist = length(diff);

        // Color selection
        vec3 rippleColor;
        if (coloredRipples) {
            rippleColor = getDropColor(dropIndex, uTime);
        } else {
            rippleColor = vec3(1.0);
        }

        vec2 rippleOffset = vec2(0.0);
        vec3 rippleGlow = vec3(0.0);
        float rippleAlpha = 0.0;

        // Loop through ripple rings
        for (int i = 0; i < 10; i++) {
            if (i >= rippleCount) break;

            float spacingJitter = rippleSpacing * 0.4 * (hash(dropIndex * 10.0 + float(i)) - 0.5);
            float thisSpacing = rippleSpacing + spacingJitter;
            float t = dropProgress - float(i) * thisSpacing;

            if (t < 0.0) continue;

            float front = t * visibleRadius;
            float fadeOut = 1.0 - t;

            float wave = sin(dist * rippleTightness - t * rippleTightness);
            float ring = smoothstep(0.02, 0.0, abs(dist - front));
            float envelope = exp(-dist * 4.0) * fadeOut;

            rippleOffset += normalize(diff) * wave * envelope * rippleStrength;

            float ringAlpha = ring * envelope * 0.4;
            rippleGlow += rippleColor * ring * envelope;
            rippleAlpha = max(rippleAlpha, ringAlpha);

            // Optional caustics (highlight peaks)
            if (enableCaustics) {
                float sharpness = abs(dFdx(wave)) + abs(dFdy(wave));
                float causticRing = smoothstep(0.02, 0.001, sharpness);
                rippleGlow += rippleColor * causticRing * envelope * 1.5;
                // Narrower and softer caustics
                // float causticRing = smoothstep(0.015, 0.0005, sharpness);
                // rippleGlow += rippleColor * causticRing * envelope * 0.7;
            }
        }

        vec4 base = texture2D(tDiffuse, uv + rippleOffset);
        base.rgb += rippleGlow;

        gl_FragColor = vec4(base.rgb, max(base.a, rippleAlpha));
    }

    `;

  const fragShaders = [
    fragmentShaderText,
    fragmentShaderText_grayscale_01,
    fragmentShaderText_vignette_02,
    fragmentShaderText_scanlines_03,
    fragmentShaderText_edgeDetection_04,
    fragmentShaderText_glow_05,
    fragmentShaderText_ASCII_06,
    fragmentShaderText_buzzed_07,
    fragmentShaderText_fireworks_08,
    fragmentShaderText_pixelated_09,
    fragmentShaderText_whoami_10,
    fragmentShaderText_wavvy_11,
    fragmentShaderText_fluid_12,
    fragmentShaderText_bouncy_13,
    fragmentShaderText_ethereal_14,
    fragmentShaderText_dropletimpact_15
  ];

  const postMaterial = new THREE.ShaderMaterial({
    uniforms: {
      tDiffuse: { value: null },
      uTime: { value: 0.0 }
    },
    vertexShader: vertexShaderText,
    fragmentShader: fragShaders[shader]
  });
  return postMaterial;
}

const createLivingBrainViz = (scene, initialGraph, props) => {
  const MAX_NODES = 2048;
  const MAX_LINKS = 4096;

  const group = new THREE.Group();
  group.position.y = 2.5;
  scene.add(group);

  const nodeBuf = new Float32Array(MAX_NODES * 4);
  const linkBuf = new Float32Array(MAX_LINKS * 7);
  const nodeTex = new THREE.DataTexture(nodeBuf, MAX_NODES, 1, THREE.RGBAFormat, THREE.FloatType);
  const linkTex = new THREE.DataTexture(linkBuf, MAX_LINKS, 1, THREE.RGBAFormat, THREE.FloatType);

  const uniforms = {
    nodeTex: { value: nodeTex },
    linkTex: { value: linkTex },
    nodeCnt: { value: 0 },
    linkCnt: { value: 0 },
    proj:    { value: new THREE.Matrix4() },
    view:    { value: new THREE.Matrix4() },
    uDisplacementRange: { value: 1 }, // NEW: Uniform for max vertex displacement range
    colorNodePos: { value: new THREE.Color(0xcc00cc) }, // Vibrant Medium Magenta
    colorNodeNeg: { value: new THREE.Color(0x77aa00) }, // Deep Acidic Green
    colorLinkPos: { value: new THREE.Color(0xd94f00) }, // Saturated Orange-Red
    colorLinkNeg: { value: new THREE.Color(0x7700ee) }, // Strong Electric Purple
    colorFresnel: { value: new THREE.Color(0x0099cc) }, // Vibrant Tech Blue
    colorGrid:    { value: new THREE.Color(0xe8e8e8) }, // Neutral Very Light Grey
    colorVoronoiEdge: { value: new THREE.Color(0xcccccc) } // Medium Light Grey
  };

  const sphereGeo = new THREE.SphereGeometry(1, 128, 64); // SphereGeometry includes 'normal' attribute
  const sphereMat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: `
    uniform sampler2D nodeTex;
    uniform float nodeCnt;
    // uniform float uTime; // REMOVED: No uTime uniform
    uniform float uDisplacementRange;
    varying float vBias;
    // attribute vec3 normal; // This line is REMOVED to avoid 'redefinition' error

    const float MAX_N = 2048.0;

    float spDist(vec3 a, vec3 b) {
    return acos(clamp(dot(a, b), -1.0, 1.0));
    }

    void main() {
    vec3 displaced = position;
    float closestBias = 0.0;
    float minDist = 9999.0;

    for (float i = 0.0; i < MAX_N; i++) {
    if (i >= nodeCnt) break;
    vec4 n = texelFetch(nodeTex, ivec2(int(i), 0), 0);
    float d = spDist(normalize(position), normalize(n.xyz));
    if (d < minDist) {
    minDist = d;
    closestBias = n.w;
    }
    }

    vBias = closestBias;

    float biasStrength = clamp(vBias * 0.5 + 0.5, 0.0, 1.0);

    float dramaticBiasInfluence = pow(biasStrength, 0.5);

    float displacementAmount = dramaticBiasInfluence * uDisplacementRange;

    displaced += normal * displacementAmount; // 'normal' is implicitly available
    gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
    }`,

    fragmentShader: `
      precision highp float;
      uniform sampler2D linkTex;
      uniform float linkCnt;
      uniform vec3 colorNodePos;
      uniform vec3 colorNodeNeg;
      varying float vBias;

      const float MAX_L = 4096.0;

      vec3 getBiasColor(float b) {
        return mix(colorNodeNeg, colorNodePos, clamp(b * 0.5 + 0.5, 0.0, 1.0));
      }

      void main() {
        vec3 col = getBiasColor(vBias);
        gl_FragColor = vec4(col, 1.0);
      }`,
    side: THREE.DoubleSide,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  const sphereMesh = new THREE.Mesh(sphereGeo, sphereMat);
  sphereMesh.scale.set(0.25, 0.25, 0.25);
  group.add(sphereMesh);

  const nodeMap = new Map();
  function spherePos(i, total, layer, maxLayer) {
    const y = 1.0 - 2.0 * (i / total);
    const radius = Math.sqrt(1.0 - y * y);
    const theta = Math.PI * (3.0 - Math.sqrt(5.0)) * i + layer * 0.2;
    return new THREE.Vector3(radius * Math.cos(theta), y, radius * Math.sin(theta));
  }

  function updateGraph(graph) {
    const nodes = graph.nodes || [], links = graph.links || [];
    const nCount = Math.min(nodes.length, MAX_NODES), lCount = Math.min(links.length, MAX_LINKS);
    const id2idx = new Map(nodes.map((n, i) => [n.id, i]));
    for (let i = 0; i < nCount; i++) {
      const pos = spherePos(i, nCount, nodes[i].layer, 6);
      nodeBuf.set([pos.x, pos.y, pos.z, nodes[i].bias || 0], i * 4);
      nodeMap.set(nodes[i].id, pos);
    }
    nodeTex.needsUpdate = true;
    let lIdx = 0;
    for (const l of links) {
      if (lIdx >= MAX_LINKS) break;
      const i0 = id2idx.get(typeof l.source === 'object' ? l.source.id : l.source);
      const i1 = id2idx.get(typeof l.target === 'object' ? l.target.id : l.target);
      if (i0 === undefined || i1 === undefined) continue;
      nodeMap.get(nodes[i0].id).toArray(linkBuf, lIdx * 7);
      nodeMap.get(nodes[i1].id).toArray(linkBuf, lIdx * 7 + 3);
      linkBuf[lIdx * 7 + 6] = l.weight || 0;
      lIdx++;
    }
    linkTex.needsUpdate = true;
    sphereMat.uniforms.nodeCnt.value = nCount;
    sphereMat.uniforms.linkCnt.value = lIdx;
  }

  function animate(cam, t) {
    sphereMat.uniforms.proj.value.copy(cam.projectionMatrix);
    sphereMat.uniforms.view.value.copy(cam.matrixWorldInverse);
    // sphereMat.uniforms.uTime.value = t; // IMPORTANT: Update the time uniform each frame for animation

    group.rotation.y += 0.005;
  }

  updateGraph(initialGraph || { nodes: [], links: [] });

  return {
    updateGraph,
    animate,
    setScale: s => sphereMesh.scale.setScalar(s),
    toggleAll: v => { sphereMesh.visible = v; }
  };
};

window.createShaderMaterial = createShaderMaterial;
window.createDebugMaterial = createDebugMaterial;
window.createPostProcessingShader = createPostProcessingShader;
window.createLivingBrainViz = createLivingBrainViz;

const DUMMY_DATA = {
  haiku: `
  The silent hum of the street, a fading breath,
  The city lights bloom, a slow, electric death.
  The final bus sighs, its heavy doors close,
  And a quiet descends, where a new feeling grows.
  The pavement is damp, a mirror to the sky,
  Reflecting the stars that are learning to fly.
  They pierce through the smog with a silver-white gleam,
  A distant, cold promise, a waking-from-dream.

  A single leaf falls, its journey complete,
  From the high, swaying branch to the tired concrete.
  It tumbles and turns, a delicate, small dance,
  A final, soft moment, a fleeting last chance
  To spin on the wind, to see what it can be,
  Before it lies still, a memory for me.
  And I watch it land there, beside a cracked stone,
  A simple, small story, but not one alone.

  For the city is filled with stories untold,
  Of futures too bright and of histories old.
  The windows are dark, but within them I know,
  Are lives being lived, in a vibrant, slow flow.
  There's the late-night baker, who kneads silent dough,
  While a young, tired writer's ideas won't grow.
  There's the sleeping old man, who dreams of the sea,
  And a new mother's child, who smiles endlessly.

  Each building's a spine, each brick is a word,
  And the city's a book, with its pages stirred
  By the breeze that whispers of what used to be,
  Of old cobblestone roads, where now cars roam free.
  The river below breathes a thick, muddy song,
  Carrying secrets and mysteries along.
  It laps at the docks, where the old boats are tied,
  Holding the stories they've gathered inside.

  A train rumbles past, a metallic, dark snake,
  Its rhythmic loud clatter making the ground shake.
  It carries its cargo to places unknown,
  To fields full of wild flowers, on its own.
  It's a promise of motion, of somewhere to go,
  A restless loud spirit, a powerful show.
  Then it's gone in a flash, and the silence returns,
  To the street and the pavement, and the lessons it learns.

  I walk without purpose, just to be here,
  To feel the cool night air, and lose every fear.
  The stars seem to burn with a beautiful heat,
  A silent, slow power, a cosmic retreat.
  They've watched all of this happen, a million times more,
  The rise and the fall of the things we adore.
  They see the grand cycle, the turning of years,
  The hopes and the heartbreaks, the laughter and tears.

  And I stand in the middle of all of this space,
  Just one quiet person, in one silent place.
  But I feel the great rhythm, the thrum and the beat,
  Of the world as it spins, bitter and sweet.
  And the quiet is not just the absence of sound,
  It's a presence, a feeling that's all around.
  It's the whisper of what came before and will be,
  A silent communion between them and me.

  And the stars and the city, the leaf and the stone,
  They are never apart, they are never alone.
  They are all part of one single, slow-breathing thing,
  A song of the ages, a silent tune they sing.
  So let the night fall, and let the stars burn,
  The world keeps on spinning, and the lessons we learn
  Are woven together, in shadow and light,
  On a silent, deep canvas, that's known as the night.
  `
};

window.DUMMY_DATA = DUMMY_DATA;


// ====== world.js ======
const world = async (props) => {
  const { brainInstance, canvas, modelURL } = props;

  // Initialize renderer
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    premultipliedAlpha: false
  });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(canvas.width, canvas.height);
  renderer.autoClear = false;

  // Scene setup
  const scene = new THREE.Scene();
  scene.background = null;

  // Camera setup
  const camera = new THREE.PerspectiveCamera(
    75,
    canvas.width / canvas.height,
    0.1,
    1000
  );
  camera.position.y = 1.5;
  camera.position.z = 2.5;

  // Lighting
  const light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.set(1, 1, 1);
  scene.add(light);
  scene.add(new THREE.AmbientLight(0x404040));

  // Framebuffer / Render Target
  const renderTarget = new THREE.WebGLRenderTarget(canvas.width, canvas.height, {
    format: THREE.RGBAFormat,
    type: THREE.UnsignedByteType,
    depthBuffer: true,
    stencilBuffer: false
  });

  // Postprocessing scene
  const postScene = new THREE.Scene();
  const postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);


  let postMaterial = createPostProcessingShader({
    width: canvas.width,
    height: canvas.height,
    shader: 3, // 16 total
    colorMult: new THREE.Color(1.0, 1.0, 1.0)
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), postMaterial);

  const updateMaterial = (filterStyle) => {
    console.log("Filter Style", filterStyle)
    postMaterial = createPostProcessingShader({
      width: canvas.width,
      height: canvas.height,
      shader: filterStyle,
      colorMult: new THREE.Color(1.0, 1.0, 1.0)
    });
    quad.material = postMaterial;
    postMaterial.needsUpdate = true;
  };

  postScene.add(quad);

  let anim, animationController, networkViz, networkVizToggleState = false;
  try {
    const brainData = brainInstance.generateGraphData();
    networkViz = createLivingBrainViz(scene, brainData, {
      width: canvas.width,
      height: canvas.height,
    });
    networkViz.toggleAll(networkVizToggleState);

    const entity = await prepEntity(scene, {
      modelURL,
      enableIK: true,
      width: canvas.width,
      height: canvas.height,
      initialAnimation: 'idle',
      debug: false
    });

    const { model, raycastPlane } = entity;
    animationController = entity.animationController;
    animationController.setFPS(60);
    animationController.play('happyandidle');

    // animationController.createIKAnimation('pointAndMove', {
    //   duration: 3.0,
    //   loop: true,
    //   chains: {
    //     'mixamorigLeftHand': {
    //       x: (t) => Math.sin(t * Math.PI * 2),
    //       y: (t) => 1.5 + 0.3 * Math.sin(t * Math.PI * 4),
    //       z: 1.0
    //     }
    //   },
    //   motion: {
    //     position: {
    //       x: (t) => Math.sin(t * Math.PI * 2) * 2,
    //       y: (t) => 0.2 * Math.sin(t * Math.PI * 8),
    //       z: (t) => Math.cos(t * Math.PI * 2) * 2
    //     },
    //     rotation: {
    //       y: (t) => t * Math.PI * 2
    //     },
    //     scale: {
    //       x: (t) => 1 + 0.1 * Math.sin(t * Math.PI * 4),
    //       y: (t) => 1 + 0.1 * Math.sin(t * Math.PI * 4),
    //       z: (t) => 1 + 0.1 * Math.sin(t * Math.PI * 4)
    //     }
    //   }
    // });

    // window.addEventListener('keyup', (e) => {
    //   if (e.key === 'w') {
    //     animationController.play('pointAt');
    //     // updateMaterial();
    //   }
    //   else if (e.key === 's') {
    //     animationController.crossfade('pointAt', 'idle');
    //   }
    // });

    const debugUI = {
      toggle: () => animationController.toggleDebug(!debugUI.visible),
      logState: () => animationController.logState(),
      visible: false
    };

    setupRaycastSelection(camera, renderer, raycastPlane, (hit, event) => {
      console.log('Ray hit plane at:', hit.point);
      $STATE.set('toggleUI', true);
    });

    // Animation loop with post-processing
    const clock = new THREE.Clock();
    anim = createAnimationLoop(
      { fps: 90 },
      ({ threejs }) => {
        animationController.update(threejs.delta);

        if (networkVizToggleState) {
          const brainData = brainInstance.generateGraphData();
          // console.log(networkViz.getPerformanceInfo());
          networkViz.animate(camera, performance.now());
          networkViz.updateGraph(brainData);
        }

        model.traverse((object) => {
          if (object.isMesh && object.material.uniforms?.uTime) {
            object.material.uniforms.uTime.value = threejs.elapsedTime;
          }
        });

        // Render to framebuffer
        renderer.setRenderTarget(renderTarget);
        renderer.clear();
        renderer.render(scene, camera);
        renderer.setRenderTarget(null);

        // Post-processing pass
        postMaterial.uniforms.tDiffuse.value = renderTarget.texture;
        postMaterial.uniforms.uTime.value = performance.now() * 0.001;
        renderer.render(postScene, postCamera);
      }
    );
    anim.start();

  } catch(err) {
    console.error('Error loading model:', err);
    const fallback = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial({ color: 0xff0000 })
    );
    scene.add(fallback);
  }

  const cleanup = () => {
    resizeObserver.disconnect();
    if (anim) anim.stop();
  };

  const handleResize = () => {
    const width = canvas.width;
    const height = canvas.height;

    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderTarget.setSize(width, height);

    // Update shader resolution
    postMaterial.fragmentShader = postMaterial.fragmentShader.replace(
      /vec2\((.*?)\)/,
      `vec2(${width.toFixed(1)}, ${height.toFixed(1)})`
    );
    postMaterial.needsUpdate = true;

    renderer.render(scene, camera);
  };

  const resizeObserver = new ResizeObserver(handleResize);
  resizeObserver.observe(canvas);

  $STATE.subscribe('containerNeedsUpdate', handleResize);

  const processAndAnimateLLMResponse = (response) => {
    // Inject HTML response to UI
    const container = document.querySelector('.response-container');
    if (container && response.html) {
      container.innerHTML = response.html;
    }

    // Play animation if present
    if (response.animationData) {
      const anim = response.animationData;

      const allAnimations = animationController.getAnimations();
      const animationName = allAnimations[UTILITIES.randomInt(1, allAnimations.length)];
      console.log('playing animation: ', animationName);
      animationController.play(animationName);
    }
  };


  $STATE.subscribe('promptResponse', processAndAnimateLLMResponse);

  $STATE.subscribe('toggleBrainViz', (state) => {
    networkVizToggleState = state;
    networkViz.toggleAll(networkVizToggleState);
  });

  $STATE.subscribe('applyBrainFeedback', (feedback = 0) => {
    // console.log(feedback);
    brainInstance.applyHumanFeedback(feedback);
  });

  $STATE.subscribe('switchFilterUp', updateMaterial);

  return {
    three: { scene, camera, renderer },
    cleanup
  };
};


// ====== matter.js ======
const prepEntityMatter = async (scene, props) => {
  const { modelURL, debug = false, width, height } = props;
  let gltf, model;
  const originalMaterials = new Map();
  const debugHelpers = new THREE.Group();
  debugHelpers.visible = debug;

  // Function to get all bone data as JSON
  const getBoneData = (model) => {
    const bones = [];
    model?.traverse((obj) => {
      if (obj.isBone) {
        bones.push({
          name: obj.name,
          position: {
            x: obj.position.x,
            y: obj.position.y,
            z: obj.position.z
          },
          parent: obj.parent?.name || null
        });
      }
    });
    return bones;
  };

  try {
    const loader = new THREE.GLTFLoader();
    gltf = await new Promise((resolve, reject) => {
      loader.load(modelURL, resolve, undefined, reject);
    });

    model = gltf.scene;

    console.log('CCDIKSolver: ', THREE.CCDIKSolver);

    // Get and log bone data immediately after loading
    const boneData = getBoneData(model);
    // console.log('Bone Data:', JSON.stringify(boneData, null, 2));

    model.traverse(object => {
      if (object.isMesh) {
        originalMaterials.set(object, object.material);
        object.geometry = object.geometry.clone();
        const material = debug
          ? createDebugMaterial(object.material)
          : createShaderMaterial({ width, height });
        material.skinning = object.material.skinning;
        material.morphTargets = object.material.morphTargets;
        if (object.material.dispose) object.material.dispose();
        object.material = material;
        object.frustumCulled = false;
      }
    });

    scene.add(model);

    return {
      model,
      gltf,
      originalMaterials,
      debugHelpers,
      boneData: getBoneData(model), // Now passing the actual array (not stringified)
      dispose: () => {
        scene.remove(model);
        scene.remove(debugHelpers);
        originalMaterials.forEach(m => m?.dispose());
      }
    };

  } catch (error) {
    console.error('Model loading failed:', error);
    const fallback = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({ color: 0xff0000 })
    );
    scene.add(fallback);
    return {
      model: fallback,
      gltf: null,
      originalMaterials: new Map(),
      debugHelpers: new THREE.Group(),
      boneData: '[]' // Empty array for fallback
    };
  }
};

window.prepEntityMatter = prepEntityMatter;


// ====== motion.js ======
const prepEntityMotion = (matterResult, scene, props) => {
  const { debug = false, enableIK = false, initialAnimation } = props;
  const { model, gltf, debugHelpers } = matterResult;

  let mixer, raycastPlane;
  const animationStates = {};
  let globalSpeed = 1.0;
  let targetFPS = 60;

  const animationController = {
    play: (name, options = {}) => {
      const state = animationStates[name];
      if (!state) return;
      state.action.reset();
      state.currentSpeed = options.speed || state.baseSpeed;
      state.action.setEffectiveTimeScale(state.currentSpeed * globalSpeed);
      state.action.setLoop(options.loop || state.loop);
      state.action.clampWhenFinished = options.clamp || false;
      state.action.play();
      state.isPlaying = true;
    },
    stop: (name) => {
      const state = animationStates[name];
      if (state) {
        state.action.stop();
        state.isPlaying = false;
      }
    },
    setGlobalSpeed: (speed) => {
      globalSpeed = speed;
      Object.values(animationStates).forEach(state => {
        if (state.isPlaying) {
          state.action.setEffectiveTimeScale(state.currentSpeed * globalSpeed);
        }
      });
    },
    setAnimationSpeed: (name, speed) => {
      const state = animationStates[name];
      if (state) {
        state.currentSpeed = speed;
        state.action.setEffectiveTimeScale(speed * globalSpeed);
      }
    },
    setFPS: (fps) => {
      targetFPS = fps;
      animationController.setGlobalSpeed((fps / 60) * globalSpeed); // Fixed this reference
    },
    crossfade: (fromName, toName, duration = 0.5) => {
      if (animationStates[fromName] && animationStates[toName]) {
        animationStates[fromName].action.fadeOut(duration);
        animationStates[toName].action
          .reset()
          .fadeIn(duration)
          .play();
      }
    },
    toggleDebug: (enabled) => {
      debugHelpers.visible = enabled;
      raycastPlane.material.visible = enabled;
    },
    logState: () => {
      console.group('Animation State');
      console.table(Object.entries(animationStates).map(([name, state]) => ({
        Name: name,
        Playing: state.isPlaying,
        Speed: state.currentSpeed,
        Progress: (state.action.time / state.duration).toFixed(2),
        Frames: state.frameCount
      })));
      console.groupEnd();
    },
    update: (delta) => {
      const adjustedDelta = delta * (targetFPS / 60) * globalSpeed;
      mixer.update(adjustedDelta);
      Object.values(animationStates).forEach(state => {
        if (state.isPlaying) {
          state.frameCount++;
          state.weight = state.action.getEffectiveWeight();
        }
      });
    },
    getAnimations: () => Object.keys(animationStates),
    getCurrentAnimations: () => Object.entries(animationStates)
      .filter(([_, state]) => state.isPlaying)
      .map(([name]) => name),
    getProgress: (name) => {
      const state = animationStates[name];
      return state ? state.action.time / state.duration : 0;
    }
  };

  // Initialize animation system
  mixer = new THREE.AnimationMixer(model);

  // Set up traditional animations
  if (gltf?.animations) {
    gltf.animations.forEach(clip => {
      const action = mixer.clipAction(clip);
      animationStates[clip.name] = {
        action,
        isIK: false,
        baseSpeed: 1.0,
        currentSpeed: 1.0,
        weight: 0,
        isPlaying: false,
        loop: THREE.LoopRepeat,
        frameCount: 0,
        duration: clip.duration,
        fadeDuration: 0.2
      };
    });
    console.log('Available animations:', Object.keys(animationStates));
  }

  // Play initial animation if specified
  if (initialAnimation && animationStates[initialAnimation]) {
    animationController.play(initialAnimation);
  }

  // Raycast plane setup
  raycastPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 2),
    new THREE.MeshBasicMaterial({
      visible: debug,
      transparent: true,
      opacity: 0.3,
      color: 0x00ff00,
      side: THREE.DoubleSide
    })
  );
  raycastPlane.name = 'raycastPlane';
  raycastPlane.position.y = 1;
  raycastPlane.position.z = 0.1;
  model.add(raycastPlane);

  return {
    animationController,
    raycastPlane,
    dispose: () => {
      if (mixer) mixer.uncacheRoot(model);
    }
  };
};

window.prepEntityMotion = prepEntityMotion;


// ====== entity.js ======
const prepEntity = async (scene, props) => {
  try {
    const matter = await window.prepEntityMatter(scene, props);
    const motion = await window.prepEntityMotion(matter, scene, props);

    return {
      model: matter.model,
      raycastPlane: motion.raycastPlane,
      animationController: motion.animationController,
      ikSolver: motion.ikSolver,
      dispose: () => {
        matter.dispose();
        motion.dispose();
      }
    };
  } catch (error) {
    console.error('Entity creation failed:', error);
    return {
      model: new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1)),
      animationController: {
        update: () => {},
        logState: () => console.log("Fallback controller - no animations")
      },
      dispose: () => {}
    };
  }
};

window.prepEntity = prepEntity;


// ====== memory.js ======
// Or is this conciousness??
const StateManager = (() => {
  const state = {};         // actual state values
  const listeners = {};     // key: [callback, ...]

  // Log helper
  const log = (action, key, value, oldValue) => {
    // console.debug(`[State] ${action.toUpperCase()} →`, { key, value, oldValue });
  };

  const get = (key) => {
    const value = state[key];
    log('get', key, value);
    return value;
  };

  const set = (key, value) => {
    const oldValue = state[key];
    state[key] = value;
    log('set', key, value, oldValue);

    if (listeners[key]) {
      listeners[key].forEach(cb => {
        try {
          cb(value, oldValue);
        } catch (err) {
          console.warn(`[State] listener for "${key}" threw:`, err);
        }
      });
    }
  };

  const toggle = (key) => {
    const newValue = !state[key];
    set(key, newValue);
    return newValue;
  };

  const remove = (key) => {
    const oldValue = state[key];
    if (key in state) {
      delete state[key];
      log('remove', key, undefined, oldValue);
      if (listeners[key]) {
        listeners[key].forEach(cb => {
          try {
            cb(undefined, oldValue);
          } catch (err) {
            console.warn(`[State] remove listener for "${key}" threw:`, err);
          }
        });
      }
    } else {
      console.debug(`[State] remove skipped (not found): "${key}"`);
    }
  };

  const getAll = () => {
    log('getAll', '*', { ...state });
    return { ...state };
  };

  const subscribe = (key, callback) => {
    if (!listeners[key]) listeners[key] = [];
    listeners[key].push(callback);
    log('subscribe', key, callback.toString());

    // Return unsubscribe function
    return () => {
      listeners[key] = listeners[key].filter(cb => cb !== callback);
      log('unsubscribe', key, callback.toString());
    };
  };

  return { get, set, toggle, remove, getAll, subscribe };
})();

window.$STATE = StateManager;


// ====== dna.js ======
const STORAGE_KEY = 'personasync_v1.0_STORAGE';

// For testing purposes only
const saveData = (data) => {
  chrome.storage.local.set({ [STORAGE_KEY]: data });
};

const loadData = async () => {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get([STORAGE_KEY], (result) => {
      if (result[STORAGE_KEY]) {
        console.log('success retrieving: ', result[STORAGE_KEY]);
        resolve(result[STORAGE_KEY]);
      } else {
        reject("No Data");
      }
    });
  });
}

window.saveData = saveData;
window.loadData = loadData;


// ====== window.js ======
const mainContentHTML = `
  <div id="personasync">
    <div id="personasync-content">
      <div id="resizeHandle"></div>
      <div class="response-container"></div>
      <canvas id="personawindow"></canvas>
      <div id="radialui"></div>
      <input type="text" id="promptBox" placeholder="Ask me something..." />
    </div>
  </div>
`;

const UIComponents = {
    buttons: {
        render: (container, radialContainer, options = {}) => {
            const buttons = [
                { id: 'brain_btn', icon: '🌌', label: 'brain' },
                { id: 'keep_this_btn', icon: '🔥', label: 'keep_this' },
                { id: 'no_good_btn', icon: '😭', label: 'no_good' },
                { id: 'filter_me', icon: '🕶️', label: 'filter_me' }
            ].map((btn, indx) => ({
                ...btn,
                onClick: options.execFunctions?.[indx] || (() => console.log(`${btn.id} clicked`))
            }));

            radialContainer.innerHTML = '';
            const layout = options.buttonLayout || 'arc';
            radialContainer.setAttribute('data-button-layout', layout);

            const rect = container.getBoundingClientRect();
            const buttonSize = Math.max(30, rect.width * (options.buttonSizePercent || 0.1));
            radialContainer.style.setProperty('--button-size', `${buttonSize}px`);

            buttons.forEach((btn, i) => {
                const el = document.createElement('div');
                el.className = 'radialbutton';
                el.classList.add(i % 2 === 0 ? 'sway-cw' : 'sway-ccw');
                el.id = `button_${btn.id}`;

                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                const spacing = buttonSize * 1.2;

                switch(layout) {
                    case 'line-top':
                        el.style.left = `${centerX - ((buttons.length-1) * spacing)/2 + i * spacing - buttonSize/2}px`;
                        el.style.top = `${buttonSize * 0.5}px`;
                        break;
                    case 'line-bottom':
                        el.style.left = `${centerX - ((buttons.length-1) * spacing)/2 + i * spacing - buttonSize/2}px`;
                        el.style.bottom = `${buttonSize * 0.5}px`;
                        break;
                    case 'line-left':
                        el.style.left = `${buttonSize * 0.5}px`;
                        el.style.top = `${centerY - ((buttons.length-1) * spacing)/2 + i * spacing - buttonSize/2}px`;
                        break;
                    case 'line-right':
                        el.style.right = `${buttonSize * 0.5}px`;
                        el.style.top = `${centerY - ((buttons.length-1) * spacing)/2 + i * spacing - buttonSize/2}px`;
                        break;
                    default: // arc
                        const angle = (i / buttons.length) * Math.PI * 2;
                        const radius = Math.min(rect.width, rect.height) * 0.35;
                        el.style.left = `${centerX + Math.cos(angle) * radius - buttonSize/2}px`;
                        el.style.top = `${centerY + Math.sin(angle) * radius - buttonSize/2}px`;
                }

                el.style.width = `${buttonSize}px`;
                el.style.height = `${buttonSize}px`;
                el.innerHTML = `
                    <div class="radialicon">${btn.icon}</div>
                    <span class="radiallabel">${btn.label}</span>
                `;

                el.addEventListener('click', (e) => {
                    e.stopPropagation();
                    btn.onClick(e);
                });

                radialContainer.appendChild(el);
            });
        }
    },

    prompt: {
        render: (container, promptBox, options = {}) => {
            const promptPos = options.promptPosition || 'bottom';
            const buttonLayout = options.buttonLayout || '';

            const layoutConflict = (
                (promptPos === 'top' && buttonLayout === 'line-top') ||
                (promptPos === 'bottom' && buttonLayout === 'line-bottom')
            );

            const finalPosition = layoutConflict
                ? (promptPos === 'top' ? 'bottom' : 'top')
                : promptPos;

            promptBox.setAttribute('data-prompt-position', finalPosition);
            promptBox.style.top = finalPosition === 'top' ? '20px' : 'auto';
            promptBox.style.bottom = finalPosition === 'bottom' ? '20px' : 'auto';

            if (options.promptPlaceholder) {
                promptBox.placeholder = options.promptPlaceholder;
            }
        }
    }

};

const setupResponseHandler = (contentDiv) => {
    const responseContainer = contentDiv.querySelector('.response-container');

    $STATE.subscribe('promptResponse', (response) => {
        if (!response?.html) return;

        const responseElement = document.createElement('div');
        responseElement.className = 'response-item';
        responseElement.innerHTML = response.html;
        responseContainer.prepend(responseElement);

        // Scroll to show new content
        setTimeout(() => {
            // responseContainer.scrollTop = responseContainer.scrollHeight;
            responseContainer.scrollTop = 0;
        }, 50);
    });
};

const renderViewWindow = async (options = {}) => {
    document.body.insertAdjacentHTML('afterbegin', mainContentHTML);
    try {
        const window = await setupWindow(options);
        return window;
    } catch(err) {
        console.error("Error initializing window:", err);
    }
};

const setupWindow = async (options) => {
    const inputManager = createInputManager(window);
    const container = document.getElementById('personasync');
    const contentDiv = document.getElementById('personasync-content');
    const resizeHandle = document.getElementById('resizeHandle');
    const canvas = document.getElementById('personawindow');
    const radialContainer = document.getElementById('radialui');
    const promptBox = document.getElementById('promptBox');

    // Initialize canvas
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;

    // Initialize UI components
    UIComponents.buttons.render(container, radialContainer, {
        execFunctions: options.execFunctions,
        buttonLayout: options.buttonLayout,
        buttonSizePercent: options.buttonSizePercent
    });

    UIComponents.prompt.render(container, promptBox, {
        promptPosition: options.promptPosition,
        promptPlaceholder: options.promptPlaceholder
    });

    // Initialize response handler
    setupResponseHandler(contentDiv);

    // Set up prompt box handling
    promptBox.addEventListener('keyup', (event) => {
        if (event.key === 'Enter' && promptBox.value.trim()) {
            const data = { prompt: promptBox.value, ENV: options.ENV };
            $STATE.set('callAncestors', data);
            promptBox.value = '';
        }
    });

    // Resize functionality (width and height)
    let isResizing = false;
    let startX, startY, startWidth, startHeight;

    const handleResizeStart = (data) => {
        if (data.event.target === resizeHandle) {
            isResizing = true;
            startX = data.currentPosition.x;
            startY = data.currentPosition.y;
            startWidth = container.clientWidth;
            startHeight = container.clientHeight;
            data.event.preventDefault();
        }
    };

    const handleResizeMove = (data) => {
        if (!isResizing) return;

        const dx = data.currentPosition.x - startX;
        const dy = data.currentPosition.y - startY;

        const newWidth = Math.max(200, Math.min(window.innerWidth - 50, startWidth - dx));
        const newHeight = Math.max(200, Math.min(window.innerHeight - 50, startHeight - dy));

        container.style.width = `${newWidth}px`;
        container.style.height = `${newHeight}px`;
        canvas.width = newWidth;
        canvas.height = newHeight;

        if (resizeHandle.style.display === 'block') {
            UIComponents.buttons.render(container, radialContainer, {
                execFunctions: options.execFunctions,
                buttonLayout: options.buttonLayout
            });
        }
    };

    const handleResizeEnd = () => {
        isResizing = false;
        $STATE.set('containerNeedsUpdate', true);
    };

    // Set up input manager handlers
    inputManager.on('click', handleResizeStart);
    inputManager.on('move', handleResizeMove);
    inputManager.on('idle', handleResizeEnd);
    inputManager.on('touchStart', handleResizeStart);
    inputManager.on('touchMove', handleResizeMove);
    inputManager.on('touchEnd', handleResizeEnd);

    // Toggle UI visibility
    const toggleUI = () => {
        const isVisible = resizeHandle.style.display !== 'block';
        radialContainer.style.display = isVisible ? 'block' : 'none';
        resizeHandle.style.display = isVisible ? 'block' : 'none';
        promptBox.style.display = isVisible ? 'block' : 'none';

        console.log(container);
        container.style.border = isVisible ? '2px solid #000' : 'none';

        if (isVisible) {
            UIComponents.buttons.render(container, radialContainer, {
                execFunctions: options.execFunctions,
                buttonLayout: options.buttonLayout
            });
        }
    };

    $STATE.subscribe('toggleUI', toggleUI);

    return {
        container,
        canvas,
        inputManager,
        radialContainer,
        promptBox,
        contentDiv,
        toggleUI,
        renderButtons: (buttonOptions) => UIComponents.buttons.render(
            container,
            radialContainer,
            { ...options, ...buttonOptions }
        ),
        resetContainer: () => {
            const responseContainer = contentDiv.querySelector('.response-container');
            responseContainer.innerHTML = '';
            responseContainer.scrollTop = 0;
        }
    };
};

window.renderViewWindow = renderViewWindow;


// ====== begin.js ======
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
    //   const loadedStorageData = await loadData();
    //   console.log(loadedStorageData);
    // })
  }
  catch(err){
    console.error(err);
  }
};

window.startPersonaMotion = startPersonaMotion;

