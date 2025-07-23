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
