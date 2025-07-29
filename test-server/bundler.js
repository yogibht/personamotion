const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { promisify } = require('util');
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

async function combineJSFiles({
  searchDirs = [__dirname], // Array of directories to search
  outputPath = path.join(__dirname, 'combined.js'),
  fileOrder = [],
  excludePatterns = [/node_modules/]
}) {
  try {
    // 1. Normalize all paths to use forward slashes
    const normalizePath = p => p.replace(/\\/g, '/');

    // 2. Find all JS files recursively in all search directories
    const findFiles = async (dir) => {
      let results = [];
      const items = await fs.promises.readdir(dir);

      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = await fs.promises.stat(fullPath);

        if (excludePatterns.some(pattern =>
          typeof pattern === 'string'
            ? fullPath.includes(pattern)
            : pattern.test(fullPath)
        )) continue;

        if (stat.isDirectory()) {
          results = results.concat(await findFiles(fullPath));
        } else if (item.endsWith('.js')) {
          results.push({
            fullPath,
            relativePath: normalizePath(path.relative(dir, fullPath))
          });
        }
      }
      return results;
    };

    // Search all specified directories
    let allFiles = [];
    for (const dir of searchDirs) {
      const files = await findFiles(dir);
      allFiles = allFiles.concat(files);
    }

    const normalizedFileOrder = fileOrder.map(normalizePath);

    // 3. Create the final file list in exact order
    const finalFiles = [];
    const foundFiles = new Set();

    // First add files in explicit order (searching all directories)
    for (const orderedPath of normalizedFileOrder) {
      let foundFile = null;

      // Check if path exists exactly as specified
      foundFile = allFiles.find(f => f.relativePath === orderedPath);

      // If not found, try to find by filename only
      if (!foundFile) {
        const filename = path.basename(orderedPath);
        foundFile = allFiles.find(f => path.basename(f.relativePath) === filename);
      }

      if (foundFile) {
        finalFiles.push(foundFile);
        foundFiles.add(foundFile.relativePath);
      } else {
        console.warn(`⚠️ File not found: ${orderedPath}`);
      }
    }

    // Then add remaining files not in order list
    const remainingFiles = allFiles.filter(f => !foundFiles.has(f.relativePath));
    finalFiles.push(...remainingFiles);

    // 4. Process files in exact order
    let outputContent = `// Combined at ${new Date().toISOString()}\n`;
    outputContent += `// ${finalFiles.length} files\n\n`;

    for (const file of finalFiles) {
      try {
        const content = await readFile(file.fullPath, 'utf8');
        outputContent += `\n// ====== ${file.relativePath} ======\n`;
        // outputContent += `(function() {\n${content}\n})();\n`;
        outputContent += `${content}\n`;
      } catch (err) {
        console.error(`Error processing ${file.relativePath}:`, err);
        outputContent += `\n// ERROR loading ${file.relativePath}\n`;
      }
    }

    await writeFile(outputPath, outputContent);
    console.log(`✅ Successfully combined ${finalFiles.length} files into ${outputPath}`);

  } catch (err) {
    console.error('❌ Fatal error during combination:', err);
    process.exit(1);
  }
}

const filenameHash = crypto.createHash('sha1').update(Date.now().toString() + Math.random().toString()).digest('hex').slice(0, 8);
const outputFilename = `personamotionbundle_${filenameHash}.js`;

// Example usage:
combineJSFiles({
  searchDirs: [
    path.join(__dirname, '../', 'persona'),
  ],
  outputPath: path.join(__dirname, '../', 'share', outputFilename),
  fileOrder: [
    '../persona/toolbelt/utilities.js',
    '../persona/toolbelt/inputmanager.js',
    '../persona/toolbelt/threehelper.js',
    '../persona/brains/first.js',
    '../persona/brains/second.js',
    '../persona/brains/third.js',
    '../persona/expression/speech.js',
    '../persona/expression/aesthetics.js',
    '../persona/expression/world.js',
    '../persona/expression/matter.js',
    '../persona/expression/motion.js',
    '../persona/expression/entity.js',
    '../persona/identity/memory.js',
    '../persona/identity/dna.js',
    '../persona/view/window.js',
    '../persona/begin.js'
  ],
  excludePatterns: ['node_modules']
});
