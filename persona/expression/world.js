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

  // const updateMaterial = () => {
  //   postMaterial = createPostProcessingShader({
  //     width: canvas.width,
  //     height: canvas.height,
  //     shader: UTILITIES.randomInt(1, 16), // 16 total
  //     colorMult: new THREE.Color(1.0, 1.0, 1.0)
  //   });
  //   quad.material = postMaterial;
  //   postMaterial.needsUpdate = true;
  // };

  postScene.add(quad);

  let anim, animationController, networkViz;
  try {
    const brainData = brainInstance.generateGraphData();
    networkViz = createGalaxyNetworkViz(scene, brainData);
    networkViz.toggleAll(false);

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
      { fps: 60 },
      ({ threejs }) => {
        animationController.update(threejs.delta);

        const brainData = brainInstance.generateGraphData();
        // console.log(networkViz.getPerformanceInfo());
        networkViz.animate(camera, performance.now());
        networkViz.updateGraph(brainData);

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

    renderer.setSize(width, height, false);
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
      animationController.play(animationName);
    }
  };


  $STATE.subscribe('promptResponse', processAndAnimateLLMResponse);

  $STATE.subscribe('toggleBrainViz', (state)=>{
    networkViz.toggleAll(state);
  })

  return {
    three: { scene, camera, renderer },
    cleanup
  };
};
