import * as THREE from './three/build/three.module.js';
import { trace, vee, submat4, rot_from_axang, axang_from_rot } from './mathutils.js';

function roterr(r1, r2) {
  let r2inv = r2.clone();
  r2inv.transpose();

  let ret = new THREE.Matrix4();
  ret.multiplyMatrices(r2inv, r1);
  return ret
}

export function attcontrol_so3_con(rot, rotdes) {
  let Re = roterr(rot, rotdes);
  let ReT = Re.clone();
  ReT.transpose();
  let ret = vee(submat4(Re, ReT));
  ret.multiplyScalar(0.5);
  return ret;
}

export function attcontrol_so3_discon(rot, rotdes) {
  let Re = roterr(rot, rotdes);
  let ReT = Re.clone();
  ReT.transpose();
  let ret = vee(submat4(Re, ReT));
  let fact = 1.0 / Math.sqrt(1 + trace(Re));
  ret.multiplyScalar(fact);
  return ret;
}

export function attcontrol_reduced_con(rot, rotdes) {
  let xax = new THREE.Vector3();
  let yax = new THREE.Vector3();
  let zax = new THREE.Vector3();
  rot.extractBasis(xax, yax, zax);

  let xdes = new THREE.Vector3();
  let ydes = new THREE.Vector3();
  let zdes = new THREE.Vector3();
  rotdes.extractBasis(xdes, ydes, zdes);

  let ax_red = new THREE.Vector3();
  ax_red.crossVectors(zdes, zax);

  let rotinv = rot.clone();
  rotinv.getInverse(rot);

  ax_red.applyMatrix4(rotinv);

  let Re = roterr(rot, rotdes)
  let dotp = zax.dot(zdes);
  let ang_red;
  if (dotp < 1.0 - 1e-6) {
    ang_red = Math.acos(dotp);
    if (Math.abs(ang_red) > 0.000001) {
      ax_red.multiplyScalar(1.0 / Math.sin(ang_red));
    }
  }
  else {
    ax_red.set(1, 0, 0);
    ang_red = 0.0;
  }

  let rot_red = rot_from_axang(ax_red, ang_red);
  let rot_red_inv = rot_red.clone();
  rot_red_inv.getInverse(rot_red);

  let Ryaw = new THREE.Matrix4();
  Ryaw.multiplyMatrices(Re, rot_red_inv);

  let axang_yaw = axang_from_rot(Ryaw);
  let ax_yaw = axang_yaw[0];
  let ang_yaw = axang_yaw[1];
  let rv_yaw = ax_yaw.clone();
  // TODO Why this negative sign?
  rv_yaw.multiplyScalar(-ang_yaw);

  let ret = new THREE.Vector3();
  ret.add(ax_red);
  ret.multiplyScalar(ang_red);
  ret.add(rv_yaw);

  return ret;
}
