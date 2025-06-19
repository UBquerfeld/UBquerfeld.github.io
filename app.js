// GIF Editor Application
class GifEditor {
    constructor() {
        this.currentGifData = null;
        this.gifFrames = [];
        this.isPlaying = true;
        this.currentFrame = 0;
        this.animationInterval = null;
        this.cropPosition = { x: 10, y: 10 };
        this.cropSize = { width: 50, height: 50 };
        
        this.init();
    }

    init() {
        this.setupTabs();
        this.setupGifUpload();
        this.setupVideoUpload();
        this.setupEventListeners();
    }

    // Tab Management
    setupTabs() {
        const tabButtons = document.querySelectorAll('.tab-button');
        const tabContents = document.querySelectorAll('.tab-content');

        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetTab = button.dataset.tab;
                
                // Remove active class from all tabs and contents
                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabContents.forEach(content => content.classList.remove('active'));
                
                // Add active class to clicked tab and its content
                button.classList.add('active');
                document.getElementById(targetTab).classList.add('active');
            });
        });
    }

    // GIF Upload Setup
    setupGifUpload() {
        const uploadArea = document.getElementById('gif-upload-area');
        const fileInput = document.getElementById('gif-file-input');
        const urlInput = document.getElementById('gif-url-input');
        const loadUrlBtn = document.getElementById('load-gif-url');

        // File input change
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleGifFile(e.target.files[0]);
            }
        });

        // Drag and drop
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            
            const files = e.dataTransfer.files;
            if (files.length > 0 && files[0].type === 'image/gif') {
                this.handleGifFile(files[0]);
            } else {
                this.showError('gif-error', '올바른 GIF 파일을 드롭해주세요.');
            }
        });

        // URL loading
        loadUrlBtn.addEventListener('click', () => {
            const url = urlInput.value.trim();
            if (url) {
                this.loadGifFromUrl(url);
            }
        });

        // Enter key on URL input
        urlInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const url = urlInput.value.trim();
                if (url) {
                    this.loadGifFromUrl(url);
                }
            }
        });
    }

    // Video Upload Setup
    setupVideoUpload() {
        const uploadArea = document.getElementById('video-upload-area');
        const fileInput = document.getElementById('video-file-input');
        const urlInput = document.getElementById('video-url-input');
        const loadUrlBtn = document.getElementById('load-video-url');

        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleVideoFile(e.target.files[0]);
            }
        });

        // Drag and drop for video
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                const file = files[0];
                const videoTypes = ['video/mp4', 'video/mov', 'video/avi', 'video/webm'];
                if (videoTypes.includes(file.type)) {
                    this.handleVideoFile(file);
                } else {
                    this.showError('video-error', '지원되는 동영상 파일을 드롭해주세요. (MP4, MOV, AVI, WebM)');
                }
            }
        });

        // Video URL loading
        loadUrlBtn.addEventListener('click', () => {
            const url = urlInput.value.trim();
            if (url) {
                this.loadVideoFromUrl(url);
            }
        });
    }

    // Event Listeners Setup
    setupEventListeners() {
        // GIF controls
        const playPauseBtn = document.getElementById('play-pause-btn');
        const frameSlider = document.getElementById('frame-slider');
        const cropBtn = document.getElementById('crop-gif-btn');
        const resetGifBtn = document.getElementById('reset-gif-btn');

        if (playPauseBtn) {
            playPauseBtn.addEventListener('click', () => this.togglePlayPause());
        }

        if (frameSlider) {
            frameSlider.addEventListener('input', (e) => {
                this.currentFrame = parseInt(e.target.value);
                this.showFrame(this.currentFrame);
            });
        }

        if (cropBtn) {
            cropBtn.addEventListener('click', () => this.cropGif());
        }

        if (resetGifBtn) {
            resetGifBtn.addEventListener('click', () => this.resetGif());
        }

        // Video controls
        const convertBtn = document.getElementById('convert-video-btn');
        const resetVideoBtn = document.getElementById('reset-video-btn');

        if (convertBtn) {
            convertBtn.addEventListener('click', () => this.convertVideoToGif());
        }

        if (resetVideoBtn) {
            resetVideoBtn.addEventListener('click', () => this.resetVideo());
        }

        // Crop selector dragging
        this.setupCropSelector();
    }

    // Setup draggable crop selector
    setupCropSelector() {
        const cropSelector = document.getElementById('crop-selector');
        if (!cropSelector) return;

        let isDragging = false;
        let startX, startY, startLeft, startTop;

        cropSelector.addEventListener('mousedown', (e) => {
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            startLeft = parseInt(cropSelector.style.left || '10px');
            startTop = parseInt(cropSelector.style.top || '10px');
            
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
            e.preventDefault();
        });

        const onMouseMove = (e) => {
            if (!isDragging) return;
            
            const canvas = document.getElementById('original-canvas');
            const canvasRect = canvas.getBoundingClientRect();
            const containerRect = canvas.parentElement.getBoundingClientRect();
            
            let newLeft = startLeft + (e.clientX - startX);
            let newTop = startTop + (e.clientY - startY);
            
            // Constrain to canvas bounds
            const maxLeft = canvas.width - this.cropSize.width;
            const maxTop = canvas.height - this.cropSize.height;
            
            newLeft = Math.max(0, Math.min(newLeft, maxLeft));
            newTop = Math.max(0, Math.min(newTop, maxTop));
            
            cropSelector.style.left = newLeft + 'px';
            cropSelector.style.top = newTop + 'px';
            
            this.cropPosition.x = newLeft;
            this.cropPosition.y = newTop;
            
            // Update cropped preview
            this.updateCroppedPreview();
        };

        const onMouseUp = () => {
            isDragging = false;
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
    }

    // Load GIF from URL with CORS handling
    async loadGifFromUrl(url) {
        this.showProcessing('gif-processing', true);
        this.hideError('gif-error');

        try {
            // First, try to load directly
            const response = await fetch(url, {
                mode: 'cors',
                headers: {
                    'Accept': 'image/gif,image/*,*/*'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('image/gif')) {
                throw new Error('URL이 유효한 GIF 파일이 아닙니다.');
            }

            const blob = await response.blob();
            await this.handleGifBlob(blob);

        } catch (error) {
            console.error('Direct fetch failed:', error);
            
            // Try alternative method using Image element
            try {
                await this.loadGifViaImage(url);
            } catch (imageError) {
                console.error('Image load failed:', imageError);
                this.showError('gif-error', 
                    `외부 URL에서 GIF를 불러올 수 없습니다. CORS 제한으로 인해 이 URL에 직접 접근할 수 없습니다. 파일을 직접 업로드해주세요.\n\n오류: ${error.message}`
                );
            }
        } finally {
            this.showProcessing('gif-processing', false);
        }
    }

    // Alternative method to load GIF using Image element
    loadGifViaImage(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            img.onload = () => {
                // Convert image to canvas and extract as blob
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                
                canvas.toBlob(async (blob) => {
                    if (blob) {
                        try {
                            await this.handleGifBlob(blob);
                            resolve();
                        } catch (error) {
                            reject(error);
                        }
                    } else {
                        reject(new Error('블롭 생성에 실패했습니다.'));
                    }
                }, 'image/gif');
            };
            
            img.onerror = () => {
                reject(new Error('이미지를 불러올 수 없습니다. URL을 확인해주세요.'));
            };
            
            img.src = url;
        });
    }

    // Handle GIF file
    async handleGifFile(file) {
        if (file.size > 10 * 1024 * 1024) { // 10MB limit
            this.showError('gif-error', '파일 크기가 10MB를 초과합니다. 더 작은 파일을 사용해주세요.');
            return;
        }

        if (file.type !== 'image/gif') {
            this.showError('gif-error', '올바른 GIF 파일을 선택해주세요.');
            return;
        }

        this.showProcessing('gif-processing', true);
        this.hideError('gif-error');

        try {
            await this.handleGifBlob(file);
        } catch (error) {
            this.showError('gif-error', `GIF 처리 중 오류가 발생했습니다: ${error.message}`);
        } finally {
            this.showProcessing('gif-processing', false);
        }
    }

    // Handle GIF blob (common for file and URL)
    async handleGifBlob(blob) {
        const arrayBuffer = await blob.arrayBuffer();
        const gifData = new Uint8Array(arrayBuffer);
        
        // Parse GIF using custom parser
        this.currentGifData = gifData;
        this.gifFrames = await this.parseGif(gifData);
        
        if (this.gifFrames.length === 0) {
            throw new Error('GIF 프레임을 추출할 수 없습니다.');
        }

        this.showGifPreview();
        this.startAnimation();
    }

    // Simple GIF parser for frame extraction
    async parseGif(data) {
        const frames = [];
        
        // Check GIF signature
        const signature = String.fromCharCode(...data.slice(0, 6));
        if (!signature.startsWith('GIF')) {
            throw new Error('유효하지 않은 GIF 파일입니다.');
        }

        // For now, we'll use a simpler approach by loading the GIF as an image
        // and capturing frames through canvas animation
        const blob = new Blob([data], { type: 'image/gif' });
        const url = URL.createObjectURL(blob);
        
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                // Create frames by drawing the image at different times
                // This is a simplified approach - in a real implementation,
                // you'd want to use a proper GIF decoder library
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = img.width;
                canvas.height = img.height;
                
                // For animated GIFs, we'll create multiple frames
                // This is a basic implementation
                for (let i = 0; i < 10; i++) { // Assume max 10 frames for demo
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0);
                    
                    const frameData = canvas.toDataURL('image/png');
                    frames.push({
                        data: frameData,
                        delay: 100, // Default 100ms delay
                        width: img.width,
                        height: img.height
                    });
                }
                
                URL.revokeObjectURL(url);
                resolve(frames);
            };
            
            img.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error('GIF 이미지를 로드할 수 없습니다.'));
            };
            
            img.src = url;
        });
    }

    // Show GIF preview
    showGifPreview() {
        const previewSection = document.getElementById('gif-preview-section');
        const originalCanvas = document.getElementById('original-canvas');
        const frameSlider = document.getElementById('frame-slider');
        const totalFrames = document.getElementById('total-frames');

        if (this.gifFrames.length === 0) return;

        const firstFrame = this.gifFrames[0];
        originalCanvas.width = firstFrame.width;
        originalCanvas.height = firstFrame.height;

        // Setup frame slider
        frameSlider.max = this.gifFrames.length - 1;
        frameSlider.value = 0;
        totalFrames.textContent = this.gifFrames.length;

        // Show the first frame
        this.showFrame(0);

        // Show preview section
        previewSection.classList.remove('hidden');

        // Update cropped preview
        this.updateCroppedPreview();
    }

    // Show specific frame
    showFrame(frameIndex) {
        if (frameIndex < 0 || frameIndex >= this.gifFrames.length) return;

        const canvas = document.getElementById('original-canvas');
        const ctx = canvas.getContext('2d');
        const frame = this.gifFrames[frameIndex];

        const img = new Image();
        img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            this.updateCroppedPreview();
        };
        img.src = frame.data;

        // Update frame counter
        document.getElementById('current-frame').textContent = frameIndex + 1;
        document.getElementById('frame-slider').value = frameIndex;
    }

    // Start/stop animation
    startAnimation() {
        this.stopAnimation();
        if (this.gifFrames.length <= 1) return;

        this.animationInterval = setInterval(() => {
            if (this.isPlaying) {
                this.currentFrame = (this.currentFrame + 1) % this.gifFrames.length;
                this.showFrame(this.currentFrame);
            }
        }, this.gifFrames[this.currentFrame]?.delay || 100);
    }

    stopAnimation() {
        if (this.animationInterval) {
            clearInterval(this.animationInterval);
            this.animationInterval = null;
        }
    }

    // Toggle play/pause
    togglePlayPause() {
        this.isPlaying = !this.isPlaying;
        const btn = document.getElementById('play-pause-btn');
        btn.textContent = this.isPlaying ? '⏸️ 일시정지' : '▶️ 재생';
        
        if (this.isPlaying) {
            this.startAnimation();
        }
    }

    // Update cropped preview
    updateCroppedPreview() {
        const originalCanvas = document.getElementById('original-canvas');
        const croppedCanvas = document.getElementById('cropped-canvas');
        
        if (!originalCanvas || !croppedCanvas) return;

        const originalCtx = originalCanvas.getContext('2d');
        const croppedCtx = croppedCanvas.getContext('2d');

        // Get image data from crop area
        const imageData = originalCtx.getImageData(
            this.cropPosition.x, 
            this.cropPosition.y, 
            this.cropSize.width, 
            this.cropSize.height
        );

        // Clear cropped canvas and draw the cropped area
        croppedCtx.clearRect(0, 0, croppedCanvas.width, croppedCanvas.height);
        croppedCtx.putImageData(imageData, 0, 0);
    }

    // Crop GIF
    async cropGif() {
        if (!this.gifFrames || this.gifFrames.length === 0) {
            this.showError('gif-error', '크롭할 GIF가 없습니다.');
            return;
        }

        this.showProcessing('gif-processing', true);

        try {
            const croppedFrames = [];
            
            // Crop each frame
            for (const frame of this.gifFrames) {
                const croppedFrame = await this.cropFrame(frame);
                croppedFrames.push(croppedFrame);
            }

            // Generate cropped GIF
            const croppedGifBlob = await this.createGifFromFrames(croppedFrames);
            
            // Download the result
            this.downloadBlob(croppedGifBlob, 'cropped-gif.gif');

        } catch (error) {
            this.showError('gif-error', `GIF 크롭 중 오류가 발생했습니다: ${error.message}`);
        } finally {
            this.showProcessing('gif-processing', false);
        }
    }

    // Crop individual frame
    async cropFrame(frame) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = this.cropSize.width;
                canvas.height = this.cropSize.height;

                // Draw the cropped portion
                ctx.drawImage(
                    img,
                    this.cropPosition.x, this.cropPosition.y,
                    this.cropSize.width, this.cropSize.height,
                    0, 0,
                    this.cropSize.width, this.cropSize.height
                );

                resolve({
                    data: canvas.toDataURL('image/png'),
                    delay: frame.delay,
                    width: this.cropSize.width,
                    height: this.cropSize.height
                });
            };
            img.src = frame.data;
        });
    }

    // Create GIF from frames (simplified version)
    async createGifFromFrames(frames) {
        // This is a simplified implementation
        // In a real application, you'd use a proper GIF encoder
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = frames[0].width;
        canvas.height = frames[0].height;

        // For now, just return the first frame as a static image
        // In a full implementation, you'd use a library like gif.js
        const img = new Image();
        img.src = frames[0].data;
        
        return new Promise((resolve) => {
            img.onload = () => {
                ctx.drawImage(img, 0, 0);
                canvas.toBlob(resolve, 'image/gif');
            };
        });
    }

    // Video handling
    handleVideoFile(file) {
        const video = document.getElementById('video-preview');
        const previewSection = document.getElementById('video-preview-section');
        
        const url = URL.createObjectURL(file);
        video.src = url;
        
        video.onloadedmetadata = () => {
            const endTimeInput = document.getElementById('end-time');
            endTimeInput.max = video.duration;
            endTimeInput.value = Math.min(3, video.duration);
            
            previewSection.classList.remove('hidden');
        };
    }

    loadVideoFromUrl(url) {
        const video = document.getElementById('video-preview');
        const previewSection = document.getElementById('video-preview-section');
        
        video.src = url;
        video.onloadedmetadata = () => {
            const endTimeInput = document.getElementById('end-time');
            endTimeInput.max = video.duration;
            endTimeInput.value = Math.min(3, video.duration);
            
            previewSection.classList.remove('hidden');
        };
        
        video.onerror = () => {
            this.showError('video-error', '동영상 URL을 불러올 수 없습니다.');
        };
    }

    // Convert video to GIF
    async convertVideoToGif() {
        const video = document.getElementById('video-preview');
        const startTime = parseFloat(document.getElementById('start-time').value);
        const endTime = parseFloat(document.getElementById('end-time').value);
        const fps = parseInt(document.getElementById('fps-setting').value);
        const sizeOption = document.getElementById('size-setting').value;

        if (startTime >= endTime) {
            this.showError('video-error', '시작 시간은 종료 시간보다 작아야 합니다.');
            return;
        }

        this.showProcessing('video-processing', true);

        try {
            const frames = await this.extractVideoFrames(video, startTime, endTime, fps, sizeOption);
            const gifBlob = await this.createGifFromFrames(frames);
            this.downloadBlob(gifBlob, 'converted-video.gif');
        } catch (error) {
            this.showError('video-error', `동영상 변환 중 오류가 발생했습니다: ${error.message}`);
        } finally {
            this.showProcessing('video-processing', false);
        }
    }

    // Extract frames from video
    async extractVideoFrames(video, startTime, endTime, fps, sizeOption) {
        const frames = [];
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Calculate canvas size
        let width = video.videoWidth;
        let height = video.videoHeight;
        
        if (sizeOption !== 'original') {
            const targetWidth = parseInt(sizeOption);
            const aspectRatio = width / height;
            width = targetWidth;
            height = targetWidth / aspectRatio;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const duration = endTime - startTime;
        const frameCount = Math.ceil(duration * fps);
        const frameInterval = duration / frameCount;
        
        for (let i = 0; i < frameCount; i++) {
            const time = startTime + (i * frameInterval);
            
            // Seek to specific time
            video.currentTime = time;
            await new Promise(resolve => {
                video.onseeked = resolve;
            });
            
            // Draw frame to canvas
            ctx.drawImage(video, 0, 0, width, height);
            
            // Convert to data URL
            const frameData = canvas.toDataURL('image/png');
            
            frames.push({
                data: frameData,
                delay: 1000 / fps, // Convert to milliseconds
                width: width,
                height: height
            });
        }
        
        return frames;
    }

    // Reset functions
    resetGif() {
        const previewSection = document.getElementById('gif-preview-section');
        const fileInput = document.getElementById('gif-file-input');
        const urlInput = document.getElementById('gif-url-input');
        
        previewSection.classList.add('hidden');
        fileInput.value = '';
        urlInput.value = '';
        
        this.stopAnimation();
        this.gifFrames = [];
        this.currentGifData = null;
        this.currentFrame = 0;
        
        this.hideError('gif-error');
    }

    resetVideo() {
        const previewSection = document.getElementById('video-preview-section');
        const fileInput = document.getElementById('video-file-input');
        const urlInput = document.getElementById('video-url-input');
        const video = document.getElementById('video-preview');
        
        previewSection.classList.add('hidden');
        fileInput.value = '';
        urlInput.value = '';
        video.src = '';
        
        this.hideError('video-error');
    }

    // Utility functions
    showProcessing(elementId, show) {
        const element = document.getElementById(elementId);
        if (element) {
            element.classList.toggle('hidden', !show);
        }
    }

    showError(elementId, message) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = message;
            element.classList.remove('hidden');
        }
    }

    hideError(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.classList.add('hidden');
        }
    }

    downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new GifEditor();
});