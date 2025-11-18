// 視覚特徴抽出・追跡
export class VisualTracker {
  constructor() {
    this.features = [];
    this.prevFrame = null;
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
  }

  // ORB風の特徴点検出（簡易版）
  detectFeatures(imageData, maxFeatures = 100) {
    const { width, height, data } = imageData;
    const features = [];
    const gridSize = 20;
    const threshold = 30;

    // グリッドベースで特徴点を検出
    for (let y = gridSize; y < height - gridSize; y += gridSize) {
      for (let x = gridSize; x < width - gridSize; x += gridSize) {
        const score = this.computeCornerScore(data, x, y, width, threshold);
        if (score > threshold) {
          features.push({
            x, y, score,
            descriptor: this.computeDescriptor(data, x, y, width)
          });
        }
      }
    }

    // スコアでソートして上位を返す
    return features.sort((a, b) => b.score - a.score).slice(0, maxFeatures);
  }

  // FAST風のコーナー検出
  computeCornerScore(data, x, y, width, threshold) {
    const centerIdx = (y * width + x) * 4;
    const centerValue = data[centerIdx];
    
    // 円周上の16点をチェック
    const circle = [
      [0, -3], [1, -3], [2, -2], [3, -1],
      [3, 0], [3, 1], [2, 2], [1, 3],
      [0, 3], [-1, 3], [-2, 2], [-3, 1],
      [-3, 0], [-3, -1], [-2, -2], [-1, -3]
    ];

    let brighter = 0, darker = 0;
    for (const [dx, dy] of circle) {
      const idx = ((y + dy) * width + (x + dx)) * 4;
      const diff = data[idx] - centerValue;
      if (diff > threshold) brighter++;
      if (diff < -threshold) darker++;
    }

    return Math.max(brighter, darker);
  }

  // 簡易的なディスクリプタ（8x8パッチの輝度）
  computeDescriptor(data, x, y, width, patchSize = 8) {
    const descriptor = [];
    const half = Math.floor(patchSize / 2);
    
    for (let dy = -half; dy < half; dy++) {
      for (let dx = -half; dx < half; dx++) {
        const idx = ((y + dy) * width + (x + dx)) * 4;
        descriptor.push(data[idx]);
      }
    }
    return descriptor;
  }

  // 特徴点マッチング
  matchFeatures(features1, features2) {
    const matches = [];
    
    for (let i = 0; i < features1.length; i++) {
      let bestMatch = -1;
      let bestDist = Infinity;
      let secondBestDist = Infinity;

      for (let j = 0; j < features2.length; j++) {
        const dist = this.descriptorDistance(
          features1[i].descriptor,
          features2[j].descriptor
        );
        
        if (dist < bestDist) {
          secondBestDist = bestDist;
          bestDist = dist;
          bestMatch = j;
        } else if (dist < secondBestDist) {
          secondBestDist = dist;
        }
      }

      // Lowe's ratio test
      if (bestMatch >= 0 && bestDist < 0.7 * secondBestDist) {
        matches.push({
          idx1: i,
          idx2: bestMatch,
          distance: bestDist,
          p1: features1[i],
          p2: features2[bestMatch]
        });
      }
    }

    return matches;
  }

  descriptorDistance(desc1, desc2) {
    let sum = 0;
    for (let i = 0; i < desc1.length; i++) {
      const diff = desc1[i] - desc2[i];
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  }

  // フレーム処理
  processFrame(videoOrImage) {
    this.canvas.width = videoOrImage.videoWidth || videoOrImage.width;
    this.canvas.height = videoOrImage.videoHeight || videoOrImage.height;
    
    this.ctx.drawImage(videoOrImage, 0, 0);
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    
    const features = this.detectFeatures(imageData);
    
    let matches = [];
    if (this.prevFrame) {
      matches = this.matchFeatures(this.prevFrame, features);
    }
    
    this.prevFrame = features;
    
    return { features, matches };
  }
}
