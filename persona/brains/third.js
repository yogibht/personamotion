// right.js – full revised file with dual IK / BAKED animation pipelines
// -------------------------------------------------------------------

// IMPORTANT: Ensure THREE.js is loaded and accessible globally
// or passed into modules as needed. This script assumes THREE is available.

// ========= 1. BONE DATA (unchanged) =========================================
const BONE_DATA = [
  {
    name: "mixamorigHips",
    position: { x: 0, y: -1.41, z: -89.72 },
    parent: "ReeblyArmature"
  },
  {
    name: "mixamorigSpine",
    position: { x: 0, y: 10.98, z: -0.67 },
    parent: "mixamorigHips"
  },
  {
    name: "mixamorigSpine1",
    position: { x: 0, y: 12.84, z: 0 },
    parent: "mixamorigSpine"
  },
  {
    name: "mixamorigSpine2",
    position: { x: 0, y: 14.67, z: 0 },
    parent: "mixamorigSpine1"
  },
  {
    name: "mixamorigNeck",
    position: { x: 0, y: 16.51, z: 0 },
    parent: "mixamorigSpine2"
  },
  {
    name: "mixamorigHead",
    position: { x: 0, y: 5.9, z: 1.56 },
    parent: "mixamorigNeck"
  },
  {
    name: "mixamorigLeftShoulder",
    position: { x: 6.73, y: 14.51, z: -0.14 },
    parent: "mixamorigSpine2"
  },
  {
    name: "mixamorigLeftArm",
    position: { x: 0, y: 13.91, z: 0 },
    parent: "mixamorigLeftShoulder"
  },
  {
    name: "mixamorigLeftForeArm",
    position: { x: 0, y: 32.69, z: 0 },
    parent: "mixamorigLeftArm"
  },
  {
    name: "mixamorigLeftHand",
    position: { x: 0, y: 27.8, z: 0 },
    parent: "mixamorigLeftForeArm"
  },
  {
    name: "mixamorigRightShoulder",
    position: { x: -6.73, y: 14.51, z: -0.1 },
    parent: "mixamorigSpine2"
  },
  {
    name: "mixamorigRightArm",
    position: { x: 0, y: 13.91, z: 0 },
    parent: "mixamorigRightShoulder"
  },
  {
    name: "mixamorigRightForeArm",
    position: { x: 0, y: 32.69, z: 0 },
    parent: "mixamorigRightArm"
  },
  {
    name: "mixamorigRightHand",
    position: { x: 0, y: 27.79, z: 0 },
    parent: "mixamorigRightForeArm"
  },
  {
    name: "mixamorigLeftUpLeg",
    position: { x: 8.19, y: -6.1, z: -1.15 },
    parent: "mixamorigHips"
  },
  {
    name: "mixamorigLeftLeg",
    position: { x: 0, y: 41.49, z: 0 },
    parent: "mixamorigLeftUpLeg"
  },
  {
    name: "mixamorigLeftFoot",
    position: { x: 0, y: 32.4, z: 0 },
    parent: "mixamorigLeftLeg"
  },
  {
    name: "mixamorigRightUpLeg",
    position: { x: -8.19, y: -6.1, z: -1.05 },
    parent: "mixamorigHips"
  },
  {
    name: "mixamorigRightLeg",
    position: { x: 0, y: 41.49, z: 0 },
    parent: "mixamorigRightUpLeg"
  },
  {
    name: "mixamorigRightFoot",
    position: { x: 0, y: 32.41, z: 0 },
    parent: "mixamorigRightLeg"
  }
];

// ========= 2. BAKED ANIMATION LIST (Must be defined before its usage in Prompt Generators) =====================
const BAKED_ANIMATIONS = [
  { name: "agreeing", description: "calm nod or simple approval" },
  { name: "agreeing_loud", description: "exaggerated, vocal agreement or cheerleading" },
  { name: "bored", description: "disengaged, uninterested, mentally checked out" },
  { name: "callingyouout", description: "direct challenge or accusatory gesture, playful or critical" },
  { name: "cheering", description: "excited, celebratory, enthusiastic moment" },
  { name: "dramaticignore", description: "theatrical disinterest or intentional dismissal" },
  { name: "falling", description: "overwhelmed, sudden drop, over-the-top defeat" },
  { name: "flying", description: "imaginative, floaty, dynamic upward movement" },
  { name: "flying_distracted", description: "whimsical, aimless, light motion" },
  { name: "happyandidle", description: "cheerful, relaxed, emotionally upbeat" },
  { name: "idle", description: "default state, no strong emotion, just standing" },
  { name: "idly_breathing", description: "subtle, calm presence, waiting" },
  { name: "ignoringyou", description: "passive-aggressive or annoyed detachment" },
  { name: "lightignore", description: "slightly distracted, casual disinterest" },
  { name: "likeahobbit", description: "quirky, erratic energy, awkward charm" },
  { name: "no", description: "decisive head shake, disapproval or rejection" },
  { name: "sad", description: "withdrawn, sorrowful, emotionally down" },
  { name: "sarcastic", description: "mocking, ironic, exaggerated or dry humor" },
  { name: "sendingfacts", description: "informative, confident delivery of information" },
  { name: "shrug", description: "uncertainty, indifference, lack of commitment" },
  { name: "sit_anxious", description: "worried or stressed while seated" },
  { name: "sit_clap", description: "seated but enthusiastic, celebrating" },
  { name: "sit_down", description: "transitioning into rest or focus" },
  { name: "sit_type", description: "active, task-oriented seated interaction" },
  { name: "sit_typeready", description: "alert and prepared, in seated posture" },
  { name: "sit_wait", description: "waiting state, passive seated stance" },
  { name: "thisorthat", description: "presenting or comparing two choices" },
  { name: "TPose", description: "neutral, default pose (no emotion or motion)" },
  { name: "tunnelsnakesrules", description: "confident, meme-like exaggerated motion" },
  { name: "walk_left", description: "moving leftward with purpose" },
  { name: "walk_right", description: "moving rightward with purpose" },
  { name: "woah", description: "surprised or astonished reaction" },
  { name: "yes", description: "approving, positive affirmation" }
];


// ========= 3. PROMPT GENERATORS CLASSES ===============================

// Conceptual base class or interface for prompt generators
class BasePromptGenerator {
  constructor(animationData = []) {
    this.animationData = animationData;
    this.animationDescriptionList = animationData.map(a => `- ${a.name}: ${a.description}`).join("\n");
  }

  // To be overridden by subclasses
  generatePrompt(userPrompt, mode) {
    throw new Error("generatePrompt method must be implemented by subclasses.");
  }
}

class IKPromptGenerator extends BasePromptGenerator {
  generatePrompt(userPrompt) {
    return {
      system: `You are an animation director for a 3D character with a rigged skeleton. You must generate precise animation data in JSON format.

BONE STRUCTURE:
${JSON.stringify(BONE_DATA, null, 2)}

ANIMATION FORMAT REQUIRED:
\`\`\`json
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
\`\`\`

RULES:
- t ranges from 0 to 1 representing animation progress
- Use Math.sin, Math.cos, Math.PI for smooth movements
- Position values are in world units
- Rotation values are in radians
- Scale values are multipliers (1.0 = normal size)
- Only include bones that need to move
- Always provide valid JavaScript expressions as strings

You MUST respond ONLY with a JSON object following the schema:
\`\`\`json
{
  "content": "<your expressive reply>",
  "animation": { /* The animation JSON object as described above */ }
}
\`\`\`
Do not include any other text or conversational elements outside the JSON.`,
      user: `Create an animation for: "${userPrompt}"`,
    };
  }
}

class BakedPromptGenerator extends BasePromptGenerator {
  generatePrompt(userPrompt) {
    return {
      system: `You are an intent-aware animation selector for a 3D character.
Your task is to choose one or more animations that best represent the character's emotional state, communicative intent, or behavioral attitude in response to the user's prompt. You can also specify how these animations should be played.

Below is the list of available animations with their expressive meanings:

${this.animationDescriptionList}

Use these descriptions to guide your choice based on the tone and purpose of your response — such as conveying excitement, sadness, sarcasm, disagreement, surprise, etc.

You MUST respond ONLY with a JSON object. Do not include any other text or conversational elements.

OUTPUT JSON SCHEMA:
\`\`\`json
{
  "content": "<your expressive reply>",
  "animationOptions": {
    "name": "<string, primary animation name>",
    "sequence": "<optional, array of strings, animation names to play in sequence, e.g., [\"idle\", \"shrug\", \"walk\"]. If provided, 'name' should be the last animation in the sequence.",
    "mode": "<optional, string, 'play' or 'crossfade'. Default is 'play'. If 'sequence' is used, 'crossfade' is typically implied.>",
    "fadeDuration": "<optional, number, duration in seconds for crossfades. Default is 0.4.>",
    "loop": "<optional, number, 1 or 0. Default is 0. Use 1 for single-play animations.>"
  }
}
\`\`\`
Ensure "name" and any "sequence" animation names are from the provided list. If "sequence" is used, "name" should be the last animation in that sequence.`,
      user: `Given the user input: "${userPrompt}"\nSelect one or more appropriate animations from the list above (based on description) and generate a short expressive reply. Output only in the specified JSON format.`,
    };
  }
}

// Map LLM API names to their respective prompt generators
const LLM_PROMPT_GENERATORS = {
  GEMINI: {
    ik: new IKPromptGenerator(BAKED_ANIMATIONS),
    baked: new BakedPromptGenerator(BAKED_ANIMATIONS), // Use BAKED_ANIMATIONS here
  },
  OPENAI: {
    ik: new IKPromptGenerator(BAKED_ANIMATIONS),
    baked: new BakedPromptGenerator(BAKED_ANIMATIONS),
  },
  DEEPSEEK: {
    ik: new IKPromptGenerator(BAKED_ANIMATIONS),
    baked: new BakedPromptGenerator(BAKED_ANIMATIONS),
  },
  CLAUDE: {
    ik: new IKPromptGenerator(BAKED_ANIMATIONS),
    baked: new BakedPromptGenerator(BAKED_ANIMATIONS),
  },
  // Add more LLM APIs here
};

// Main function to get prompts for different LLMs
const getLLMPrompt = (llmApiName, userPrompt, mode = "baked") => {
  const generatorSet = LLM_PROMPT_GENERATORS[llmApiName.toUpperCase()];
  if (!generatorSet) {
    throw new Error(`Unsupported LLM API: ${llmApiName}`);
  }

  const generator = generatorSet[mode.toLowerCase()];
  if (!generator) {
    throw new Error(`Unsupported mode '${mode}' for LLM API: ${llmApiName}`);
  }

  return generator.generatePrompt(userPrompt);
};


// ========= 4. HELPERS =======================================================
let debug_prompt_count = 0;

const parseFunctionStrings = (obj) => {
  if (!obj || typeof obj !== "object") return;

  const parseValue = (val) => {
    if (typeof val === "string" && val.includes("=>")) {
      try {
        const body = val.split("=>")[1].trim();
        return new Function("t", "return " + body);
      } catch (e) {
        console.warn("Invalid function string:", val);
        return () => 0; // Return a no-op function on error
      }
    }
    return val;
  };

  for (const key in obj) {
    if (typeof obj[key] === "object" && obj[key] !== null) {
      parseFunctionStrings(obj[key]);
    } else {
      obj[key] = parseValue(obj[key]);
    }
  }
};

// ========= 5. MAIN LLM CALLER (updated) =====================================
const callAncestors = async (data) => {
  debug_prompt_count++;

  const selectedThirdBrain = 'GEMINI'; // Or pass this in `data` to make it configurable
  const mode = data.mode || "ik"; // Default to 'ik' if not specified

  try {
    const promptData = getLLMPrompt(selectedThirdBrain, data.prompt, mode);

    let llmPayload;
    switch (selectedThirdBrain) {
      case 'GEMINI':
        llmPayload = {
          contents: [
            { role: "user", parts: [{ text: promptData.system + "\n\n" + promptData.user }] }
          ]
        };
        break;
      case 'OPENAI':
        llmPayload = {
          model: "gpt-4-turbo",
          messages: [
            { role: "system", content: promptData.system },
            { role: "user", content: promptData.user }
          ],
          response_format: { type: "json_object" }
        };
        break;
      case 'DEEPSEEK':
        llmPayload = {
          model: 'deepseek-chat',
          messages: [
            { role: "system", content: promptData.system },
            { role: "user", content: promptData.user }
          ],
          "stream": false
        };
        break;
      case 'CLAUDE':
        llmPayload = {
          model: "claude-3-sonnet-20240229",
          max_tokens: 1024,
          messages: [
            { role: "user", content: `Here are the instructions: ${promptData.system}\n\n${promptData.user}` }
          ],
        };
        break;
      default:
        throw new Error(`Payload generation not implemented for LLM: ${selectedThirdBrain}`);
    }

    const homecall = await UTILITIES.remoteRequest({
      userData: llmPayload,
      APIKEY: data.ENV.API[selectedThirdBrain].key,
      URL: data.ENV.API[selectedThirdBrain].url,
      model: selectedThirdBrain
    });

    let processedcall = JSON.parse(homecall);

    let response_text = '';
    if (selectedThirdBrain === 'GEMINI') {
      response_text = processedcall?.candidates?.[0]?.content?.parts?.[0]?.text;
    } else if (selectedThirdBrain === 'OPENAI' || selectedThirdBrain === 'DEEPSEEK') {
      response_text = processedcall?.choices?.[0]?.message?.content;
    } else if (selectedThirdBrain === 'CLAUDE') {
      response_text = processedcall?.content?.[0]?.text;
    }

    if (!response_text) {
      throw new Error("LLM response text is empty or ill-formatted.");
    }

    let animationData = null;
    let AIResponse = null;
    let cleanedText = response_text.trim();

    cleanedText = cleanedText.replace(/^```(?:json)?\s*|```\s*$/g, '').trim();

    cleanedText = cleanedText.replace(/"(.*?)=>([\s\S]*?)"/g, (match, p1, p2) => {
      return `"${p1}=>${p2.replace(/[\n\r]/g, " ")}"`;
    });

    cleanedText = cleanedText.replace(/,\s*([}\]])/g, "$1");

    try {
      const parsedLLMResponse = JSON.parse(cleanedText);

      if (mode === "baked") {
        // BAKED MODE: Expect { content: "...", animationOptions: { ... } }
        // Extract content and animation options
        AIResponse = parsedLLMResponse.content;
        animationData = {
          mode: "baked",
          // Pass all options directly to the animationController.play method
          // The 'name' property is now part of animationOptions
          ...parsedLLMResponse.animationOptions
        };
        // Ensure that if sequence is provided, the main 'name' is the last in the sequence
        if (animationData.sequence && animationData.sequence.length > 0) {
            animationData.name = animationData.sequence[animationData.sequence.length - 1];
        } else if (!animationData.name) {
            // Fallback if no sequence and no name is provided (shouldn't happen with good LLM output)
            console.warn("Baked animation response missing 'name' or 'sequence' in animationOptions.");
            animationData.name = "idle"; // Default to idle
        }

      } else { // IK MODE
        // IK MODE: Expect { content: "...", animation: { ... } }
        if (parsedLLMResponse?.animation) {
          parseFunctionStrings(parsedLLMResponse.animation.chains);
          parseFunctionStrings(parsedLLMResponse.animation.motion);
          animationData = parsedLLMResponse.animation;
        }
        if (parsedLLMResponse?.content) {
          AIResponse = parsedLLMResponse.content;
        }
      }
    } catch (e) {
      console.warn("Failed to parse JSON animation block or LLM response:", e);
      console.warn("Problematic cleaned JSON:\n", cleanedText);
      AIResponse = "Sorry, I couldn't generate a valid animation or response right now.";
    }

    const responseContent = `
      <div class="personamotion-responseItem">
        <h2 style="margin-top: 0; color: #3498db; text-transform: uppercase; letter-spacing: 2px;">
        Prompt: ${data.prompt}
        </h2>
        <p style="font-size: 1.1em; line-height: 1.6; margin-bottom: 0;">
        ${AIResponse || "Animation generated."}
        </p>
      </div>
    `;

    $STATE.set("promptResponse", {
      data: response_text, // Keep raw LLM text for debug if needed
      html: responseContent,
      animationData,
      content: AIResponse
    });
  } catch (err) {
    console.error("Error in callAncestors:", err);
    $STATE.set("promptResponse", {
      data: null,
      html: `
        <div style="background-color: #e74c3c;
                    color: #ecf0f1;
                    font-family: 'Arial', sans-serif;
                    padding: 2em;
                    border-radius: 12px;
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
                    text-align: center;
                    max-width: 400px;
                    margin: 2em auto;">
          <h2 style="margin-top: 0; color: #fff;">Error!</h2>
          <p style="font-size: 1.1em;">Failed to get a response from the AI. Please try again.</p>
          <p style="font-size: 0.9em; opacity: 0.8;">Details: ${err.message}</p>
        </div>
      `,
      animationData: null,
      content: "Failed to get a response from the AI."
    });
  }
};

// ========= 6. INITIALISATION ===============================================
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

  $STATE.subscribe("callAncestors", callAncestors);
};

window.initiateRightBrain = initiateRightBrain;
