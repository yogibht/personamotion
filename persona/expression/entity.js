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
