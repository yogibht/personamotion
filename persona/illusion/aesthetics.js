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
    uniform vec2 uResolution;

    void main() {
        // The resolution must be passed in this specific format.
        vec2 resolution = uResolution;

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
    uniform vec2 uResolution;
    void main() {
      vec2 uv = gl_FragCoord.xy / uResolution;
      vec4 color = texture2D(tDiffuse, uv);
      float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
      gl_FragColor = vec4(vec3(gray) * ${glslColorMult}, color.a);
    }
    `;

  const fragmentShaderText_vignette_02 = `
    uniform sampler2D tDiffuse;
    uniform vec2 uResolution;
      void main() {
        vec2 uv = gl_FragCoord.xy / uResolution;
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
    uniform vec2 uResolution;
      void main() {
        vec2 resolution = uResolution;
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
    uniform vec2 uResolution;
      void main() {
        vec2 resolution = uResolution;
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
    uniform vec2 uResolution;
      void main() {
        vec2 resolution = uResolution;
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
    uniform vec2 uResolution;

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
      vec2 resolution = uResolution;
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
    uniform vec2 uResolution;

    void main() {
    vec2 resolution = uResolution;
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
    uniform vec2 uResolution;

    // Simple random function
    float random(vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
    }

    void main() {
    vec2 resolution = uResolution;
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
    uniform vec2 uResolution;

    void main() {
        // The resolution must be passed in this specific format.
        vec2 resolution = uResolution;

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
    uniform vec2 uResolution;

    void main() {
        // The resolution must be passed in this specific format.
        vec2 resolution = uResolution;

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
    uniform vec2 uResolution;

    void main() {
        // The resolution must be passed in this specific format.
        vec2 resolution = uResolution;

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
    uniform vec2 uResolution;

    void main() {
        vec2 resolution = uResolution;
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
    uniform vec2 uResolution;

    void main() {
        vec2 resolution = uResolution;
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
    uniform vec2 uResolution;

    void main() {
        vec2 resolution = uResolution;
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
    uniform vec2 uResolution;

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
        vec2 resolution = uResolution;
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
      uTime: { value: 0.0 },
      uResolution: { value: new THREE.Vector2(width, height) }
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
    uDisplacementRange: { value: 1 },
    colorNodePos: { value: new THREE.Color(0xcc00cc) },
    colorNodeNeg: { value: new THREE.Color(0x77aa00) },
    colorLinkPos: { value: new THREE.Color(0xd94f00) },
    colorLinkNeg: { value: new THREE.Color(0x7700ee) },
    colorFresnel: { value: new THREE.Color(0x0099cc) },
    colorGrid:    { value: new THREE.Color(0xe8e8e8) },
    colorVoronoiEdge: { value: new THREE.Color(0xcccccc) }
  };

  const sphereGeo = new THREE.SphereGeometry(1, 128, 64);
  const sphereMat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: `
    uniform sampler2D nodeTex;
    uniform float nodeCnt;
    uniform float uDisplacementRange;
    varying float vBias;

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

    displaced += normal * displacementAmount;
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
  let disposed = false;

  const spherePos = (i, total, layer, maxLayer) => {
    const y = 1.0 - 2.0 * (i / total);
    const radius = Math.sqrt(1.0 - y * y);
    const theta = Math.PI * (3.0 - Math.sqrt(5.0)) * i + layer * 0.2;
    return new THREE.Vector3(radius * Math.cos(theta), y, radius * Math.sin(theta));
  }

  const updateGraph = (graph) => {
    if (disposed) return;

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

  const animate = (cam, t) => {
    if (disposed) return;

    sphereMat.uniforms.proj.value.copy(cam.projectionMatrix);
    sphereMat.uniforms.view.value.copy(cam.matrixWorldInverse);
    group.rotation.y += 0.005;
  }

  const dispose = () => {
    if (disposed) return;
    disposed = true;

    // Remove from scene
    if (scene && group.parent === scene) {
      scene.remove(group);
    }

    // Dispose geometry
    if (sphereGeo) {
      sphereGeo.dispose();
    }

    // Dispose material and its uniforms
    if (sphereMat) {
      // Dispose textures in uniforms
      if (sphereMat.uniforms.nodeTex?.value) {
        sphereMat.uniforms.nodeTex.value.dispose();
      }
      if (sphereMat.uniforms.linkTex?.value) {
        sphereMat.uniforms.linkTex.value.dispose();
      }

      sphereMat.dispose();
    }

    // Dispose textures
    if (nodeTex) {
      nodeTex.dispose();
    }
    if (linkTex) {
      linkTex.dispose();
    }

    // Clear data structures
    nodeMap.clear();

    // Clear mesh references
    if (sphereMesh) {
      sphereMesh.geometry = null;
      sphereMesh.material = null;
    }

    // Clear group children
    while (group.children.length > 0) {
      const child = group.children[0];
      group.remove(child);
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    }
  }

  updateGraph(initialGraph || { nodes: [], links: [] });

  return {
    updateGraph,
    animate,
    dispose,
    setScale: s => !disposed && sphereMesh.scale.setScalar(s),
    toggle: v => !disposed && (sphereMesh.visible = v)
  };
};

const createGalaxyBrainViz = (scene, initialGraph, props = {}) => {
  const MAX_PARTICLES = 8192;

  const group = new THREE.Group();
  group.scale.set(0.5, 0.5, 0.5);
  group.position.y = 2.5;
  scene.add(group);

  let disposed = false;
  let circleTexture = null;

  // Create circular particle texture
  const createCircleTexture = () => {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.4, 'rgba(255,255,255,0.8)');
    gradient.addColorStop(0.7, 'rgba(255,255,255,0.3)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  };

  circleTexture = createCircleTexture();

  const uniforms = {
    uSize: { value: props.particleSize || 1.5 },
    uTime: { value: 0.0 },
    uMap: { value: circleTexture },
    uBrightness: { value: props.brightness || 2.0 }
  };

  const vertexShader = `
    uniform mat4 projectionMatrix;
    uniform mat4 modelMatrix;
    uniform mat4 viewMatrix;

    attribute vec3 position;
    attribute vec3 color;
    attribute float aScale;
    attribute float aDistance;
    attribute float aNeuralInfluence;
    attribute float aArmIndex;

    uniform float uTime;
    uniform float uSize;

    varying vec3 vColor;
    varying float vDistance;
    varying float vNeuralInfluence;

    void main() {
        vec4 modelPosition = modelMatrix * vec4(position, 1.0);
        vec4 viewPosition = viewMatrix * modelPosition;
        vec4 projectedPosition = projectionMatrix * viewPosition;
        gl_Position = projectedPosition;

        float neuralBrightening = (1.0 + aNeuralInfluence * 2.0);
        float distanceAttenuation = (1.0 - aDistance * 0.3);
        gl_PointSize = uSize * aScale * neuralBrightening * distanceAttenuation;
        gl_PointSize *= (1.0 / -viewPosition.z);

        vColor = color;
        vDistance = aDistance;
        vNeuralInfluence = aNeuralInfluence;
    }
  `;

  const fragmentShader = `
    precision highp float;

    uniform sampler2D uMap;
    uniform float uBrightness;

    varying vec3 vColor;
    varying float vDistance;
    varying float vNeuralInfluence;

    float hash21(in vec2 n) {
        return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
    }

    float neuralFiring(vec2 p, float influence) {
        vec2 i = floor(p * 8.0);
        vec2 f = fract(p * 8.0);

        float a = hash21(i + influence * 10.0);
        float b = hash21(i + vec2(1.0, 0.0) + influence * 10.0);
        float c = hash21(i + vec2(0.0, 1.0) + influence * 10.0);
        float d = hash21(i + vec2(1.0, 1.0) + influence * 10.0);

        vec2 u = f * f * (3.0 - 2.0 * f);

        float noise = mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;

        return step(0.5, noise) * (noise * 0.8 + 0.2);
    }

    void main() {
        vec2 uv = vec2(gl_PointCoord.x, 1.0 - gl_PointCoord.y);

        vec4 pointTexture = texture2D(uMap, uv);
        if (pointTexture.a < 0.1) discard;

        float firing = neuralFiring(gl_PointCoord.xy, vNeuralInfluence);
        float neuralPulse = vNeuralInfluence * firing * 0.8 + 0.2;

        vec3 finalColor = vColor * pointTexture.rgb;

        float neuralGlow = 1.0 + vNeuralInfluence * neuralPulse * 2.0;
        float distanceDim = 1.0 - vDistance * 0.4;

        gl_FragColor = vec4(finalColor * neuralGlow * distanceDim, pointTexture.a) * uBrightness;
    }
  `;

  const geometry = new THREE.BufferGeometry();
  const vertices = new Float32Array(MAX_PARTICLES * 3);
  const colors = new Float32Array(MAX_PARTICLES * 3);
  const scales = new Float32Array(MAX_PARTICLES);
  const distances = new Float32Array(MAX_PARTICLES);
  const neuralInfluences = new Float32Array(MAX_PARTICLES);
  const armIndices = new Float32Array(MAX_PARTICLES);

  geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));
  geometry.setAttribute('aDistance', new THREE.BufferAttribute(distances, 1));
  geometry.setAttribute('aNeuralInfluence', new THREE.BufferAttribute(neuralInfluences, 1));
  geometry.setAttribute('aArmIndex', new THREE.BufferAttribute(armIndices, 1));

  const material = new THREE.RawShaderMaterial({
    uniforms: uniforms,
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  const galaxyPoints = new THREE.Points(geometry, material);
  group.add(galaxyPoints);

  let particleCount = 0;

  const generateGalaxyFromBrain = (graph) => {
    if (disposed) return;

    const nodes = graph.nodes || [];
    const links = graph.links || [];

    const connectionMap = new Map();
    nodes.forEach(node => {
      connectionMap.set(node.id, {
        connections: 0,
        totalWeight: 0,
        bias: typeof node.bias === 'number' ? node.bias : 0
      });
    });

    links.forEach(link => {
      const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
      const targetId = typeof link.target === 'object' ? link.target.id : link.target;
      const weight = Math.abs(link.bias || 0);

      [sourceId, targetId].forEach(id => {
        if (connectionMap.has(id)) {
          const info = connectionMap.get(id);
          info.connections++;
          info.totalWeight += weight;
        }
      });
    });

    particleCount = 0;
    const connectionValues = Array.from(connectionMap.values());
    const maxConnections = Math.max(1, ...connectionValues.map(c => c.connections));
    const majorHubs = nodes
      .filter(n => connectionMap.get(n.id).connections > 0)
      .sort((a, b) => connectionMap.get(b.id).connections - connectionMap.get(a.id).connections)
      .slice(0, typeof props.numArms === 'number' ? props.numArms : Math.min(6, Math.max(2, Math.floor(nodes.length / 10))));

    const armCount = majorHubs.length;
    const particlesPerArm = Math.floor(MAX_PARTICLES * 0.4 / armCount);
    const randomParticles = MAX_PARTICLES - (particlesPerArm * armCount);
    let maxDistance = 0;

    const colorFromBias = (bias, dim = false) => {
      const clamped = Math.max(-1, Math.min(1, bias));
      const t = (clamped + 1) / 2;

      let hue = 0.67 - t * 0.67;
      let sat = dim ? 0.6 : 0.9;
      let light = dim ? 0.3 + t * 0.2 : 0.5 + t * 0.3;

      return new THREE.Color().setHSL(hue, sat, light);
    };

    // Generate spiral arms from major hubs
    majorHubs.forEach((hub, armIndex) => {
      const info = connectionMap.get(hub.id);
      const sizeFactor = info.connections / maxConnections;
      const spiralTightness = (props.spiralTightness || 4.0) * (1 + sizeFactor);

      for (let i = 0; i < particlesPerArm && particleCount < MAX_PARTICLES; i++) {
        const norm = i / particlesPerArm;
        const angle = (armIndex / armCount) * Math.PI * 2 + norm * spiralTightness;

        const radius = 0.2 + norm * (1.2 + sizeFactor * 0.8);
        const radiusVar = (Math.random() - 0.5) * 0.1;
        const thetaVar = (Math.random() - 0.5) * 0.05;

        const finalRadius = radius + radiusVar;
        const finalTheta = angle + thetaVar;

        const x = Math.cos(finalTheta) * finalRadius;
        const y = (Math.random() - 0.5) * 0.05 * (1 - norm * 0.7);
        const z = Math.sin(finalTheta) * finalRadius;

        vertices.set([x, y, z], particleCount * 3);
        maxDistance = Math.max(maxDistance, finalRadius);

        const color = colorFromBias(info.bias);
        colors.set([color.r, color.g, color.b], particleCount * 3);

        scales[particleCount] = 0.5 + sizeFactor * 1.5;
        distances[particleCount] = norm;
        neuralInfluences[particleCount] = sizeFactor * (0.5 + Math.random() * 0.5);
        armIndices[particleCount] = armIndex;

        particleCount++;
      }
    });

    // Fill remaining with background particles
    const backgroundNodes = nodes.filter(n => !majorHubs.includes(n));

    for (let i = 0; i < randomParticles && particleCount < MAX_PARTICLES; i++) {
      const node = backgroundNodes[i % backgroundNodes.length];
      const info = connectionMap.get(node.id) || { connections: 0, bias: 0 };

      const radius = Math.pow(Math.random(), 0.7) * 1.5;
      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.5) * Math.PI * 0.1;

      const x = Math.cos(theta) * Math.cos(phi) * radius;
      const y = Math.sin(phi) * radius * 0.2;
      const z = Math.sin(theta) * Math.cos(phi) * radius;

      vertices.set([x, y, z], particleCount * 3);
      maxDistance = Math.max(maxDistance, radius);

      const color = colorFromBias(info.bias, true);
      colors.set([color.r, color.g, color.b], particleCount * 3);

      const sizeFactor = info.connections / maxConnections;
      scales[particleCount] = 0.2 + sizeFactor * 1.0;
      distances[particleCount] = radius / maxDistance;
      neuralInfluences[particleCount] = sizeFactor * (0.2 + Math.random() * 0.3);
      armIndices[particleCount] = -1;

      particleCount++;
    }

    // Normalize distances
    for (let i = 0; i < particleCount; i++) {
      const x = vertices[i * 3], z = vertices[i * 3 + 2];
      const r = Math.sqrt(x * x + z * z);
      distances[i] = r / maxDistance;
    }

    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;
    geometry.attributes.aScale.needsUpdate = true;
    geometry.attributes.aDistance.needsUpdate = true;
    geometry.attributes.aNeuralInfluence.needsUpdate = true;
    geometry.attributes.aArmIndex.needsUpdate = true;

    geometry.setDrawRange(0, particleCount);
  }

  const updateGraph = (graph) => {
    if (!disposed) {
      generateGalaxyFromBrain(graph);
    }
  }

  const animate = (camera, time) => {
    if (disposed) return;

    group.rotation.y += 0.002;
    group.rotation.x = UTILITIES.toRadian(35) + Math.sin(time * 0.001) * 0.05;
    group.rotation.z = Math.cos(time * 0.0015) * 0.03;
  }

  const dispose = () => {
    if (disposed) return;
    disposed = true;

    // Remove from scene
    if (scene && group.parent === scene) {
      scene.remove(group);
    }

    // Dispose geometry and its attributes
    if (geometry) {
      geometry.dispose();
    }

    // Dispose material and its uniforms
    if (material) {
      // Dispose textures in uniforms
      if (material.uniforms.uMap?.value) {
        material.uniforms.uMap.value.dispose();
      }
      material.dispose();
    }

    // Dispose the circle texture
    if (circleTexture) {
      circleTexture.dispose();
      circleTexture = null;
    }

    // Clear points mesh references
    if (galaxyPoints) {
      galaxyPoints.geometry = null;
      galaxyPoints.material = null;
    }

    // Clear group children
    while (group.children.length > 0) {
      const child = group.children[0];
      group.remove(child);
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    }

    // Clear typed arrays (help GC)
    vertices.fill(0);
    colors.fill(0);
    scales.fill(0);
    distances.fill(0);
    neuralInfluences.fill(0);
    armIndices.fill(0);
  }

  // Initialize
  updateGraph(initialGraph || { nodes: [], links: [] });

  return {
    updateGraph,
    animate,
    dispose,
    setScale: (s) => !disposed && group.scale.setScalar(s),
    toggle: (visible) => !disposed && (group.visible = visible),
    setBrightness: (brightness) => !disposed && (uniforms.uBrightness.value = brightness),
    setParticleSize: (size) => !disposed && (uniforms.uSize.value = size)
  };
};

window.createShaderMaterial = createShaderMaterial;
window.createDebugMaterial = createDebugMaterial;
window.createPostProcessingShader = createPostProcessingShader;
window.createLivingBrainViz = createLivingBrainViz;
window.createGalaxyBrainViz = createGalaxyBrainViz;

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
