const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let model;
let hand;

// Load the gesture recognition model
async function loadModel() {
  model = await handpose.load();
}

// Initialize the video stream
async function init() {
  await loadModel();

  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: 'user'
    }
  });
  video.srcObject = stream;
}

// Process the video frames
function processFrame() {
  const input = new tf.TensorFromPixels(video, 1);
  const predictions = model.estimate(input);

  if (predictions.length > 0) {
    hand = predictions[0];

    // Extract thumb tip coordinates
    const thumbTipX = hand.landmarks[4].x;
    const thumbTipY = hand.landmarks[4].y;

    // Convert to screen coordinates
    const currentHandX = thumbTipX * canvas.width;
    const currentHandY = thumbTipY * canvas.height;

    // Smooth the position using EMA and SMA
    smoothHandX = smoothPosition(currentHandX, currentHandY);

    // Move the mouse if not stopped
    if (!stopMovement) {
      // Calculate mouse movement based on scaling factors and damping
      const mouseX = smoothHandX * scalingFactorX * dampingFactor;
      const mouseY = smoothHandY * scalingFactorY * dampingFactor;

      // Move the mouse pointer
      moveMouse(mouseX, mouseY);
    }

    // Check for Palm gesture
    if (isPalmGesture(hand)) {
      stopMovement = true;
      if (!clickPerformed) {
        click();
        clickPerformed = true;
      }
    } else {
      stopMovement = false;
      clickPerformed = false;
    }
  }

  // Draw the video frame and hand landmarks
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  drawHand(hand);

  // Calculate FPS
  const currentTime = performance.now();
  FPS = 1000 / (currentTime - START_TIME);
  START_TIME = currentTime;

  // Display FPS
  ctx.font = "16px Arial";
  ctx.fillStyle = "red";
  ctx.fillText("FPS: " + FPS.toFixed(1), 10, 30);

  requestAnimationFrame(processFrame);
}

// Gesture recognition logic
function isPalmGesture(hand) {
  // Check if all fingers are spread out and palm is facing forward
  const thumbTip = hand.landmarks[4];
  const indexTip = hand.landmarks[8];
  const middleTip = hand.landmarks[12];
  const ringTip = hand.landmarks[16];
  const pinkyTip = hand.landmarks[20];

  const thumbSpread = Math.abs(thumbTip.x - indexTip.x);
  const indexSpread = Math.abs(indexTip.x - middleTip.x);
  const middleSpread = Math.abs(middleTip.x - ringTip.x);
  const ringSpread = Math.abs(ringTip.x - pinkyTip.x);

  const thumbCurl = thumbTip.y - indexTip.y;
  const indexCurl = indexTip.y - middleTip.y;
  const middleCurl = middleTip.y - ringTip.y;
  const ringCurl = ringTip.y - pinkyTip.y;

  return thumbSpread > threshold && indexSpread > threshold &&
         middleSpread > threshold && ringSpread > threshold &&
         thumbCurl < 0 && indexCurl < 0 && middleCurl < 0 && ringCurl < 0;
}

// Mouse movement and click simulation
function moveMouse(x, y) {
  // Simulate mouse movement using the robotjs library
  robot.moveMouse(x, y);
}

function click() {
  // Simulate a mouse click using the robotjs library
  robot.click();
}

// Hand drawing
function drawHand(hand) {
  // Draw the hand landmarks on the canvas
  ctx.strokeStyle = "red";
  ctx.lineWidth = 2;
  for (let i = 0; i < hand.landmarks.length; i++) {
    const landmark = hand.landmarks[i];
    const x = landmark.x * canvas.width;
    const y = landmark.y * canvas.height;
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, 2 * Math.PI);
    ctx.stroke();
  }
}

// Initialization
init().then(() => {
  processFrame();
});
