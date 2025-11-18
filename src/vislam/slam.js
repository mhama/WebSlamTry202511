// VISLAM メインクラス
import { VisualTracker } from './visual.js';
import { IMUProcessor } from './imu.js';
import { SensorFusion } from './fusion.js';

export class VISLAM {
  constructor() {
    this.visualTracker = new VisualTracker();
    this.imuProcessor = new IMUProcessor();
    this.sensorFusion = new SensorFusion();
    
    this.isRunning = false;
    this.lastFrameTime = Date.now();
    this.frameCount = 0;
    this.fps = 0;
  }

  async initialize() {
    const hasPermission = await this.imuProcessor.requestPermission();
    if (!hasPermission) {
      console.warn('IMU permission denied');
    }
    
    this.imuProcessor.start();
    
    // IMUデータを予測ステップに使用
    this.imuProcessor.onData((type, data) => {
      if (type === 'motion' && this.isRunning) {
        const now = Date.now();
        const dt = (now - this.lastFrameTime) / 1000;
        this.sensorFusion.predict(data, dt);
      }
    });
  }

  start() {
    this.isRunning = true;
  }

  stop() {
    this.isRunning = false;
    this.imuProcessor.stop();
  }

  processFrame(videoElement) {
    if (!this.isRunning) return null;

    const now = Date.now();
    const dt = (now - this.lastFrameTime) / 1000;
    this.lastFrameTime = now;
    
    // FPS計算
    this.frameCount++;
    if (this.frameCount % 30 === 0) {
      this.fps = Math.round(1 / dt);
    }

    // 視覚処理
    const visualData = this.visualTracker.processFrame(videoElement);
    
    // センサーフュージョン更新
    this.sensorFusion.update(visualData);
    
    const state = this.sensorFusion.getState();
    
    return {
      pose: state,
      features: visualData.features,
      matches: visualData.matches,
      fps: this.fps
    };
  }

  getPose() {
    return this.sensorFusion.getState();
  }

  reset() {
    this.sensorFusion = new SensorFusion();
    this.visualTracker.prevFrame = null;
    this.frameCount = 0;
  }
}
