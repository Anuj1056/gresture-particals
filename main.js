// ====== THREE.JS BASIC SETUP ======
let scene, camera, renderer, particles;
const COUNT = 3000;

const params = {
  expansion: 1.0
};

initThree();
initParticles();
initHands();
animate();

function initThree() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.set(0, 0, 8);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

function initParticles() {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(COUNT * 3);
  const colors = new Float32Array(COUNT * 3);

  for (let i = 0; i < COUNT; i++) {
    const i3 = i * 3;
    const p = randomPointOnSphere();
    positions[i3] = p.x;
    positions[i3 + 1] = p.y;
    positions[i3 + 2] = p.z;

    colors[i3] = 0.5 + Math.random() * 0.5;
    colors[i3 + 1] = 0.2;
    colors[i3 + 2] = 1.0;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 0.08,
    vertexColors: true,
    transparent: true,
    opacity: 0.9
  });

  particles = new THREE.Points(geometry, material);
  scene.add(particles);
}

function randomPointOnSphere() {
  const u = Math.random();
  const v = Math.random();
  const theta = 2 * Math.PI * u;
  const phi = Math.acos(2 * v - 1);
  const r = 2.0;

  return new THREE.Vector3(
    r * Math.sin(phi) * Math.cos(theta),
    r * Math.sin(phi) * Math.sin(theta),
    r * Math.cos(phi)
  );
}

function animate() {
  requestAnimationFrame(animate);

  // expand / contract by hand openness
  if (particles) {
    particles.scale.set(
      params.expansion,
      params.expansion,
      params.expansion
    );
    particles.rotation.y += 0.003;
  }

  renderer.render(scene, camera);
}

// ====== WEBCAM + MEDIAPIPE HANDS (SIMPLE) ======
function initHands() {
  const videoElement = document.querySelector('.input_video');

  const hands = new Hands({
    locateFile: (file) =>
      `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
  });

  hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.6,
    minTrackingConfidence: 0.6
  });

  hands.onResults(onHandsResults);

  const cam = new Camera(videoElement, {
    onFrame: async () => {
      await hands.send({ image: videoElement });
    },
    width: 640,
    height: 480
  });

  cam.start();
}

function onHandsResults(results) {
  // no hand => shrink a bit
  if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
    params.expansion = 0.7;
    return;
  }

  const hand = results.multiHandLandmarks[0];

  const wrist = hand[0];
  const middleTip = hand[12];

  const dx = middleTip.x - wrist.x;
  const dy = middleTip.y - wrist.y;
  const dz = middleTip.z - wrist.z;
  const dist = Math.sqrt(dx*dx + dy*dy + dz*dz); // 0..~0.5

  // map dist to 0.5..3.0
  let openness = (dist - 0.05) / 0.25;
  openness = Math.min(Math.max(openness, 0), 1);
  params.expansion = 0.5 + openness * 2.5;
}
