// テスト実行
import { VISLAM } from '../vislam/slam.js';
import { CameraSimulator } from './camera-sim.js';

class VISLAMTester {
  constructor() {
    this.vislam = new VISLAM();
    this.simulator = new CameraSimulator();
    this.results = [];
  }

  async runTest(trajectoryType = 'forward') {
    console.log(`\n=== テスト開始: ${trajectoryType} ===\n`);
    
    // 軌跡を定義
    this.simulator.defineTrajectory(trajectoryType);
    this.simulator.reset();
    
    // VISLAM初期化（IMUなし）
    this.vislam.start();
    
    const totalFrames = this.simulator.getTotalFrames();
    const errors = [];
    
    // 各フレームを処理
    for (let i = 0; i < totalFrames; i++) {
      const frame = this.simulator.getNextFrame();
      if (!frame) break;
      
      // VISLAMで処理
      const result = this.vislam.processFrame(frame.canvas);
      
      if (result) {
        // 真値との誤差を計算
        const error = this.calculateError(result.pose, frame.pose);
        errors.push(error);
        
        if (i % 10 === 0) {
          console.log(`Frame ${i}/${totalFrames}:`);
          console.log(`  真値: (${frame.pose.position.x.toFixed(2)}, ${frame.pose.position.y.toFixed(2)}, ${frame.pose.position.z.toFixed(2)})`);
          console.log(`  推定: (${result.pose.position.x.toFixed(2)}, ${result.pose.position.y.toFixed(2)}, ${result.pose.position.z.toFixed(2)})`);
          console.log(`  誤差: ${error.position.toFixed(3)}m`);
          console.log(`  特徴点: ${result.features.length}, マッチ: ${result.matches.length}`);
        }
      }
    }
    
    // 統計を計算
    const stats = this.calculateStats(errors);
    console.log(`\n=== テスト結果 ===`);
    console.log(`平均位置誤差: ${stats.meanPositionError.toFixed(3)}m`);
    console.log(`最大位置誤差: ${stats.maxPositionError.toFixed(3)}m`);
    console.log(`標準偏差: ${stats.stdDeviation.toFixed(3)}m`);
    
    this.results.push({
      trajectoryType,
      stats,
      errors
    });
    
    this.vislam.reset();
    return stats;
  }

  calculateError(estimated, groundTruth) {
    const dx = estimated.position.x - groundTruth.position.x;
    const dy = estimated.position.y - groundTruth.position.y;
    const dz = estimated.position.z - groundTruth.position.z;
    
    return {
      position: Math.sqrt(dx * dx + dy * dy + dz * dz),
      x: Math.abs(dx),
      y: Math.abs(dy),
      z: Math.abs(dz)
    };
  }

  calculateStats(errors) {
    if (errors.length === 0) {
      return { meanPositionError: 0, maxPositionError: 0, stdDeviation: 0 };
    }
    
    const positionErrors = errors.map(e => e.position);
    const mean = positionErrors.reduce((a, b) => a + b, 0) / positionErrors.length;
    const max = Math.max(...positionErrors);
    
    const variance = positionErrors.reduce((sum, val) => {
      return sum + Math.pow(val - mean, 2);
    }, 0) / positionErrors.length;
    const stdDev = Math.sqrt(variance);
    
    return {
      meanPositionError: mean,
      maxPositionError: max,
      stdDeviation: stdDev
    };
  }

  async runAllTests() {
    await this.runTest('forward');
    await this.runTest('rotation');
    await this.runTest('circle');
    
    console.log('\n=== 全テスト完了 ===\n');
    this.simulator.dispose();
  }
}

// テスト実行
const tester = new VISLAMTester();
tester.runAllTests().catch(console.error);
