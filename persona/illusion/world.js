const world = async (props) => {
  const { storageData, brainInstance, canvas, modelURL } = props;

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
  quad.frustumCulled = false;

  const updateMaterial = (filterStyle) => {
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

  let anim, animationController, networkViz, networkVizType, brainData;
  try {
    brainData = brainInstance.generateGraphData();
    networkViz = createLivingBrainViz(scene, brainData, {
      width: canvas.width,
      height: canvas.height,
    });
    // networkViz = createGalaxyBrainViz(scene, brainData, {
    //   particleSize: 2.0,
    //   brightness: 2.0,
    //   rotationSpeed: 0.1,
    //   spiralTightness: 2.0,
    //   numArms: 5
    // });
    networkViz.toggle(networkVizType !== undefined);

    const entity = await prepEntity(scene, {
      modelURL,
      enableIK: true,
      width: canvas.width,
      height: canvas.height,
      initialAnimation: 'idle',
      debug: false
    });

    const { model, raycastPlane, boneData } = entity;

    // const ikSolver = new THREE.CCDIKSolver(model, boneData);
    // const ikHelper = new THREE.CCDIKHelper(model, boneData);
    // scene.add(ikHelper);

    animationController = entity.animationController;
    animationController.setFPS(60);
    animationController.play('idle', {loop: true});

    // animationController.createIKAnimation('wave', {
    //   mixamorigLeftHand: t => ({
    //     x: Math.sin(t * Math.PI * 2) * 25,
    //     y: Math.sin(t * Math.PI * 4) * 15,
    //     z: 0
    //   })
    // }, 1.5);
    // entity.animationController.play('wave');

    // entity.animationController.createIKAnimation('kick', {
    //   mixamorigRightFoot: t => ({
    //     x: 0,
    //     y: Math.max(0, Math.sin(t * Math.PI) * 40),
    //     z: 0
    //   })
    // }, 1);
    // entity.animationController.play('kick');

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
      // console.log('Ray hit plane at:', hit.point);
      $STATE.set('toggleUI', true);
    });

    const clock = new THREE.Clock();
    anim = createAnimationLoop(
      { fps: 90 },
      ({ threejs }) => {
        animationController.update(threejs.delta);

        if (networkVizType !== undefined) {
          const brainData = brainInstance.generateGraphData();
          // console.log(networkViz.getPerformanceInfo());
          networkViz.updateGraph(brainData);
          networkViz.animate(camera, performance.now());
        }

        model.traverse((object) => {
          if (object.isMesh && object.material.uniforms?.uTime) {
            object.material.uniforms.uTime.value = threejs.elapsedTime;
          }
        });

        renderer.setRenderTarget(renderTarget);
        renderer.clear();
        renderer.render(scene, camera);
        renderer.setRenderTarget(null);

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

  const getVoices = () => {
    return new Promise((resolve) => {
      const voices = speechSynthesis.getVoices();

      if (voices.length > 0) {
        resolve(voices);
      } else {
        const onVoicesChanged = () => {
          const voices = speechSynthesis.getVoices();
          if (voices.length > 0) {
            speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged);
            resolve(voices);
          }
        };
        speechSynthesis.addEventListener('voiceschanged', onVoicesChanged);
      }
    });
  };

  const initializeTTS = async () => {
    const allAvailableVoices = await getVoices();

    const selectedLanguage = 'en-US';
    const filteredVoices = allAvailableVoices.filter(data => data.lang === selectedLanguage);
    const selectedVoice = filteredVoices.find(v => v.name === 'English (America)+Andrea' || 'Google US English');

    const voiceOptions = {
      voice: selectedVoice,
      rate: 0.8,
      pitch: 1.05,
      volume: 0.25,
      ssml: true,
      emphasis: 'strong',
      breakAfter: 250,
      onEnd: () => console.log('utterance ended')
    };

    const tts = new NaturalTTS(selectedLanguage, voiceOptions);

    return { tts, voiceOptions };
  };

  const processAndAnimateLLMResponse = async (response) => {
    const { tts, voiceOptions } = await initializeTTS();

    const container = document.querySelector('.response-container');
    if (container && response.html) {
      container.innerHTML = response.html;
    }

    if (response.animationData) {
      const animData = response.animationData;
      animData.loop = (animData.options && animData.options.loop === 1) ? THREE.LoopOnce : THREE.LoopRepeat;
      animationController.play(animData.name, animData.options);
      tts.speak(response.content, voiceOptions);
    }
  };


  $STATE.subscribe('promptResponse', processAndAnimateLLMResponse);

  $STATE.subscribe('toggleBrainViz', (state) => {
    if (networkVizType === state) {
      networkVizType = undefined;
    }
    else {
      networkVizType = state;
    }
    if (networkVizType === 'bulb') {
      networkViz.dispose();
      networkViz = undefined;
      networkViz = createLivingBrainViz(scene, brainData, {
        width: canvas.width,
        height: canvas.height,
      });
    }
    else if (networkVizType !== undefined){
      networkViz.dispose();
      networkViz = undefined;
      networkViz = createGalaxyBrainViz(scene, brainData, {
        particleSize: 2.0,
        brightness: 2.0,
        rotationSpeed: 0.1,
        spiralTightness: 2.0,
        numArms: 5
      });
    }
    if (networkViz) networkViz.toggle(networkVizType !== undefined);
  });

  $STATE.subscribe('switchFilterUp', updateMaterial);

  return {
    three: { scene, camera, renderer },
    cleanup
  };
};
