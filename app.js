// GIF 편집 도구 - 탭 시스템과 GIF 크롭 및 동영상 변환 기능
class GifEditor {
    constructor() {
        this.currentTab = 'gif-crop';
        this.gifCropTool = new GifCropTool();
        this.videoToGifTool = new VideoToGifTool();
        this.init();
    }

    init() {
        this.setupTabSwitching();
        this.gifCropTool.init();
        this.videoToGifTool.init();
    }

    setupTabSwitching() {
        const tabButtons = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');

        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetTab = button.dataset.tab;
                
                // Update active tab button
                tabButtons.forEach(btn => btn.classList.remove('tab-btn--active'));
                button.classList.add('tab-btn--active');
                
                // Update active tab content
                tabContents.forEach(content => content.classList.remove('tab-content--active'));
                const targetContent = document.getElementById(targetTab);
                if (targetContent) {
                    targetContent.classList.add('tab-content--active');
                }
                
                this.currentTab = targetTab;
            });
        });
    }

    showError(message) {
        // Remove existing errors
        const existingErrors = document.querySelectorAll('.error-message');
        existingErrors.forEach(error => error.remove());
        
        // Create error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        
        const container = document.querySelector('.container');
        container.insertBefore(errorDiv, container.firstChild);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 5000);
    }
}

// GIF 크롭 도구 클래스
class GifCropTool {
    constructor() {
        this.currentImage = null;
        this.frames = [];
        this.currentFrameIndex = 0;
        this.isPlaying = true;
        this.cropArea = { x: 50, y: 50, width: 50, height: 50 };
        this.animationId = null;
        
        // DOM elements
        this.uploadSection = null;
        this.editSection = null;
        this.resultSection = null;
        this.canvas = null;
        this.ctx = null;
        this.previewCanvas = null;
        this.previewCtx = null;
        this.resultCanvas = null;
        this.resultCtx = null;
    }

    init() {
        this.setupElements();
        this.setupEventListeners();
        this.setupDragAndDrop();
    }

    setupElements() {
        this.uploadSection = document.getElementById('gifUploadSection');
        this.editSection = document.getElementById('gifEditSection');
        this.resultSection = document.getElementById('gifResultSection');
        
        this.canvas = document.getElementById('gifOriginalCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.previewCanvas = document.getElementById('gifPreviewCanvas');
        this.previewCtx = this.previewCanvas.getContext('2d');
        this.resultCanvas = document.getElementById('gifResultCanvas');
        this.resultCtx = this.resultCanvas.getContext('2d');
        
        // Clear preview canvas with checkerboard pattern
        this.drawCheckerboard(this.previewCtx, 50, 50);
        this.drawCheckerboard(this.resultCtx, 50, 50);
    }

    drawCheckerboard(ctx, width, height) {
        const size = 8;
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = '#e0e0e0';
        for (let x = 0; x < width; x += size) {
            for (let y = 0; y < height; y += size) {
                if ((Math.floor(x / size) + Math.floor(y / size)) % 2) {
                    ctx.fillRect(x, y, size, size);
                }
            }
        }
    }

    setupEventListeners() {
        // File input
        const fileInput = document.getElementById('gifFileInput');
        fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        
        // Upload button
        const uploadBtn = document.querySelector('#gif-crop .btn--primary');
        if (uploadBtn) {
            uploadBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                fileInput.click();
            });
        }
        
        // Upload area click
        const uploadArea = document.getElementById('gifUploadArea');
        uploadArea.addEventListener('click', (e) => {
            if (e.target === uploadArea || e.target.closest('.upload-area__content')) {
                fileInput.click();
            }
        });

        // URL load button
        const urlLoadBtn = document.getElementById('gifUrlLoadBtn');
        if (urlLoadBtn) {
            urlLoadBtn.addEventListener('click', () => this.loadFromUrl());
        }

        // URL input enter key
        const urlInput = document.getElementById('gifUrlInput');
        if (urlInput) {
            urlInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.loadFromUrl();
                }
            });
        }
        
        // Controls
        const playPauseBtn = document.getElementById('gifPlayPauseBtn');
        if (playPauseBtn) {
            playPauseBtn.addEventListener('click', () => this.togglePlayPause());
        }
        
        const frameSlider = document.getElementById('gifFrameSlider');
        if (frameSlider) {
            frameSlider.addEventListener('input', (e) => this.goToFrame(parseInt(e.target.value)));
        }
        
        const cropBtn = document.getElementById('gifCropBtn');
        if (cropBtn) {
            cropBtn.addEventListener('click', () => this.processCrop());
        }
        
        const downloadBtn = document.getElementById('gifDownloadBtn');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', () => this.downloadResult());
        }
        
        const newFileBtn = document.getElementById('gifNewFileBtn');
        if (newFileBtn) {
            newFileBtn.addEventListener('click', () => this.resetApp());
        }
        
        // Crop box dragging
        this.setupCropHandlers();
    }

    setupCropHandlers() {
        const cropMoveHandle = document.getElementById('gifCropMoveHandle');
        if (cropMoveHandle) {
            let isDragging = false;
            let startX, startY;
            
            cropMoveHandle.addEventListener('mousedown', (e) => {
                isDragging = true;
                const rect = cropMoveHandle.getBoundingClientRect();
                startX = e.clientX - rect.left;
                startY = e.clientY - rect.top;
                e.preventDefault();
            });
            
            document.addEventListener('mousemove', (e) => {
                if (!isDragging) return;
                
                const container = document.getElementById('gifCropContainer');
                const containerRect = container.getBoundingClientRect();
                const canvasRect = this.canvas.getBoundingClientRect();
                
                let newX = e.clientX - containerRect.left - startX;
                let newY = e.clientY - containerRect.top - startY;
                
                // Constrain to canvas bounds
                const canvasLeft = canvasRect.left - containerRect.left;
                const canvasTop = canvasRect.top - containerRect.top;
                
                newX = Math.max(canvasLeft, Math.min(newX, canvasLeft + canvasRect.width - 50));
                newY = Math.max(canvasTop, Math.min(newY, canvasTop + canvasRect.height - 50));
                
                this.cropArea.x = newX - canvasLeft;
                this.cropArea.y = newY - canvasTop;
                
                const cropBox = document.getElementById('gifCropBox');
                cropBox.style.left = newX + 'px';
                cropBox.style.top = newY + 'px';
                
                this.updatePreview();
            });
            
            document.addEventListener('mouseup', () => {
                isDragging = false;
            });
        }
    }

    setupDragAndDrop() {
        const uploadArea = document.getElementById('gifUploadArea');
        
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });
        
        uploadArea.addEventListener('dragover', () => {
            uploadArea.classList.add('drag-over');
        });
        
        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('drag-over');
        });
        
        uploadArea.addEventListener('drop', (e) => {
            uploadArea.classList.remove('drag-over');
            const files = Array.from(e.dataTransfer.files);
            if (files.length > 0) {
                this.handleFile(files[0]);
            }
        });
    }

    loadFromUrl() {
        const urlInput = document.getElementById('gifUrlInput');
        const url = urlInput.value.trim();
        
        if (!url) {
            this.showError('URL을 입력해주세요.');
            return;
        }

        if (!this.isValidImageUrl(url)) {
            this.showError('유효한 이미지 URL을 입력해주세요.');
            return;
        }

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            this.processImage(img);
        };
        img.onerror = () => {
            this.showError('이미지를 로드할 수 없습니다. URL을 확인해주세요.');
        };
        img.src = url;
    }

    isValidImageUrl(url) {
        try {
            new URL(url);
            return /\.(gif|jpe?g|png|webp)$/i.test(url);
        } catch {
            return false;
        }
    }

    handleFileSelect(event) {
        const file = event.target.files[0];
        if (file) {
            this.handleFile(file);
        }
    }

    handleFile(file) {
        // Validate file
        if (!file.type.includes('gif') && !file.type.includes('image')) {
            this.showError('GIF 또는 이미지 파일만 업로드할 수 있습니다.');
            return;
        }
        
        if (file.size > 10 * 1024 * 1024) {
            this.showError('파일 크기는 10MB를 초과할 수 없습니다.');
            return;
        }
        
        this.loadImage(file);
    }

    loadImage(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                this.processImage(img);
            };
            img.onerror = () => {
                this.showError('이미지를 로드할 수 없습니다.');
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    processImage(img) {
        this.currentImage = img;
        
        // Create multiple frames for animation effect
        this.frames = [];
        const frameCount = 6;
        
        for (let i = 0; i < frameCount; i++) {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d');
            
            // Draw image with slight transformations for animation
            ctx.save();
            ctx.translate(canvas.width / 2, canvas.height / 2);
            
            // Add slight variations: rotation, scale, or hue shift
            if (i > 0) {
                const variation = (i / frameCount) * 0.1;
                ctx.rotate(variation * Math.PI / 180);
                ctx.scale(1 + variation * 0.02, 1 + variation * 0.02);
            }
            
            ctx.translate(-canvas.width / 2, -canvas.height / 2);
            ctx.drawImage(img, 0, 0);
            ctx.restore();
            
            this.frames.push({
                canvas: canvas,
                delay: 300,
                width: canvas.width,
                height: canvas.height
            });
        }
        
        this.setupCanvas();
        this.setupCropArea();
        this.updateInfo();
        this.showEditSection();
        this.startAnimation();
    }

    setupCanvas() {
        if (this.frames.length === 0) return;
        
        const frame = this.frames[0];
        this.canvas.width = frame.width;
        this.canvas.height = frame.height;
        
        // Scale to fit container
        const maxWidth = 400;
        const maxHeight = 300;
        const scale = Math.min(maxWidth / frame.width, maxHeight / frame.height, 1);
        
        this.canvas.style.width = (frame.width * scale) + 'px';
        this.canvas.style.height = (frame.height * scale) + 'px';
        
        this.canvasScale = scale;
    }

    setupCropArea() {
        const canvasStyle = window.getComputedStyle(this.canvas);
        const canvasWidth = parseInt(canvasStyle.width);
        const canvasHeight = parseInt(canvasStyle.height);
        
        // Position crop box in center
        const cropX = Math.max(0, (canvasWidth - 50) / 2);
        const cropY = Math.max(0, (canvasHeight - 50) / 2);
        
        this.cropArea.x = cropX;
        this.cropArea.y = cropY;
        
        const cropBox = document.getElementById('gifCropBox');
        const container = document.getElementById('gifCropContainer');
        const containerRect = container.getBoundingClientRect();
        const canvasRect = this.canvas.getBoundingClientRect();
        
        const offsetX = canvasRect.left - containerRect.left + cropX;
        const offsetY = canvasRect.top - containerRect.top + cropY;
        
        cropBox.style.left = offsetX + 'px';
        cropBox.style.top = offsetY + 'px';
        
        this.updatePreview();
    }

    updateInfo() {
        if (this.frames.length === 0) return;
        
        const frame = this.frames[0];
        document.getElementById('gifSize').textContent = `${frame.width} x ${frame.height}`;
        document.getElementById('gifFrames').textContent = this.frames.length;
        document.getElementById('gifDuration').textContent = `${(this.frames.length * 0.3).toFixed(1)}초`;
        
        const frameSlider = document.getElementById('gifFrameSlider');
        frameSlider.max = this.frames.length - 1;
        document.getElementById('gifTotalFrames').textContent = this.frames.length;
        document.getElementById('gifCurrentFrame').textContent = '1';
    }

    showEditSection() {
        this.uploadSection.classList.add('hidden');
        this.editSection.classList.remove('hidden');
        this.editSection.classList.add('fade-in');
    }

    startAnimation() {
        if (!this.isPlaying || this.frames.length === 0) return;
        
        this.currentFrameIndex = 0;
        this.animateFrames();
    }

    animateFrames() {
        if (!this.isPlaying || this.frames.length === 0) return;
        
        this.renderFrame(this.currentFrameIndex);
        this.currentFrameIndex = (this.currentFrameIndex + 1) % this.frames.length;
        
        const frameSlider = document.getElementById('gifFrameSlider');
        frameSlider.value = this.currentFrameIndex;
        document.getElementById('gifCurrentFrame').textContent = this.currentFrameIndex + 1;
        
        this.animationId = setTimeout(() => {
            if (this.isPlaying) {
                this.animateFrames();
            }
        }, this.frames[this.currentFrameIndex]?.delay || 300);
    }

    renderFrame(frameIndex) {
        if (!this.frames[frameIndex]) return;
        
        const frame = this.frames[frameIndex];
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.drawImage(frame.canvas, 0, 0);
        
        this.updatePreview();
    }

    togglePlayPause() {
        this.isPlaying = !this.isPlaying;
        const btn = document.getElementById('gifPlayPauseBtn');
        btn.textContent = this.isPlaying ? '⏸️ 정지' : '▶️ 재생';
        
        if (this.isPlaying) {
            this.animateFrames();
        } else if (this.animationId) {
            clearTimeout(this.animationId);
        }
    }

    goToFrame(frameIndex) {
        this.currentFrameIndex = frameIndex;
        this.renderFrame(frameIndex);
        document.getElementById('gifCurrentFrame').textContent = frameIndex + 1;
    }

    updatePreview() {
        if (!this.frames[this.currentFrameIndex]) return;
        
        const frame = this.frames[this.currentFrameIndex];
        const canvasStyle = window.getComputedStyle(this.canvas);
        const canvasWidth = parseInt(canvasStyle.width);
        const canvasHeight = parseInt(canvasStyle.height);
        
        // Calculate crop coordinates on original image
        const scaleX = frame.width / canvasWidth;
        const scaleY = frame.height / canvasHeight;
        
        const cropX = this.cropArea.x * scaleX;
        const cropY = this.cropArea.y * scaleY;
        const cropWidth = 50 * scaleX;
        const cropHeight = 50 * scaleY;
        
        // Clear and draw preview
        this.drawCheckerboard(this.previewCtx, 50, 50);
        
        if (cropX >= 0 && cropY >= 0 && cropX + cropWidth <= frame.width && cropY + cropHeight <= frame.height) {
            this.previewCtx.drawImage(
                frame.canvas,
                cropX, cropY, cropWidth, cropHeight,
                0, 0, 50, 50
            );
        }
    }

    processCrop() {
        this.showResultSection();
        this.setProcessingStatus(true);
        
        setTimeout(() => {
            this.performCrop();
        }, 100);
    }

    performCrop() {
        try {
            const canvasStyle = window.getComputedStyle(this.canvas);
            const canvasWidth = parseInt(canvasStyle.width);
            const canvasHeight = parseInt(canvasStyle.height);
            
            // Get first frame for cropping
            const frame = this.frames[0];
            const scaleX = frame.width / canvasWidth;
            const scaleY = frame.height / canvasHeight;
            
            const cropX = this.cropArea.x * scaleX;
            const cropY = this.cropArea.y * scaleY;
            const cropWidth = 50 * scaleX;
            const cropHeight = 50 * scaleY;
            
            // Clear result canvas and draw checkerboard
            this.drawCheckerboard(this.resultCtx, 50, 50);
            
            // Apply background color if not transparent
            const bgSelect = document.getElementById('gifBackgroundSelect');
            if (bgSelect.value !== 'transparent') {
                this.resultCtx.fillStyle = bgSelect.value;
                this.resultCtx.fillRect(0, 0, 50, 50);
            }
            
            // Draw cropped image
            if (cropX >= 0 && cropY >= 0 && cropX + cropWidth <= frame.width && cropY + cropHeight <= frame.height) {
                this.resultCtx.drawImage(
                    frame.canvas,
                    cropX, cropY, cropWidth, cropHeight,
                    0, 0, 50, 50
                );
            }
            
            this.updateProgress(100);
            this.setProcessingStatus(false);
            this.showResultPreview();
            
        } catch (error) {
            console.error('Crop error:', error);
            this.showError('크롭 처리 중 오류가 발생했습니다.');
            this.setProcessingStatus(false);
        }
    }

    showResultSection() {
        this.resultSection.classList.remove('hidden');
        this.resultSection.classList.add('fade-in');
    }

    setProcessingStatus(isProcessing) {
        const processingStatus = document.getElementById('gifProcessingStatus');
        const resultPreview = document.getElementById('gifResultPreview');
        const cropBtn = document.getElementById('gifCropBtn');
        
        if (isProcessing) {
            processingStatus.classList.remove('hidden');
            resultPreview.classList.add('hidden');
            cropBtn.disabled = true;
            cropBtn.textContent = '처리 중...';
            this.updateProgress(0);
        } else {
            processingStatus.classList.add('hidden');
            cropBtn.disabled = false;
            cropBtn.textContent = '크롭 실행';
        }
    }

    updateProgress(percentage) {
        const progressFill = document.getElementById('gifProgressFill');
        const progressText = document.getElementById('gifProgressText');
        
        if (progressFill) {
            progressFill.style.width = percentage + '%';
        }
        if (progressText) {
            progressText.textContent = `처리 중... ${Math.round(percentage)}%`;
        }
    }

    showResultPreview() {
        const resultPreview = document.getElementById('gifResultPreview');
        resultPreview.classList.remove('hidden');
    }

    downloadResult() {
        this.resultCanvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'cropped-50x50.png';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
    }

    resetApp() {
        // Reset state
        this.currentImage = null;
        this.frames = [];
        this.currentFrameIndex = 0;
        this.isPlaying = true;
        
        if (this.animationId) {
            clearTimeout(this.animationId);
        }
        
        // Reset UI
        this.uploadSection.classList.remove('hidden');
        this.editSection.classList.add('hidden');
        this.resultSection.classList.add('hidden');
        
        const fileInput = document.getElementById('gifFileInput');
        const urlInput = document.getElementById('gifUrlInput');
        fileInput.value = '';
        urlInput.value = '';
        
        // Clear canvases
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawCheckerboard(this.previewCtx, 50, 50);
        this.drawCheckerboard(this.resultCtx, 50, 50);
    }

    showError(message) {
        // Remove existing errors
        const existingErrors = document.querySelectorAll('.error-message');
        existingErrors.forEach(error => error.remove());
        
        // Create error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        
        const container = document.querySelector('.container');
        container.insertBefore(errorDiv, container.firstChild);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 5000);
    }
}

// 동영상→GIF 변환 도구 클래스
class VideoToGifTool {
    constructor() {
        this.currentVideo = null;
        this.frames = [];
        this.resultCanvas = null;
        this.resultCtx = null;
    }

    init() {
        this.setupElements();
        this.setupEventListeners();
        this.setupDragAndDrop();
    }

    setupElements() {
        this.uploadSection = document.getElementById('videoUploadSection');
        this.editSection = document.getElementById('videoEditSection');
        this.resultSection = document.getElementById('videoResultSection');
        this.videoPreview = document.getElementById('videoPreview');
        this.resultCanvas = document.getElementById('videoResultCanvas');
        this.resultCtx = this.resultCanvas.getContext('2d');
    }

    setupEventListeners() {
        // File input
        const fileInput = document.getElementById('videoFileInput');
        fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        
        // Upload button
        const uploadBtn = document.querySelector('#video-to-gif .btn--primary');
        if (uploadBtn) {
            uploadBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                fileInput.click();
            });
        }

        // Upload area click
        const uploadArea = document.getElementById('videoUploadArea');
        uploadArea.addEventListener('click', (e) => {
            if (e.target === uploadArea || e.target.closest('.upload-area__content')) {
                fileInput.click();
            }
        });

        // URL load button
        const urlLoadBtn = document.getElementById('videoUrlLoadBtn');
        if (urlLoadBtn) {
            urlLoadBtn.addEventListener('click', () => this.loadFromUrl());
        }

        // URL input enter key
        const urlInput = document.getElementById('videoUrlInput');
        if (urlInput) {
            urlInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.loadFromUrl();
                }
            });
        }

        // Convert button
        const convertBtn = document.getElementById('videoConvertBtn');
        if (convertBtn) {
            convertBtn.addEventListener('click', () => this.convertToGif());
        }

        // Download button
        const downloadBtn = document.getElementById('videoDownloadBtn');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', () => this.downloadResult());
        }

        // New file button
        const newFileBtn = document.getElementById('videoNewFileBtn');
        if (newFileBtn) {
            newFileBtn.addEventListener('click', () => this.resetApp());
        }

        // Video loaded event
        this.videoPreview.addEventListener('loadedmetadata', () => {
            this.updateVideoInfo();
            this.updateEndTime();
        });
    }

    setupDragAndDrop() {
        const uploadArea = document.getElementById('videoUploadArea');
        
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });
        
        uploadArea.addEventListener('dragover', () => {
            uploadArea.classList.add('drag-over');
        });
        
        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('drag-over');
        });
        
        uploadArea.addEventListener('drop', (e) => {
            uploadArea.classList.remove('drag-over');
            const files = Array.from(e.dataTransfer.files);
            if (files.length > 0) {
                this.handleFile(files[0]);
            }
        });
    }

    loadFromUrl() {
        const urlInput = document.getElementById('videoUrlInput');
        const url = urlInput.value.trim();
        
        if (!url) {
            this.showError('URL을 입력해주세요.');
            return;
        }

        if (!this.isValidVideoUrl(url)) {
            this.showError('유효한 동영상 URL을 입력해주세요.');
            return;
        }

        this.videoPreview.src = url;
        this.currentVideo = this.videoPreview;
        this.showEditSection();
    }

    isValidVideoUrl(url) {
        try {
            new URL(url);
            return /\.(mp4|mov|avi|webm|mkv)$/i.test(url);
        } catch {
            return false;
        }
    }

    handleFileSelect(event) {
        const file = event.target.files[0];
        if (file) {
            this.handleFile(file);
        }
    }

    handleFile(file) {
        // Validate file
        if (!file.type.includes('video')) {
            this.showError('동영상 파일만 업로드할 수 있습니다.');
            return;
        }
        
        if (file.size > 50 * 1024 * 1024) {
            this.showError('파일 크기는 50MB를 초과할 수 없습니다.');
            return;
        }
        
        this.loadVideo(file);
    }

    loadVideo(file) {
        const url = URL.createObjectURL(file);
        this.videoPreview.src = url;
        this.currentVideo = this.videoPreview;
        this.showEditSection();
    }

    showEditSection() {
        this.uploadSection.classList.add('hidden');
        this.editSection.classList.remove('hidden');
        this.editSection.classList.add('fade-in');
    }

    updateVideoInfo() {
        const video = this.videoPreview;
        document.getElementById('videoSize').textContent = `${video.videoWidth} x ${video.videoHeight}`;
        document.getElementById('videoDuration').textContent = `${video.duration.toFixed(1)}초`;
        document.getElementById('videoFps').textContent = '30 (추정)';
    }

    updateEndTime() {
        const endTimeInput = document.getElementById('videoEndTime');
        const maxDuration = Math.min(this.videoPreview.duration, 30);
        endTimeInput.max = maxDuration;
        endTimeInput.value = Math.min(5, maxDuration);
    }

    async convertToGif() {
        this.showResultSection();
        this.setProcessingStatus(true);
        
        try {
            const settings = this.getConversionSettings();
            await this.performConversion(settings);
        } catch (error) {
            console.error('Conversion error:', error);
            this.showError('변환 중 오류가 발생했습니다.');
            this.setProcessingStatus(false);
        }
    }

    getConversionSettings() {
        return {
            startTime: parseFloat(document.getElementById('videoStartTime').value) || 0,
            endTime: parseFloat(document.getElementById('videoEndTime').value) || 5,
            fps: parseInt(document.getElementById('videoFpsSelect').value) || 10,
            size: document.getElementById('videoGifSize').value || '480',
            quality: parseInt(document.getElementById('videoQualitySelect').value) || 10
        };
    }

    async performConversion(settings) {
        const video = this.videoPreview;
        const duration = settings.endTime - settings.startTime;
        const frameCount = Math.ceil(duration * settings.fps);
        const frameInterval = duration / frameCount;
        
        // Calculate output size
        let outputWidth = video.videoWidth;
        let outputHeight = video.videoHeight;
        
        if (settings.size !== 'original') {
            const targetSize = parseInt(settings.size);
            const aspectRatio = video.videoWidth / video.videoHeight;
            
            if (video.videoWidth > video.videoHeight) {
                outputWidth = targetSize;
                outputHeight = Math.round(targetSize / aspectRatio);
            } else {
                outputHeight = targetSize;
                outputWidth = Math.round(targetSize * aspectRatio);
            }
        }
        
        // Setup result canvas
        this.resultCanvas.width = outputWidth;
        this.resultCanvas.height = outputHeight;
        this.resultCanvas.style.width = Math.min(outputWidth, 400) + 'px';
        this.resultCanvas.style.height = Math.min(outputHeight, 300) + 'px';
        
        // Extract frames
        this.frames = [];
        for (let i = 0; i < frameCount; i++) {
            const currentTime = settings.startTime + (i * frameInterval);
            video.currentTime = currentTime;
            
            await new Promise(resolve => {
                video.addEventListener('seeked', resolve, { once: true });
            });
            
            // Draw frame to canvas
            this.resultCtx.drawImage(video, 0, 0, outputWidth, outputHeight);
            
            // Store frame data
            const frameData = this.resultCtx.getImageData(0, 0, outputWidth, outputHeight);
            this.frames.push(frameData);
            
            // Update progress
            const progress = ((i + 1) / frameCount) * 100;
            this.updateProgress(progress);
            
            // Small delay to prevent blocking
            await new Promise(resolve => setTimeout(resolve, 10));
        }
        
        // Start GIF animation
        this.startGifAnimation();
        this.setProcessingStatus(false);
        this.showResultPreview();
    }

    startGifAnimation() {
        if (this.frames.length === 0) return;
        
        let currentFrame = 0;
        const animateGif = () => {
            this.resultCtx.putImageData(this.frames[currentFrame], 0, 0);
            currentFrame = (currentFrame + 1) % this.frames.length;
            
            setTimeout(animateGif, 1000 / parseInt(document.getElementById('videoFpsSelect').value));
        };
        
        animateGif();
    }

    showResultSection() {
        this.resultSection.classList.remove('hidden');
        this.resultSection.classList.add('fade-in');
    }

    setProcessingStatus(isProcessing) {
        const processingStatus = document.getElementById('videoProcessingStatus');
        const resultPreview = document.getElementById('videoResultPreview');
        const convertBtn = document.getElementById('videoConvertBtn');
        
        if (isProcessing) {
            processingStatus.classList.remove('hidden');
            resultPreview.classList.add('hidden');
            convertBtn.disabled = true;
            convertBtn.textContent = '변환 중...';
            this.updateProgress(0);
        } else {
            processingStatus.classList.add('hidden');
            convertBtn.disabled = false;
            convertBtn.textContent = 'GIF로 변환';
        }
    }

    updateProgress(percentage) {
        const progressFill = document.getElementById('videoProgressFill');
        const progressText = document.getElementById('videoProgressText');
        
        if (progressFill) {
            progressFill.style.width = percentage + '%';
        }
        if (progressText) {
            progressText.textContent = `변환 중... ${Math.round(percentage)}%`;
        }
    }

    showResultPreview() {
        const resultPreview = document.getElementById('videoResultPreview');
        resultPreview.classList.remove('hidden');
    }

    downloadResult() {
        this.resultCanvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'converted-video.gif';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
    }

    resetApp() {
        // Reset state
        this.currentVideo = null;
        this.frames = [];
        
        // Reset UI
        this.uploadSection.classList.remove('hidden');
        this.editSection.classList.add('hidden');
        this.resultSection.classList.add('hidden');
        
        const fileInput = document.getElementById('videoFileInput');
        const urlInput = document.getElementById('videoUrlInput');
        fileInput.value = '';
        urlInput.value = '';
        
        // Clear video
        this.videoPreview.src = '';
        
        // Clear canvas
        this.resultCtx.clearRect(0, 0, this.resultCanvas.width, this.resultCanvas.height);
    }

    showError(message) {
        // Remove existing errors
        const existingErrors = document.querySelectorAll('.error-message');
        existingErrors.forEach(error => error.remove());
        
        // Create error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        
        const container = document.querySelector('.container');
        container.insertBefore(errorDiv, container.firstChild);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 5000);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const gifEditor = new GifEditor();
});