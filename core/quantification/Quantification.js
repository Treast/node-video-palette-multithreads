const ClusterData = require('./ClusterData');
const Cluster = require('./Cluster');
const Vector3 = require('../../utils/Vector3');

class Quantification {
  constructor(data, size) {
    this.clusterData = [];
    this.clusters = [];
    this.setupData(data);
    this.setupCluster(size);
  }

  setupData(data) {
    for (let vector of data) {
      this.clusterData.push(new ClusterData(vector));
    }
  }

  setupCluster(size) {
    for (let i = 0; i < size; i += 1) {
      this.clusters.push(new Cluster());
    }
  }

  generate() {
    let isThereAClusterChange = false;
    do {
      isThereAClusterChange = false;
      for (let data of this.clusterData) {
        let minimumDistance = 256 * 256 * 3;

        if(data.cluster) {
          minimumDistance = data.vector.distanceTo(data.cluster.vector);
        }

        for (let cluster of this.clusters) {
          const distance = data.vector.distanceTo(cluster.vector);

          if (distance < minimumDistance) {
            if (!data.cluster || data.cluster.vector !== cluster.vector) {
              isThereAClusterChange = true;
            }
            data.cluster = cluster;
            minimumDistance = distance;
          }
        }
        data.cluster.clusterData.push(data);
      }
      this.calculateCentroids();
    } while (isThereAClusterChange);
    return this.clusters;
  }

  calculateCentroids() {
    // console.log('-------------------------------------')
    for (let cluster of this.clusters) {
      if(cluster.clusterData.length > 0) {
        let centroidX = 0;
        let centroidY = 0;
        let centroidZ = 0;
        for (let data of cluster.clusterData) {
          centroidX += data.vector.x;
          centroidY += data.vector.y;
          centroidZ += data.vector.z;
        }
        centroidX /= cluster.clusterData.length;
        centroidY /= cluster.clusterData.length;
        centroidZ /= cluster.clusterData.length;
        cluster.vector = new Vector3(centroidX, centroidY, centroidZ);
      } else {
        cluster.vector = Vector3.randomize(0, 256);
      }
      // console.log(cluster.vector);
    }
  }
}

module.exports = Quantification;
