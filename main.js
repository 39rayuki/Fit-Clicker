import { PoseLandmarker, FilesetResolver, DrawingUtils } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0";

// DOM Elements
const video = document.getElementById('video');
const canvasElement = document.getElementById('output_canvas');
const canvasCtx = canvasElement.getContext('2d');
const coinDisplay = document.getElementById('coin-count');
const motionBar = document.getElementById('motion-bar');
const cameraStatus = document.getElementById('camera-status');
const body = document.getElementById('body');
const startBtn = document.getElementById('start-btn');
const statsList = document.getElementById('stats-list');
const emergencyEl = document.getElementById('emergency-mission');
const dailyListEl = document.getElementById('daily-missions');
const globalListEl = document.getElementById('global-missions');

// --- Game State & Stats ---
let state = {
    coins: 0,
    stats: {
        squat: 0,
        swing: 0,
        motionSeconds: 0
    },
    activeMissions: {
        global: [
            { id: 'g1', title: "スクワットマスター I", target: 50, current: 0, reward: 10000, key: 'squat' },
            { id: 'g2', title: "腕振りの達人 I", target: 100, current: 0, reward: 5000, key: 'swing' }
        ],
        daily: [],
        emergency: null
    },
    lastDailyUpdate: null
};

// Load state from LocalStorage
const savedState = localStorage.getItem('fitClickerState');
if (savedState) {
    const parsed = JSON.parse(savedState);
    state = { ...state, ...parsed };
}

function saveState() {
    localStorage.setItem('fitClickerState', JSON.stringify(state));
}

// --- Pose AI Setup ---
let poseLandmarker = undefined;
let lastVideoTime = -1;
let isBonusActive = false;
let lastLandmarks = null;

async function initAI() {
    const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm");
    poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task`,
            delegate: "GPU"
        },
        runningMode: "VIDEO",
        numPoses: 1
    });
    cameraStatus.textContent = "AIの準備が完了。開始をクリック！";
}
initAI();

// --- Exercise Detection ---
let squatState = 'up';
let swingState = 'down';

function checkExercises(landmarks) {
    if (!landmarks) return;
    const lm = landmarks;

    // 1. Squat detection (Hip vs Knee Y)
    // Landmarks: Left Hip (23), Left Knee (25)
    const hipY = lm[23].y;
    const kneeY = lm[25].y;
    const squatThreshold = 0.1;
    
    if (squatState === 'up' && hipY > kneeY - squatThreshold) {
        squatState = 'down';
    } else if (squatState === 'down' && hipY < kneeY - squatThreshold - 0.05) {
        squatState = 'up';
        incrementStat('squat');
    }

    // 2. Arm Swing detection (Wrist vs Shoulder Y)
    // Landmarks: Left Shoulder (11), Left Wrist (15)
    const shoulderY = lm[11].y;
    const wristY = lm[15].y;
    if (swingState === 'down' && wristY < shoulderY) {
        swingState = 'up';
    } else if (swingState === 'up' && wristY > shoulderY + 0.1) {
        swingState = 'down';
        incrementStat('swing');
    }
}

function incrementStat(key) {
    state.stats[key]++;
    updateMissions(key);
    renderUI();
    saveState();
}

// --- Mission Logic ---
function generateDailyMissions() {
    const now = new Date().toDateString();
    if (state.lastDailyUpdate === now && state.activeMissions.daily.length > 0) return;

    state.activeMissions.daily = [
        { id: 'd1', title: "朝のスクワット", target: 20, current: 0, reward: 2000, key: 'squat', expires: now },
        { id: 'd2', title: "昼の腕振り", target: 30, current: 0, reward: 1500, key: 'swing', expires: now },
        { id: 'd3', title: "夜の追い込みスクワット", target: 50, current: 0, reward: 3000, key: 'squat', expires: now }
    ];
    state.lastDailyUpdate = now;
    saveState();
}

function triggerEmergencyMission() {
    if (state.activeMissions.emergency) return;

    const mission = {
        id: 'e1',
        title: "緊急：今すぐスクワット20回！",
        target: 20,
        current: 0,
        reward: 10000,
        key: 'squat',
        timeLeft: 1800 // 30 minutes
    };
    state.activeMissions.emergency = mission;
    
    // Notification
    if (Notification.permission === "granted") {
        new Notification("Fit Clicker: 緊急ミッション発生！", { body: mission.title });
    }
    
        if (missionInterval) clearInterval(missionInterval);
        missionInterval = setInterval(() => {
            state.activeMissions.emergency.timeLeft--;
            if (isBonusActive) {
                // emergencyの進捗はカウント方式に変えたので、ここでは表示だけ更新
            }
            // ... (実際には incrementStat で更新されるのでここは表示管理のみ)
            renderUI();
        }, 1000);

    renderUI();
    saveState();
}

function updateMissions(key) {
    // Update Global
    state.activeMissions.global.forEach(m => {
        if (m.key === key && m.current < m.target) {
            m.current++;
            if (m.current >= m.target) state.coins += m.reward;
        }
    });

    // Update Daily
    state.activeMissions.daily.forEach(m => {
        if (m.key === key && m.current < m.target) {
            m.current++;
            if (m.current >= m.target) state.coins += m.reward;
        }
    });

    // Update Emergency
    if (state.activeMissions.emergency && state.activeMissions.emergency.key === key) {
        state.activeMissions.emergency.current++;
        if (state.activeMissions.emergency.current >= state.activeMissions.emergency.target) {
            state.coins += state.activeMissions.emergency.reward;
            state.activeMissions.emergency = null;
        }
    }
}

// --- UI Rendering ---
function renderUI() {
    coinDisplay.textContent = Math.floor(state.coins).toLocaleString();
    statsList.textContent = `スクワット: ${state.stats.squat}回 | 腕振り: ${state.stats.swing}回`;

    // Render Daily
    dailyListEl.innerHTML = state.activeMissions.daily.map(m => `
        <div class="mission-item ${m.current >= m.target ? 'completed' : ''}">
            <div class="mission-info">
                <p class="mission-title">${m.title}</p>
                <p class="mission-progress">${m.current}/${m.target}回 (${m.reward}c)</p>
            </div>
            ${m.current >= m.target ? '✅' : ''}
        </div>
    `).join('');

    // Render Global
    globalListEl.innerHTML = state.activeMissions.global.map(m => `
        <div class="mission-item ${m.current >= m.target ? 'completed' : ''}">
            <div class="mission-info">
                <p class="mission-title">${m.title}</p>
                <p class="mission-progress">${m.current}/${m.target}回 (${m.reward}c)</p>
            </div>
            ${m.current >= m.target ? '✅' : ''}
        </div>
    `).join('');

    // Render Emergency
    if (state.activeMissions.emergency) {
        const m = state.activeMissions.emergency;
        const min = Math.floor(m.timeLeft / 60);
        const sec = m.timeLeft % 60;
        emergencyEl.innerHTML = `
            <div class="mission-item emergency">
                <div class="mission-info">
                    <p class="mission-title">${m.title}</p>
                    <p class="mission-progress">${m.current}/${m.target}回 (${m.reward}c)</p>
                </div>
                <p class="mission-timer">${min}:${sec.toString().padStart(2, '0')}</p>
            </div>
        `;
        body.classList.add('emergency-active');
    } else {
        emergencyEl.innerHTML = `<div class="mission-item empty">現在なし</div>`;
        body.classList.remove('emergency-active');
    }
}

// --- Main Loops ---
async function predictWebcam() {
    canvasElement.width = video.videoWidth;
    canvasElement.height = video.videoHeight;

    if (lastVideoTime !== video.currentTime) {
        lastVideoTime = video.currentTime;
        const result = poseLandmarker.detectForVideo(video, performance.now());

        canvasCtx.save();
        canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
        
        const drawingUtils = new DrawingUtils(canvasCtx);
        if (result.landmarks && result.landmarks.length > 0) {
            const landmarks = result.landmarks[0];
            drawingUtils.drawConnectors(landmarks, PoseLandmarker.POSE_CONNECTIONS);
            drawingUtils.drawLandmarks(landmarks, { radius: 3 });
            
            checkExercises(landmarks);
            
            // Motion detection for bonus
            const motion = calculateMotion(result.landmarks);
            updateMotionState(motion);
        }
        canvasCtx.restore();
    }
    requestAnimationFrame(predictWebcam);
}

function calculateMotion(landmarks) {
    if (!lastLandmarks || !landmarks[0]) {
        lastLandmarks = landmarks[0];
        return 0;
    }
    let totalDiff = 0;
    const current = landmarks[0];
    const previous = lastLandmarks;
    const joints = [11, 12, 13, 14, 15, 16];
    joints.forEach(idx => {
        totalDiff += Math.hypot(current[idx].x - previous[idx].x, current[idx].y - previous[idx].y);
    });
    lastLandmarks = current;
    return totalDiff / joints.length;
}

function updateMotionState(motion) {
    const normalizedMotion = Math.min(motion * 500, 100);
    motionBar.style.width = `${normalizedMotion}%`;
    isBonusActive = motion > 0.05;
    if (isBonusActive) body.classList.add('bonus-active');
    else body.classList.remove('bonus-active');
}

function gameLoop() {
    const rate = isBonusActive ? 100 : 1;
    state.coins += rate / 10; // Run 10 times per second
    renderUI();
    if (Math.random() < 0.0005) triggerEmergencyMission(); // Random emergency
}

// --- Init ---
startBtn.addEventListener('click', async () => {
    // 連打防止
    if (startBtn.disabled) return;
    startBtn.disabled = true;
    startBtn.textContent = "起動中...";

    try {
        if (Notification.permission !== "granted") {
            await Notification.requestPermission();
        }

        cameraStatus.textContent = "カメラをリクエスト中...";
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                width: { ideal: 1280 },
                height: { ideal: 720 }
            } 
        });

        video.srcObject = stream;
        video.addEventListener('loadeddata', predictWebcam);
        
        startBtn.style.display = 'none';
        cameraStatus.textContent = "カメラ起動中 - 動いて100倍ボーナス！";
        
        generateDailyMissions();
        setInterval(gameLoop, 100);
        setInterval(saveState, 5000);

    } catch (err) {
        console.error("Camera Error:", err);
        startBtn.disabled = false;
        startBtn.textContent = "再試行";
        
        if (err.name === 'NotReadableError') {
            cameraStatus.innerHTML = "<span style='color: #f472b6;'>エラー: カメラが他のアプリで使用中です。<br>他のタブやZoom等を閉じてから再試行してください。</span>";
        } else {
            cameraStatus.textContent = "エラー: " + err.message;
        }
    }
});
renderUI();
