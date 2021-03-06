import * as THREE from './three/build/three.module.js';
import { GLTFLoader } from './three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from './three/examples/jsm/controls/OrbitControls.js';

import { rot_from_z_yaw_zyx, normang } from './mathutils.js';
import {
         attcontrol_so3_con,
         attcontrol_so3_discon,
         attcontrol_reduced_con
       } from './rotmetrics.js';

var camera, scene, renderer;
var geometry, material, mesh;
var controls;

const followbox = document.getElementById('followbox');
const infoelem = document.getElementById("info");
const speedelem = document.getElementById("speed");

var model;
var goal_marker;

var K_pos = new THREE.Matrix3();
var K_vel = new THREE.Matrix3();
var K_rot = new THREE.Matrix3();
var K_ang = new THREE.Matrix3();
K_pos.identity();
K_vel.identity();
K_rot.identity();
K_ang.identity();

// Desired State
var posdes;
var yawdes = 0.0;
// Actual State
var pos = new THREE.Vector3();
var vel, ang;
var rot;

var att_type = 0;

const e1 = new THREE.Vector3(1, 0, 0);
const e2 = new THREE.Vector3(0, 1, 0);
const e3 = new THREE.Vector3(0, 0, 1);

var gravity;
const dt = 0.02;

// Desired position cannot go beyond this.
const fence_size = 5.0;
// Will be reset if past this and Return to Origin pressed.
const bound_size = 10.0;

var raycaster = new THREE.Raycaster();
var mouse = new THREE.Vector2();

const homeheight = 2.0;
const homepos = new THREE.Vector3(0, 0, homeheight);
const startpos = new THREE.Vector3(1.0, 1.0, homeheight);

function defset(s, val) {
  eval(s + ' = ' + val);
}

function posgainset(name, val) {
  K_pos.elements[0] = val;
  K_pos.elements[4] = val;
  K_pos.elements[8] = val;
}
function velgainset(name, val) {
  K_vel.elements[0] = val;
  K_vel.elements[4] = val;
  K_vel.elements[8] = val;
}
function anggainset(name, val) {
  K_rot.elements[0] = val;
  K_rot.elements[4] = val;
}
function angvelgainset(name, val) {
  K_ang.elements[0] = val;
  K_ang.elements[4] = val;
}
function yawgainset(name, val) {
  K_rot.elements[8] = val;
}
function yawvelgainset(name, val) {
  K_ang.elements[8] = val;
}

var move_amount, upmove_amount, turn_amount, posyaw_step_size, diag_step_size;
const gmag = 9.81;
const settings_meta = [
  ["position gain", 7.0, posgainset, "", 0, 20],
  ["velocity gain", 4.0, velgainset, "", 0, 20],
  ["roll/pitch gain", 190.0, anggainset, "", 0, 400],
  ["ang. vel. gain", 25.0, angvelgainset, "", 0, 100],
  ["yaw gain", 30.0, yawgainset, "", 0, 100],
  ["yaw vel. gain", 10.0, yawvelgainset, "", 0, 50],
  ["horiz. move distance", 1.0, defset, "move_amount", 0.05, fence_size],
  ["vert. move distance", 0.5, defset, "upmove_amount", 0.05, fence_size],
  ["turn amount", Math.PI / 4.0, defset, "turn_amount", 0.01, Math.PI],
  ["pos yaw step size", 3.0, defset, "posyaw_step_size", 1, fence_size],
  ["diag step size", 4.0, defset, "diag_step_size", 1, fence_size],
];

function getsettingid(i) {
  return "setting" + i;
}

function create_settings() {
  let settingsdiv = document.getElementById("settingsdiv");
  if (!settingsdiv) {
    return;
  }

  let newhtml = "";

  for (let i = 0; i < settings_meta.length; i++) {
    let name = settings_meta[i][0];
    let defval = settings_meta[i][1];
    let f_set = settings_meta[i][2];
    let varname = settings_meta[i][3];

    let minval = settings_meta[i][4];
    let maxval = settings_meta[i][5];

    let step = (maxval - minval) / 20;

    let entryid = getsettingid(i);
    newhtml += name + "<br>"
    newhtml += `<div style="display: inline; justify-content: center"><input type="range" class="settingslider" min="${minval}" max="${maxval}" step="${step}" id="range${entryid}"/>`;
    newhtml += `<input type="text" style="text-align: right; width: 2.5em" id="${entryid}"/></div>`;
  }

  settingsdiv.innerHTML += newhtml;
}

function set_default_settings() {
  for (let i = 0; i < settings_meta.length; i++) {
    let defval = settings_meta[i][1];
    let f_set = settings_meta[i][2];
    let varname = settings_meta[i][3];

    let entryid = getsettingid(i);
    let entry = document.getElementById(entryid);
    let range = document.getElementById("range" + entryid);

    if (entry) {
      entry.value = defval;
    }
    if (range) {
      range.value = defval;
    }

    f_set(varname, defval);

    if (range) {
      range.addEventListener('change', function() { f_set(varname, range.value); });
      if (entry) {
        entry.addEventListener('change', function() { f_set(varname, entry.value); range.value = entry.value});
        range.addEventListener('input', function() { entry.value = range.value});
      }
    }
  }
}

create_settings();

window.onload = function() {
  set_default_settings();
};

document.addEventListener('mouseup', onMouseClick, false);
document.addEventListener("keydown", onDocumentKeyDown, false);

const control_sel = document.getElementById("controltype");
if (control_sel) {
  control_sel.addEventListener("change", changeControl);
}

init();
animate();

function destohome() {
  yawdes = 0.0;
  setposdes(homepos.clone());
}

function return_to_origin_but() {
  if (is_blown_up() || out_of_bounds()) {
    reset_to_home();
  }
  else {
    destohome();
  }
}

const camfuncs = [
  ['homebut', return_to_origin_but],
  ['resetcambut', resetcam],
  ['sidecambut', sidecam],
  ['diagcambut', diagcam],
  ['topcambut', topcam],
  ['sidecamorthobut', sidecamortho],
  ['resetdefbut', set_default_settings],
];

for (let i = 0; i < camfuncs.length; i++) {
  const elem = document.getElementById(camfuncs[i][0]);
  if (elem) {
    elem.onclick = camfuncs[i][1];
  }
}

if (followbox) {
  followbox.onchange = function() {
    if (followbox.checked) {
      controls.target = pos;
    }
    else {
      controls.target = homepos.clone();
    }
  };
}

function is_blown_up() {
  return (
    isNaN(pos.x) ||
    isNaN(pos.y) ||
    isNaN(pos.z) ||
    isNaN(vel.x) ||
    isNaN(vel.y) ||
    isNaN(vel.z) ||
    rot.elements.some((x) => isNaN(x)) ||
    isNaN(ang.x) ||
    isNaN(ang.y) ||
    isNaN(ang.z) ||
    fblin_isnan()
  );
}

function out_of_bounds() {
  return (
    Math.abs(pos.x) > bound_size ||
    Math.abs(pos.y) > bound_size ||
    Math.abs(pos.z) > bound_size
  );
}

function reset_to_home() {
  pos.set(homepos.x, homepos.y, homepos.z);
  vel.set(0, 0, 0);
  rot.identity();
  ang.set(0, 0, 0);

  fblin_reset();

  destohome();
}

const step1 = document.getElementById('step1');
const step2 = document.getElementById('step2');
const step3 = document.getElementById('step3');

// Quick Direction Change
if (step1) {
  step1.onclick =
  function on1() {
    reset_to_home();
    rot.makeRotationX(-Math.PI / 2 + 0.1);
    let newposdes = posdes.clone();
    newposdes.y -= 5.0;
    setposdes(newposdes);
  };
}

// Pos Yaw Step
if (step2) {
  step2.onclick =
  function on2() {
    reset_to_home();
    yawdes += Math.PI - 0.05;
    let newposdes = posdes.clone();
    newposdes.y += posyaw_step_size;
    setposdes(newposdes);
  };
}

// Diagonal Step
if (step3) {
  step3.onclick =
  function on3() {
    reset_to_home();
    let newposdes = posdes.clone();
    newposdes.x += diag_step_size;
    newposdes.y += diag_step_size;
    setposdes(newposdes);
  };
}

function onDocumentKeyDown(event) {
  var keycode = event.which;
  let newdes = new THREE.Vector3(posdes.x, posdes.y, posdes.z);

  let used = true;

  let dpos = new THREE.Vector3(0, 0, 0);
  if (keycode == 87) { // W
    dpos.x += move_amount;
  }
  else if (keycode == 83) { // S
    dpos.x -= move_amount;
  }
  else if (keycode == 65) { // A
    dpos.y += move_amount;
  }
  else if (keycode == 68) { // D
    dpos.y -= move_amount;
  }

  else if (keycode == 69) { // E
    dpos.y -= move_amount;
    dpos.x += move_amount;
  }
  else if (keycode == 81) { // Q
    dpos.y += move_amount;
    dpos.x += move_amount;
  }

  else if (keycode == 38) { // up
    dpos.z += upmove_amount;
  }
  else if (keycode == 40) { // down
    dpos.z -= upmove_amount;
  }

  else if (keycode == 37) { // left
    yawdes += turn_amount;
  }
  else if (keycode == 39) { //right
    yawdes -= turn_amount;
  }
  else {
    used = false;
  }

  // Hack to prevent vertical scrolling
  if (keycode == 38 || keycode == 40) {
    event.preventDefault();
  }

  let yawrot = new THREE.Matrix4();
  yawrot.makeRotationZ(yawdes);
  dpos.applyMatrix4(yawrot);

  posdes.add(dpos);
  setposdes(posdes);
};

function onMouseClick(event) {
  if (event.button != 2) {
    return;
  }

  event.preventDefault();
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x =  ((event.clientX - rect.left) / canvas.clientWidth)  * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / canvas.clientHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  raycaster.ray.closestPointToPoint(posdes, posdes);
  setposdes(posdes);
}

function changeControl() {
  let s = control_sel.value;
  if (s == "cso3") {
    att_type = 0;
  }
  if (s == "dso3") {
    att_type = 1;
  }
  if (s == "redatt") {
    att_type = 2;
  }
  if (s == "fblin") {
    att_type = 3;
  }
}

function setposdes(vec) {
  vec.x = Math.min(fence_size, Math.max(-fence_size, vec.x));
  vec.y = Math.min(fence_size, Math.max(-fence_size, vec.y));
  vec.z = Math.min(fence_size, Math.max(-fence_size, vec.z));

  posdes = vec;
  if (goal_marker) {
    goal_marker.position.set(vec.x, vec.y, vec.z);
    goal_marker.rotation.set(0, 0, yawdes);
  }
}

function resetcamcontrol(target) {
  controls = new OrbitControls(camera, renderer.domElement);
  controls.update();
  controls.target.set(target.x, target.y, target.z);
  controls.enablePan = false;

  if (followbox) {
    followbox.checked = false;
  }
}
function perspectivecam(fov) {
  camera = new THREE.PerspectiveCamera(fov, canvas.clientWidth / canvas.clientHeight, 0.01, 1000);
}
function orthocam(height) {
  const width = height * (canvas.clientWidth / canvas.clientHeight);
  camera = new THREE.OrthographicCamera(-width / 2, width / 2, height / 2, -height / 2, 0.01, 1000);
}
function resetcam() {
  perspectivecam(60);
  camera.position.set(-5.5, 0, 5.5);
  camera.lookAt(0, 0, homeheight);
  resetcamcontrol(homepos);
}
function sidecam() {
  perspectivecam(60);
  camera.position.set(0, posyaw_step_size + 2.5, homeheight + 0.75);
  resetcamcontrol(homepos);
}
function diagcam() {
  perspectivecam(40);
  camera.position.set(-1.5, -1.5, homeheight + 0.50);
  resetcamcontrol(homepos);
}
function topcam() {
  orthocam(10.0);
  camera.position.set(0, 0, 6.0);
  camera.up.set(1, 0, 0);
  camera.lookAt(0, 0, homeheight);
  resetcamcontrol(homepos);
}
function sidecamortho() {
  orthocam(5.0);
  camera.position.set(0, 5.0, homeheight);
  camera.lookAt(0, 0, homeheight);
  resetcamcontrol(homepos);
}

var canvas;

function init() {
  THREE.Object3D.DefaultUp = new THREE.Vector3(0, 0, 1);

  canvas = document.getElementById("sim");
  renderer = new THREE.WebGLRenderer( { canvas : canvas, antialias: true } );
  renderer.setClearColor( 0xffffff, 1 );

  const width = canvas.clientWidth;
  const height = canvas.clientHeight;

  resetcam();

  scene = new THREE.Scene();

  let loader = new GLTFLoader();

  loader.load('models/quad.glb', function ( gltf ) {
    model = gltf.scene;
    model.scale.set(0.1, 0.1, 0.1);

    scene.add(model);
  }, undefined, function (error) {
    console.error(error);
  });

  const size = 10;
  const divisions = 10;

  let grid = new THREE.GridHelper(size, divisions);
  grid.rotateX(Math.PI / 2);
  scene.add(grid);

  let axesHelper = new THREE.AxesHelper(1);
  axesHelper.material.linewidth = 7;
  axesHelper.position.z = 0.05;
  scene.add(axesHelper);

  loader.load('models/goalmarker.glb', function ( gltf ) {
    goal_marker = gltf.scene;
    goal_marker.scale.set(0.05, 0.05, 0.05);
    goal_marker.position.set(posdes.x, posdes.y, posdes.z);
    goal_marker.rotation.set(0, 0, yawdes);

    scene.add(goal_marker);
  }, undefined, function (error) {
    console.error(error);
  });

  const geo = new THREE.PlaneGeometry(10, 10, 32);
  const mat = new THREE.MeshBasicMaterial({color:0xfafafa, side: THREE.DoubleSide, transparent: true, opacity: 0.75});
  const plane = new THREE.Mesh(geo, mat);
  scene.add(plane);

  let light1 = new THREE.PointLight(0xffffff, 1, 0, 0);
  light1.position.set(0, 0, 10.0);
  let light2 = new THREE.AmbientLight(0xffffff);
  let light3 = new THREE.DirectionalLight(0xffffff, 1.0, 100);
  light3.position.set(0, 0, 10);
  scene.add(light1);
  scene.add(light2);
  scene.add(light3);

  initsim();
}

function initsim() {
  gravity = new THREE.Vector3(0, 0, -gmag);

  pos = new THREE.Vector3();
  vel = new THREE.Vector3();
  ang = new THREE.Vector3();

  rot = new THREE.Matrix4();
  rot.identity();

  setposdes(startpos);
}

let fblin_u;
let fblin_udot;

fblin_reset();

function fblin_reset() {
  fblin_u = gmag;
  fblin_udot = 0.0;
}

function fblin_isnan() {
  return isNaN(fblin_u) || isNaN(fblin_udot);
}

function fblin(posdes, yawdes, pos, vel, rot, ang) {
  const u = fblin_u;
  const udot = fblin_udot;

  let k1 = K_pos.clone();
  k1.multiplyScalar(K_rot.elements[0]);
  let k2 = K_vel.clone();
  k2.multiplyScalar(K_rot.elements[0]);

  let snap_ff = pos.clone().sub(posdes).applyMatrix3(k1).add(vel.clone().applyMatrix3(k2));
  snap_ff.multiplyScalar(-1);

  let rotinv = rot.clone();
  rotinv.getInverse(rot);

  let snap_ff_B = snap_ff.clone();
  snap_ff_B.applyMatrix4(rotinv);

  let grav_B = gravity.clone();
  grav_B.applyMatrix4(rotinv);

  let aa = new THREE.Vector3();
  let k3 = K_rot.elements[0];
  let k4 = K_ang.elements[0];
  aa.x = (-snap_ff_B.y + k3 * grav_B.y - 2 * udot * ang.x) / u - k4 * ang.x + ang.z * ang.y;
  aa.y = ( snap_ff_B.x - k3 * grav_B.x - 2 * udot * ang.y) / u - k4 * ang.y - ang.z * ang.x;

  let uddot = snap_ff_B.z - k3 * (u + grav_B.z) - k4 * udot + u * (ang.x * ang.x + ang.y * ang.y);

  fblin_u += udot * dt;
  fblin_udot += uddot * dt;

  // TODO, Use actual FBLin yaw controller.
  let euler = new THREE.Euler();
  euler.setFromRotationMatrix(rot);
  aa.z = -K_rot.elements[8] * normang(euler.z - yawdes) - K_ang.elements[8] * ang.z;

  if (infoelem) {
    infoelem.innerHTML = `Thrust: ${u.toFixed(2)}. Thrust Vel: ${udot.toFixed(2)}. Thrust Acc: ${uddot.toFixed(2)}. Ang acc: ${aa.x.toFixed(2)}, ${aa.y.toFixed(2)}, ${aa.z.toFixed(2)}`;
  }

  return [fblin_u, aa];
}

function control(posdes, yawdes, pos, vel, rot, ang) {
  // Position Control
  let accel_des = pos.clone().sub(posdes).applyMatrix3(K_pos).add(vel.clone().applyMatrix3(K_vel));
  accel_des.multiplyScalar(-1);
  accel_des.sub(gravity);

  let zax = e3.clone();
  zax.applyMatrix4(rot);

  let u = accel_des.dot(zax);

  let zdes = accel_des.normalize();

  let rotdes = rot_from_z_yaw_zyx(zdes, yawdes);

  // Attitude Control
  let eR;
  if (att_type == 0) {
    eR = attcontrol_so3_con(rot, rotdes);
  }
  if (att_type == 1) {
    eR = attcontrol_so3_discon(rot, rotdes);
  }
  if (att_type == 2) {
    eR = attcontrol_reduced_con(rot, rotdes);
  }

  eR.applyMatrix3(K_rot);
  let eang = ang.clone().applyMatrix3(K_ang);
  eR.add(eang)
  eR.multiplyScalar(-1);

  if (infoelem) {
    infoelem.innerHTML = `Desired accel: (${accel_des.x.toFixed(2)}, ${accel_des.y.toFixed(2)}, ${accel_des.z.toFixed(2)}). Thrust: ${u.toFixed(2)}. Ang acc: ${eR.x.toFixed(2)}, ${eR.y.toFixed(2)}, ${eR.z.toFixed(2)}`;
  }

  return [u, eR];
}

function sim(u, angacc) {
  if (u < 0) {
    u = 0;
  }
  if (u > 100) {
    u = 100;
  }

  angacc.clampScalar(-5000, 5000);

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
  let angquat = new THREE.Quaternion(
                  dt * ang.x / 2,
                  dt * ang.y / 2,
                  dt * ang.z / 2,
                0);
  let quatderiv = new THREE.Quaternion();
  quatderiv.multiplyQuaternions(quat, angquat);
  quat.x += quatderiv.x;
  quat.y += quatderiv.y;
  quat.z += quatderiv.z;
  quat.w += quatderiv.w;
  quat.normalize();

  rot.makeRotationFromQuaternion(quat);

  ang.add(angacc.clone().multiplyScalar(dt));

  if (speedelem) {
    var speed = vel.length();
    speedelem.innerHTML = `Speed: ${speed.toFixed(2)} m/s`;
  }
}

function handle_resize() {
  if (canvas.clientWidth !== canvas.width || canvas.clientHeight !== canvas.height) {
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);

    // For perspectives
    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    // For orthos
    camera.right = camera.top * camera.aspect;
    camera.left = camera.bottom * camera.aspect;

    camera.updateProjectionMatrix();
  }
}

function animate() {
  requestAnimationFrame(animate);

  if (model) {
    model.position.set(pos.x, pos.y, pos.z);
    model.rotation.setFromRotationMatrix(rot);
  }

  let control_f;
  if (att_type < 3) {
    control_f = control;
  }
  else {
    control_f = fblin
  }

  let uvec = control_f(posdes, yawdes, pos, vel, rot, ang);
  sim(uvec[0], uvec[1]);

  controls.update();

  handle_resize();
  renderer.render(scene, camera);
}
