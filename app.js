const defaults = {
    quality: 20,
    width: 1280,
    output: false,
    video: './Trailer - Blade Runner 2049.mp4',
    fps: 1,
    directory: 'images'
}

const args = require('curlew.js').init(defaults)

const childProcess = require('child_process')
const path = require('path')
const fs = require('fs')
const os = require('os')
const EventEmitter = require('events')

const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffmpeg = require('fluent-ffmpeg');
ffmpeg.setFfmpegPath(ffmpegPath);

const CPUS = os.cpus()
const workers = []
const results = []
let images = []

const workerEvent = new EventEmitter()

const createWorker = () => {
    const image = images.shift()

    if(!image) return false

    const worker = childProcess.fork(path.resolve(__dirname, 'worker.js'), ['--image', image])
    worker.on('message', ({clusters}) => {
        results.push(clusters)
    })

    worker.on('exit', () => {
        const workerIndex = workers.indexOf(worker)
        worker.kill()

        if (workerIndex > -1) workers.splice(workerIndex, 1)

        if (images.length === 0 && workers.length === 0) {
            workerEvent.emit('handle:quantification')
        }
        createWorker()
    })

    workers.push(worker)
}

const handleQuantification = () => {
    console.log(results.length)
    console.log('Handle quantification')
    console.timeEnd('Timer')
}

const getScreenshotsFromVideo = video => {
    return new Promise((resolve, reject) => {
        ffmpeg(path.resolve(__dirname, video))
            .outputOptions([
                '-vf',
                `fps=${args.fps}`,
            ])
            .output(`${args.directory}/img%03d.jpg`)
            .size(`${args.width}x?`)
            .on('end', resolve)
            .on('error', reject)
            .run()
    })
}

const processScreenshots = () => {
    return new Promise((resolve, reject) => {
        fs.readdir(path.resolve(__dirname, args.directory), (err, files) => {
            if (err) {
                console.error(err)
                reject(err)
            }

            images = files.filter(item => /\.jpg$/.test(item))

            CPUS.map(() => { createWorker() })
        })
    })
}

workerEvent.once('handle:quantification', () => {
    handleQuantification()
})

console.time('Timer')
getScreenshotsFromVideo(args.video)
.then(processScreenshots)
.then(() => {
    console.log('Finished')
})