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

const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path
const ffmpeg = require('fluent-ffmpeg')
ffmpeg.setFfmpegPath(ffmpegPath)

const Quantification = require('./core/quantification/Quantification')
const { createCanvas, loadImage } = require('canvas')
const ora = require('ora')

const CPUS = os.cpus();
let results = [];
let clusters = []
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

    const worker = childProcess.fork(path.resolve(__dirname, 'worker.js'), ['--image', image, '--quality', args.quality]);
    
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
  return new Promise(resolve => {
    const quantification = new Quantification(results, 8)
    quantification.generate()

    quantification.clusters.sort((a, b) => {
      return b.clusterData.length - a.clusterData.length;
    })
    
    clusters = quantification.clusters
    resolve()
  })
};

const generatePostImage = () => {
  return new Promise(resolve => {
    const localCanvas = createCanvas(parseInt(args.width), parseInt(args.height));
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
    ffmpeg(path.resolve(__dirname, `video_${args.width}x${args.height}.mp4`))
      .output(`${args.directory}/img%03d.jpg`)
      .size(`${args.width}x?`)
      .aspect('16:9')
      .outputOptions(['-vf', `fps=${args.fps}`])
      .on('end', resolve)
      .on('error', reject)
      .run();
  });
};

const resizeVideo = video => {
  return new Promise((resolve, reject) => {
    ffmpeg(path.resolve(__dirname, video))
      .output(`video_${args.width}x${args.height}.mp4`)
      .size(`${args.width}x?`)
      .aspect('16:9')
      .on('end', resolve)
      .on('error', reject)
      .run()
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
          resolve()
      });
    });
  });
};

console.time('Timer');
let spinner = ora({ spinner: 'dots', text: 'Resizing image' }).start()
resizeVideo(args.video)
  .then(() => {
    spinner.succeed()
    spinner = ora({ spinner: 'dots', text: 'Taking screenshots from the video' }).start()
    return getScreenshotsFromVideo(args.video)
  })
  .then(() => {
    spinner.succeed()
    spinner = ora({ spinner: 'dots', text: 'Processing screenshots' }).start()
    return processScreenshots()
  })
  .then(() => {
    spinner.succeed()
    spinner = ora({ spinner: 'dots', text: 'Handling final quantification' }).start()
    return handleQuantification()
  })
  .then(() => {
    spinner.succeed()
    spinner = ora({ spinner: 'dots', text: 'Generating post image' }).start()
    return generatePostImage()
  })
  .then(() => {
    spinner.succeed()
    console.timeEnd('Timer')
  })
