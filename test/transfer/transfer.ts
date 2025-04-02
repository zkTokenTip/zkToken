import { expect } from "chai";
import paillierBigint from "paillier-bigint";

const snarkjs = require("snarkjs");

import { getRandomBigInt } from "../common";

const transferValue = 50n;

export async function transfer(
  keysA: paillierBigint.KeyPair,
  keysB: paillierBigint.KeyPair,
  zkToken: any,
  userA: any,
  userB: any
) {
  const encryptedBalanceABefor = await zkToken.balanceOf(userA.address);
  const balanceABefore = keysA.privateKey.decrypt(encryptedBalanceABefor);
  const encryptedBalanceBBefor = await zkToken.balanceOf(userB.address);
  const balanceBBefore = keysB.privateKey.decrypt(encryptedBalanceBBefor);

  const { proof, publicSignals } = await createTransferProof(
    keysA,
    keysB,
    encryptedBalanceABefor
  );

  await expect(
    zkToken.connect(userA).transfer(
      userB.address,
      [proof.pi_a[0], proof.pi_a[1]],
      [
        [proof.pi_b[0][1], proof.pi_b[0][0]],
        [proof.pi_b[1][1], proof.pi_b[1][0]],
      ],
      [proof.pi_c[0], proof.pi_c[1]],
      publicSignals
    )
  ).emit(zkToken, "Transfer");

  const encryptedBalanceA = await zkToken.balanceOf(userA.address);
  const balanceA = keysA.privateKey.decrypt(encryptedBalanceA);
  expect(balanceABefore - transferValue).to.be.eq(balanceA);

  const encryptedBalanceB = await zkToken.balanceOf(userB.address);
  const balanceB = keysB.privateKey.decrypt(encryptedBalanceB);
  expect(balanceBBefore + transferValue).to.be.eq(balanceB);
}

export async function createTransferProof(
  senderKeys: paillierBigint.KeyPair,
  receiverKeys: paillierBigint.KeyPair,
  encryptedSenderBalance: bigint
) {
  return await snarkjs.groth16.fullProve(
    getTransferData(senderKeys, receiverKeys, encryptedSenderBalance),
    "test/transfer/transfer.wasm",
    "test/transfer/transfer.zkey"
  );
}

export function getTransferData(
  senderKeys: paillierBigint.KeyPair,
  receiverKeys: paillierBigint.KeyPair,
  encryptedSenderBalance: bigint
) {
  const value = transferValue;
  const sender_rand_r = getRandomBigInt(senderKeys.publicKey.n);
  const receiver_rand_r = getRandomBigInt(receiverKeys.publicKey.n);
  const encryptedSenderValue = senderKeys.publicKey.encrypt(
    senderKeys.publicKey.n - value,
    sender_rand_r
  );
  const encryptedReceiverValue = receiverKeys.publicKey.encrypt(
    value,
    receiver_rand_r
  );
  const senderPubKey = [
    senderKeys.publicKey.g,
    sender_rand_r,
    senderKeys.publicKey.n,
  ];
  const receiverPubKey = [
    receiverKeys.publicKey.g,
    receiver_rand_r,
    receiverKeys.publicKey.n,
  ];
  const senderPrivKey = [
    senderKeys.privateKey.lambda,
    senderKeys.privateKey.mu,
    senderKeys.privateKey.n,
  ];

  return {
    encryptedSenderBalance,
    encryptedSenderValue,
    encryptedReceiverValue,
    value,
    senderPubKey,
    receiverPubKey,
    senderPrivKey,
  };
}
