const args = require('curlew.js').init()
const Quantification = require('./core/quantification/Quantification');
const { createCanvas, loadImage } = require('canvas');
const path = require('path')

console.log(`Worker ${process.pid} with ${args.image}`)

loadImage(path.resolve(__dirname, 'images', args.image))
    .then(image => {
        const WIDTH = image.width;
        const HEIGHT = image.height;

        const canvas = createCanvas(WIDTH, HEIGHT);
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, WIDTH, HEIGHT);

        ctx.drawImage(image, 0, 0);
        const pixels = ctx.getImageData(0, 0, WIDTH, HEIGHT).data;
        const data = [];

        for (let i = 0; i < pixels.length; i += 4 * 20) {
            data.push([pixels[i], pixels[i + 1], pixels[i + 2]]);
        }

        let quantification = new Quantification(data, 8);
        quantification.generate();

        quantification.clusters.sort((a, b) => {
            return b.clusterData.length - a.clusterData.length;
        });

        const clustersData = []

        for (let cluster of quantification.clusters) {
            clustersData.push([cluster.vector.x, cluster.vector.y, cluster.vector.z]);
        }

        process.send({
            clusters: clustersData
        })
    })
    .catch(() => {
        console.log('Worker error')
    });