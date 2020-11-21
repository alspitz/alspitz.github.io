import * as THREE from './three/build/three.module.js';

// All here assume rotaiton matrices are Matrix4s.

const twopi = 2 * Math.PI;

export function normang(ang) {
  return ((((ang + Math.PI) % twopi) + twopi) % twopi) - Math.PI;
}

export function trace(rot) {
  return rot.elements[0] + rot.elements[5] + rot.elements[10];
}

export function axang_from_rot(rot) {
  let ax = new THREE.Vector3();
  ax.x = rot.elements[9] - rot.elements[6];
  ax.y = rot.elements[2] - rot.elements[8];
  ax.z = rot.elements[4] - rot.elements[1];

  if (trace(rot) > 2.9999) {
    return [new THREE.Vector3(0, 0, 1.0), 0.0];
  }

  let ang = Math.acos((trace(rot) - 1) / 2.0);

  ax.multiplyScalar(1.0 / (2 * Math.sin(ang)));

  return [ax, ang];
}

export function rot_from_axang(u, ang) {
  let rot = new THREE.Matrix4();
  let cs = Math.cos(ang);
  let sn = Math.sin(ang);
  let t0 = 1 - cs;
  let t1 = u.x * u.y * t0;
  let t2 = u.x * u.z * t0;
  let t3 = u.y * u.z * t0;
  rot.set(
    cs + u.x * u.x * t0, t1 - u.z * sn, t2 + u.y * sn, 0,
    t1 + u.z * sn, cs + u.y * u.y * t0, t3 - u.x * sn, 0,
    t2 - u.y * sn, t3 + u.x * sn, cs + u.z * u.z * t0, 0,
    0, 0, 0, 1
  );

  return rot;
}

export function rot_from_z_yaw_zyx(z, yaw) {
  z.normalize();

  let y_c = new THREE.Vector3(-Math.sin(yaw), Math.cos(yaw), 0.0);
  let x_b = new THREE.Vector3();
  x_b.crossVectors(y_c, z);
  x_b.normalize();
  let y_b = new THREE.Vector3();
  y_b.crossVectors(z, x_b);

  let rot = new THREE.Matrix4();
  rot.makeBasis(x_b, y_b, z);
  return rot;
}

export function vee(rot) {
  // Assuming rot is a Matrix4
  return new THREE.Vector3(-rot.elements[9], rot.elements[8], -rot.elements[4]);
}

export function submat4(r1, r2) {
  let ret = new THREE.Matrix4();
  ret.set(
    r1.elements[0] - r2.elements[0],
    r1.elements[4] - r2.elements[4],
    r1.elements[8] - r2.elements[8],
    r1.elements[12] - r2.elements[12],
    r1.elements[1] - r2.elements[1],
    r1.elements[5] - r2.elements[5],
    r1.elements[9] - r2.elements[9],
    r1.elements[13] - r2.elements[13],
    r1.elements[2] - r2.elements[2],
    r1.elements[6] - r2.elements[6],
    r1.elements[10] - r2.elements[10],
    r1.elements[14] - r2.elements[14],
    r1.elements[3] - r2.elements[3],
    r1.elements[7] - r2.elements[7],
    r1.elements[11] - r2.elements[11],
    r1.elements[15] - r2.elements[15]
  );
  return ret;
}
