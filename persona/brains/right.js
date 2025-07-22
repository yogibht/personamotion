const BONE_DATA = [
  {
    "name": "mixamorigHips",
    "position": { "x": 0, "y": -1.41, "z": -89.72 },
    "parent": "ReeblyArmature"
  },
  {
    "name": "mixamorigSpine",
    "position": { "x": 0, "y": 10.98, "z": -0.67 },
    "parent": "mixamorigHips"
  },
  {
    "name": "mixamorigSpine1",
    "position": { "x": 0, "y": 12.84, "z": 0 },
    "parent": "mixamorigSpine"
  },
  {
    "name": "mixamorigSpine2",
    "position": { "x": 0, "y": 14.67, "z": 0 },
    "parent": "mixamorigSpine1"
  },
  {
    "name": "mixamorigNeck",
    "position": { "x": 0, "y": 16.51, "z": 0 },
    "parent": "mixamorigSpine2"
  },
  {
    "name": "mixamorigHead",
    "position": { "x": 0, "y": 5.90, "z": 1.56 },
    "parent": "mixamorigNeck"
  },
  {
    "name": "mixamorigLeftShoulder",
    "position": { "x": 6.73, "y": 14.51, "z": -0.14 },
    "parent": "mixamorigSpine2"
  },
  {
    "name": "mixamorigLeftArm",
    "position": { "x": 0, "y": 13.91, "z": 0 },
    "parent": "mixamorigLeftShoulder"
  },
  {
    "name": "mixamorigLeftForeArm",
    "position": { "x": 0, "y": 32.69, "z": 0 },
    "parent": "mixamorigLeftArm"
  },
  {
    "name": "mixamorigLeftHand",
    "position": { "x": 0, "y": 27.80, "z": 0 },
    "parent": "mixamorigLeftForeArm"
  },
  {
    "name": "mixamorigRightShoulder",
    "position": { "x": -6.73, "y": 14.51, "z": -0.10 },
    "parent": "mixamorigSpine2"
  },
  {
    "name": "mixamorigRightArm",
    "position": { "x": 0, "y": 13.91, "z": 0 },
    "parent": "mixamorigRightShoulder"
  },
  {
    "name": "mixamorigRightForeArm",
    "position": { "x": 0, "y": 32.69, "z": 0 },
    "parent": "mixamorigRightArm"
  },
  {
    "name": "mixamorigRightHand",
    "position": { "x": 0, "y": 27.79, "z": 0 },
    "parent": "mixamorigRightForeArm"
  },
  {
    "name": "mixamorigLeftUpLeg",
    "position": { "x": 8.19, "y": -6.10, "z": -1.15 },
    "parent": "mixamorigHips"
  },
  {
    "name": "mixamorigLeftLeg",
    "position": { "x": 0, "y": 41.49, "z": 0 },
    "parent": "mixamorigLeftUpLeg"
  },
  {
    "name": "mixamorigLeftFoot",
    "position": { "x": 0, "y": 32.40, "z": 0 },
    "parent": "mixamorigLeftLeg"
  },
  {
    "name": "mixamorigRightUpLeg",
    "position": { "x": -8.19, "y": -6.10, "z": -1.05 },
    "parent": "mixamorigHips"
  },
  {
    "name": "mixamorigRightLeg",
    "position": { "x": 0, "y": 41.49, "z": 0 },
    "parent": "mixamorigRightUpLeg"
  },
  {
    "name": "mixamorigRightFoot",
    "position": { "x": 0, "y": 32.41, "z": 0 },
    "parent": "mixamorigRightLeg"
  }
];

const ANIMATION_INSTRUCTIONS = {
  system: `You are an animation director for a 3D character with a Mixamo-rigged skeleton. You must generate precise animation data in JSON format.

BONE STRUCTURE:
${JSON.stringify(BONE_DATA, null, 2)}

ANIMATION FORMAT REQUIRED:
{
  "animationName": "descriptive_name",
  "duration": 2.0,
  "loop": true/false,
  "chains": {
    "boneName": {
      "x": "(t) => mathematical_expression",
      "y": "(t) => mathematical_expression",
      "z": "(t) => mathematical_expression"
    }
  },
  "motion": {
    "position": {
      "x": "(t) => mathematical_expression",
      "y": "(t) => mathematical_expression",
      "z": "(t) => mathematical_expression"
    },
    "rotation": {
      "x": "(t) => mathematical_expression",
      "y": "(t) => mathematical_expression",
      "z": "(t) => mathematical_expression"
    },
    "scale": {
      "x": "(t) => mathematical_expression",
      "y": "(t) => mathematical_expression",
      "z": "(t) => mathematical_expression"
    }
  }
}

RULES:
- t ranges from 0 to 1 representing animation progress
- Use Math.sin, Math.cos, Math.PI for smooth movements
- Position values are in world units
- Rotation values are in radians
- Scale values are multipliers (1.0 = normal size)
- Only include bones that need to move
- Always provide valid JavaScript expressions as strings

Examples:
- Wave: "Math.sin(t * Math.PI * 2)"
- Bounce: "Math.abs(Math.sin(t * Math.PI * 4))"
- Ease in/out: "0.5 * (1 - Math.cos(t * Math.PI))"

ONLY RESPOND WITH JSON`,

  prompt: (action) => `Create an animation for: "${action}" And your response should be in this schema: { content: $you_response_goes_here, animation: $animationjsondata_as_required_goes_here }`
};

let debug_prompt_count = 0;

const parseFunctionStrings = (obj) => {
  if (!obj || typeof obj !== 'object') return;

  const parseValue = (val) => {
    if (typeof val === 'string' && val.includes('=>')) {
      try {
        const body = val.split('=>')[1].trim();
        return new Function('t', 'return ' + body);
      } catch (e) {
        console.warn('Invalid function string:', val);
        return () => 0;
      }
    }
    return val;
  };

  for (const key in obj) {
    if (typeof obj[key] === 'object') {
      parseFunctionStrings(obj[key]);
    } else {
      obj[key] = parseValue(obj[key]);
    }
  }
};

const callAncestors = async (data) => {
  debug_prompt_count++;

  const promptText = `System Prompt: ${ANIMATION_INSTRUCTIONS.system}\nUser Prompt: \n${ANIMATION_INSTRUCTIONS.prompt(data.prompt)}`;

  const ancestorData = {
    contents: [{
      parts: [{ text: promptText }]
    }]
  };

  try {
    const homecall = await UTILITIES.remoteRequest(ancestorData, data.ENV.API.GEMINI.key, data.ENV.API.GEMINI.url);
    const processedcall = JSON.parse(homecall);
    const response_text = processedcall.candidates[0].content.parts[0].text;

    let animationData = null;
    let AIResponse = null;
    let cleanedText = response_text.trim();

    // Step 1: Remove markdown block fences
    if (cleanedText.startsWith('```json')) cleanedText = cleanedText.slice(7);
    if (cleanedText.endsWith('```')) cleanedText = cleanedText.slice(0, -3);

    // Step 2: Remove newlines inside strings like "(t) => ..."
    cleanedText = cleanedText.replace(/"(.*?)=>[\s\S]*?"/g, (match) => {
      return match.replace(/\n/g, ' ').replace(/\r/g, ' ');
    });

    // Step 3: Remove trailing commas before closing brackets
    cleanedText = cleanedText.replace(/,\s*([}\]])/g, '$1');

    try {
      const maybeJSON = JSON.parse(cleanedText);
      console.log(maybeJSON);
      if (maybeJSON && maybeJSON.animation) {
        parseFunctionStrings(maybeJSON.animation.chains);
        parseFunctionStrings(maybeJSON.animation.motion);
        animationData = maybeJSON.animation;
      }
      if (maybeJSON && maybeJSON.content) {
        AIResponse = maybeJSON.content
      }
    } catch (e) {
      console.warn('Failed to parse JSON animation block:', e);
      console.warn('Problematic cleaned JSON:\n', cleanedText);
    }


    const responseContent = `
      <div style="background-color: #2c3e50;
                  color: #ecf0f1;
                  font-family: 'Arial', sans-serif;
                  padding: 2em;
                  border-radius: 12px;
                  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
                  text-align: center;
                  max-width: 400px;
                  margin: 2em auto;
                  border: 2px solid #3498db;
                  transition: transform 0.2s ease-in-out, background-color 0.2s ease-in-out;">
        <h2 style="margin-top: 0; color: #3498db; text-transform: uppercase; letter-spacing: 2px;">
        Prompt: ${data.prompt}
        </h2>
        <p style="font-size: 1.1em; line-height: 1.6; margin-bottom: 0;">
        ${AIResponse}
        </p>
      </div>
    `;

    $STATE.set('promptResponse', {
      data: response_text,
      html: responseContent,
      animationData
    });

  } catch (err) {
    console.error(err);
  }
};

const initiateRightBrain = async () => {
  const globalData = {
    containerNeedsUpdate: true,
    containerHeight: 0,
    containerWidth: 0,
    toggleUI: false
  };

  for (const key in globalData) {
    $STATE.set(key, globalData[key]);
  }

  $STATE.subscribe('callAncestors', callAncestors);
};

window.initiateRightBrain = initiateRightBrain;
