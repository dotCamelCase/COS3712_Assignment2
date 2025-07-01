/*─────────────────────────────────────────────────────────────────────
  City scene with glTF drones & cars
  – supports skinned / rigged models via clone() from SkeletonUtils
─────────────────────────────────────────────────────────────────────*/
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader }   from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone }        from 'three/examples/jsm/utils/SkeletonUtils.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

/*────────────────────
  Global collections & flags
────────────────────*/
let cars               = [];
let drones             = [];
let hoverDrones        = [];
let alwaysMovingDrones = [];

let carsMoving   = true;
let dronesMoving = true;

// ——— Trees ————————————————————————————————
let treeTemplate = null;
const trees      = [];
let officeTemplate = null;
let hotelTemplate  = null;

/*────────────────────
  Scene, camera, renderer
────────────────────*/
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x222222);

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
let isTopView = false;
camera.position.set(0, 30, 50);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
// renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);
const rgbeLoader = new RGBELoader();

rgbeLoader.setPath('models/').load('scifi.hdr', (hdrTexture) => {
  hdrTexture.mapping = THREE.EquirectangularReflectionMapping;

  scene.environment = hdrTexture;
  scene.background  = hdrTexture; // Optional: set HDR as skybox background

  // Optional: boost brightness & realism
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMappingExposure = 1.2;
});

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance   = 10;
controls.maxDistance   = 150;
controls.maxPolarAngle = Math.PI / 2;

/*────────────────────
  Texture loader
────────────────────*/
const texLoader = new THREE.TextureLoader();

/*────────────────────
  Ground  (NEW grass + inner pavement disc)
────────────────────*/
const groundSize = 200;

/* base grass square */
const grassTex = texLoader.load('textures/grass.jpg');
grassTex.wrapS = grassTex.wrapT = THREE.RepeatWrapping;
grassTex.repeat.set(groundSize / 10, groundSize / 10);

const groundGeom = new THREE.PlaneGeometry(groundSize, groundSize);
const groundMat  = new THREE.MeshStandardMaterial({ map: grassTex });
const ground     = new THREE.Mesh(groundGeom, groundMat);
ground.rotation.x = -Math.PI / 2;
// ground.receiveShadow = true;
scene.add(ground);

/* inner pavement circle (radius 89) */
const pavementTex = texLoader.load('textures/pavement.jpg');
pavementTex.wrapS = pavementTex.wrapT = THREE.RepeatWrapping;
pavementTex.repeat.set(groundSize / 10, groundSize / 10);

const innerRadius  = 89;
const discGeom     = new THREE.CircleGeometry(innerRadius, 64);
const discMat      = new THREE.MeshStandardMaterial({ map: pavementTex });
const discMesh     = new THREE.Mesh(discGeom, discMat);
discMesh.rotation.x = -Math.PI / 2;
discMesh.position.y = 0.01;          // lift a hair to avoid Z‑fighting
scene.add(discMesh);

/*────────────────────
  Lights
────────────────────*/
const keyLight = new THREE.DirectionalLight(0xffffff, 1);
keyLight.position.set(10, 20, 10);
// keyLight.castShadow = true;
scene.add(keyLight);

scene.add(new THREE.AmbientLight(0xffffff, 0.4));

const fillLight = new THREE.DirectionalLight(0xffffff, 0.5);
fillLight.position.set(-10, 10, -10);
// fillLight.castShadow = true;
scene.add(fillLight);

/*────────────────────
  Buildings
────────────────────*/
const [
  texRight, texLeft, texTop, texBottom, texFront, texBack,
  texB, texC
] = [
  'building_right', 'building_left',  'building_top', 'building_bottom',
  'building_front', 'building_back',  'buildingb',    'buildingc'
].map(name => texLoader.load(`textures/${name}.jpg`));

const normalMap = texLoader.load('textures/normalgl.jpg');
[
  texRight, texLeft, texTop, texBottom,
  texFront, texBack, texB, texC
].forEach(t => (t.flipY = false));

const bPos   = [];
const rows   = 7;
const cols   = 8;
const dx     = 12;
const dz     = 15;
const startX = -(cols - 1) * dx / 2;
const startZ = -(rows - 1) * dz / 2;

for (let r = 0; r < rows; r++) {
  for (let c = 0; c < cols; c++) {
    bPos.push([startX + c * dx, 0, startZ + r * dz]);
  }
}

const heights = [
  12,16,14,11,18,20,13,17, 14,18,20,13,17,12,16,14,
  16,20,18,15,19,22,15,18, 15,19,21,16,20,17,14,19,
  12,15,13,18,21,15,17,16, 14,17,16,19,20,18,15,14,
  13,16,14,17,19,16,18,20,
];

const typeB = [3, 7, 9, 15, 16, 18, 28, 34, 41, 52];
const typeC = [4, 12, 25, 37, 49, 50, 51];

bPos.forEach((p, i) => {
  const h = heights[i];
  let mesh;

 if (typeB.includes(i)) {
  mesh = new THREE.Mesh(
  new THREE.CylinderGeometry(4, 4, h, 16),
  new THREE.MeshStandardMaterial({ map: texB, normalMap: normalMap })
);

  } else if (typeC.includes(i)) {
    mesh = new THREE.Mesh(
      new THREE.ConeGeometry(5, h, 16),
      new THREE.MeshStandardMaterial({ map: texC, normalMap: normalMap })
    );
  } else {
   mesh = new THREE.Mesh(
  new THREE.BoxGeometry(8, h, 8),
  [
    new THREE.MeshStandardMaterial({ map: texRight,  normalMap: normalMap }),
    new THREE.MeshStandardMaterial({ map: texBack,   normalMap: normalMap,   side: THREE.DoubleSide }),
    new THREE.MeshStandardMaterial({ map: texTop,    normalMap: normalMap }),
    new THREE.MeshStandardMaterial({ map: texBottom, normalMap: normalMap }),
    new THREE.MeshStandardMaterial({ map: texFront,  normalMap: normalMap }),
    new THREE.MeshStandardMaterial({ map: texLeft,   normalMap: normalMap,  side: THREE.DoubleSide }),
  ]
);
  }

  mesh.position.set(p[0], h / 2, p[2]);
  scene.add(mesh);
});

// Make bump effect softer (optional)
scene.traverse((obj) => {
  if (obj.isMesh && obj.material.normalMap) {
    if (Array.isArray(obj.material)) {
      obj.material.forEach(mat => mat.normalScale.set(0.6, 0.6));
    } else {
      obj.material.normalScale.set(0.6, 0.6);
    }
  }
});

/*────────────────────
  =====   DRONES   =====
────────────────────*/
const hoverIdx   = [5, 12, 19, 26, 33, 40, 47, 54];
const movePos    = [ [-25, 25, 15], [-10, 25, 15] ];
let   droneTPL   = null;

new GLTFLoader().load(
  'models/drone.glb',
  (g) => {
    droneTPL = g.scene;
    droneTPL.scale.set(0.2, 0.2, 0.2);
    droneTPL.traverse(c => { if (c.isMesh) { c.castShadow = c.receiveShadow = true; } });

    buildHoverDrones();
    buildMovingDrones();
  },
  undefined,
  err => console.error('Cannot load drone.glb:', err)
);

function cloneDrone() {
  const d = clone(droneTPL);
  drones.push(d);
  scene.add(d);
  return d;
}
function buildHoverDrones() {
  hoverIdx.forEach((i) => {
    const d = cloneDrone();
    d.position.set(bPos[i][0], heights[i] + 5, bPos[i][2]);
    hoverDrones.push(d);
  });
}
function buildMovingDrones() {
  movePos.forEach(([x, y, z]) => {
    const d = cloneDrone();
    d.position.set(x, y, z);
    alwaysMovingDrones.push(d);
  });
}

/*────────────────────
  =====   CARS   =====
────────────────────*/
const totalCars         = 13;
const specialCars       = [2, 3];
const rotatingCarsCount = totalCars - specialCars.length;
let   carTPL            = null;

new GLTFLoader().load(
  'models/car.glb',
  (g) => {
    carTPL = g.scene;
    carTPL.scale.set(0.04, 0.04, 0.04);
    carTPL.traverse(c => { if (c.isMesh) { c.castShadow = c.receiveShadow = true; } });

    buildAllCars();
  },
  undefined,
  err => console.error('Cannot load car.glb:', err)
);

function cloneCar() {
  const c = clone(carTPL);
  scene.add(c);
  return c;
}

function buildAllCars() {
  for (let i = 0, idx = 0; i < totalCars; i++) {
    const mesh = cloneCar();
    let angle  = 0;

    if (!specialCars.includes(i)) {
      angle = idx * (2 * Math.PI / rotatingCarsCount);
      idx++;
    }
    cars.push({ mesh, angle, direction: 1 });
  }

  cars[2].mesh.position.set(-40, 15, 0);
  cars[3].mesh.position.set(-15, 20, 10);
}

/*────────────────────
  =====   TREES   =====
────────────────────*/
new GLTFLoader().load(
  'models/tree.glb',
  (gltf) => {
    treeTemplate = gltf.scene;
    treeTemplate.scale.set(4, 4, 4);
    treeTemplate.traverse((c) => {
      if (c.isMesh) { c.castShadow = c.receiveShadow = true; }
    });
    buildTreeRing();
  },
  undefined,
  err => console.error('Cannot load tree.glb:', err)
);

function buildTreeRing() {
  if (!treeTemplate) return;
  const count  = 36;
  const radius = 90;

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const tree  = clone(treeTemplate);
    tree.position.set(
      Math.cos(angle) * radius,
      0,
      Math.sin(angle) * radius
    );
    tree.rotation.y = angle + (Math.random() - 0.5) * 0.4;
    scene.add(tree);
    trees.push(tree);
  }
}
/*────────────────────
  =====   OFFICE   =====
────────────────────*/
new GLTFLoader().load(
  'models/office.glb',              // adjust path if needed
  (gltf) => {
    officeTemplate = gltf.scene;
    officeTemplate.scale.set(0.08, 0.08, 0.08);       // tweak to look right
    officeTemplate.traverse((c) => {
      if (c.isMesh) { c.castShadow = c.receiveShadow = true; }
    });
    placeOffice();                            // drop it in immediately
  },
  undefined,
  (err) => console.error('Cannot load office.glb:', err)
);

/*────────────────────
  =====   HOTEL   =====
────────────────────*/
new GLTFLoader().load(
  'models/hotel.glb',               // adjust path if needed
  (gltf) => {
    hotelTemplate = gltf.scene;
    hotelTemplate.scale.set(1, 1, 1);         // tweak to look right
    hotelTemplate.traverse((c) => {
      if (c.isMesh) { c.castShadow = c.receiveShadow = true; }
    });
    placeHotel();                             // drop it in immediately
  },
  undefined,
  (err) => console.error('Cannot load hotel.glb:', err)
);

/*────────────────────
  Input handling
────────────────────*/
const keys       = {};
const moveSpeed  = 0.5;
const boostSpeed = 1.5;

window.addEventListener('keydown', (e) => {
  keys[e.key] = true;
  switch (e.key) {
    case '1': carsMoving   = !carsMoving; break;
    case 'd': case 'D': dronesMoving = !dronesMoving; break;
    case 'v': case 'V':
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
window.addEventListener('keyup', (e) => delete keys[e.key]);

/*────────────────────
  Animation
────────────────────*/
const clock     = new THREE.Clock();
const hoverAmp  = 2;
const hoverFreq = 2;

function animate() {
  requestAnimationFrame(animate);
  controls.update();

  const camSpeed = keys['Shift'] ? boostSpeed : moveSpeed;
  if (keys['ArrowUp'])    camera.position.z -= camSpeed;
  if (keys['ArrowDown'])  camera.position.z += camSpeed;
  if (keys['ArrowLeft'])  camera.position.x -= camSpeed;
  if (keys['ArrowRight']) camera.position.x += camSpeed;

  if (carsMoving && cars.length === totalCars) {
    const r = 90;
    cars.forEach((c, i) => {
      if (specialCars.includes(i)) return;
      c.angle -= 0.01;
      c.mesh.position.set(
        Math.cos(c.angle) * r,
        10,
        Math.sin(c.angle) * r
      );
      c.mesh.rotation.y = -c.angle + Math.PI / 2;
    });

    const c2 = cars[2];
    c2.mesh.position.z += 0.2 * c2.direction;
    c2.mesh.position.setX(-40).setY(15);
    if (Math.abs(c2.mesh.position.z) >= 20) c2.direction *= -1;

    const c3 = cars[3];
    c3.mesh.position.x += 0.2 * c3.direction;
    c3.mesh.position.setZ(10).setY(20);
    if (c3.mesh.position.x >= 0 || c3.mesh.position.x <= -30) c3.direction *= -1;
  }

  const t = clock.getElapsedTime();
  if (dronesMoving && hoverDrones.length) {
    hoverDrones.forEach((d, i) => {
      d.rotation.y += 0.04;
      d.position.y = heights[hoverIdx[i]] + 5 +
                     hoverAmp * Math.sin(t * hoverFreq + i);
    });
  }
  alwaysMovingDrones.forEach((d, i) => {
    d.rotation.y += 0.04;
    d.position.y = movePos[i][1] +
                   hoverAmp * Math.sin(t * hoverFreq + i + 10);
  });

  renderer.render(scene, camera);
}
// ——————————————————————————————————————————————
// Place office (north) and hotel (east) in the grass ring
// ——————————————————————————————————————————————
function placeOffice() {
  if (!officeTemplate) return;
  const office = clone(officeTemplate);   // safe for skinned models too
  const r      = 70;                      // midway between 49 and 90
  office.position.set(0, 0, r);           // (x=0, z=+r)
  scene.add(office);
}

function placeHotel() {
  if (!hotelTemplate) return;
  const hotel = clone(hotelTemplate);
  const r     = 70;
  hotel.position.set(r, 0, 0);            // (x=+r, z=0)
  hotel.rotation.y = Math.PI / 2;         // face south; adjust if needed
  scene.add(hotel);
}

animate();

/*────────────────────
  Resize
────────────────────*/
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
