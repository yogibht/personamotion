const prepEntityMotion = (matterResult, scene, props) => {
  const { model, gltf, debugHelpers, boneData } = matterResult;
  const { debug = false } = props;

  let mixer, raycastPlane, ikSolver;
  const animationStates = {};
  let globalSpeed = 1;
  let targetFPS = 60;

  /* collect bones once */
  const bones = [];
  const boneByName = {};
  model.traverse(o => {
    if (o.isBone) {
      bones.push(o);
      boneByName[o.name] = o;
    }
  });

  /* build full skeleton that CCDIKSolver expects */
  const skeleton = {
    bones,
    getBoneByName: n => boneByName[n] || null
  };
  model.skeleton = skeleton;
  ikSolver = new THREE.CCDIKSolver(model, []);

  /* helper: create IK clip + CCD entry */
  const createIKAnimation = (name, chains, dur = 1) => {
    const tracks = [];
    ikSolver.iks.length = 0; // clear previous rigs

    Object.entries(chains).forEach(([boneName, fn]) => {
      const bone = boneByName[boneName];
      if (!bone) return;

      /* keyframes */
      const times = [], px = [], py = [], pz = [];
      for (let i = 0; i <= 60; i++) {
        const t = i / 60;
        const p = fn(t);
        times.push(t * dur);
        px.push(p.x ?? 0);
        py.push(p.y ?? 0);
        pz.push(p.z ?? 0);
      }
      tracks.push(new THREE.VectorKeyframeTrack(`${boneName}.position`, times, [...px, ...py, ...pz]));

      /* CCD definition */
      const links = [];
      let parent = bone.parent;
      while (parent && parent !== model && parent.isBone && links.length < 6) {
        links.unshift({ index: bones.indexOf(parent) });
        parent = parent.parent;
      }
      ikSolver.iks.push({
        target: bones.indexOf(bone),
        effector: bones.indexOf(bone),
        links
      });
    });

    const clip = new THREE.AnimationClip(name, dur, tracks);
    const action = mixer.clipAction(clip).setLoop(THREE.LoopRepeat, Infinity);
    animationStates[name] = {
      action, isIK: true, baseSpeed: 1, currentSpeed: 1, weight: 0,
      isPlaying: false, loop: THREE.LoopRepeat, frameCount: 0,
      duration: dur, fadeDuration: 0.2
    };
    return animationStates[name];
  };

  const animationController = {
    createIKAnimation,
    play: (name, opts = {}) => {
      const st = animationStates[name];
      if (!st) return;
      st.action.reset()
        .setEffectiveTimeScale((opts.speed ?? st.baseSpeed) * globalSpeed)
        .setLoop(opts.loop ?? st.loop, Infinity)
        .play();
      st.isPlaying = true;
    },
    stop: name => {
      const st = animationStates[name];
      if (st) { st.action.stop(); st.isPlaying = false; }
    },
    setGlobalSpeed: s => {
      globalSpeed = s;
      Object.values(animationStates).forEach(st => {
        if (st.isPlaying) st.action.setEffectiveTimeScale(st.currentSpeed * globalSpeed);
      });
    },
    setFPS: fps => {
      targetFPS = fps;
      animationController.setGlobalSpeed((fps / 60) * globalSpeed);
    },
    crossfade: (from, to, dur = 0.5) => {
      const f = animationStates[from], t = animationStates[to];
      if (f && t) { f.action.fadeOut(dur); t.action.reset().fadeIn(dur).play(); }
    },
    toggleDebug: v => {
      debugHelpers.visible = v;
      if (raycastPlane) raycastPlane.material.visible = v;
    },
    logState: () => console.table(Object.entries(animationStates).map(([n, s]) => ({ Name: n, Playing: s.isPlaying }))),
    update: delta => {
      const d = delta * (targetFPS / 60) * globalSpeed;
      mixer.update(d);
      if (ikSolver) ikSolver.update();
      Object.values(animationStates).forEach(s => {
        if (s.isPlaying) { s.frameCount++; s.weight = s.action.getEffectiveWeight(); }
      });
    },
    getAnimations: () => Object.keys(animationStates),
    getCurrentAnimations: () => Object.entries(animationStates).filter(([, s]) => s.isPlaying).map(([n]) => n),
    getProgress: n => { const s = animationStates[n]; return s ? s.action.time / s.duration : 0; }
  };

  mixer = new THREE.AnimationMixer(model);
  if (gltf?.animations) {
    gltf.animations.forEach(clip => {
      const act = mixer.clipAction(clip);
      animationStates[clip.name] = {
        action: act, isIK: false, baseSpeed: 1, currentSpeed: 1, weight: 0,
        isPlaying: false, loop: THREE.LoopRepeat, frameCount: 0,
        duration: clip.duration, fadeDuration: 0.2
      };
    });
  }

  raycastPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 2),
    new THREE.MeshBasicMaterial({ visible: debug, transparent: true, opacity: 0.3, color: 0x00ff00, side: THREE.DoubleSide })
  );
  raycastPlane.name = 'raycastPlane';
  raycastPlane.position.set(0, 1, 0.1);
  model.add(raycastPlane);

  return {
    animationController,
    raycastPlane,
    ikSolver,
    dispose: () => { if (mixer) mixer.uncacheRoot(model); }
  };
};
window.prepEntityMotion = prepEntityMotion;
