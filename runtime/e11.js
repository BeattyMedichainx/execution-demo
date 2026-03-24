/**
 * 11/11 Execution Arithmetic (EA-11)
 * Minimal reference implementation (non-proprietary subset)
 */

export class E11Number {
  constructor(value, trust, policy, proof, confidence) {
    this.value = value;
    this.trust = trust;
    this.policy = policy;
    this.proof = proof;
    this.confidence = confidence;
  }
}

export function valid(a, b) {
  return a.policy === b.policy && a.trust > 0 && b.trust > 0;
}

export function add(a, b) {
  if (!valid(a, b)) return "DENIED";

  return new E11Number(
    a.value + b.value,
    Math.min(a.trust, b.trust),
    a.policy,
    `proof(${a.proof}|${b.proof}|ADD)`,
    Math.min(a.confidence, b.confidence)
  );
}
