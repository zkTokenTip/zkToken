import { expect } from "chai";
import paillierBigint from "paillier-bigint";

const snarkjs = require("snarkjs");

import { getRandomBigInt } from "../common";

export function getMintData(keys: paillierBigint.KeyPair) {
  const value = 10n;
  const rand_r = getRandomBigInt(keys.publicKey.n);
  const encryptedValue = keys.publicKey.encrypt(value, rand_r);
  const receiverPubKey = [keys.publicKey.g, rand_r, keys.publicKey.n];

  return { encryptedValue, value, receiverPubKey };
}

export async function createMintProof(keys: paillierBigint.KeyPair) {
  return await snarkjs.groth16.fullProve(
    getMintData(keys),
    "test/mint/mint.wasm",
    "test/mint/mint.zkey"
  );
}

export function mint() {}
