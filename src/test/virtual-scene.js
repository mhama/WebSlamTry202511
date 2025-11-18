// テスト用仮想環境
import * as THREE from 'three';

export class VirtualScene {
  constructor(width = 640, height = 480) {
    this.width = width;
    this.height = height;
    
    // シーン作成
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x808080);
    
    // カメラ
    this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 100);
    this.camera.position.set(0, 1.6, 0);
    
    // レンダラー（オフスクリーン）
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(width, height);
    
    this.setupRoom();
  }

  setupRoom() {
    // 床
    const floorGeometry = new THREE.PlaneGeometry(10, 10);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x808080,
      roughness: 0.8
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    this.scene.add(floor);
    
    // 壁（テクスチャ付き）
    const wallGeometry = new THREE.PlaneGeometry(10, 3);
    
    // テクスチャ生成（チェッカーボード）
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    const tileSize = 64;
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        ctx.fillStyle = (x + y) % 2 === 0 ? '#ffffff' : '#cccccc';
        ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
      }
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    const wallMaterial = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.7
    });
    
    // 4つの壁
    const wall1 = new THREE.Mesh(wallGeometry, wallMaterial);
    wall1.position.set(0, 1.5, -5);
    this.scene.add(wall1);
    
    const wall2 = new THREE.Mesh(wallGeometry, wallMaterial);
    wall2.position.set(0, 1.5, 5);
    wall2.rotation.y = Math.PI;
    this.scene.add(wall2);
    
    const wall3 = new THREE.Mesh(wallGeometry, wallMaterial);
    wall3.position.set(-5, 1.5, 0);
    wall3.rotation.y = Math.PI / 2;
    this.scene.add(wall3);
    
    const wall4 = new THREE.Mesh(wallGeometry, wallMaterial);
    wall4.position.set(5, 1.5, 0);
    wall4.rotation.y = -Math.PI / 2;
    this.scene.add(wall4);
    
    // いくつかのオブジェクト
    const boxGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const boxMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    const box = new THREE.Mesh(boxGeometry, boxMaterial);
    box.position.set(-2, 0.25, -2);
    this.scene.add(box);
    
    const sphereGeometry = new THREE.SphereGeometry(0.3, 32, 32);
    const sphereMaterial = new THREE.MeshStandardMaterial({ color: 0x0000ff });
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphere.position.set(2, 0.3, -3);
    this.scene.add(sphere);
    
    // ライト
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    this.scene.add(directionalLight);
  }

  setCameraPosition(x, y, z) {
    this.camera.position.set(x, y, z);
  }

  setCameraRotation(x, y, z) {
    this.camera.rotation.set(x, y, z);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
    return this.renderer.domElement;
  }

  getImageData() {
    const canvas = this.renderer.domElement;
    const ctx = canvas.getContext('2d');
    return ctx.getImageData(0, 0, this.width, this.height);
  }

  dispose() {
    this.renderer.dispose();
  }
}
