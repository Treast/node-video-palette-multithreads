class Vector3 {
  constructor(x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  distanceTo(vector) {
    const sum = Math.pow(this.x - vector.x, 2) + Math.pow(this.y - vector.y, 2) + Math.pow(this.z - vector.z, 2);
    return Math.sqrt(sum);
  }

  static randomize(min, max) {
    const randomX = Math.floor(Math.random() * (max - min)) + min;
    const randomY = Math.floor(Math.random() * (max - min)) + min;
    const randomZ = Math.floor(Math.random() * (max - min)) + min;
    return new Vector3(randomX, randomY, randomZ);
  }
}

module.exports = Vector3;
