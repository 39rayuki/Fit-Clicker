import { PoseLandmarker, FilesetResolver, DrawingUtils } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0";

const video = document.getElementById('video');
const canvasElement = document.getElementById('output_canvas');
const canvasCtx = canvasElement.getContext('2d');
const coinDisplay = document.getElementById('coin-count');
const motionBar = document.getElementById('motion-bar');
const cameraStatus = document.getElementById('camera-status');
const earningRateText = document.getElementById('earning-rate');
const body = document.getElementById('body');
const startBtn = document.getElementById('start-btn');

// Game State
let coins = 0;
let isBonusActive = false;
let poseLandmarker = undefined;
let lastVideoTime = -1;
let lastLandmarks = null;

const BASE_RATE = 1;
const BONUS_MULTIPLIER = 100;
const MOTION_THRESHOLD = 0.05; // Pose movement threshold

// Mission Logic
const missionTitle = document.getElementById('mission-title');
const missionTimer = document.getElementById('mission-timer');
const missionReward = document.getElementById('mission-reward');
const missionBtn = document.getElementById('mission-btn');
let currentMission = null;
let missionTimeLeft = 0;
let missionInterval = null;
let missionProgress = 0;

const MISSIONS = [
    { title: "AI Daily: Full Body Motion", reward: 5000, type: "daily" },
    { title: "EMERGENCY: Rapid Movement", reward: 25000, type: "emergency", time: 30 },
    { title: "AI Daily: Shoulder Rotation", reward: 3000, type: "daily" }
];

// 1. Initialize MediaPipe Pose
async function createPoseLandmarker() {
    const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
    );
    poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task`,
            delegate: "GPU"
        },
        runningMode: "VIDEO",
        numPoses: 1
    });
    cameraStatus.textContent = "AI Ready. Click Start!";
}

createPoseLandmarker();

// 2. Motion Detection via Landmarks
function calculateMotion(landmarks) {
    if (!lastLandmarks || !landmarks[0]) {
        lastLandmarks = landmarks[0];
        return 0;
    }

    let totalDiff = 0;
    const current = landmarks[0];
    const previous = lastLandmarks;

    // Compare key joints: shoulders, elbows, wrists, hips, knees
    const jointsToTrack = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26];
    jointsToTrack.forEach(idx => {
        const dx = current[idx].x - previous[idx].x;
        const dy = current[idx].y - previous[idx].y;
        totalDiff += Math.sqrt(dx * dx + dy * dy);
    });

    lastLandmarks = current;
    return totalDiff / jointsToTrack.length;
}

// 3. Drawing & Main Loop
async function predictWebcam() {
    canvasElement.width = video.videoWidth;
    canvasElement.height = video.videoHeight;

    if (lastVideoTime !== video.currentTime) {
        lastVideoTime = video.currentTime;
        const result = poseLandmarker.detectForVideo(video, performance.now());

        canvasCtx.save();
        canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
        
        const drawingUtils = new DrawingUtils(canvasCtx);
        if (result.landmarks) {
            for (const landmarks of result.landmarks) {
                drawingUtils.drawConnectors(landmarks, PoseLandmarker.POSE_CONNECTIONS);
                drawingUtils.drawLandmarks(landmarks, { radius: 4 });
                
                const motion = calculateMotion(result.landmarks);
                updateMotionState(motion);
            }
        }
        canvasCtx.restore();
    }
    requestAnimationFrame(predictWebcam);
}

function updateMotionState(motion) {
    const normalizedMotion = Math.min(motion * 500, 100); // Scale for UI
    motionBar.style.width = `${normalizedMotion}%`;

    if (motion > MOTION_THRESHOLD) {
        isBonusActive = true;
        body.classList.add('bonus-active');
    } else {
        isBonusActive = false;
        body.classList.remove('bonus-active');
    }
}

// Game Functions
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
        
        if (missionInterval) clearInterval(missionInterval);
        missionInterval = setInterval(() => {
            missionTimeLeft--;
            if (isBonusActive) {
                missionProgress++;
                missionBtn.textContent = `AI Analyzing: ${Math.floor((missionProgress / randomMission.time) * 100)}%`;
            } else {
                missionBtn.textContent = "AI WAITING FOR MOTION...";
            }
            missionTimer.textContent = `00:${missionTimeLeft.toString().padStart(2, '0')}`;
            if (missionTimeLeft <= 0) {
                clearInterval(missionInterval);
                if (missionProgress >= randomMission.time * 0.4) completeMission();
                else failMission();
            }
        }, 1000);
    } else {
        body.classList.remove('emergency');
        missionTimer.textContent = "--:--";
        missionBtn.disabled = false;
        missionBtn.textContent = "Complete Mission";
    }
}

function completeMission() {
    updateCoins(currentMission.reward);
    missionTitle.textContent = "MISSION COMPLETE!";
    missionTimer.textContent = "DONE";
    body.classList.remove('emergency');
    setTimeout(startMission, 5000);
}

function failMission() {
    missionTitle.textContent = "MISSION FAILED...";
    missionTimer.textContent = "FAIL";
    missionBtn.textContent = "LOW ACTIVITY";
    body.classList.remove('emergency');
    setTimeout(startMission, 5000);
}

missionBtn.addEventListener('click', completeMission);

startBtn.addEventListener('click', async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
    video.addEventListener('loadeddata', predictWebcam);
    startBtn.style.display = 'none';
    setInterval(updateCoins, 1000);
    startMission();
});
