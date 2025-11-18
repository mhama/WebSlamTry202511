// WebAR VISLAM Demo with Three.js
class ARVislamDemo {
    constructor() {
        this.video = document.getElementById('video');
        this.canvas = document.getElementById('canvas');
        this.statusEl = document.getElementById('status');
        this.orientationEl = document.getElementById('orientation-data');
        this.startBtn = document.getElementById('startBtn');
        this.placeBtn = document.getElementById('placeBtn');

        // Three.js components
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.objects = [];

        // Tracking data
        this.orientation = { alpha: 0, beta: 0, gamma: 0 };
        this.acceleration = { x: 0, y: 0, z: 0 };
        this.position = { x: 0, y: 0, z: -5 };

        // SLAM-like state
        this.velocity = { x: 0, y: 0, z: 0 };
        this.lastTime = Date.now();

        this.isRunning = false;
        this.hasCamera = false;

        this.init();
    }

    init() {
        this.startBtn.addEventListener('click', () => this.start());
        this.placeBtn.addEventListener('click', () => this.placeObject());

        // Check for sensor support
        if (window.DeviceOrientationEvent) {
            this.statusEl.textContent = '準備完了。AR開始ボタンを押してください。';
        } else {
            this.statusEl.textContent = '警告: デバイスの向き検出が利用できません。';
        }
    }

    async start() {
        try {
            this.statusEl.textContent = 'カメラにアクセス中...';

            // Request camera access (rear camera)
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment', // rear camera
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                },
                audio: false
            });

            this.video.srcObject = stream;
            this.video.style.display = 'block';
            this.hasCamera = true;

            // Wait for video to be ready
            await new Promise((resolve) => {
                this.video.onloadedmetadata = () => {
                    this.video.play();
                    resolve();
                };
            });

            this.statusEl.textContent = 'Three.jsシーンを初期化中...';
            this.initThreeJS();

            this.statusEl.textContent = 'センサーを初期化中...';
            await this.initSensors();

            this.statusEl.textContent = 'AR実行中 - デバイスを動かしてください';
            this.startBtn.style.display = 'none';
            this.placeBtn.style.display = 'block';

            this.isRunning = true;
            this.animate();

        } catch (error) {
            console.error('Error starting AR:', error);
            this.statusEl.textContent = `エラー: ${error.message}`;
        }
    }

    initThreeJS() {
        // Create scene
        this.scene = new THREE.Scene();

        // Create camera
        const aspect = window.innerWidth / window.innerHeight;
        this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
        this.camera.position.set(0, 0, 0);

        // Create renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            alpha: true,
            antialias: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);

        // Add lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(1, 1, 1);
        this.scene.add(directionalLight);

        // Add grid for reference (ground plane)
        const gridHelper = new THREE.GridHelper(10, 10, 0x00ff00, 0x00ff00);
        gridHelper.position.y = -1.5;
        gridHelper.material.transparent = true;
        gridHelper.material.opacity = 0.3;
        this.scene.add(gridHelper);

        // Add initial object
        this.placeObject();

        // Handle window resize
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    async initSensors() {
        // Request motion permissions on iOS 13+
        if (typeof DeviceMotionEvent !== 'undefined' &&
            typeof DeviceMotionEvent.requestPermission === 'function') {
            try {
                const permissionState = await DeviceMotionEvent.requestPermission();
                if (permissionState !== 'granted') {
                    throw new Error('Motion permission not granted');
                }
            } catch (error) {
                console.error('Error requesting motion permission:', error);
            }
        }

        // Device orientation (gyroscope + magnetometer)
        window.addEventListener('deviceorientation', (event) => {
            this.orientation.alpha = event.alpha || 0; // Z-axis rotation (0-360)
            this.orientation.beta = event.beta || 0;   // X-axis rotation (-180 to 180)
            this.orientation.gamma = event.gamma || 0; // Y-axis rotation (-90 to 90)

            this.updateOrientationDisplay();
        }, true);

        // Device motion (accelerometer + gyroscope)
        window.addEventListener('devicemotion', (event) => {
            if (event.accelerationIncludingGravity) {
                this.acceleration.x = event.accelerationIncludingGravity.x || 0;
                this.acceleration.y = event.accelerationIncludingGravity.y || 0;
                this.acceleration.z = event.accelerationIncludingGravity.z || 0;
            }
        }, true);
    }

    updateOrientationDisplay() {
        this.orientationEl.innerHTML = `
            α: ${this.orientation.alpha.toFixed(1)}°
            β: ${this.orientation.beta.toFixed(1)}°
            γ: ${this.orientation.gamma.toFixed(1)}°
        `;
    }

    updateCameraFromSensors() {
        // Convert device orientation to camera rotation
        // This is a simplified SLAM-like tracking using IMU data

        const alpha = THREE.MathUtils.degToRad(this.orientation.alpha);
        const beta = THREE.MathUtils.degToRad(this.orientation.beta);
        const gamma = THREE.MathUtils.degToRad(this.orientation.gamma);

        // Apply rotations (simplified)
        // In a real VISLAM system, this would be fused with visual features
        this.camera.rotation.set(
            beta,
            alpha,
            -gamma,
            'YXZ'
        );

        // Simple dead reckoning from acceleration
        // In a real VISLAM system, this would be corrected by visual odometry
        const currentTime = Date.now();
        const dt = (currentTime - this.lastTime) / 1000; // delta time in seconds
        this.lastTime = currentTime;

        // Filter out gravity (simplified)
        const accelThreshold = 0.5;
        const ax = Math.abs(this.acceleration.x) > accelThreshold ? this.acceleration.x / 100 : 0;
        const ay = Math.abs(this.acceleration.y) > accelThreshold ? this.acceleration.y / 100 : 0;
        const az = Math.abs(this.acceleration.z - 9.8) > accelThreshold ? (this.acceleration.z - 9.8) / 100 : 0;

        // Update velocity (dead reckoning)
        this.velocity.x += ax * dt;
        this.velocity.y += ay * dt;
        this.velocity.z += az * dt;

        // Apply damping
        this.velocity.x *= 0.95;
        this.velocity.y *= 0.95;
        this.velocity.z *= 0.95;

        // Update position
        this.camera.position.x += this.velocity.x * dt;
        this.camera.position.y += this.velocity.y * dt;
        this.camera.position.z += this.velocity.z * dt;
    }

    placeObject() {
        // Create a random colorful 3D object
        const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff];
        const color = colors[Math.floor(Math.random() * colors.length)];

        // Random geometry
        const geometries = [
            new THREE.BoxGeometry(0.3, 0.3, 0.3),
            new THREE.SphereGeometry(0.2, 16, 16),
            new THREE.ConeGeometry(0.2, 0.4, 16),
            new THREE.TorusGeometry(0.2, 0.08, 8, 16)
        ];
        const geometry = geometries[Math.floor(Math.random() * geometries.length)];

        const material = new THREE.MeshPhongMaterial({
            color: color,
            shininess: 100
        });

        const mesh = new THREE.Mesh(geometry, material);

        // Place object in front of camera
        const distance = 2;
        const angle = THREE.MathUtils.degToRad(this.orientation.alpha || 0);

        mesh.position.set(
            Math.sin(angle) * distance,
            -1 + (Math.random() - 0.5),
            -Math.cos(angle) * distance
        );

        // Add rotation animation
        mesh.userData.rotationSpeed = {
            x: (Math.random() - 0.5) * 0.02,
            y: (Math.random() - 0.5) * 0.02,
            z: (Math.random() - 0.5) * 0.02
        };

        this.scene.add(mesh);
        this.objects.push(mesh);

        this.statusEl.textContent = `AR実行中 - オブジェクト数: ${this.objects.length}`;
    }

    animate() {
        if (!this.isRunning) return;

        requestAnimationFrame(() => this.animate());

        // Update camera based on sensor data
        this.updateCameraFromSensors();

        // Animate objects
        this.objects.forEach(obj => {
            if (obj.userData.rotationSpeed) {
                obj.rotation.x += obj.userData.rotationSpeed.x;
                obj.rotation.y += obj.userData.rotationSpeed.y;
                obj.rotation.z += obj.userData.rotationSpeed.z;
            }
        });

        // Render scene
        this.renderer.render(this.scene, this.camera);
    }
}

// Initialize app when page loads
document.addEventListener('DOMContentLoaded', () => {
    new ARVislamDemo();
});
