// @ts-nocheck
// Marty's animation clips: copied from the Voxel Explorer 3D Character Studio export (idle, walk, run, jump, attack,
// wave, celebrate, scout). Each clip is a pure function of time that fills in joint angles; main.ts applies them to his rig.
import * as THREE from 'three';

export type ClipId = 'idle' | 'walk' | 'run' | 'jump' | 'attack' | 'wave' | 'celebrate' | 'scout';

export interface TargetPose {
  rootY: number;
  rootRotY: number;
  pelvisY: number;
  pelvisZ: number;
  pelvisRotX: number;
  pelvisRotY: number;
  pelvisRotZ: number;
  torsoRotX: number;
  torsoRotY: number;
  torsoRotZ: number;
  torsoScaleY: number;
  headRotX: number;
  headRotY: number;
  headRotZ: number;
  leftShoulderX: number;
  leftShoulderY: number;
  leftShoulderZ: number;
  leftElbowX: number;
  leftHandZ: number;
  rightShoulderX: number;
  rightShoulderY: number;
  rightShoulderZ: number;
  rightElbowX: number;
  rightHandZ: number;
  leftHipX: number;
  leftHipY: number;
  leftHipZ: number;
  leftKneeX: number;
  leftBootX: number;
  rightHipX: number;
  rightHipY: number;
  rightHipZ: number;
  rightKneeX: number;
  rightBootX: number;
  leftBrowY: number;
  leftBrowRotZ: number;
  rightBrowY: number;
  rightBrowRotZ: number;
}

const _target: TargetPose = {
  rootY: 0,
  rootRotY: 0,
  pelvisY: 1.32,
  pelvisZ: 0,
  pelvisRotX: 0,
  pelvisRotY: 0,
  pelvisRotZ: 0,
  torsoRotX: 0,
  torsoRotY: 0,
  torsoRotZ: 0,
  torsoScaleY: 1,
  headRotX: 0,
  headRotY: 0,
  headRotZ: 0,
  leftShoulderX: 0,
  leftShoulderY: 0,
  leftShoulderZ: 0.14,
  leftElbowX: 0,
  leftHandZ: 0,
  rightShoulderX: 0,
  rightShoulderY: 0,
  rightShoulderZ: -0.14,
  rightElbowX: 0,
  rightHandZ: 0,
  leftHipX: 0,
  leftHipY: 0,
  leftHipZ: 0.055,
  leftKneeX: 0,
  leftBootX: 0,
  rightHipX: 0,
  rightHipY: 0,
  rightHipZ: -0.055,
  rightKneeX: 0,
  rightBootX: 0,
  leftBrowY: 0.545,
  leftBrowRotZ: 0,
  rightBrowY: 0.545,
  rightBrowRotZ: 0,
};

function resetTargetPose() {
  _target.rootY = 0;
  _target.rootRotY = 0;
  _target.pelvisY = 1.32;
  _target.pelvisZ = 0;
  _target.pelvisRotX = 0;
  _target.pelvisRotY = 0;
  _target.pelvisRotZ = 0;
  _target.torsoRotX = 0;
  _target.torsoRotY = 0;
  _target.torsoRotZ = 0;
  _target.torsoScaleY = 1;
  _target.headRotX = 0;
  _target.headRotY = 0;
  _target.headRotZ = 0;
  _target.leftShoulderX = 0;
  _target.leftShoulderY = 0;
  _target.leftShoulderZ = 0.14;
  _target.leftElbowX = -0.06;
  _target.leftHandZ = 0;
  _target.rightShoulderX = 0;
  _target.rightShoulderY = 0;
  _target.rightShoulderZ = -0.14;
  _target.rightElbowX = -0.06;
  _target.rightHandZ = 0;
  _target.leftHipX = 0;
  _target.leftHipY = 0;
  _target.leftHipZ = 0.055;
  _target.leftKneeX = 0;
  _target.leftBootX = 0;
  _target.rightHipX = 0;
  _target.rightHipY = 0;
  _target.rightHipZ = -0.055;
  _target.rightKneeX = 0;
  _target.rightBootX = 0;
  _target.leftBrowY = 0.545;
  _target.leftBrowRotZ = -0.03;
  _target.rightBrowY = 0.545;
  _target.rightBrowRotZ = 0.03;
}

const equippedProp: string = 'none';   // the studio's torch prop is not part of Marty

export function clipPose(clipId: ClipId, animTime: number): TargetPose {
  resetTargetPose();
  switch (clipId) {
    case 'idle': {
      const breath = Math.sin(animTime * 2.1);
      const slowDrift = Math.sin(animTime * 0.85);
      _target.pelvisY = 1.32 - Math.abs(breath) * 0.012;
      _target.pelvisRotY = slowDrift * 0.04;
      _target.torsoRotX = breath * 0.025;
      _target.torsoScaleY = 1 + breath * 0.014;
      _target.headRotY = Math.sin(animTime * 0.65) * 0.12;
      _target.headRotX = -breath * 0.025 + Math.cos(animTime * 0.5) * 0.03;
      _target.headRotZ = Math.sin(animTime * 0.45) * 0.025;

      _target.leftShoulderZ = 0.14 + (breath + 1) * 0.018;
      _target.rightShoulderZ = -0.14 - (breath + 1) * 0.018;
      _target.leftShoulderX = Math.sin(animTime * 1.05) * 0.03;
      _target.rightShoulderX = -Math.sin(animTime * 1.05) * 0.03;

      if (equippedProp === 'torch') {
        // Hold torch forward and slightly up in right hand
        _target.rightShoulderX = -0.65 + breath * 0.03;
        _target.rightElbowX = -0.45;
        _target.rightShoulderZ = -0.18;
      }
      break;
    }

    case 'walk': {
      const phase = animTime * 4.8;
      const sinP = Math.sin(phase);
      const cosP = Math.cos(phase);
      const bounce = Math.abs(Math.sin(phase));

      _target.pelvisY = 1.30 + bounce * 0.055;
      _target.pelvisRotY = -sinP * 0.12;
      _target.pelvisRotZ = cosP * 0.035;
      _target.torsoRotX = 0.06 + (1 - bounce) * 0.03;
      _target.torsoRotY = sinP * 0.14;
      _target.headRotY = -sinP * 0.06;
      _target.headRotX = -0.03 + Math.sin(phase * 2) * 0.025;

      // Leg stride
      const stride = 0.58;
      _target.leftHipX = sinP * stride;
      _target.rightHipX = -sinP * stride;
      _target.leftHipZ = 0.035;
      _target.rightHipZ = -0.035;

      // Knee bends when leg swings forward from back
      _target.leftKneeX = Math.max(0, -cosP) * 0.52 + 0.06;
      _target.rightKneeX = Math.max(0, cosP) * 0.52 + 0.06;

      // Boot ankle roll
      _target.leftBootX = -sinP * 0.18;
      _target.rightBootX = sinP * 0.18;

      // Opposite arm swing
      _target.leftShoulderX = -sinP * 0.48;
      _target.leftElbowX = -0.18 - Math.max(0, -sinP) * 0.25;
      _target.leftShoulderZ = 0.12;

      if (equippedProp === 'torch') {
        _target.rightShoulderX = -0.72 + sinP * 0.08;
        _target.rightElbowX = -0.42;
      } else {
        _target.rightShoulderX = sinP * 0.48;
        _target.rightElbowX = -0.18 - Math.max(0, sinP) * 0.25;
      }
      _target.rightShoulderZ = -0.12;
      break;
    }

    case 'run': {
      const phase = animTime * 8.2;
      const sinP = Math.sin(phase);
      const cosP = Math.cos(phase);
      const flight = Math.sin(phase * 2);

      _target.pelvisY = 1.26 + Math.max(0, flight) * 0.12 + Math.abs(sinP) * 0.04;
      _target.pelvisRotX = 0.14;
      _target.pelvisRotY = -sinP * 0.20;
      _target.pelvisRotZ = cosP * 0.05;

      _target.torsoRotX = 0.18 + Math.cos(phase * 2) * 0.04;
      _target.torsoRotY = sinP * 0.24;
      _target.headRotX = -0.18;
      _target.headRotY = -sinP * 0.10;

      // High-knee sprint stride
      const stride = 0.92;
      _target.leftHipX = sinP * stride;
      _target.rightHipX = -sinP * stride;
      _target.leftHipZ = 0.03;
      _target.rightHipZ = -0.03;

      _target.leftKneeX = Math.max(0, -cosP * 0.95 + 0.25);
      _target.rightKneeX = Math.max(0, cosP * 0.95 + 0.25);
      _target.leftBootX = -sinP * 0.25;
      _target.rightBootX = sinP * 0.25;

      // Pumping arms
      _target.leftShoulderX = -sinP * 0.85;
      _target.leftElbowX = -0.65 - Math.max(0, -sinP) * 0.35;
      _target.leftShoulderZ = 0.15;

      _target.rightShoulderX = sinP * 0.85;
      _target.rightElbowX = -0.65 - Math.max(0, sinP) * 0.35;
      _target.rightShoulderZ = -0.15;

      // Determined brows
      _target.leftBrowRotZ = -0.12;
      _target.rightBrowRotZ = 0.12;
      _target.leftBrowY = 0.532;
      _target.rightBrowY = 0.532;
      break;
    }

    case 'jump': {
      // 2.0-second cycle: 0..0.4 crouch, 0.4..1.25 airborne arc, 1.25..1.65 land absorb, 1.65..2.0 recover
      const cycle = animTime % 2.0;
      if (cycle < 0.4) {
        // Crouch anticipation
        const t = THREE.MathUtils.smoothstep(cycle, 0, 0.4);
        _target.pelvisY = 1.32 - t * 0.28;
        _target.torsoRotX = t * 0.28;
        _target.headRotX = -t * 0.20;
        _target.leftHipX = -t * 0.45;
        _target.rightHipX = -t * 0.45;
        _target.leftKneeX = t * 0.78;
        _target.rightKneeX = t * 0.78;
        _target.leftBootX = -t * 0.32;
        _target.rightBootX = -t * 0.32;
        _target.leftShoulderX = t * 0.55;
        _target.rightShoulderX = t * 0.55;
        _target.leftElbowX = -t * 0.35;
        _target.rightElbowX = -t * 0.35;
      } else if (cycle < 1.25) {
        // Airborne arc
        const u = (cycle - 0.4) / 0.85; // 0..1
        const arc = 4 * u * (1 - u); // Parabolic peak = 1 at u = 0.5
        _target.rootY = arc * 0.78;
        _target.pelvisY = 1.32;
        _target.torsoRotX = -0.10 * arc + 0.12 * (1 - arc);
        _target.headRotX = -0.12 * arc;

        // Asymmetric athletic knee tuck in air
        _target.leftHipX = -0.58 * arc;
        _target.leftKneeX = 0.85 * arc;
        _target.rightHipX = 0.25 * arc;
        _target.rightKneeX = 0.45 * arc;

        // Arms reach up dynamically
        _target.leftShoulderX = -2.1 * arc;
        _target.rightShoulderX = -2.1 * arc;
        _target.leftShoulderZ = 0.32 * arc + 0.14;
        _target.rightShoulderZ = -0.32 * arc - 0.14;
        _target.leftElbowX = -0.25;
        _target.rightElbowX = -0.25;

        _target.leftBrowY = 0.562;
        _target.rightBrowY = 0.562;
      } else if (cycle < 1.65) {
        // Cushioned landing
        const u = (cycle - 1.25) / 0.4;
        const dip = Math.sin(u * Math.PI);
        _target.pelvisY = 1.32 - dip * 0.24;
        _target.torsoRotX = dip * 0.24;
        _target.leftHipX = -dip * 0.40;
        _target.rightHipX = -dip * 0.40;
        _target.leftKneeX = dip * 0.70;
        _target.rightKneeX = dip * 0.70;
        _target.leftBootX = -dip * 0.28;
        _target.rightBootX = -dip * 0.28;
        _target.leftShoulderZ = 0.14 + dip * 0.22;
        _target.rightShoulderZ = -0.14 - dip * 0.22;
      }
      break;
    }

    case 'attack': {
      // 1.5s combo cycle: Windup (0..0.45), Slash Strike (0.45..0.75), Hold/Follow-through (0.75..1.15), Recover (1.15..1.5)
      const cycle = animTime % 1.5;
      if (cycle < 0.45) {
        const t = THREE.MathUtils.smoothstep(cycle, 0, 0.45);
        _target.pelvisY = 1.32 - t * 0.08;
        _target.pelvisRotY = -t * 0.32;
        _target.torsoRotY = -t * 0.45;
        _target.torsoRotX = -t * 0.12;
        _target.headRotY = t * 0.38;

        // Right arm winds up high behind shoulder
        _target.rightShoulderX = -t * 2.25;
        _target.rightShoulderZ = -0.14 - t * 0.35;
        _target.rightElbowX = -t * 0.55;

        // Left arm counter-balances forward
        _target.leftShoulderX = -t * 0.55;
        _target.leftShoulderZ = 0.28;
        _target.leftElbowX = -0.45;

        // Wide combat step
        _target.leftHipX = -t * 0.25;
        _target.leftKneeX = t * 0.32;
        _target.rightHipX = t * 0.28;
        _target.rightKneeX = t * 0.20;
      } else if (cycle < 0.85) {
        const t = THREE.MathUtils.smoothstep(cycle, 0.45, 0.68);
        _target.pelvisY = 1.24 - t * 0.06;
        _target.pelvisRotY = THREE.MathUtils.lerp(-0.32, 0.34, t);
        _target.torsoRotY = THREE.MathUtils.lerp(-0.45, 0.52, t);
        _target.torsoRotX = THREE.MathUtils.lerp(-0.12, 0.24, t);
        _target.headRotY = THREE.MathUtils.lerp(0.38, -0.28, t);

        // Powerful downward diagonal swing
        _target.rightShoulderX = THREE.MathUtils.lerp(-2.25, -0.35, t);
        _target.rightShoulderY = t * 0.42;
        _target.rightShoulderZ = THREE.MathUtils.lerp(-0.49, -0.08, t);
        _target.rightElbowX = THREE.MathUtils.lerp(-0.55, -0.12, t);

        // Left arm pulls back
        _target.leftShoulderX = THREE.MathUtils.lerp(-0.55, 0.42, t);
        _target.leftElbowX = -0.5;

        _target.leftHipX = -0.28;
        _target.leftKneeX = 0.38;
        _target.rightHipX = 0.30;
        _target.rightKneeX = 0.22;

        // Fierce eyebrows
        _target.leftBrowRotZ = -0.16;
        _target.rightBrowRotZ = 0.16;
        _target.leftBrowY = 0.528;
        _target.rightBrowY = 0.528;
      } else {
        const t = THREE.MathUtils.smoothstep(cycle, 0.85, 1.5);
        _target.pelvisY = THREE.MathUtils.lerp(1.18, 1.32, t);
        _target.pelvisRotY = THREE.MathUtils.lerp(0.34, 0, t);
        _target.torsoRotY = THREE.MathUtils.lerp(0.52, 0, t);
        _target.torsoRotX = THREE.MathUtils.lerp(0.24, 0, t);
        _target.headRotY = THREE.MathUtils.lerp(-0.28, 0, t);
        _target.rightShoulderX = THREE.MathUtils.lerp(-0.35, 0, t);
        _target.rightShoulderY = THREE.MathUtils.lerp(0.42, 0, t);
        _target.leftShoulderX = THREE.MathUtils.lerp(0.42, 0, t);
        _target.leftHipX = THREE.MathUtils.lerp(-0.28, 0, t);
        _target.leftKneeX = THREE.MathUtils.lerp(0.38, 0, t);
        _target.rightHipX = THREE.MathUtils.lerp(0.30, 0, t);
        _target.rightKneeX = THREE.MathUtils.lerp(0.22, 0, t);
      }
      break;
    }

    case 'wave': {
      const waveOsc = Math.sin(animTime * 7.5);
      const breath = Math.sin(animTime * 2.4);

      _target.pelvisY = 1.32 + breath * 0.015;
      _target.pelvisRotZ = -0.03;
      _target.torsoRotZ = 0.05;
      _target.torsoRotY = 0.12;
      _target.headRotZ = -0.09 + Math.sin(animTime * 3.75) * 0.03;
      _target.headRotY = 0.08;
      _target.headRotX = -0.05;

      // Raise character's right arm (-X, viewer's left) high and wave
      _target.rightShoulderX = -2.35;
      _target.rightShoulderZ = -0.45 + waveOsc * 0.22;
      _target.rightElbowX = -0.28;
      _target.rightHandZ = waveOsc * 0.28;

      // Relaxed left hand on hip area
      _target.leftShoulderZ = 0.26;
      _target.leftShoulderX = 0.12;
      _target.leftElbowX = -0.55;

      // Friendly raised eyebrows
      _target.leftBrowY = 0.566;
      _target.rightBrowY = 0.566;
      _target.leftBrowRotZ = 0.05;
      _target.rightBrowRotZ = -0.05;
      break;
    }

    case 'celebrate': {
      const beat = animTime * 6.5;
      const sinB = Math.sin(beat);
      const cosB = Math.cos(beat);
      const hop = Math.abs(sinB);

      _target.rootY = Math.max(0, sinB) * 0.14;
      _target.pelvisY = 1.28 + hop * 0.06;
      _target.pelvisRotZ = cosB * 0.08;
      _target.pelvisRotY = cosB * 0.18;
      _target.torsoRotY = -cosB * 0.22;
      _target.torsoRotZ = -cosB * 0.06;
      _target.headRotZ = cosB * 0.10;
      _target.headRotX = -0.08 + hop * 0.08;

      // Alternating high celebratory fist pumps
      _target.leftShoulderX = -2.2 + sinB * 0.45;
      _target.leftShoulderZ = 0.35;
      _target.leftElbowX = -0.35 - Math.max(0, sinB) * 0.3;

      _target.rightShoulderX = -2.2 - sinB * 0.45;
      _target.rightShoulderZ = -0.35;
      _target.rightElbowX = -0.35 - Math.max(0, -sinB) * 0.3;

      // Bouncing knees
      _target.leftHipX = -0.15 + Math.max(0, cosB) * -0.25;
      _target.leftKneeX = 0.25 + Math.max(0, cosB) * 0.35;
      _target.rightHipX = -0.15 + Math.max(0, -cosB) * -0.25;
      _target.rightKneeX = 0.25 + Math.max(0, -cosB) * 0.35;

      _target.leftBrowY = 0.565;
      _target.rightBrowY = 0.565;
      break;
    }

    case 'scout': {
      const scan = Math.sin(animTime * 1.4);
      _target.pelvisY = 1.30;
      _target.torsoRotY = scan * 0.25;
      _target.torsoRotX = 0.04;
      _target.headRotY = scan * 0.38;
      _target.headRotX = -0.06;

      // Left hand raised to visor/brow to shield sun while scouting
      _target.leftShoulderX = -1.65;
      _target.leftShoulderZ = 0.22;
      _target.leftShoulderY = -0.35;
      _target.leftElbowX = -1.25;

      // Right hand resting on belt
      _target.rightShoulderZ = -0.30;
      _target.rightShoulderX = 0.18;
      _target.rightElbowX = -0.65;

      // One inquisitive eyebrow raised
      _target.leftBrowY = 0.562;
      _target.rightBrowY = 0.535;
      _target.rightBrowRotZ = 0.10;
      break;
    }
  }
  return _target;
}
