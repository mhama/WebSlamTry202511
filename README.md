# VISLAM AR Web

Web上でスマホ向けに動作するVisual Inertial SLAM（VISLAM）を使ったシンプルなARアプリです。

## 特徴

- 📱 iOS/Android対応（カメラ + IMU）
- 🎯 リアルタイム特徴点追跡
- 🔄 センサーフュージョン（拡張カルマンフィルタ）
- 🧪 Three.jsベースの自動テスト環境
- 🚀 GitHub Pagesでホスト可能

## アーキテクチャ

### VISLAMコア
- **visual.js**: FAST風コーナー検出 + ORB風ディスクリプタ
- **imu.js**: DeviceMotion/Orientation APIでIMUデータ取得
- **fusion.js**: 拡張カルマンフィルタでセンサーフュージョン
- **slam.js**: メインSLAMループ

### ARアプリ
- **camera.js**: カメラ入力管理
- **renderer.js**: Three.jsレンダリング
- **app.js**: メインアプリケーション

### テスト環境
- **virtual-scene.js**: テクスチャ付き仮想部屋
- **camera-sim.js**: カメラ軌跡シミュレーター
- **test-runner.js**: 自動テスト実行

## セットアップ

```bash
npm install
```

## 開発

```bash
npm run dev
```

ブラウザで `http://localhost:5173` を開きます。

**注意**: カメラとIMUを使うため、HTTPSまたはlocalhostが必要です。

## テスト

```bash
npm test
```

仮想環境で以下の軌跡をテスト：
- 前進運動
- 回転運動
- 円運動

## ビルド

```bash
npm run build
```

`dist/` フォルダがGitHub Pagesにデプロイ可能です。

## GitHub Pagesデプロイ

1. `vite.config.js`の`base`をリポジトリ名に設定
2. ビルド: `npm run build`
3. `dist/`フォルダをgh-pagesブランチにプッシュ

または GitHub Actions を使用:

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run build
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

## 使い方

1. スマホでアプリを開く
2. 「ARを開始」ボタンをタップ
3. カメラとIMUの権限を許可
4. デバイスを動かすと緑のキューブが表示される

## 制限事項

- スケール推定は不定（単眼カメラの制約）
- 高速な動きには追従しにくい
- テクスチャの少ない環境では精度が低下

## 今後の改善

- [ ] ループクロージャ検出
- [ ] マップ保存・読み込み
- [ ] より高度な特徴点検出（ORB完全実装）
- [ ] WebAssemblyで高速化
- [ ] ARコンテンツの配置機能

## ライセンス

MIT
