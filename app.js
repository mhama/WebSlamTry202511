// WebAR VISLAM Demo with Three.js
class ARVislamDemo {
    constructor() {
        this.video = document.getElementById('video');
        this.canvas = document.getElementById('canvas');
        this.statusEl = document.getElementById('status');
        this.orientationEl = document.getElementById('orientation-data');
        this.startBtn = document.getElementById('startBtn');
        this.placeBtn = document.getElementById('placeBtn');

        // Debug UI elements
        this.debugPanel = document.getElementById('debug-panel');
        this.toggleDebugBtn = document.getElementById('toggle-debug');

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

        // Performance tracking
        this.frameCount = 0;
        this.lastFpsUpdate = Date.now();
        this.currentFps = 0;
        this.renderCount = 0;

        // State flags
        this.isRunning = false;
        this.hasCamera = false;
        this.hasSensors = false;
        this.debugMode = false;

        // Debug counters
        this.sensorEventCount = 0;

        this.init();
    }

    init() {
        this.startBtn.addEventListener('click', () => this.start());
        this.placeBtn.addEventListener('click', () => this.placeObject());
        this.toggleDebugBtn.addEventListener('click', () => this.toggleDebug());

        // Log device and browser information
        console.log('=== ARVislamDemo Initialization ===');
        console.log('User Agent:', navigator.userAgent);
        console.log('Platform:', navigator.platform);
        console.log('DeviceOrientationEvent support:', !!window.DeviceOrientationEvent);
        console.log('DeviceMotionEvent support:', !!window.DeviceMotionEvent);
        console.log('DeviceOrientationEvent.requestPermission:', typeof DeviceOrientationEvent?.requestPermission);
        console.log('DeviceMotionEvent.requestPermission:', typeof DeviceMotionEvent?.requestPermission);

        // Check for sensor support
        if (window.DeviceOrientationEvent) {
            this.statusEl.textContent = '準備完了。AR開始ボタンを押してください。';
        } else {
            this.statusEl.textContent = '警告: デバイスの向き検出が利用できません。';
        }

        console.log('ARVislamDemo initialized');
    }

    toggleDebug() {
        this.debugMode = !this.debugMode;
        this.debugPanel.style.display = this.debugMode ? 'block' : 'none';
        console.log('Debug mode:', this.debugMode);
    }

    start() {
        // IMPORTANT: Must NOT use async/await in the button click handler
        // because it breaks the user gesture context needed for sensor permissions

        this.statusEl.textContent = 'センサー権限を要求中...';
        console.log('Starting AR initialization...');

        // Request sensor permissions synchronously (must be in user gesture context)
        this.requestSensorPermissions()
            .then(() => {
                this.statusEl.textContent = 'カメラにアクセス中...';
                console.log('✓ Sensor permissions granted, requesting camera...');

                // Now request camera access
                return navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: 'environment',
                        width: { ideal: 1920 },
                        height: { ideal: 1080 }
                    },
                    audio: false
                });
            })
            .then((stream) => {
                this.video.srcObject = stream;
                this.video.style.display = 'block';
                this.hasCamera = true;
                this.updateDebugIndicator('camera', true, 'アクティブ');
                console.log('✓ Camera active:', stream.getVideoTracks()[0].getSettings());

                // Wait for video to be ready
                return new Promise((resolve) => {
                    this.video.onloadedmetadata = () => {
                        this.video.play();
                        resolve();
                    };
                });
            })
            .then(() => {
                this.statusEl.textContent = 'Three.jsシーンを初期化中...';
                this.initThreeJS();
                this.updateDebugIndicator('threejs', true, 'アクティブ');
                console.log('✓ Three.js initialized');

                this.statusEl.textContent = 'センサーを初期化中...';
                this.attachSensorListeners();
                console.log('✓ Sensor listeners attached');

                this.statusEl.textContent = 'AR実行中 - デバイスを動かしてください';
                this.startBtn.style.display = 'none';
                this.placeBtn.style.display = 'block';

                this.isRunning = true;
                this.animate();
            })
            .catch((error) => {
                console.error('Error starting AR:', error);
                this.statusEl.textContent = `エラー: ${error.message}`;
                this.updateDebugIndicator('sensor', false, 'エラー');
            });
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

        // Add axis helper for debugging
        const axesHelper = new THREE.AxesHelper(2);
        axesHelper.position.set(0, 0, -3);
        this.scene.add(axesHelper);

        // Add a large bright test object to ensure visibility
        const testGeometry = new THREE.SphereGeometry(0.5, 32, 32);
        const testMaterial = new THREE.MeshBasicMaterial({
            color: 0xff00ff,
            wireframe: false
        });
        const testMesh = new THREE.Mesh(testGeometry, testMaterial);
        testMesh.position.set(0, 0, -3);
        this.scene.add(testMesh);
        this.objects.push(testMesh);

        console.log('Added test sphere at (0, 0, -3)');

        // Handle window resize
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    requestSensorPermissions() {
        // IMPORTANT: This function is called directly from user gesture (button click)
        // We must NOT use async/await here to maintain user gesture context

        console.log('Requesting sensor permissions...');

        const needsPermission = typeof DeviceOrientationEvent !== 'undefined' &&
            typeof DeviceOrientationEvent.requestPermission === 'function';

        if (!needsPermission) {
            console.log('✓ No permission request needed (not iOS 13+)');
            return Promise.resolve();
        }

        // On iOS 13+, request both permissions in sequence
        console.log('Requesting DeviceOrientation permission (iOS 13+)...');

        return DeviceOrientationEvent.requestPermission()
            .then((orientationState) => {
                console.log('DeviceOrientation permission result:', orientationState);

                if (orientationState !== 'granted') {
                    throw new Error('DeviceOrientation permission denied');
                }

                // Request motion permission
                if (typeof DeviceMotionEvent !== 'undefined' &&
                    typeof DeviceMotionEvent.requestPermission === 'function') {
                    console.log('Requesting DeviceMotion permission (iOS 13+)...');
                    return DeviceMotionEvent.requestPermission();
                }
                return 'granted';
            })
            .then((motionState) => {
                console.log('DeviceMotion permission result:', motionState);

                if (motionState !== 'granted') {
                    throw new Error('DeviceMotion permission denied');
                }

                console.log('✓ All sensor permissions granted');
            })
            .catch((error) => {
                console.error('Sensor permission error:', error);
                this.updateDebugIndicator('sensor', false, '権限なし');

                // More user-friendly error messages
                if (error.name === 'NotAllowedError') {
                    throw new Error('センサー権限が拒否されました。ページをリロードして再試行してください。');
                } else {
                    throw error;
                }
            });
    }

    attachSensorListeners() {
        console.log('Attaching sensor listeners...');

        // Device orientation (gyroscope + magnetometer)
        window.addEventListener('deviceorientation', (event) => {
            // Log only first 5 events to avoid console spam
            if (this.sensorEventCount < 5) {
                console.log(`DeviceOrientation event #${this.sensorEventCount + 1}:`, {
                    alpha: event.alpha,
                    beta: event.beta,
                    gamma: event.gamma,
                    absolute: event.absolute
                });
                this.sensorEventCount++;
            }

            this.orientation.alpha = event.alpha || 0; // Z-axis rotation (0-360)
            this.orientation.beta = event.beta || 0;   // X-axis rotation (-180 to 180)
            this.orientation.gamma = event.gamma || 0; // Y-axis rotation (-90 to 90)

            if (!this.hasSensors && (event.alpha !== null || event.beta !== null || event.gamma !== null)) {
                this.hasSensors = true;
                this.updateDebugIndicator('sensor', true, 'アクティブ');
                console.log('✓ Orientation sensor ACTIVE - values detected:', {
                    alpha: event.alpha?.toFixed(1),
                    beta: event.beta?.toFixed(1),
                    gamma: event.gamma?.toFixed(1)
                });
            }

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

        console.log('✓ Sensor listeners attached');

        // Set a timeout to check if sensors are working
        setTimeout(() => {
            if (!this.hasSensors) {
                console.warn('Sensors not responding after 2 seconds');
                this.updateDebugIndicator('sensor', false, '応答なし');
                this.statusEl.textContent = '警告: センサーが応答していません。デバイスを動かしてください。';
            }
        }, 2000);
    }

    updateDebugIndicator(type, active, statusText) {
        const indicator = document.getElementById(`${type}-indicator`);
        const status = document.getElementById(`${type}-status`);

        if (indicator && status) {
            if (active) {
                indicator.classList.remove('inactive');
                indicator.classList.add('active');
            } else {
                indicator.classList.remove('active');
                indicator.classList.add('inactive');
            }
            status.textContent = statusText;
        }
    }

    updateOrientationDisplay() {
        this.orientationEl.innerHTML = `
            α: ${this.orientation.alpha.toFixed(1)}°
            β: ${this.orientation.beta.toFixed(1)}°
            γ: ${this.orientation.gamma.toFixed(1)}°
        `;

        // Update debug panel sensor data
        this.updateDebugElement('sensor-alpha', `${this.orientation.alpha.toFixed(1)}°`);
        this.updateDebugElement('sensor-beta', `${this.orientation.beta.toFixed(1)}°`);
        this.updateDebugElement('sensor-gamma', `${this.orientation.gamma.toFixed(1)}°`);
        this.updateDebugElement('accel-x', this.acceleration.x.toFixed(2));
        this.updateDebugElement('accel-y', this.acceleration.y.toFixed(2));
        this.updateDebugElement('accel-z', this.acceleration.z.toFixed(2));
    }

    updateDebugElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
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
        this.updateDebugElement('object-count', this.objects.length);

        console.log(`Placed object at (${mesh.position.x.toFixed(2)}, ${mesh.position.y.toFixed(2)}, ${mesh.position.z.toFixed(2)})`);
        this.updateObjectList();
    }

    updateObjectList() {
        const listEl = document.getElementById('object-list');
        if (!listEl) return;

        listEl.innerHTML = this.objects.map((obj, index) => `
            <div class="debug-row" style="font-size: 10px;">
                <span class="debug-label">#${index}:</span>
                <span class="debug-value">
                    (${obj.position.x.toFixed(1)}, ${obj.position.y.toFixed(1)}, ${obj.position.z.toFixed(1)})
                </span>
            </div>
        `).join('');
    }

    animate() {
        if (!this.isRunning) return;

        requestAnimationFrame(() => this.animate());

        // Update FPS counter
        this.frameCount++;
        const now = Date.now();
        if (now - this.lastFpsUpdate >= 1000) {
            this.currentFps = this.frameCount;
            this.frameCount = 0;
            this.lastFpsUpdate = now;
            this.updateDebugElement('fps', this.currentFps);
        }

        // Update camera based on sensor data
        this.updateCameraFromSensors();

        // Update debug info
        if (this.camera) {
            this.updateDebugElement('cam-position',
                `x:${this.camera.position.x.toFixed(2)} y:${this.camera.position.y.toFixed(2)} z:${this.camera.position.z.toFixed(2)}`
            );
            this.updateDebugElement('cam-rotation',
                `x:${THREE.MathUtils.radToDeg(this.camera.rotation.x).toFixed(1)}° y:${THREE.MathUtils.radToDeg(this.camera.rotation.y).toFixed(1)}° z:${THREE.MathUtils.radToDeg(this.camera.rotation.z).toFixed(1)}°`
            );
        }

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
        this.renderCount++;

        // Update render count every 60 frames
        if (this.renderCount % 60 === 0) {
            this.updateDebugElement('render-count', this.renderCount);
            this.updateDebugElement('canvas-size',
                `${this.canvas.width}x${this.canvas.height}`
            );
        }
    }
}

// Initialize app when page loads
document.addEventListener('DOMContentLoaded', () => {
    new ARVislamDemo();
});
