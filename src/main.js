import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

let cars = [];
let drones = [];
let alwaysMovingDrones = [];
let carsMoving = true;
let dronesMoving = true;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x222222);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
let isTopView = false;
camera.position.set(0, 30, 50);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 10;
controls.maxDistance = 150;
controls.maxPolarAngle = Math.PI / 2;

const textureLoader = new THREE.TextureLoader();

// Load textures for each building face
const textureRight = textureLoader.load('textures/building_right.jpg');
const textureLeft = textureLoader.load('textures/building_left.jpg');
const textureTop = textureLoader.load('textures/building_top.jpg');
const textureBottom = textureLoader.load('textures/building_bottom.jpg');
const textureFront = textureLoader.load('textures/building_front.jpg');
const textureBack = textureLoader.load('textures/building_back.jpg');
const textureBuildingB = textureLoader.load('textures/buildingb.jpg');
const textureBuildingC = textureLoader.load('textures/buildingc.jpg');

[
  textureRight, textureLeft, textureTop,
  textureBottom, textureFront, textureBack,
  textureBuildingB, textureBuildingC
].forEach(tex => tex.flipY = false);

const groundSize = 200;
const groundGeometry = new THREE.PlaneGeometry(groundSize, groundSize);

const pavementTexture = textureLoader.load('textures/pavement.jpg');
pavementTexture.wrapS = THREE.RepeatWrapping;
pavementTexture.wrapT = THREE.RepeatWrapping;
pavementTexture.repeat.set(groundSize / 10, groundSize / 10);

const groundMaterial = new THREE.MeshStandardMaterial({ map: pavementTexture });
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(10, 20, 10);
scene.add(light);
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const light2 = new THREE.DirectionalLight(0xffffff, 0.5);
light2.position.set(-10, 10, -10);
scene.add(light2);

// === Buildings ===
const buildingPositions = [];
const spacingX = 12;
const spacingZ = 15;
const rows = 7;
const cols = 8;

let startX = -(cols - 1) * spacingX / 2;
let startZ = -(rows - 1) * spacingZ / 2;

for (let row = 0; row < rows; row++) {
  for (let col = 0; col < cols; col++) {
    buildingPositions.push([
      startX + col * spacingX,
      0,
      startZ + row * spacingZ,
    ]);
  }
}

const fixedHeights = [
  12,16,14,11,18,20,13,17,
  14,18,20,13,17,12,16,14,
  16,20,18,15,19,22,15,18,
  15,19,21,16,20,17,14,19,
  12,15,13,18,21,15,17,16,
  14,17,16,19,20,18,15,14,
  13,16,14,17,19,16,18,20,
];

const typeBIndices = [3, 7, 9, 15, 16, 18, 28, 34, 41, 52];
const typeCIndices = [4, 12, 25, 37, 49, 50, 51];

for (let i = 0; i < buildingPositions.length; i++) {
  const pos = buildingPositions[i];
  const height = fixedHeights[i];

  let mesh;

  if (typeBIndices.includes(i)) {
    const geometry = new THREE.CylinderGeometry(4, 4, height, 16);
    const material = new THREE.MeshStandardMaterial({ map: textureBuildingB });
    mesh = new THREE.Mesh(geometry, material);
  } else if (typeCIndices.includes(i)) {
    const geometry = new THREE.ConeGeometry(5, height, 16);
    const material = new THREE.MeshStandardMaterial({ map: textureBuildingC });
    mesh = new THREE.Mesh(geometry, material);
  } else {
    const geometry = new THREE.BoxGeometry(8, height, 8);
    const materials = [
      new THREE.MeshStandardMaterial({ map: textureRight }),
      new THREE.MeshStandardMaterial({ map: textureBack, side: THREE.DoubleSide }),
      new THREE.MeshStandardMaterial({ map: textureTop }),
      new THREE.MeshStandardMaterial({ map: textureBottom }),
      new THREE.MeshStandardMaterial({ map: textureFront }),
      new THREE.MeshStandardMaterial({ map: textureLeft, side: THREE.DoubleSide }),
    ];
    mesh = new THREE.Mesh(geometry, materials);
  }

  mesh.position.set(pos[0], height / 2, pos[2]);
  scene.add(mesh);
}

// === Cars ===
// ... (unchanged car, drone, animation, and event code continues below)
const carGeometry = new THREE.BoxGeometry(2, 1, 4);
const carMaterial = new THREE.MeshPhongMaterial({ color: 0xffff00 });

const totalCars = 13;
const specialCarIndices = [2, 3];
const totalRotatingCars = totalCars - specialCarIndices.length;

for (let i = 0, rotatingIndex = 0; i < totalCars; i++) {
  const car = new THREE.Mesh(carGeometry, carMaterial);
  scene.add(car);
  let angle = 0;
  if (!specialCarIndices.includes(i)) {
    angle = rotatingIndex * (2 * Math.PI / totalRotatingCars);
    rotatingIndex++;
  }
  cars.push({ mesh: car, angle, direction: 1 });
}

cars[2].mesh.position.set(-40, 15, 0);
cars[3].mesh.position.set(-15, 20, 10);

// === Drones ===
const droneGeometry = new THREE.BoxGeometry(2, 1, 1);
const droneMaterial = new THREE.MeshPhongMaterial({ color: 0x00ffff });

const hoverDronesIndices = [5, 12, 19, 26, 33, 40, 47, 54];
const hoverDrones = [];

hoverDronesIndices.forEach(i => {
  const bPos = buildingPositions[i];
  const bHeight = fixedHeights[i];
  const drone = new THREE.Mesh(droneGeometry, droneMaterial);
  drone.position.set(bPos[0], bHeight + 5, bPos[2]);
  scene.add(drone);
  hoverDrones.push(drone);
});

const alwaysMovingDronesPositions = [
  [-25, 25, 15],
  [-10, 25, 15],
];
alwaysMovingDronesPositions.forEach(pos => {
  const drone = new THREE.Mesh(droneGeometry, droneMaterial);
  drone.position.set(pos[0], pos[1], pos[2]);
  scene.add(drone);
  alwaysMovingDrones.push(drone);
});

const hoverAmplitude = 2;
const hoverSpeed = 0.002;

const movementSpeed = 0.5;
const boostSpeed = 1.5;
const keysPressed = {};

window.addEventListener('keydown', (event) => {
  keysPressed[event.key] = true;
  switch (event.key) {
    case '1': carsMoving = !carsMoving; break;
    case 'd':
    case 'D': dronesMoving = !dronesMoving; break;
    case 'v':
    case 'V':
      if (!isTopView) {
        camera.position.set(0, 80, 0);
        camera.lookAt(0, 0, 0);
        isTopView = true;
      } else {
        camera.position.set(0, 30, 50);
        camera.lookAt(0, 0, 0);
        isTopView = false;
      }
      break;
  }
});

window.addEventListener('keyup', (event) => {
  delete keysPressed[event.key];
});

function animate() {
  requestAnimationFrame(animate);
  controls.update();

  const speed = keysPressed['Shift'] ? boostSpeed : movementSpeed;
  if (keysPressed['ArrowUp']) camera.position.z -= speed;
  if (keysPressed['ArrowDown']) camera.position.z += speed;
  if (keysPressed['ArrowLeft']) camera.position.x -= speed;
  if (keysPressed['ArrowRight']) camera.position.x += speed;

  if (carsMoving) {
    const radius = 90;
    for (let i = 0; i < cars.length; i++) {
      if (specialCarIndices.includes(i)) continue;
      cars[i].angle += 0.01;
      cars[i].mesh.position.x = Math.cos(cars[i].angle) * radius;
      cars[i].mesh.position.z = Math.sin(cars[i].angle) * radius;
      cars[i].mesh.position.y = 10;
    }

    cars[2].mesh.position.z += 0.2 * cars[2].direction;
    cars[2].mesh.position.x = -40;
    cars[2].mesh.position.y = 15;
    if (cars[2].mesh.position.z >= 20 || cars[2].mesh.position.z <= -20) {
      cars[2].direction *= -1;
    }

    cars[3].mesh.position.x += 0.2 * cars[3].direction;
    cars[3].mesh.position.z = 10;
    cars[3].mesh.position.y = 20;
    if (cars[3].mesh.position.x >= 0 || cars[3].mesh.position.x <= -30) {
      cars[3].direction *= -1;
    }
  }

  if (dronesMoving) {
    hoverDrones.forEach((drone, index) => {
      drone.rotation.y += 0.04;
      drone.position.y = buildingPositions[hoverDronesIndices[index]][1] + fixedHeights[hoverDronesIndices[index]] + 5 +
        hoverAmplitude * Math.sin(Date.now() * hoverSpeed + index);
    });
  }

  alwaysMovingDrones.forEach((drone, index) => {
    drone.rotation.y += 0.04;
    drone.position.y = alwaysMovingDronesPositions[index][1] +
      hoverAmplitude * Math.sin(Date.now() * hoverSpeed + index + 10);
  });

  renderer.render(scene, camera);
}

animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
