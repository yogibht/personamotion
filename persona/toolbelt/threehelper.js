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
