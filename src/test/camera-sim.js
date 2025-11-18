// 仮想カメラシミュレーター
import { VirtualScene } from './virtual-scene.js';

export class CameraSimulator {
  constructor() {
    this.scene = new VirtualScene();
    this.trajectory = [];
    this.currentFrame = 0;
  }

  // カメラ軌跡を定義
  defineTrajectory(type = 'forward') {
    this.trajectory = [];
    const numFrames = 100;
    
    switch (type) {
      case 'forward':
        // 前進
        for (let i = 0; i < numFrames; i++) {
          const t = i / numFrames;
          this.trajectory.push({
            position: { x: 0, y: 1.6, z: -t * 3 },
            rotation: { x: 0, y: 0, z: 0 }
          });
        }
        break;
        
      case 'rotation':
        // 回転
        for (let i = 0; i < numFrames; i++) {
          const angle = (i / numFrames) * Math.PI;
          this.trajectory.push({
            position: { x: 0, y: 1.6, z: 0 },
            rotation: { x: 0, y: angle, z: 0 }
          });
        }
        break;
        
      case 'circle':
        // 円運動
        for (let i = 0; i < numFrames; i++) {
          const angle = (i / numFrames) * Math.PI * 2;
          const radius = 2;
          this.trajectory.push({
            position: {
              x: Math.sin(angle) * radius,
              y: 1.6,
              z: Math.cos(angle) * radius
            },
            rotation: { x: 0, y: angle + Math.PI, z: 0 }
          });
        }
        break;
    }
  }

  // 次のフレームを取得
  getNextFrame() {
    if (this.currentFrame >= this.trajectory.length) {
      return null;
    }
    
    const pose = this.trajectory[this.currentFrame];
    this.scene.setCameraPosition(pose.position.x, pose.position.y, pose.position.z);
    this.scene.setCameraRotation(pose.rotation.x, pose.rotation.y, pose.rotation.z);
    
    const canvas = this.scene.render();
    this.currentFrame++;
    
    return {
      canvas,
      pose,
      frameNumber: this.currentFrame - 1
    };
  }

  reset() {
    this.currentFrame = 0;
  }

  getTotalFrames() {
    return this.trajectory.length;
  }

  dispose() {
    this.scene.dispose();
  }
}
