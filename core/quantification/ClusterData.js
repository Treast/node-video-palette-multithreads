const Vector3 = require('../../utils/Vector3');

class ClusterData {
  constructor(vector) {
    this.vector = new Vector3(vector[0], vector[1], vector[2]);
    this.cluster = null;
  }
}

module.exports = ClusterData;
