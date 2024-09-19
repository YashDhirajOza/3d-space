import "./style.css";
import * as THREE from "three";
import { GUI } from "dat.gui";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';

// Scene setup
const scene = new THREE.Scene();
const canvas = document.querySelector("canvas.webgl");
const renderer = new THREE.WebGLRenderer({ canvas });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// Camera setup
const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 2, 6);
scene.add(camera);

// Controls
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;

// Audio setup
let audioListener;
let audioLoader;
let backgroundMusic;

function setupAudio() {
  audioListener = new THREE.AudioListener();
  camera.add(audioListener);

  backgroundMusic = new THREE.Audio(audioListener);
  audioLoader = new THREE.AudioLoader();

  audioLoader.load('interstellar.mp3', function(buffer) {
    backgroundMusic.setBuffer(buffer);
    backgroundMusic.setLoop(true);
    backgroundMusic.setVolume(0.5);
  });
}

setupAudio();

// Milky Way parameters
const parameters = {
  count: 200000,
  size: 0.005,
  radius: 8,
  branches: 4,
  spin: 1.2,
  randomness: 0.1,
  randomnessPower: 3,
  insideColor: "#ffab91",
  outsideColor: "#3c70a4",
  shape: "spiral",
  armWidth: 0.3,
  coreSize: 0.7,
  dustLanes: true,
  centralBlackHole: true,
  bulge: true,
  halo: true,
  playMusic: false,
  markLocation: () => markYouAreHere(),
  goToSolarSystem: () => transitionToSolarSystem()
};

let galaxyGeometry = null;
let galaxyMaterial = null;
let galaxyPoints = null;
let markerMesh;

// Generate galaxy function
const generateGalaxy = () => {
  // Dispose of previous galaxy
  if (galaxyPoints !== null) {
    galaxyGeometry.dispose();
    galaxyMaterial.dispose();
    scene.remove(galaxyPoints);
  }

  // Create new geometry
  galaxyGeometry = new THREE.BufferGeometry();

  const positions = new Float32Array(parameters.count * 3);
  const colors = new Float32Array(parameters.count * 3);

  const colorInside = new THREE.Color(parameters.insideColor);
  const colorOutside = new THREE.Color(parameters.outsideColor);

  for (let i = 0; i < parameters.count; i++) {
    const i3 = i * 3;

    // Position
    let radius = Math.random() * parameters.radius;
    const branchAngle = ((i % parameters.branches) / parameters.branches) * Math.PI * 2;
    const spinAngle = radius * parameters.spin;

    // Apply spiral shape
    let x = Math.cos(branchAngle + spinAngle) * radius;
    let y = 0;
    let z = Math.sin(branchAngle + spinAngle) * radius;

    // Apply arm width
    const armWidth = parameters.armWidth * (1 - radius / parameters.radius);
    x += (Math.random() - 0.5) * armWidth;
    z += (Math.random() - 0.5) * armWidth;

    // Apply bulge
    if (parameters.bulge && Math.random() < 0.1) {
      const bulgeRadius = Math.random() * parameters.radius * 0.2;
      const bulgeAngle = Math.random() * Math.PI * 2;
      x = Math.cos(bulgeAngle) * bulgeRadius;
      z = Math.sin(bulgeAngle) * bulgeRadius;
      y = (Math.random() - 0.5) * bulgeRadius * 0.5;
    }

    // Apply halo
    if (parameters.halo && Math.random() < 0.05) {
      const haloRadius = Math.random() * parameters.radius * 1.5;
      const haloAngle1 = Math.random() * Math.PI * 2;
      const haloAngle2 = Math.random() * Math.PI * 2;
      x = Math.sin(haloAngle1) * Math.cos(haloAngle2) * haloRadius;
      y = Math.sin(haloAngle1) * Math.sin(haloAngle2) * haloRadius;
      z = Math.cos(haloAngle1) * haloRadius;
    }

    // Apply randomness
    const randomX = Math.pow(Math.random(), parameters.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * parameters.randomness * radius;
    const randomY = Math.pow(Math.random(), parameters.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * parameters.randomness * radius;
    const randomZ = Math.pow(Math.random(), parameters.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * parameters.randomness * radius;

    x += randomX;
    y += randomY;
    z += randomZ;

    positions[i3] = x;
    positions[i3 + 1] = y;
    positions[i3 + 2] = z;

    // Color
    let mixedColor = colorInside.clone();
    mixedColor.lerp(colorOutside, radius / parameters.radius);

    // Apply dust lanes
    if (parameters.dustLanes) {
      const dustLane = Math.sin(branchAngle * parameters.branches) * 0.5 + 0.5;
      mixedColor.multiplyScalar(1 - dustLane * 0.3);
    }

    colors[i3] = mixedColor.r;
    colors[i3 + 1] = mixedColor.g;
    colors[i3 + 2] = mixedColor.b;
  }

  galaxyGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  galaxyGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  // Material
  galaxyMaterial = new THREE.PointsMaterial({
    size: parameters.size,
    sizeAttenuation: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
  });

  // Points
  galaxyPoints = new THREE.Points(galaxyGeometry, galaxyMaterial);
  scene.add(galaxyPoints);

  // Add central black hole
  if (parameters.centralBlackHole) {
    const blackHoleGeometry = new THREE.SphereGeometry(parameters.coreSize * 0.05, 32, 32);
    const blackHoleMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const blackHole = new THREE.Mesh(blackHoleGeometry, blackHoleMaterial);
    galaxyPoints.add(blackHole);
  }
};

function markYouAreHere() {
  if (markerMesh) scene.remove(markerMesh);

  // Create a group to hold all parts of the marker
  markerMesh = new THREE.Group();

  // Create a glowing sphere
  const sphereGeometry = new THREE.SphereGeometry(0.08, 32, 32);
  const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.8 });
  const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
  markerMesh.add(sphere);

  // Add a pulsating effect to the sphere
  const pulsate = () => {
    const scale = 1 + Math.sin(Date.now() * 0.005) * 0.1;
    sphere.scale.set(scale, scale, scale);
    requestAnimationFrame(pulsate);
  };
  pulsate();

  // Create orbiting rings
  const ringGeometry = new THREE.RingGeometry(0.12, 0.14, 64);
  const ringMaterial = new THREE.MeshBasicMaterial({ color: 0xff00ff, side: THREE.DoubleSide, transparent: true, opacity: 0.6 });
  const ring1 = new THREE.Mesh(ringGeometry, ringMaterial);
  const ring2 = new THREE.Mesh(ringGeometry, ringMaterial);
  ring2.rotation.x = Math.PI / 2;
  markerMesh.add(ring1, ring2);

  // Animate the rings
  const animateRings = () => {
    ring1.rotation.z += 0.01;
    ring2.rotation.y += 0.01;
    requestAnimationFrame(animateRings);
  };
  animateRings();

  // Add some stars around the marker
  const starGeometry = new THREE.BufferGeometry();
  const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.02 });
  const starVertices = [];
  for (let i = 0; i < 100; i++) {
    const x = (Math.random() - 0.5) * 0.5;
    const y = (Math.random() - 0.5) * 0.5;
    const z = (Math.random() - 0.5) * 0.5;
    starVertices.push(x, y, z);
  }
  starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
  const stars = new THREE.Points(starGeometry, starMaterial);
  markerMesh.add(stars);

  // Position the marker in the galaxy
  markerMesh.position.set(3, 0, 2);
  scene.add(markerMesh);

  // Add a text label
  const loader = new THREE.FontLoader();
  loader.load('https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', function(font) {
    const textGeometry = new THREE.TextGeometry('You are here', {
      font: font,
      size: 0.1,
      height: 0.02
    });
    const textMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const textMesh = new THREE.Mesh(textGeometry, textMaterial);
    textMesh.position.set(0.2, 0.2, 0);
    markerMesh.add(textMesh);
  });
}
function createLightspeedEffect() {
  const starCount = 1000;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(starCount * 3);

  for (let i = 0; i < starCount * 3; i += 3) {
    positions[i] = (Math.random() - 0.5) * 20;
    positions[i + 1] = (Math.random() - 0.5) * 20;
    positions[i + 2] = Math.random() * 10 + 5;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({ color: 0xffffff, size: 0.05 });
  const stars = new THREE.Points(geometry, material);

  scene.add(stars);

  // Animate stars moving past the camera
  const animateStars = () => {
    stars.position.z -= 0.1;
    if (stars.position.z < -10) {
      stars.position.z = 5;
    }
    requestAnimationFrame(animateStars);
  };

  animateStars();
}

function transitionToSolarSystem() {
  if (!markerMesh) {
    console.warn("Please mark your location first!");
    return;
  }

  // Move camera to the marker
  const duration = 3000; // 3 seconds
  const startPosition = camera.position.clone();
  const endPosition = markerMesh.position.clone().add(new THREE.Vector3(0, 0, 0.5));
  
  createLightspeedEffect();

  let startTime = null;
  function animateCamera(currentTime) {
    if (!startTime) startTime = currentTime;
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);

    camera.position.lerpVectors(startPosition, endPosition, progress);

    if (progress < 1) {
      requestAnimationFrame(animateCamera);
    } else {
      // Transition complete, redirect to solar system
      setTimeout(() => {
        window.location.href = 'https://sabarisurendra.github.io/3js-solar-system/';
      }, 1000);
    }
  }

  requestAnimationFrame(animateCamera);
}

// GUI
const gui = new GUI({ width: 340 });
gui.add(parameters, "count").min(1000).max(1000000).step(1000).onFinishChange(generateGalaxy);
gui.add(parameters, "size").min(0.001).max(0.1).step(0.001).onFinishChange(generateGalaxy);
gui.add(parameters, "radius").min(0.01).max(20).step(0.01).onFinishChange(generateGalaxy);
gui.add(parameters, "branches").min(2).max(20).step(1).onFinishChange(generateGalaxy);
gui.add(parameters, "spin").min(-5).max(5).step(0.001).onFinishChange(generateGalaxy);
gui.add(parameters, "randomness").min(0).max(2).step(0.001).onFinishChange(generateGalaxy);
gui.add(parameters, "randomnessPower").min(1).max(10).step(0.001).onFinishChange(generateGalaxy);
gui.addColor(parameters, "insideColor").onFinishChange(generateGalaxy);
gui.addColor(parameters, "outsideColor").onFinishChange(generateGalaxy);
gui.add(parameters, "armWidth").min(0).max(1).step(0.01).onFinishChange(generateGalaxy);
gui.add(parameters, "coreSize").min(0).max(1).step(0.01).onFinishChange(generateGalaxy);
gui.add(parameters, "dustLanes").onFinishChange(generateGalaxy);
gui.add(parameters, "centralBlackHole").onFinishChange(generateGalaxy);
gui.add(parameters, "bulge").onFinishChange(generateGalaxy);
gui.add(parameters, "halo").onFinishChange(generateGalaxy);
gui.add(parameters, "playMusic").name("Play Music").onChange((value) => {
  if (value && backgroundMusic.buffer) {
    backgroundMusic.play();
  } else {
    backgroundMusic.pause();
  }
});
gui.add(parameters, 'markLocation').name('Mark "You are here"');
gui.add(parameters, 'goToSolarSystem').name('Go to Solar System');

// Initial galaxy generation
generateGalaxy();

// Animation
const clock = new THREE.Clock();

const animate = () => {
  const elapsedTime = clock.getElapsedTime();

  // Update controls
  controls.update();

  // Rotate galaxy
  if (galaxyPoints) {
    galaxyPoints.rotation.y = elapsedTime * 0.05;
  }

  if (markerMesh) {
    markerMesh.rotation.y = -elapsedTime * 0.05;
  }

  // Render
  renderer.render(scene, camera);

  // Call animate again on the next frame
  requestAnimationFrame(animate);
};

// Handle window resize
const handleResize = () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
};

window.addEventListener("resize", handleResize);
handleResize();

// Start animation loop
animate();

// Handle fullscreen
window.addEventListener("dblclick", () => {
  if (!document.fullscreenElement) {
    canvas.requestFullscreen();
  } else {
    document.exitFullscreen();
  }
});
