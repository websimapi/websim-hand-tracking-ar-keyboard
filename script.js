import { Hands } from '@mediapipe/hands';
import * as cameraUtils from '@mediapipe/camera_utils';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { ARKeyboard } from './keyboard.js';
import { SynthEngine } from './audio.js';

// DOM elements
const videoElement = document.getElementById('webcam');
const canvasElement = document.getElementById('canvas');
const statusElement = document.getElementById('status');
const debugElement = document.getElementById('debug');
const ctx = canvasElement.getContext('2d');

// Initialize the keyboard and synth engine
let arKeyboard;
let synthEngine;

// Hand tracking variables
let hands;
let camera;
let fingerTips = [4, 8, 12, 16, 20]; // Thumb, index, middle, ring, pinky tips
let fingerBases = [2, 5, 9, 13, 17]; // Corresponding base joints
let activeFingers = new Set();
let previousActiveFingers = new Set();
let lastHandData = null;

// Depth tracking variables
let depthThreshold = 0.2;
let isHandsInitialized = false;

function onResults(results) {
    // Clear the canvas
    ctx.save();
    ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    // Draw the keyboard
    arKeyboard.draw(ctx);

    // Update for active fingers
    previousActiveFingers = new Set(activeFingers);
    activeFingers.clear();
    
    if (results.multiHandLandmarks) {
        for (const landmarks of results.multiHandLandmarks) {
            lastHandData = landmarks;
            
            // Draw hand landmarks and connections
            drawConnectors(ctx, landmarks, HAND_CONNECTIONS, {color: '#00FF00', lineWidth: 2});
            drawLandmarks(ctx, landmarks, {color: '#FF0000', lineWidth: 1});
            
            // Check each finger for interaction with the keyboard
            fingerTips.forEach((tipIdx, fingerIndex) => {
                const tip = landmarks[tipIdx];
                const base = landmarks[fingerBases[fingerIndex]];
                
                // Calculate finger pointing direction and approximate depth
                const direction = {
                    x: tip.x - base.x,
                    y: tip.y - base.y,
                    z: tip.z - base.z
                };
                
                // Calculate pseudo-depth based on finger orientation and position
                // Negative Z means the finger is pointing toward the camera/keyboard
                const isPointingDown = direction.z < -depthThreshold;
                
                // Check if finger is over a key
                const keyIndex = arKeyboard.getKeyAtPosition(tip.x, tip.y);
                
                if (keyIndex !== -1 && isPointingDown) {
                    activeFingers.add(keyIndex);
                    
                    // Trigger note if this is a new press
                    if (!previousActiveFingers.has(keyIndex)) {
                        synthEngine.playNote(keyIndex);
                        arKeyboard.setKeyPressed(keyIndex, true);
                    }
                }
            });
            
            // Display debug info
            updateDebugInfo(landmarks);
        }
    }
    
    // Release keys that are no longer pressed
    previousActiveFingers.forEach(keyIndex => {
        if (!activeFingers.has(keyIndex)) {
            arKeyboard.setKeyPressed(keyIndex, false);
            synthEngine.stopNote(keyIndex);
        }
    });
    
    ctx.restore();
}

function updateDebugInfo(landmarks) {
    if (!landmarks) return;
    
    const indexFinger = landmarks[8];
    const wrist = landmarks[0];
    
    // Calculate pseudo-depth (Z-distance)
    const depth = indexFinger.z - wrist.z;
    
    debugElement.textContent = `
        Finger X: ${indexFinger.x.toFixed(2)}
        Finger Y: ${indexFinger.y.toFixed(2)}
        Depth Z: ${depth.toFixed(3)}
        Keys pressed: ${Array.from(activeFingers).join(', ')}
    `;
}

function setupHandTracking() {
    // Set up MediaPipe Hands
    hands = new Hands({
        locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        }
    });
    
    hands.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
    });
    
    hands.onResults(onResults);
    
    // Set up camera - using the correct Camera constructor from cameraUtils
    camera = new cameraUtils.Camera(videoElement, {
        onFrame: async () => {
            await hands.send({image: videoElement});
        },
        width: 1280,
        height: 720
    });
    
    camera.start()
        .then(() => {
            statusElement.textContent = "Hand tracking active";
            isHandsInitialized = true;
            
            // Set canvas dimensions once video is streaming
            resizeCanvas();
        })
        .catch(err => {
            console.error("Error starting camera:", err);
            statusElement.textContent = "Error: Could not access camera";
        });
}

function resizeCanvas() {
    const container = document.getElementById('video-container');
    const rect = container.getBoundingClientRect();
    
    canvasElement.width = rect.width;
    canvasElement.height = videoElement.videoHeight * (rect.width / videoElement.videoWidth);
    
    // Initialize keyboard based on canvas dimensions
    arKeyboard = new ARKeyboard(canvasElement.width, canvasElement.height);
    synthEngine = new SynthEngine();
}

window.addEventListener('resize', resizeCanvas);

// Initialize hand tracking after page loads
window.addEventListener('load', () => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: 'user',
                width: { ideal: 1280 },
                height: { ideal: 720 }
            },
            audio: false
        })
        .then(stream => {
            videoElement.srcObject = stream;
            setupHandTracking();
        })
        .catch(err => {
            console.error("Error accessing webcam:", err);
            statusElement.textContent = "Error: Could not access webcam";
        });
    } else {
        statusElement.textContent = "Error: Your browser doesn't support webcam access";
    }
});

// Make HAND_CONNECTIONS available for drawing
const HAND_CONNECTIONS = [
    [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
    [0, 5], [5, 6], [6, 7], [7, 8], // Index
    [5, 9], [9, 10], [10, 11], [11, 12], // Middle
    [9, 13], [13, 14], [14, 15], [15, 16], // Ring
    [13, 17], [17, 18], [18, 19], [19, 20], // Pinky
    [0, 17], [5, 9], [9, 13], [13, 17], // Palm
];