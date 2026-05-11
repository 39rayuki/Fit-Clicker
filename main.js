const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const coinDisplay = document.getElementById('coin-count');
const motionBar = document.getElementById('motion-bar');
const cameraStatus = document.getElementById('camera-status');
const earningRateText = document.getElementById('earning-rate');
const body = document.getElementById('body');
const startBtn = document.getElementById('start-btn');

let coins = 0;
let isBonusActive = false;
let lastFrameData = null;
const ctx = canvas.getContext('2d', { willReadFrequently: true });

// Game loop variables
const BASE_RATE = 1;
const BONUS_MULTIPLIER = 100;
const MOTION_THRESHOLD = 15; // Adjustment based on environment

function updateCoins() {
    const rate = isBonusActive ? BASE_RATE * BONUS_MULTIPLIER : BASE_RATE;
    coins += rate;
    coinDisplay.textContent = Math.floor(coins).toLocaleString();
    earningRateText.textContent = `Rate: ${rate} coins/sec`;
}

// Motion detection logic
function detectMotion() {
    if (video.paused || video.ended) return;

    // Draw current video frame to hidden canvas
    canvas.width = 64; // Low res for performance
    canvas.height = 48;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const currentFrameData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

    if (lastFrameData) {
        let diff = 0;
        for (let i = 0; i < currentFrameData.length; i += 4) {
            // Compare brightness (simple version)
            const oldGray = (lastFrameData[i] + lastFrameData[i+1] + lastFrameData[i+2]) / 3;
            const newGray = (currentFrameData[i] + currentFrameData[i+1] + currentFrameData[i+2]) / 3;
            diff += Math.abs(newGray - oldGray);
        }
        
        const motionLevel = (diff / (canvas.width * canvas.height));
        const normalizedMotion = Math.min(motionLevel / 2, 100);
        
        motionBar.style.width = `${normalizedMotion}%`;
        
        if (motionLevel > MOTION_THRESHOLD) {
            isBonusActive = true;
            body.classList.add('bonus-active');
        } else {
            isBonusActive = false;
            body.classList.remove('bonus-active');
        }
    }

    lastFrameData = currentFrameData;
    requestAnimationFrame(detectMotion);
}

// Initialization
async function initCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
        cameraStatus.textContent = "Camera Active - Move to Earn 100x!";
        detectMotion();
    } catch (err) {
        console.error("Camera error:", err);
        cameraStatus.textContent = "Error: Camera access denied.";
    }
}

startBtn.addEventListener('click', () => {
    initCamera();
    startBtn.style.display = 'none';
    setInterval(updateCoins, 1000);
});
