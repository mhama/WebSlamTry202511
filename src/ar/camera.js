// カメラ入力管理
export class CameraManager {
  constructor() {
    this.stream = null;
    this.videoElement = null;
  }

  async initialize(videoElement) {
    this.videoElement = videoElement;
    
    const constraints = {
      video: {
        facingMode: 'environment',
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: false
    };

    try {
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.videoElement.srcObject = this.stream;
      
      return new Promise((resolve, reject) => {
        this.videoElement.onloadedmetadata = () => {
          this.videoElement.play();
          resolve({
            width: this.videoElement.videoWidth,
            height: this.videoElement.videoHeight
          });
        };
        this.videoElement.onerror = reject;
      });
    } catch (error) {
      console.error('Camera access error:', error);
      throw error;
    }
  }

  stop() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
  }

  getVideoElement() {
    return this.videoElement;
  }
}
