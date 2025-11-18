// センサーフュージョン（拡張カルマンフィルタ）
export class SensorFusion {
  constructor() {
    // 状態ベクトル: [x, y, z, vx, vy, vz, qw, qx, qy, qz]
    this.state = {
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      quaternion: { w: 1, x: 0, y: 0, z: 0 }
    };
    
    this.covariance = this.initCovariance();
    this.lastUpdateTime = Date.now();
  }

  initCovariance() {
    // 10x10の共分散行列（簡易版）
    const size = 10;
    const cov = [];
    for (let i = 0; i < size; i++) {
      cov[i] = [];
      for (let j = 0; j < size; j++) {
        cov[i][j] = i === j ? 1.0 : 0.0;
      }
    }
    return cov;
  }

  // 予測ステップ（IMUデータから）
  predict(imuData, dt) {
    const { acceleration, rotationRate } = imuData;
    
    // 位置の更新（速度積分）
    this.state.position.x += this.state.velocity.x * dt;
    this.state.position.y += this.state.velocity.y * dt;
    this.state.position.z += this.state.velocity.z * dt;
    
    // 速度の更新（加速度積分）
    if (acceleration) {
      this.state.velocity.x += acceleration.x * dt;
      this.state.velocity.y += acceleration.y * dt;
      this.state.velocity.z += acceleration.z * dt;
    }
    
    // 姿勢の更新（角速度積分）
    if (rotationRate) {
      this.updateQuaternion(rotationRate, dt);
    }
  }

  // 更新ステップ（視覚データから）
  update(visualData) {
    if (!visualData || !visualData.matches || visualData.matches.length < 5) {
      return;
    }

    // 視覚オドメトリから相対的な移動を推定
    const motion = this.estimateMotionFromMatches(visualData.matches);
    
    if (motion) {
      // カルマンゲイン（簡易版）
      const K = 0.3; // 視覚データの信頼度
      
      this.state.position.x += K * motion.translation.x;
      this.state.position.y += K * motion.translation.y;
      this.state.position.z += K * motion.translation.z;
      
      // 姿勢の補正
      this.state.quaternion = this.slerp(
        this.state.quaternion,
        motion.rotation,
        K
      );
    }
  }

  estimateMotionFromMatches(matches) {
    if (matches.length < 5) return null;

    // 5点アルゴリズムの簡易版
    // 実際にはRANSACとEssential Matrix分解が必要
    
    let dx = 0, dy = 0;
    for (const match of matches) {
      dx += match.p2.x - match.p1.x;
      dy += match.p2.y - match.p1.y;
    }
    
    dx /= matches.length;
    dy /= matches.length;
    
    // スケールは不定なので適当な係数
    const scale = 0.001;
    
    return {
      translation: {
        x: dx * scale,
        y: dy * scale,
        z: 0
      },
      rotation: this.state.quaternion // 簡易版では回転は推定しない
    };
  }

  updateQuaternion(rotationRate, dt) {
    const { alpha, beta, gamma } = rotationRate;
    const degToRad = Math.PI / 180;
    
    // 角速度からクォータニオンの微分を計算
    const wx = alpha * degToRad;
    const wy = beta * degToRad;
    const wz = gamma * degToRad;
    
    const { w, x, y, z } = this.state.quaternion;
    
    const dw = 0.5 * (-x * wx - y * wy - z * wz) * dt;
    const dx = 0.5 * (w * wx + y * wz - z * wy) * dt;
    const dy = 0.5 * (w * wy - x * wz + z * wx) * dt;
    const dz = 0.5 * (w * wz + x * wy - y * wx) * dt;
    
    this.state.quaternion.w += dw;
    this.state.quaternion.x += dx;
    this.state.quaternion.y += dy;
    this.state.quaternion.z += dz;
    
    // 正規化
    this.normalizeQuaternion();
  }

  normalizeQuaternion() {
    const { w, x, y, z } = this.state.quaternion;
    const norm = Math.sqrt(w * w + x * x + y * y + z * z);
    
    if (norm > 0) {
      this.state.quaternion.w /= norm;
      this.state.quaternion.x /= norm;
      this.state.quaternion.y /= norm;
      this.state.quaternion.z /= norm;
    }
  }

  slerp(q1, q2, t) {
    // 球面線形補間
    let dot = q1.w * q2.w + q1.x * q2.x + q1.y * q2.y + q1.z * q2.z;
    
    if (dot < 0) {
      dot = -dot;
      q2 = { w: -q2.w, x: -q2.x, y: -q2.y, z: -q2.z };
    }
    
    if (dot > 0.9995) {
      // 線形補間
      return {
        w: q1.w + t * (q2.w - q1.w),
        x: q1.x + t * (q2.x - q1.x),
        y: q1.y + t * (q2.y - q1.y),
        z: q1.z + t * (q2.z - q1.z)
      };
    }
    
    const theta = Math.acos(dot);
    const sinTheta = Math.sin(theta);
    const w1 = Math.sin((1 - t) * theta) / sinTheta;
    const w2 = Math.sin(t * theta) / sinTheta;
    
    return {
      w: q1.w * w1 + q2.w * w2,
      x: q1.x * w1 + q2.x * w2,
      y: q1.y * w1 + q2.y * w2,
      z: q1.z * w1 + q2.z * w2
    };
  }

  getState() {
    return { ...this.state };
  }
}
