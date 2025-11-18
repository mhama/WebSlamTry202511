// Three.js レンダリング
import * as THREE from 'three';

export class ARRenderer {
  constructor(canvas, videoElement) {
    this.canvas = canvas;
    this.videoElement = videoElement;
    
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: true
    });
    
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    
    this.setupScene();
    this.setupEventListeners();
  }

  setupScene() {
    // 環境光
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);
    
    // 指向性ライト
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    this.scene.add(directionalLight);
    
    // テスト用のキューブ
    const geometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
    const material = new THREE.MeshStandardMaterial({
      color: 0x00ff00,
      metalness: 0.5,
      roughness: 0.5
    });
    this.testCube = new THREE.Mesh(geometry, material);
    this.testCube.position.set(0, 0, -1);
    this.scene.add(this.testCube);
    
    // 座標軸ヘルパー
    const axesHelper = new THREE.AxesHelper(0.5);
    this.scene.add(axesHelper);
  }

  setupEventListeners() {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  updatePose(pose) {
    if (!pose) return;
    
    const { position, quaternion } = pose;
    
    // カメラの位置を更新
    this.camera.position.set(
      position.x,
      position.y,
      position.z
    );
    
    // カメラの姿勢を更新
    this.camera.quaternion.set(
      quaternion.x,
      quaternion.y,
      quaternion.z,
      quaternion.w
    );
    
    // テストキューブを回転
    this.testCube.rotation.x += 0.01;
    this.testCube.rotation.y += 0.01;
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  addObject(object) {
    this.scene.add(object);
  }

  removeObject(object) {
    this.scene.remove(object);
  }

  dispose() {
    this.renderer.dispose();
  }
}
