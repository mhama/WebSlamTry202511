// IMUデータ処理
export class IMUProcessor {
  constructor() {
    this.orientation = { alpha: 0, beta: 0, gamma: 0 };
    this.acceleration = { x: 0, y: 0, z: 0 };
    this.rotationRate = { alpha: 0, beta: 0, gamma: 0 };
    this.gravity = { x: 0, y: 0, z: 0 };
    this.listeners = [];
  }

  async requestPermission() {
    if (typeof DeviceMotionEvent !== 'undefined' && 
        typeof DeviceMotionEvent.requestPermission === 'function') {
      try {
        const permission = await DeviceMotionEvent.requestPermission();
        return permission === 'granted';
      } catch (error) {
        console.error('IMU permission error:', error);
        return false;
      }
    }
    return true; // Android等では不要
  }

  start() {
    window.addEventListener('deviceorientation', this.handleOrientation.bind(this));
    window.addEventListener('devicemotion', this.handleMotion.bind(this));
  }

  stop() {
    window.removeEventListener('deviceorientation', this.handleOrientation.bind(this));
    window.removeEventListener('devicemotion', this.handleMotion.bind(this));
  }

  handleOrientation(event) {
    this.orientation = {
      alpha: event.alpha || 0,  // Z軸周り（コンパス）
      beta: event.beta || 0,    // X軸周り（前後傾き）
      gamma: event.gamma || 0   // Y軸周り（左右傾き）
    };
    this.notifyListeners('orientation', this.orientation);
  }

  handleMotion(event) {
    if (event.acceleration) {
      this.acceleration = {
        x: event.acceleration.x || 0,
        y: event.acceleration.y || 0,
        z: event.acceleration.z || 0
      };
    }

    if (event.accelerationIncludingGravity) {
      this.gravity = {
        x: event.accelerationIncludingGravity.x || 0,
        y: event.accelerationIncludingGravity.y || 0,
        z: event.accelerationIncludingGravity.z || 0
      };
    }

    if (event.rotationRate) {
      this.rotationRate = {
        alpha: event.rotationRate.alpha || 0,
        beta: event.rotationRate.beta || 0,
        gamma: event.rotationRate.gamma || 0
      };
    }

    this.notifyListeners('motion', {
      acceleration: this.acceleration,
      gravity: this.gravity,
      rotationRate: this.rotationRate
    });
  }

  onData(callback) {
    this.listeners.push(callback);
  }

  notifyListeners(type, data) {
    this.listeners.forEach(cb => cb(type, data));
  }

  getQuaternion() {
    // オイラー角からクォータニオンへ変換
    const { alpha, beta, gamma } = this.orientation;
    const degToRad = Math.PI / 180;
    
    const a = alpha * degToRad;
    const b = beta * degToRad;
    const g = gamma * degToRad;

    const ca = Math.cos(a / 2);
    const sa = Math.sin(a / 2);
    const cb = Math.cos(b / 2);
    const sb = Math.sin(b / 2);
    const cg = Math.cos(g / 2);
    const sg = Math.sin(g / 2);

    return {
      w: ca * cb * cg + sa * sb * sg,
      x: sa * cb * cg - ca * sb * sg,
      y: ca * sb * cg + sa * cb * sg,
      z: ca * cb * sg - sa * sb * cg
    };
  }
}
