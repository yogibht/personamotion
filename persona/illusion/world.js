const worldIllusion = async (props) => {
  const { storageData, brainInstance, canvas, modelURL } = props;

  const adjustCanvasSize = () => {
    const isMobile = UTILITIES.checkDeviceType() === 'mobile';

    if (isMobile) {
      // On mobile: make it square and as wide as screen
      const size = Math.min(window.innerWidth, window.innerHeight);
      canvas.style.width = `${size}px`;
      canvas.style.height = `${size}px`;
      canvas.width = size;
      canvas.height = size;
    } else {
      // On desktop: use existing dimensions
      const displayWidth = canvas.clientWidth;
      const displayHeight = canvas.clientHeight;
      if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        canvas.width = displayWidth;
        canvas.height = displayHeight;
      }
    }
  };

  adjustCanvasSize();

  // Initialize renderer
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    premultipliedAlpha: false
  });
  renderer.setClearColor(0x000000, 0);
  renderer.setSize(canvas.width, canvas.height, false);
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

  const renderTarget = new THREE.WebGLRenderTarget(
    canvas.width,
    canvas.height,
    {
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
      depthBuffer: true,
      stencilBuffer: false
    }
  );

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

  const updatePostProcMaterial = (filterStyle) => {
    postMaterial = createPostProcessingShader({
      width: canvas.width,
      height: canvas.width,
      shader: filterStyle,
      colorMult: new THREE.Color(1.0, 1.0, 1.0)
    });
    postMaterial.needsUpdate = true;
    quad.material = postMaterial;
  };

  postScene.add(quad);

  let networkViz, networkVizType, brainData;

  const switchBrainViz = (state) => {
    if (networkVizType === state) {
      networkVizType = undefined;
    }
    else {
      networkVizType = state;
    }
    if (networkViz && networkVizType === 'bulb') {
      networkViz.dispose();
      networkViz = undefined;
      networkViz = createLivingBrainViz(scene, brainData, {
        width: canvas.width,
        height: canvas.height,
      });
    }
    else if (networkViz && networkVizType === 'galaxy'){
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
    else{
      if(networkViz) networkViz.dispose();
      networkViz = undefined;
      networkViz = createLivingBrainViz(scene, brainData, {
        width: canvas.width,
        height: canvas.height,
      });
    }
    networkViz.toggle(networkVizType !== undefined);
  }

  let anim, animationController;
  try {
    brainData = brainInstance.generateGraphData();
    switchBrainViz();

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

    const render = (now) => {
      renderer.setRenderTarget(renderTarget);
      renderer.clear();
      renderer.render(scene, camera);
      renderer.setRenderTarget(null);

      postMaterial.uniforms.tDiffuse.value = renderTarget.texture;
      postMaterial.uniforms.uTime.value = now;
      renderer.render(postScene, postCamera);
    }

    const clock = new THREE.Clock();
    anim = createAnimationLoop(
      { fps: 90 },
      ({ threejs }) => {
        animationController.update(threejs.delta);

        if (networkVizType !== undefined) {
          brainData = brainInstance.generateGraphData();
          // console.log(networkViz.getPerformanceInfo());
          networkViz.updateGraph(brainData);
          networkViz.animate(camera, performance.now());
        }

        model.traverse((object) => {
          if (object.isMesh && object.material.uniforms?.uTime) {
            object.material.uniforms.uTime.value = threejs.elapsedTime;
          }
        });

        render(performance.now() * 0.001);
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
    adjustCanvasSize();

    renderer.setSize(canvas.width, canvas.height, false);

    // Update camera aspect ratio
    camera.aspect = canvas.width / canvas.height;
    camera.updateProjectionMatrix();

    // Update render target
    renderTarget.setSize(
      canvas.width,
      canvas.height
    );

    // Update post-processing material
    if (postMaterial) {
      postMaterial.uniforms.uResolution.value.set(
        canvas.width,
        canvas.height
      );
      postMaterial.needsUpdate = true;
    }

    renderer.clear();
    renderer.render(scene, camera);
  };

  const resizeObserver = new ResizeObserver(handleResize);
  resizeObserver.observe(canvas);

  $STATE.subscribe('containerNeedsUpdate', handleResize);

  const getVoices = async () => {
    return new Promise((resolve) => {
      const voices = speechSynthesis.getVoices();

      if (voices.length > 0) {
        resolve(voices);
      } else {
        speechSynthesis.addEventListener('voiceschanged', () => {
          const voices = speechSynthesis.getVoices();
          resolve(voices);
        });
      }
    });
  };

  const initializeTTS = async () => {
    try {
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
    }
    catch(err){
      console.error(err);
    }
  };

  const { tts, voiceOptions } = await initializeTTS();

  const processAndAnimateLLMResponse = (response) => {
    const container = document.querySelector('#personamotion-responseContainer');
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

  $STATE.subscribe('switchFilterUp', updatePostProcMaterial);

  $STATE.subscribe('toggleBrainViz', switchBrainViz);

  return {
    three: { scene, camera, renderer },
    cleanup
  };
};

window.worldIllusion = worldIllusion;
