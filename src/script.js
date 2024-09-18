import "./style.css";
import * as THREE from "three";
import { GUI } from "dat.gui";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

// Scene setup
const scene = new THREE.Scene();
const canvas = document.querySelector("canvas.webgl");
const renderer = new THREE.WebGLRenderer({ canvas });

// Camera setup
const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 2, 6);
scene.add(camera);

// Controls
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;

// Galaxy parameters
const parameters = {
  count: 100000,
  size: 0.01,
  radius: 5,
  branches: 3,
  spin: 1,
  randomness: 0.2,
  randomnessPower: 3,
  insideColor: "#ff6030",
  outsideColor: "#1b3984",
  shape: "spiral", // New parameter for galaxy shape
  armWidth: 0.5, // New parameter for spiral arm width
  coreSize: 0.5, // New parameter for galaxy core size
  dustLanes: false, // New parameter for dust lanes
  centralBlackHole: false, // New parameter for central black hole
};

let galaxyGeometry = null;
let galaxyMaterial = null;
let galaxyPoints = null;

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
    let radius, branchAngle, spinAngle;

    switch (parameters.shape) {
      case "spiral":
        radius = Math.random() * parameters.radius;
        branchAngle = ((i % parameters.branches) / parameters.branches) * Math.PI * 2;
        spinAngle = radius * parameters.spin;
        break;
      case "elliptical":
        radius = Math.cbrt(Math.random()) * parameters.radius;
        branchAngle = Math.random() * Math.PI * 2;
        spinAngle = 0;
        break;
      case "irregular":
        radius = Math.random() * parameters.radius;
        branchAngle = Math.random() * Math.PI * 2;
        spinAngle = Math.random() * Math.PI * 2;
        break;
    }

    let x = Math.cos(branchAngle + spinAngle) * radius;
    let y = 0;
    let z = Math.sin(branchAngle + spinAngle) * radius;

    // Apply arm width for spiral galaxies
    if (parameters.shape === "spiral") {
      const armWidth = parameters.armWidth * (1 - radius / parameters.radius);
      x += (Math.random() - 0.5) * armWidth;
      z += (Math.random() - 0.5) * armWidth;
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
    if (parameters.shape === "spiral") {
      mixedColor.lerp(colorOutside, radius / parameters.radius);
    } else {
      mixedColor.lerp(colorOutside, Math.random());
    }

    // Apply dust lanes for spiral galaxies
    if (parameters.shape === "spiral" && parameters.dustLanes) {
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
    const blackHoleGeometry = new THREE.SphereGeometry(parameters.coreSize * 0.1, 32, 32);
    const blackHoleMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const blackHole = new THREE.Mesh(blackHoleGeometry, blackHoleMaterial);
    galaxyPoints.add(blackHole);
  }
};

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
gui.add(parameters, "shape", ["spiral", "elliptical", "irregular"]).onFinishChange(generateGalaxy);
gui.add(parameters, "armWidth").min(0).max(1).step(0.01).onFinishChange(generateGalaxy);
gui.add(parameters, "coreSize").min(0).max(1).step(0.01).onFinishChange(generateGalaxy);
gui.add(parameters, "dustLanes").onFinishChange(generateGalaxy);
gui.add(parameters, "centralBlackHole").onFinishChange(generateGalaxy);

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