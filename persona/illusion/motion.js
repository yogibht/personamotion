const prepEntityMotion = (matterResult, scene, props) => {
  const { debug = false, enableIK = false, initialAnimation } = props;
  const { model, gltf, debugHelpers } = matterResult;

  let mixer, raycastPlane;
  const animationStates = {};
  let globalSpeed = 1.0;
  let targetFPS = 60;

  const animationController = {
    play: (name, options = {}) => {
      const mode = options.mode || 'play';
      const duration = options.fadeDuration ?? 0.4;
      const modeList = Array.isArray(mode) ? mode : mode.split('|');

      const sequence = options.sequence || [name];
      const lastName = sequence[sequence.length - 1];

      const playClip = (fromState, toState, fadeDuration, isFinal = false) => {
        if (fromState && modeList.includes("crossfade")) {
          fromState.action.fadeOut(fadeDuration);
        } else if (fromState && fromState.isPlaying) {
          fromState.action.stop();
          fromState.isPlaying = false;
        }

        toState.action.reset();
        toState.action.fadeIn(fadeDuration).play();
        toState.currentSpeed = options.speed || toState.baseSpeed;
        toState.action.setEffectiveTimeScale(toState.currentSpeed * globalSpeed);

        // Apply loop/clamp to the final animation in the sequence
        if (isFinal) {
          const loopType = options.loop ?? toState.loop;
          toState.action.setLoop(loopType);
          toState.action.clampWhenFinished = loopType === THREE.LoopOnce;
        }

        toState.isPlaying = true;
      };

      // Stop everything if toggle is set and last is already playing
      const finalState = animationStates[lastName];
      if (!finalState) return;
      if (modeList.includes("toggle") && finalState.isPlaying) {
        finalState.action.stop();
        finalState.isPlaying = false;
        return;
      }

      // Play sequence (crossfading between them)
      let prevState = null;
      sequence.forEach((animName, idx) => {
        const state = animationStates[animName];
        if (!state) return;

        const isFinal = idx === sequence.length - 1;
        setTimeout(() => {
          playClip(prevState, state, duration, isFinal);
        }, idx * duration * 1000); // delay each step in chain
        prevState = state;
      });
    },
    // play("walk", {
    //   sequence: ["idle", "shrug", "walk"],
    //   mode: "crossfade",
    //   loop: THREE.LoopOnce
    // });
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
    getAnimations: (byName= false) => {
      const animKeys = Object.keys(animationStates);
      return animKeys;
    },
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
    // console.log('Available animations:', JSON.stringify(Object.keys(animationStates)));
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
