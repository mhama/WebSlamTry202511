// メインアプリケーション
import { VISLAM } from '../vislam/slam.js';
import { CameraManager } from './camera.js';
import { ARRenderer } from './renderer.js';

class ARApp {
  constructor() {
    this.vislam = new VISLAM();
    this.cameraManager = new CameraManager();
    this.renderer = null;
    this.isRunning = false;
    
    this.videoElement = document.getElementById('video');
    this.canvas = document.getElementById('canvas');
    this.infoElement = document.getElementById('info');
    this.startButton = document.getElementById('start-btn');
    
    this.setupUI();
  }

  setupUI() {
    this.startButton.addEventListener('click', async () => {
      await this.start();
    });
  }

  async start() {
    try {
      this.startButton.style.display = 'none';
      this.updateInfo('カメラを初期化中...');
      
      // カメラ初期化
      const videoSize = await this.cameraManager.initialize(this.videoElement);
      this.updateInfo(`カメラ: ${videoSize.width}x${videoSize.height}`);
      
      // VISLAM初期化
      this.updateInfo('VISLAMを初期化中...');
      await this.vislam.initialize();
      
      // レンダラー初期化
      this.renderer = new ARRenderer(this.canvas, this.videoElement);
      
      // 開始
      this.vislam.start();
      this.isRunning = true;
      this.updateInfo('実行中...');
      
      this.loop();
    } catch (error) {
      console.error('Start error:', error);
      this.updateInfo(`エラー: ${error.message}`);
      this.startButton.style.display = 'block';
    }
  }

  loop() {
    if (!this.isRunning) return;
    
    // VISLAMでフレーム処理
    const result = this.vislam.processFrame(this.videoElement);
    
    if (result) {
      // 姿勢を更新
      this.renderer.updatePose(result.pose);
      
      // 情報表示
      const { position, quaternion } = result.pose;
      this.updateInfo(
        `FPS: ${result.fps}\n` +
        `特徴点: ${result.features.length}\n` +
        `マッチ: ${result.matches.length}\n` +
        `位置: (${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)})`
      );
    }
    
    // レンダリング
    this.renderer.render();
    
    requestAnimationFrame(() => this.loop());
  }

  updateInfo(text) {
    this.infoElement.textContent = text;
  }

  stop() {
    this.isRunning = false;
    this.vislam.stop();
    this.cameraManager.stop();
    if (this.renderer) {
      this.renderer.dispose();
    }
  }
}

// アプリ起動
const app = new ARApp();

// クリーンアップ
window.addEventListener('beforeunload', () => {
  app.stop();
});
