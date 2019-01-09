const Vector3 = require('../../utils/Vector3');

class Cluster {
  constructor() {
    this.vector = Vector3.randomize(0, 256);
    this.clusterData = [];
  }

  getHex() {
    return `#${this.colorToHex(this.vector.x)}${this.colorToHex(this.vector.y)}${this.colorToHex(this.vector.z)}`
  }

  colorToHex(color) {
    const round = Math.round(color);
    let hex = Number(round).toString(16);
    if (hex.length < 2) {
      hex = `0${hex}`;
    }
    return hex;
  }
}

module.exports = Cluster;
