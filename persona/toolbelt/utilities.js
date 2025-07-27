const uuidv4 = ()=>{
    const _M = randomInt(6, 1);
    const _N = ["8", "9", "a", "b"][randomInt(3)];
    const placeholder = `xxxxxxxx-xxxx-${_M}xxx-${_N}xxx-xxxxxxxxxxxx`
    return placeholder.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

const randomInt = (max, min=0, seedstring)=>{
    if(seedstring){
        const randfunc = mulberry32(seedstring);
        const rand = randfunc();
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(rand * (max - min) + min);
    }
    else{
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min) + min);
    }
}

const randomFloat = (max=1.0, min=0.0)=>{
    return Math.random() * (max - min) + min;
}

const generateSeed = (seed_string)=>{
    if(!seed_string){
        seed_string = Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 12);
    }
    const newseed = xmur3(seed_string);
    return newseed();
}

const xmur3 = (seed_string)=>{
    for(var i = 0, h = 1779033703 ^ seed_string.length; i < seed_string.length; i++)
        h = Math.imul(h ^ seed_string.charCodeAt(i), 3432918353),
        h = h << 13 | h >>> 19;
    return function(){
        h = Math.imul(h ^ h >>> 16, 2246822507);
        h = Math.imul(h ^ h >>> 13, 3266489909);
        return (h ^= h >>> 16) >>> 0;
    }
}

const mulberry32 = (a)=>{
    return function() {
      var t = a += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}

const easeIn = (start, end, t) => start + (end - start) * (t * t);

const easeOut = (start, end, t) => start + (end - start) * (1 - (1 - t) * (1 - t));

const easeInOut = (start, end, t) => start + (end - start) * ((t < 0.5) ? (2 * t * t) : (-1 + (4 - 2 * t) * t));

const easeOutQuad = (n)=>{
    return 1 - (1 - n) * (1 - n);
}

const easeOutBounce = (x)=>{
    const n1 = 7.5625;
    const d1 = 2.75;

    if (x < 1 / d1) {
        return n1 * x * x;
    } else if (x < 2 / d1) {
        return n1 * (x -= 1.5 / d1) * x + 0.75;
    } else if (x < 2.5 / d1) {
        return n1 * (x -= 2.25 / d1) * x + 0.9375;
    } else {
        return n1 * (x -= 2.625 / d1) * x + 0.984375;
    }
}

const toRadian = (x)=>{
    return x * Math.PI/180;
}

const toDegree = (x)=>{
    return x * 180/Math.PI;
}

const lerp = (n1, n2, alpha)=>{
    return (1 - alpha) * n1 + alpha * n2;
    // return a + (b - a) * alpha;
}

const clamp = (a, min=0, max=1)=>{
    return Math.min(max, Math.max(min, a));
}

const inverseLerp = (x, y, a)=>{
    return clamp((a - x) / (y - x));
}

const loadResource = (filepath, type="text")=>{
    return new Promise((resolve, reject)=>{
        fetch(filepath, {
            method: "GET",
            mode: "no-cors"
        })
        .then(response=>{
            if(response.ok){
                if(type==="blob") resolve(response.blob());
                else if(type==="json") resolve(response.json());
                else resolve(response.text());
            }
            else reject("Invalid File")
        })
        .then(resData=>{/*console.log(resData);*/})
        .catch((error)=>{
            console.log(error);
            reject(error);
        });
    });
};

const findFPS = ()=> {
	return new Promise((resolve, reject)=>{
		const fpslist = [];
		let count = 250;    // 250 frame sampled
		let then = 0;
		const FPSLoop = (now) => {
			if(count > 0) requestAnimationFrame(FPSLoop);
			else{
				const avgFPS = fpslist.reduce((a, b) => a + b) / fpslist.length;
				resolve(avgFPS);
			}

			now *= 0.001;
			const deltaTime = now - then;
			then = now;
			const fps = 1 / deltaTime;

			fpslist.push(fps);

			count--;
		};
		requestAnimationFrame(FPSLoop);
	});
};

const remoteRequest = async ({
  userData,
  APIKEY,
  URL,
  model
}) => {

  if (!model) model = 'GEMINI';

  try {
    const headers = {
      'Content-Type': 'application/json',
      'X-goog-api-key': APIKEY
    };
    if(model === 'DEEPSEEK' || model === 'OPENAI'){
      delete headers['X-goog-api-key'];
      headers['Authorization'] = `Bearer ${APIKEY}`;
    }
    else if(model === 'CLAUDE'){
      delete headers['X-goog-api-key'];
      headers['x-api-key'] = APIKEY;
      headers['anthropic-version'] = '2023-06-01';
    }
    const response = await fetch(URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(userData)
    });
    if(model === 'GEMINI'){
      const data = await response.text();
      return data;
    }
    else{
      const data = await response.json();
      console.log('Response Data: ', data);
      return data.response;
    }
  }
  catch(err){
    console.error(err);
  }
};

const BREAKPOINTS = {
    MOBILE: 768,
    TABLET: 1024
};

const checkDeviceType = () => {
    const width = window.innerWidth;

    // Primary width-based checks
    if (width <= BREAKPOINTS.MOBILE) {
        return DEVICETYPES.MOBILE;
    }
    if (width <= BREAKPOINTS.TABLET) {
        return DEVICETYPES.TABLET;
    }
    if (width > BREAKPOINTS.TABLET) {
        return DEVICETYPES.DESKTOP;
    }

    // Fallback to user agent checks
    const ua = navigator.userAgent;
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
        return DEVICETYPES.TABLET;
    }
    if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|OperaMobi/i.test(ua)) {
        return DEVICETYPES.MOBILE;
    }

    return DEVICETYPES.DESKTOP;
};

const DEVICETYPES = {
    DESKTOP: "desktop",
    MOBILE: "mobile"
};

const UTILITIES = {
    uuidv4,
    randomInt,
    randomFloat,
    generateSeed,
    easeIn,
    easeOut,
    easeInOut,
    easeOutQuad,
    easeOutBounce,
    toRadian,
    toDegree,
    lerp,
    clamp,
    inverseLerp,
    loadResource,
    findFPS,
    remoteRequest,
    checkDeviceType,
    DEVICETYPES
};

window.UTILITIES = UTILITIES;
