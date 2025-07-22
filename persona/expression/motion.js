const prepEntityMotion = (matterResult, scene, props) => {
  const { debug = false, enableIK = false, initialAnimation } = props;
  const { model, gltf, debugHelpers } = matterResult;

  let mixer, raycastPlane;
  const animationStates = {};
  const skeletonHelpers = [];
  let ikSolver, ikChains = {};
  let globalSpeed = 1.0;
  let targetFPS = 60;
  let ikAnimations = new Map();

  // Track active crossfades
  const activeCrossfades = new Map();

  // Enhanced IK Chain with blending support
  const createIKChain = (bones) => {
    // Store original bone transforms for this chain
    const originalBoneTransforms = bones.map(bone => ({
      bone,
      originalQuaternion: bone.quaternion.clone(),
      originalPosition: bone.position.clone()
    }));

    const chain = {
      bones,
      originalBoneTransforms,
      target: new THREE.Vector3(),
      currentTarget: new THREE.Vector3(),
      prevTarget: new THREE.Vector3(),
      iterations: 15,
      tolerance: 0.01,
      enabled: false,
      weight: 1.0, // Add weight for blending
      targetWeight: 1.0,
      blendSpeed: 8.0, // Increased for smoother transitions

      setTarget: function(position, weight = 1.0) {
        this.prevTarget.copy(this.currentTarget);
        this.target.copy(position);
        this.targetWeight = weight;
        this.enabled = weight > 0.001;
      },

      updateWeight: function(delta) {
        // Smooth weight interpolation
        const diff = this.targetWeight - this.weight;
        if (Math.abs(diff) > 0.001) {
          this.weight += diff * this.blendSpeed * delta;
          this.weight = Math.max(0, Math.min(1, this.weight));
        }

        // Interpolate current target based on weight
        this.currentTarget.lerpVectors(this.prevTarget, this.target, Math.min(this.weight, 1));
      },

      solve: function(delta) {
        this.updateWeight(delta);

        if (!this.enabled || this.weight <= 0.001) {
          // Blend back to original positions when weight is low
          this.blendToOriginal();
          return;
        }

        const effectiveTarget = this.currentTarget;
        const effectiveWeight = this.weight;

        // Store pre-IK transforms for blending
        const preIKTransforms = this.bones.map(bone => ({
          quaternion: bone.quaternion.clone(),
          position: bone.position.clone()
        }));

        for (let i = 0; i < this.iterations; i++) {
          for (let j = this.bones.length - 1; j >= 0; j--) {
            const bone = this.bones[j];
            const endEffector = this.getEndEffectorPosition();
            const bonePos = new THREE.Vector3();

            bone.getWorldPosition(bonePos);
            const toEndEffector = endEffector.clone().sub(bonePos);
            const toTarget = effectiveTarget.clone().sub(bonePos);

            if (toEndEffector.length() > 0.001 && toTarget.length() > 0.001) {
              toEndEffector.normalize();
              toTarget.normalize();

              const dotProduct = toEndEffector.dot(toTarget);
              if (Math.abs(dotProduct) < 0.999) {
                const rotation = new THREE.Quaternion().setFromUnitVectors(toEndEffector, toTarget);
                bone.quaternion.multiply(rotation);
              }
            }

            bone.updateMatrixWorld(true);
            if (endEffector.distanceTo(effectiveTarget) < this.tolerance) break;
          }
        }

        // Apply weight blending between pre-IK and post-IK transforms
        if (effectiveWeight < 1.0) {
          for (let i = 0; i < this.bones.length; i++) {
            const bone = this.bones[i];
            const preTransform = preIKTransforms[i];

            // Blend quaternions
            const currentQuat = bone.quaternion.clone();
            bone.quaternion.copy(preTransform.quaternion);
            bone.quaternion.slerp(currentQuat, effectiveWeight);

            bone.updateMatrixWorld(true);
          }
        }
      },

      blendToOriginal: function() {
        // Blend bones back to their animation-driven state
        for (let i = 0; i < this.originalBoneTransforms.length; i++) {
          const { bone } = this.originalBoneTransforms[i];
          // Let the regular animation mixer handle the transforms
          // This allows smooth blending back to keyframe animation
        }
      },

      getEndEffectorPosition: function() {
        const lastBone = this.bones[this.bones.length - 1];
        const pos = new THREE.Vector3();
        lastBone.getWorldPosition(pos);
        return pos;
      },

      disable: function() {
        this.targetWeight = 0;
        this.enabled = false;
      },

      setWeight: function(weight) {
        this.targetWeight = Math.max(0, Math.min(1, weight));
        this.enabled = this.targetWeight > 0.001;
      }
    };
    return chain;
  };

  // Find bone by name in the model
  const findBone = (name) => {
    let foundBone = null;
    model.traverse((object) => {
      if (object.isBone && object.name === name) {
        foundBone = object;
      }
    });
    return foundBone;
  };

  // Create arm chain from shoulder to hand
  const createArmChain = (side) => {
    const prefix = side === 'left' ? 'mixamorigLeftArm' : 'mixamorigRightArm';
    const handName = side === 'left' ? 'mixamorigLeftHand' : 'mixamorigRightHand';

    const shoulder = findBone(prefix);
    const forearm = findBone(side === 'left' ? 'mixamorigLeftForeArm' : 'mixamorigRightForeArm');
    const hand = findBone(handName);

    if (shoulder && forearm && hand) {
      return [shoulder, forearm, hand];
    }
    return null;
  };

  // Store original bone transforms for blending
  const originalTransforms = new Map();

  const storeOriginalTransforms = () => {
    model.traverse((object) => {
      if (object.isBone) {
        originalTransforms.set(object.uuid, {
          position: object.position.clone(),
          quaternion: object.quaternion.clone(),
          scale: object.scale.clone()
        });
      }
    });
  };

  // Initialize IK System
  const initIKSystem = () => {
    if (!enableIK) return;

    // Store original transforms first
    storeOriginalTransforms();

    ikSolver = {
      chains: [],
      add: function(chain) {
        this.chains.push(chain);
      },
      solve: function(delta) {
        this.chains.forEach(chain => chain.solve(delta));
      }
    };

    // Create left arm chain
    const leftArmBones = createArmChain('left');
    if (leftArmBones) {
      const leftChain = createIKChain(leftArmBones);
      ikChains['mixamorigLeftHand'] = leftChain;
      ikSolver.add(leftChain);
      console.log('Created left arm IK chain');
    }

    // Create right arm chain
    const rightArmBones = createArmChain('right');
    if (rightArmBones) {
      const rightChain = createIKChain(rightArmBones);
      ikChains['mixamorigRightHand'] = rightChain;
      ikSolver.add(rightChain);
      console.log('Created right arm IK chain');
    }

    console.log('IK chains created:', Object.keys(ikChains));
  };

  // Crossfade manager
  const createCrossfade = (fromName, toName, duration) => {
    const crossfadeId = `${fromName}->${toName}`;

    return {
      id: crossfadeId,
      fromName,
      toName,
      duration,
      elapsed: 0,
      progress: 0,
      fromState: animationStates[fromName],
      toState: animationStates[toName],

      update: function(delta) {
        this.elapsed += delta;
        this.progress = Math.min(this.elapsed / this.duration, 1);

        const fadeOutWeight = 1 - this.progress;
        const fadeInWeight = this.progress;

        // Handle different animation type combinations
        if (this.fromState.isIK && this.toState.isIK) {
          // IK to IK crossfade
          this.updateIKToIK(fadeOutWeight, fadeInWeight);
        } else if (!this.fromState.isIK && this.toState.isIK) {
          // Regular to IK crossfade - NO BLENDING, just fade out regular and start IK fresh
          this.updateRegularToIKDirect(fadeOutWeight, fadeInWeight);
        } else if (this.fromState.isIK && !this.toState.isIK) {
          // IK to Regular crossfade
          this.updateIKToRegular(fadeOutWeight, fadeInWeight);
        } else {
          // Regular to Regular crossfade (existing system)
          this.updateRegularToRegular(fadeOutWeight, fadeInWeight);
        }

        return this.progress >= 1;
      },

      updateIKToIK: function(fadeOutWeight, fadeInWeight) {
        // Blend between IK animations by adjusting chain weights
        Object.keys(this.fromState.chains || {}).forEach(chainName => {
          const chain = ikChains[chainName];
          if (chain) {
            chain.setWeight(fadeOutWeight);
          }
        });

        Object.keys(this.toState.chains || {}).forEach(chainName => {
          const chain = ikChains[chainName];
          if (chain) {
            chain.setWeight(fadeInWeight);
            // Update IK targets for the "to" animation
            const targetConfig = this.toState.chains[chainName];
            const elapsed = (Date.now() - this.toState.startTime) / 1000;
            let t = elapsed / this.toState.duration;
            if (this.toState.loop && t > 1.0) t = t % 1.0;

            const target = new THREE.Vector3(
              typeof targetConfig.x === 'function' ? targetConfig.x(t) : (targetConfig.x || 0),
              typeof targetConfig.y === 'function' ? targetConfig.y(t) : (targetConfig.y || 0),
              typeof targetConfig.z === 'function' ? targetConfig.z(t) : (targetConfig.z || 0)
            );
            chain.setTarget(target, fadeInWeight);
          }
        });
      },

      updateRegularToIKDirect: function(fadeOutWeight, fadeInWeight) {
        // Fade out regular animation completely
        if (this.fromState.action) {
          this.fromState.action.setEffectiveWeight(fadeOutWeight);
        }

        // Run IK animation at full strength from its own timeline
        // Don't blend the IK targets - let them run their own animation curves
        Object.keys(this.toState.chains || {}).forEach(chainName => {
          const chain = ikChains[chainName];
          if (chain) {
            // Set IK weight to full during crossfade - no blending of IK targets
            chain.setWeight(1.0);

            // Calculate IK targets based on the IK animation's own timeline
            const targetConfig = this.toState.chains[chainName];
            const elapsed = (Date.now() - this.toState.startTime) / 1000;
            let t = elapsed / this.toState.duration;
            if (this.toState.loop && t > 1.0) t = t % 1.0;

            const target = new THREE.Vector3(
              typeof targetConfig.x === 'function' ? targetConfig.x(t) : (targetConfig.x || 0),
              typeof targetConfig.y === 'function' ? targetConfig.y(t) : (targetConfig.y || 0),
              typeof targetConfig.z === 'function' ? targetConfig.z(t) : (targetConfig.z || 0)
            );

            // Set target without weight blending - IK runs its own animation
            chain.setTarget(target, 1.0);
          }
        });

        // The overall crossfade weight controls the global blend between the two systems
        // but the IK animation itself runs unmodified
        if (fadeInWeight < 1.0) {
          // During crossfade, we can optionally reduce the overall IK influence
          // but keep the IK animation's internal curves intact
          Object.keys(this.toState.chains || {}).forEach(chainName => {
            const chain = ikChains[chainName];
            if (chain) {
              // Apply overall crossfade weight to the IK system
              chain.setWeight(fadeInWeight);
            }
          });
        }
      },

      updateIKToRegular: function(fadeOutWeight, fadeInWeight) {
        // Fade out IK animation gradually
        Object.keys(this.fromState.chains || {}).forEach(chainName => {
          const chain = ikChains[chainName];
          if (chain) {
            chain.setWeight(fadeOutWeight);

            // Update IK targets during fade out to maintain current animation
            const targetConfig = this.fromState.chains[chainName];
            const elapsed = (Date.now() - this.fromState.startTime) / 1000;
            let t = elapsed / this.fromState.duration;
            if (this.fromState.loop && t > 1.0) t = t % 1.0;

            const target = new THREE.Vector3(
              typeof targetConfig.x === 'function' ? targetConfig.x(t) : (targetConfig.x || 0),
              typeof targetConfig.y === 'function' ? targetConfig.y(t) : (targetConfig.y || 0),
              typeof targetConfig.z === 'function' ? targetConfig.z(t) : (targetConfig.z || 0)
            );
            chain.setTarget(target, fadeOutWeight);
          }
        });

        // Fade in regular animation
        if (this.toState.action) {
          this.toState.action.setEffectiveWeight(fadeInWeight);
        }
      },

      updateRegularToRegular: function(fadeOutWeight, fadeInWeight) {
        // Standard Three.js crossfade
        if (this.fromState.action) {
          this.fromState.action.setEffectiveWeight(fadeOutWeight);
        }
        if (this.toState.action) {
          this.toState.action.setEffectiveWeight(fadeInWeight);
        }
      }
    };
  };

  // Enhanced Animation Controller
  const animationController = {
    play: (name, options = {}) => {
      const state = animationStates[name];
      if (!state) {
        console.warn(`Animation '${name}' not found`);
        return;
      }

      if (state.isIK) {
        // Store initial transform for motion animations
        if (state.motion && Object.keys(state.motion).length > 0) {
          state.initialTransform = {
            position: model.position.clone(),
            rotation: model.rotation.clone(),
            scale: model.scale.clone()
          };
        }

        // Handle IK animation
        state.isPlaying = true;
        state.startTime = Date.now();

        // Enable IK chains with full weight
        Object.keys(state.chains || {}).forEach(chainName => {
          const chain = ikChains[chainName];
          if (chain) {
            chain.setWeight(1.0);
          }
        });

        console.log(`Starting IK animation: ${name}`);
      } else if (state.action) {
        // Handle regular animation
        state.action.reset();
        state.currentSpeed = options.speed || state.baseSpeed;
        state.action.setEffectiveTimeScale(state.currentSpeed * globalSpeed);
        state.action.setLoop(options.loop || state.loop);
        state.action.clampWhenFinished = options.clamp || false;
        state.action.setEffectiveWeight(1.0);
        state.action.play();
        state.isPlaying = true;
      }
    },

    stop: (name) => {
      const state = animationStates[name];
      if (state) {
        if (state.action) {
          state.action.stop();
          state.action.setEffectiveWeight(0);
        }
        if (state.isIK) {
          // Disable IK chains used by this animation
          Object.keys(state.chains || {}).forEach(chainName => {
            const chain = ikChains[chainName];
            if (chain) chain.disable();
          });
        }
        state.isPlaying = false;
      }
    },

    setGlobalSpeed: (speed) => {
      globalSpeed = speed;
      Object.values(animationStates).forEach(state => {
        if (state.isPlaying && state.action) {
          state.action.setEffectiveTimeScale(state.currentSpeed * globalSpeed);
        }
      });
    },

    setAnimationSpeed: (name, speed) => {
      const state = animationStates[name];
      if (state && state.action) {
        state.currentSpeed = speed;
        state.action.setEffectiveTimeScale(speed * globalSpeed);
      }
    },

    setFPS: (fps) => {
      targetFPS = fps;
      animationController.setGlobalSpeed((fps / 60) * globalSpeed);
    },

    getCurrentFPS: () => targetFPS,

    createIKAnimation: (name, config) => {
      if (!enableIK || !ikSolver) {
        console.warn("IK system not enabled");
        return null;
      }

      const duration = config.duration || 1.0;

      animationStates[name] = {
        action: null,
        isIK: true,
        chains: config.chains || {},
        motion: config.motion || {},
        duration: duration,
        baseSpeed: 1.0,
        currentSpeed: 1.0,
        weight: 0,
        isPlaying: false,
        loop: config.loop !== false,
        frameCount: 0,
        fadeDuration: 0.2,
        startTime: 0,
        initialTransform: null
      };

      console.log(`Created IK animation: ${name}`);
      return animationStates[name];
    },

    getIKChains: () => enableIK ? Object.keys(ikChains) : [],

    setIKTarget: (chainName, targetPosition) => {
      if (!enableIK || !ikSolver) return;
      const chain = ikChains[chainName];
      if (chain) {
        chain.setTarget(targetPosition);
      }
    },

    crossfade: (fromName, toName, duration = 0.5) => {
      const fromState = animationStates[fromName];
      const toState = animationStates[toName];

      if (!fromState || !toState) {
        console.warn(`Cannot crossfade: missing animation(s) ${fromName} or ${toName}`);
        return;
      }

      // Stop any existing crossfades involving these animations
      const crossfadesToRemove = [];
      activeCrossfades.forEach((crossfade, id) => {
        if (crossfade.fromName === fromName || crossfade.toName === fromName ||
            crossfade.fromName === toName || crossfade.toName === toName) {
          crossfadesToRemove.push(id);
        }
      });
      crossfadesToRemove.forEach(id => activeCrossfades.delete(id));

      // Start the target animation if it's not playing
      if (!toState.isPlaying) {
        if (toState.isIK) {
          toState.isPlaying = true;
          toState.startTime = Date.now();
          // Initialize motion if needed
          if (toState.motion && Object.keys(toState.motion).length > 0) {
            toState.initialTransform = {
              position: model.position.clone(),
              rotation: model.rotation.clone(),
              scale: model.scale.clone()
            };
          }
        } else if (toState.action) {
          toState.action.reset();
          toState.action.setEffectiveWeight(0); // Start with 0 weight
          toState.action.play();
          toState.isPlaying = true;
        }
      }

      // For IK to Regular transitions, ensure the regular animation is playing with full weight initially
      // then we'll fade it in during crossfade
      if (fromState.isIK && !toState.isIK && toState.action) {
        toState.action.setEffectiveWeight(1.0);
      }

      // Create and start crossfade
      const crossfade = createCrossfade(fromName, toName, duration);
      activeCrossfades.set(crossfade.id, crossfade);

      console.log(`Starting crossfade: ${fromName} -> ${toName} (${duration}s)`);
    },

    getAnimations: () => Object.keys(animationStates),

    getCurrentAnimations: () => Object.entries(animationStates)
      .filter(([_, state]) => state.isPlaying)
      .map(([name]) => name),

    getProgress: (name) => {
      const state = animationStates[name];
      if (!state) return 0;
      if (state.isIK) {
        const elapsed = (Date.now() - state.startTime) / 1000;
        return Math.min(elapsed / state.duration, 1.0);
      }
      return state.action ? state.action.time / state.duration : 0;
    },

    update: (delta) => {
      const adjustedDelta = delta * (targetFPS / 60) * globalSpeed;

      // Update mixer for regular animations
      if (mixer) mixer.update(adjustedDelta);

      // Update active crossfades
      const completedCrossfades = [];
      activeCrossfades.forEach((crossfade, id) => {
        const isComplete = crossfade.update(adjustedDelta);
        if (isComplete) {
          completedCrossfades.push(id);
          // Clean up completed crossfade
          if (crossfade.fromState.isIK) {
            // Fully disable "from" IK chains
            Object.keys(crossfade.fromState.chains || {}).forEach(chainName => {
              const chain = ikChains[chainName];
              if (chain) chain.setWeight(0);
            });
          } else if (crossfade.fromState.action) {
            crossfade.fromState.action.setEffectiveWeight(0);
            crossfade.fromState.action.stop();
          }
          crossfade.fromState.isPlaying = false;
        }
      });
      completedCrossfades.forEach(id => activeCrossfades.delete(id));

      // Update IK animations (only those not involved in crossfades)
      Object.entries(animationStates).forEach(([name, state]) => {
        if (state.isPlaying && state.isIK) {
          // Check if this animation is involved in a crossfade
          let inCrossfade = false;
          activeCrossfades.forEach(crossfade => {
            if (crossfade.fromName === name || crossfade.toName === name) {
              inCrossfade = true;
            }
          });

          if (!inCrossfade) {
            // Update normally
            const elapsed = (Date.now() - state.startTime) / 1000;
            let t = elapsed / state.duration;

            // Handle looping
            if (state.loop && t > 1.0) {
              t = t % 1.0;
            }

            // Stop if not looping and finished
            if (!state.loop && t >= 1.0) {
              animationController.stop(name);
              return;
            }

            // Update IK targets
            Object.entries(state.chains).forEach(([chainName, targetConfig]) => {
              const chain = ikChains[chainName];
              if (chain) {
                const target = new THREE.Vector3(
                  typeof targetConfig.x === 'function' ? targetConfig.x(t) : (targetConfig.x || 0),
                  typeof targetConfig.y === 'function' ? targetConfig.y(t) : (targetConfig.y || 0),
                  typeof targetConfig.z === 'function' ? targetConfig.z(t) : (targetConfig.z || 0)
                );
                chain.setTarget(target);
              }
            });

            // Update mesh motion
            if (state.motion && state.initialTransform) {
              const motion = state.motion;

              // Update position
              if (motion.position) {
                const pos = state.initialTransform.position.clone();
                if (typeof motion.position.x === 'function') pos.x += motion.position.x(t);
                else if (motion.position.x !== undefined) pos.x += motion.position.x;

                if (typeof motion.position.y === 'function') pos.y += motion.position.y(t);
                else if (motion.position.y !== undefined) pos.y += motion.position.y;

                if (typeof motion.position.z === 'function') pos.z += motion.position.z(t);
                else if (motion.position.z !== undefined) pos.z += motion.position.z;

                model.position.copy(pos);
              }

              // Update rotation
              if (motion.rotation) {
                const rot = state.initialTransform.rotation.clone();
                if (typeof motion.rotation.x === 'function') rot.x += motion.rotation.x(t);
                else if (motion.rotation.x !== undefined) rot.x += motion.rotation.x;

                if (typeof motion.rotation.y === 'function') rot.y += motion.rotation.y(t);
                else if (motion.rotation.y !== undefined) rot.y += motion.rotation.y;

                if (typeof motion.rotation.z === 'function') rot.z += motion.rotation.z(t);
                else if (motion.rotation.z !== undefined) rot.z += motion.rotation.z;

                model.rotation.copy(rot);
              }

              // Update scale
              if (motion.scale) {
                const scale = state.initialTransform.scale.clone();
                if (typeof motion.scale.x === 'function') scale.x *= motion.scale.x(t);
                else if (motion.scale.x !== undefined) scale.x *= motion.scale.x;

                if (typeof motion.scale.y === 'function') scale.y *= motion.scale.y(t);
                else if (motion.scale.y !== undefined) scale.y *= motion.scale.y;

                if (typeof motion.scale.z === 'function') scale.z *= motion.scale.z(t);
                else if (motion.scale.z !== undefined) scale.z *= motion.scale.z;

                model.scale.copy(scale);
              }
            }

            state.frameCount++;
          }
        }
      });

      // Solve IK chains with delta for smooth blending
      if (ikSolver) {
        ikSolver.solve(adjustedDelta);
      }
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

  // Initialize IK system
  initIKSystem();

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
    ikSolver: enableIK ? ikSolver : null,
    dispose: () => {
      if (mixer) mixer.uncacheRoot(model);
    }
  };
};

window.prepEntityMotion = prepEntityMotion;
