const defaults = {
  quality: 20,
  width: 1920,
  height: 1080,
  output: false,
  video: './Trailer - Blade Runner 2049.mp4',
  fps: 1,
  directory: 'images',
};

const args = require('curlew.js').init(defaults);

const childProcess = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const EventEmitter = require('events');

const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffmpeg = require('fluent-ffmpeg');
ffmpeg.setFfmpegPath(ffmpegPath);

const Quantification = require('./core/quantification/Quantification');
const { createCanvas, loadImage } = require('canvas');

const CPUS = os.cpus();
let results = [];
let images = [];

const getNextImage = () => {
    return images.shift()
}

const createWorker = () => {
  return new Promise(resolve => {
    const image = getNextImage()

    if (!image) {
      resolve();
    }

    const worker = childProcess.fork(path.resolve(__dirname, 'worker.js'), ['--image', image]);
    
    worker.on('message', ({ clusters }) => {
      results = [...results, ...clusters]
      const nextImage = getNextImage()

      if(nextImage) {
          worker.send({image: nextImage})
      } else {
          worker.kill()
          resolve()
      }
    });
  });
};

const handleQuantification = () => {
  console.timeEnd('Timer');

  const quantification = new Quantification(results, 8)
  quantification.generate()

  quantification.clusters.sort((a, b) => {
    return b.clusterData.length - a.clusterData.length;
  })

  quantification.clusters.map(cluster => console.log(cluster.getHex()))
  
  return generatePostImage(quantification.clusters)
};

const generatePostImage = clusters => {
  return new Promise(resolve => {
    const localCanvas = createCanvas(args.width, args.height);
    const localCtx = localCanvas.getContext('2d');
    const colorWidth = args.width / Math.floor(clusters.length / 2);
    const colorHeight = args.height / 2

    const pivot = Math.floor(clusters.length / 2);
    for (let i = 0; i < clusters.length; i += 1) {
      let height = 0;
      if (i >= pivot) {
        height += colorHeight;
      }
      localCtx.fillStyle = clusters[i].getHex();
      localCtx.fillRect(colorWidth * (i % pivot), height, colorWidth, colorHeight);
    }
    const out = fs.createWriteStream(path.resolve(__dirname, 'dist', `${args.video}.jpg`));
    const stream = localCanvas.createJPEGStream();
    stream.pipe(out);
    out.on('finish', () => {
      resolve();
    });
  })
}

const getScreenshotsFromVideo = video => {
  return new Promise((resolve, reject) => {
    ffmpeg(path.resolve(__dirname, video))
      .outputOptions(['-vf', `fps=${args.fps}`])
      .output(`${args.directory}/img%03d.jpg`)
      .size(`${args.width}x?`)
      .on('end', resolve)
      .on('error', reject)
      .run();
  });
};

const processScreenshots = () => {
  return new Promise((resolve, reject) => {
    fs.readdir(path.resolve(__dirname, args.directory), (err, files) => {
      if (err) {
        console.error(err);
        reject(err);
      }

      images = files.filter(item => /\.jpg$/.test(item));

      const promises = CPUS.map(() => {
        return createWorker();
      });

      Promise.all(promises).then(() => {
          handleQuantification()
      });
    });
  });
};

console.time('TimerFull');
console.time('Timer');
getScreenshotsFromVideo(args.video)
  .then(processScreenshots)
  .then(() => {
    console.log('Finished');
    console.timeEnd('TimerFull')
  });
