import { expect } from "chai";
import paillierBigint from "paillier-bigint";

const snarkjs = require("snarkjs");

import { getRandomBigInt } from "../common";

const mintValue = 1000n;

export function getMintData(keys: paillierBigint.KeyPair) {
  const value = mintValue;
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

export async function mint(
  keys: paillierBigint.KeyPair,
  zkToken: any,
  user: any
) {
  let { proof, publicSignals } = await createMintProof(keys);

  await expect(
    await zkToken.connect(user).mint(
      user.address,
      [proof.pi_a[0], proof.pi_a[1]],
      [
        [proof.pi_b[0][1], proof.pi_b[0][0]],
        [proof.pi_b[1][1], proof.pi_b[1][0]],
      ],
      [proof.pi_c[0], proof.pi_c[1]],
      publicSignals
    )
  ).emit(zkToken, "Mint");

  const encryptedBalance = await zkToken.balanceOf(user.address);
  const balance = keys.privateKey.decrypt(encryptedBalance);

  expect(balance).to.be.eq(mintValue);
}
