self.addEventListener('message', (e) => {
  // const { type, pixels, width, height } = e.data;

  // if (type === 'analyzeDrawing') {
  //   const analysis = analyze(pixels, width, height);
  //   self.postMessage({ type: 'analysisResult', analysis });
  // }
  console.log("message received: ", e.data);
});

const analyze = (pixels, width, height) => {
  // Example: count dark pixels
  let darkPixelCount = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    const avg = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
    if (avg < 50) darkPixelCount++;
  }

  return {
    darkPixelCount,
    resolution: `${width}x${height}`,
  };
};
