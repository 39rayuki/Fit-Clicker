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

// Mission variables
const missionTitle = document.getElementById('mission-title');
const missionTimer = document.getElementById('mission-timer');
const missionReward = document.getElementById('mission-reward');
const missionBtn = document.getElementById('mission-btn');
const missionCard = document.getElementById('mission-card');

let currentMission = null;
let missionTimeLeft = 0;
let missionInterval = null;

const MISSIONS = [
    { title: "Daily: Squat 10 times", reward: 5000, type: "daily" },
    { title: "EMERGENCY: Sprint for 30s", reward: 25000, type: "emergency", time: 30 },
    { title: "Daily: Arm Swings 20 times", reward: 3000, type: "daily" }
];

function updateCoins(amount = null) {
    if (amount !== null) {
        coins += amount;
    } else {
        const rate = isBonusActive ? BASE_RATE * BONUS_MULTIPLIER : BASE_RATE;
        coins += rate;
    }
    coinDisplay.textContent = Math.floor(coins).toLocaleString();
    const rate = isBonusActive ? BASE_RATE * BONUS_MULTIPLIER : BASE_RATE;
    earningRateText.textContent = `Rate: ${rate} coins/sec`;
}

let missionProgress = 0;

function startMission() {
    const randomMission = MISSIONS[Math.floor(Math.random() * MISSIONS.length)];
    currentMission = randomMission;
    missionTitle.textContent = randomMission.title;
    missionReward.textContent = `Reward: ${randomMission.reward.toLocaleString()} coins`;
    missionProgress = 0;
    
    if (randomMission.type === "emergency") {
        body.classList.add('emergency');
        missionTimeLeft = randomMission.time;
        missionBtn.disabled = true;
        missionBtn.textContent = "MOVEMENT REQUIRED!";
        
        missionInterval = setInterval(() => {
            missionTimeLeft--;
            
            // 運動を検知している間だけ進捗を追加
            if (isBonusActive) {
                missionProgress++;
                missionBtn.textContent = `Progress: ${Math.floor((missionProgress / randomMission.time) * 100)}%`;
            } else {
                missionBtn.textContent = "STOPPED! MOVE NOW!";
            }

            missionTimer.textContent = `00:${missionTimeLeft.toString().padStart(2, '0')}`;
            
            if (missionTimeLeft <= 0) {
                clearInterval(missionInterval);
                // 50%以上の時間動いていればクリア
                if (missionProgress >= randomMission.time * 0.5) {
                    completeMission();
                } else {
                    failMission();
                }
            }
        }, 1000);
    } else {
        body.classList.remove('emergency');
        missionTimer.textContent = "--:--";
        missionBtn.disabled = false;
        missionBtn.textContent = "Complete Mission";
    }
}

function failMission() {
    missionTitle.textContent = "MISSION FAILED...";
    missionTimer.textContent = "FAIL";
    missionBtn.textContent = "NOT ENOUGH MOTION";
    body.classList.remove('emergency');
    setTimeout(startMission, 5000);
}

function completeMission() {
    if (!currentMission) return;
    
    // In a real app, MediaPipe would check the movement here.
    // For prototype, we just give reward if bonus was active at any point or just on click.
    updateCoins(currentMission.reward);
    
    missionTitle.textContent = "MISSION COMPLETE!";
    missionTimer.textContent = "DONE";
    body.classList.remove('emergency');
    
    setTimeout(startMission, 5000); // Next mission after 5s
}

missionBtn.addEventListener('click', completeMission);

// Initialization
async function initCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
        cameraStatus.textContent = "Camera Active - Move to Earn 100x!";
        detectMotion();
        startMission(); // Start first mission
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
