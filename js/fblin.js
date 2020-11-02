import * as THREE from './three/build/three.module.js';
import { GLTFLoader } from './three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from './three/examples/jsm/controls/OrbitControls.js';
var camera, scene, renderer;
var geometry, material, mesh;
var controls;

var model;
var goal_marker;

var K_pos, K_vel, K_rot, K_ang;

var posdes;
var yawdes = 0.0;
var pos, vel, ang;
var rot;

var gravity;
var dt;

var raycaster = new THREE.Raycaster();
var mouse = new THREE.Vector2();

var CANVAS_WIDTH = 1280;
var CANVAS_HEIGHT = 720;

const homeheight = 1.0;
const startpos = new THREE.Vector3(1.0, 1.0, homeheight);

var desx1 = document.getElementById("desx1");
var desy1 = document.getElementById("desy1");
var desz1 = document.getElementById("desz1");

document.addEventListener('mouseup', onMouseClick, false);
document.addEventListener("keydown", onDocumentKeyDown, false);

init();
animate();

document.getElementById('gobut').onclick =
function onGo() {
  var x = parseFloat(desx1.value);
  var y = parseFloat(desy1.value);
  var z = parseFloat(desz1.value);

  if (Math.abs(x) > 5 || Math.abs(y) > 5 || Math.abs(z) > 5) {
    console.log("Desired position out of bounds.");
    return;
  }

  setposdes(new THREE.Vector3(x, y, z));
};

document.getElementById('homebut').onclick =
function onHome() {
  setposdes(new THREE.Vector3(0, 0, homeheight));
};

function onDocumentKeyDown(event) {
  var keycode = event.which;
  let newdes = new THREE.Vector3(posdes.x, posdes.y, posdes.z);
  if (keycode == 87) {
    newdes.x += 1.0;
  }
  if (keycode == 83) {
    newdes.x -= 1.0;
  }
  if (keycode == 65) {
    newdes.y += 1.0;
  }
  if (keycode == 68) {
    newdes.y -= 1.0;
  }
  if (keycode == 69) {
    newdes.z += 0.5
  }
  if (keycode == 81) {
    newdes.z -= 0.5
  }

  setposdes(newdes);
};

function onMouseClick(event) {
  if (event.button != 2) {
    return;
  }

  event.preventDefault();
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x =  ((event.clientX - rect.left) / CANVAS_WIDTH)  * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / CANVAS_HEIGHT) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  raycaster.ray.closestPointToPoint(posdes, posdes);
  setposdes(posdes);
}

function setposdes(vec) {
  vec.x = Math.min(5, Math.max(-5, vec.x));
  vec.y = Math.min(5, Math.max(-5, vec.y));
  vec.z = Math.min(5, Math.max(-5, vec.z));

  posdes = vec;
  goal_marker.position.set(vec.x, vec.y, vec.z);
  desx1.value = vec.x;
  desy1.value = vec.y;
  desz1.value = vec.z;
}

function init() {
  THREE.Object3D.DefaultUp = new THREE.Vector3(0, 0, 1);

  camera = new THREE.PerspectiveCamera(70, CANVAS_WIDTH / CANVAS_HEIGHT, 0.01, 1000);
  camera.position.x = -3;
  camera.position.z = 3;

  renderer = new THREE.WebGLRenderer( { antialias: true } );
  renderer.setClearColor( 0xffffff, 1 );
  renderer.setSize( CANVAS_WIDTH, CANVAS_HEIGHT );
  document.getElementById('sim').appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.update();
  controls.enablePan = false;

  scene = new THREE.Scene();

  var loader = new GLTFLoader();

  loader.load('models/hex.gltf', function ( gltf ) {
    model = gltf.scene;
    scene.add( gltf.scene );
  }, undefined, function (error) {
    console.error(error);
  });

  var size = 10;
  var divisions = 10;

  var grid = new THREE.GridHelper(size, divisions);
  grid.rotateX(Math.PI / 2);
  scene.add(grid);

  const axesHelper = new THREE.AxesHelper(5);
  axesHelper.material.linewidth = 10;
  scene.add(axesHelper);

  const geometry = new THREE.SphereGeometry(0.05, 8, 8);
  const material = new THREE.MeshBasicMaterial({color: 0xf9812a});
  goal_marker = new THREE.Mesh(geometry, material);
  scene.add(goal_marker);

  initsim();
}

function initsim() {
  gravity = new THREE.Vector3(0, 0, -9.81);
  dt = 0.02;

  pos = new THREE.Vector3();
  vel = new THREE.Vector3();
  ang = new THREE.Vector3();

  rot = new THREE.Matrix4();
  rot.identity();

  setposdes(startpos);

  K_pos = new THREE.Matrix3();
  K_vel = new THREE.Matrix3();
  K_rot = new THREE.Matrix3();
  K_ang = new THREE.Matrix3();

  K_pos.identity();
  K_vel.identity();
  K_rot.identity();
  K_ang.identity();

  K_pos.multiplyScalar(7.0);
  K_vel.multiplyScalar(4.0);
  K_rot.multiplyScalar(190);
  K_ang.multiplyScalar(25);
}

function control(posdes, pos, vel, rot, ang) {
  let accel_des = pos.clone().sub(posdes).applyMatrix3(K_pos).add(vel.clone().applyMatrix3(K_vel));
  accel_des.multiplyScalar(-1);
  accel_des.sub(gravity);

  let xax = new THREE.Vector3();
  let yax = new THREE.Vector3();
  let zax = new THREE.Vector3();

  rot.extractBasis(xax, yax, zax);

  let u = accel_des.dot(zax);

  let zdes = accel_des.normalize();

  let eR = new THREE.Vector3();
  eR.crossVectors(zdes, zax);

  eR.applyMatrix3(K_rot);
  let eang = ang.clone().applyMatrix3(K_ang);
  eR.add(eang)
  eR.multiplyScalar(-1);

  document.getElementById("info").innerHTML = `Desired accel: (${accel_des.x.toFixed(2)}, ${accel_des.y.toFixed(2)}, ${accel_des.z.toFixed(2)}). Thrust: ${u.toFixed(2)}. Ang acc: ${eR.x.toFixed(2)}, ${eR.y.toFixed(2)}, ${eR.z.toFixed(2)}`;

  return [u, eR]
}

function sim(u, angacc) {
  let acc = new THREE.Vector3();

  let xax = new THREE.Vector3();
  let yax = new THREE.Vector3();
  let zax = new THREE.Vector3();
  rot.extractBasis(xax, yax, zax);

  acc.copy(zax)
  acc.multiplyScalar(u);
  acc.add(gravity);

  let scaled_vel = new THREE.Vector3();
  scaled_vel.copy(vel);
  scaled_vel.multiplyScalar(dt);

  pos.add(scaled_vel);
  vel.add(acc.multiplyScalar(dt));

  let quat = new THREE.Quaternion();
  quat.setFromRotationMatrix(rot);
  let angquat = new THREE.Quaternion(dt * ang.x / 2, dt * ang.y / 2, dt *dt *  ang.z / 2, 0);
  let quatderiv = new THREE.Quaternion();
  quatderiv.multiplyQuaternions(quat, angquat);
  quat.x += quatderiv.x;
  quat.y += quatderiv.y;
  quat.z += quatderiv.z;
  quat.w += quatderiv.w;
  quat.normalize();

  rot.makeRotationFromQuaternion(quat);

  ang.add(angacc.clone().multiplyScalar(dt));

  var speed = vel.length();
  document.getElementById("speed").innerHTML = `Speed: ${speed.toFixed(2)} m/s`;
}

function animate() {
  requestAnimationFrame(animate);

  if (model) {
    model.position.set(pos.x, pos.y, pos.z);
    model.rotation.setFromRotationMatrix(rot);
  }

  let uvec = control(posdes, pos, vel, rot, ang);
  sim(uvec[0], uvec[1]);

  controls.update();
  renderer.render(scene, camera);
}
