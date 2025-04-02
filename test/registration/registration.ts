import { expect } from "chai";
import paillierBigint from "paillier-bigint";

const snarkjs = require("snarkjs");

import { initBalance, getRandomBigInt } from "../common";

export async function registration(
  keys: paillierBigint.KeyPair,
  zkToken: any,
  user: any
) {
  let { proof, publicSignals } = await createRegistrationProof(keys);

  await expect(
    await zkToken.connect(user).registration(
      [proof.pi_a[0], proof.pi_a[1]],
      [
        [proof.pi_b[0][1], proof.pi_b[0][0]],
        [proof.pi_b[1][1], proof.pi_b[1][0]],
      ],
      [proof.pi_c[0], proof.pi_c[1]],
      publicSignals
    )
  ).emit(zkToken, "Registration");

  const encryptedBalance = await zkToken.balanceOf(user.address);
  const balance = keys.privateKey.decrypt(encryptedBalance);
  const pubKey = await zkToken.getPubKey(user.address);

  expect(balance).to.be.eq(initBalance);
  expect(pubKey[0]).to.be.eq(keys.publicKey.g);
  expect(pubKey[1]).to.be.eq(keys.publicKey.n);
  expect(pubKey[2]).to.be.eq(keys.publicKey._n2);
}

export function getRegistrationData(keys: paillierBigint.KeyPair) {
  const balance = initBalance;
  const rand_r = getRandomBigInt(keys.publicKey.n);
  const encryptedBalance = keys.publicKey.encrypt(balance, rand_r);
  const pubKey = [keys.publicKey.g, rand_r, keys.publicKey.n];

  return { encryptedBalance, balance, pubKey };
}

export function getRegistrationDataFromPub(pub: paillierBigint.PublicKey) {
  const balance = initBalance;
  const rand_r = getRandomBigInt(pub.n);
  const encryptedBalance = pub.encrypt(balance, rand_r);
  const pubKey = [pub.g, rand_r, pub.n];

  return { encryptedBalance, balance, pubKey };
}

export async function createRegistrationProof(keys: paillierBigint.KeyPair) {
  return await snarkjs.groth16.fullProve(
    getRegistrationData(keys),
    "test/registration/registration.wasm",
    "test/registration/registration.zkey"
  );
}
