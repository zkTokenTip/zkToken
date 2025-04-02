import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import paillierBigint from "paillier-bigint";
import hre from "hardhat";
import { expect } from "chai";

const fs = require("fs");
const snarkjs = require("snarkjs");
// import snarkjs from "snarkjs";

import { mint, createMintProof } from "./mint/mint";
import { transfer, createTransferProof } from "./transfer/transfer";
import {
  registration,
  createRegistrationProof,
} from "./registration/registration";

describe("zkToken", function () {
  async function deployFixture() {
    const [userA, userB] = await hre.ethers.getSigners();

    const keysA = await paillierBigint.generateRandomKeys(32);
    const keysB = await paillierBigint.generateRandomKeys(32);

    const registrationVerifier = await hre.ethers.deployContract(
      "RegistrationVerifier"
    );

    const mintVerifier = await hre.ethers.deployContract("MintVerifier");

    const transferVerifier = await hre.ethers.deployContract(
      "TransferVerifier"
    );

    const zkToken = await hre.ethers.deployContract("zkToken", [
      await transferVerifier.getAddress(),
      await registrationVerifier.getAddress(),
      await registrationVerifier.getAddress(),
    ]);

    return {
      keysA,
      keysB,
      registrationVerifier,
      mintVerifier,
      transferVerifier,
      zkToken,
      userA,
      userB,
    };
  }

  describe("Verifiers", function () {
    it("Verification Registration Proof", async function () {
      const { keysA, registrationVerifier } = await loadFixture(deployFixture);

      const { proof, publicSignals } = await createRegistrationProof(keysA);

      const flag = await registrationVerifier.verifyProof(
        [proof.pi_a[0], proof.pi_a[1]],
        [
          [proof.pi_b[0][1], proof.pi_b[0][0]],
          [proof.pi_b[1][1], proof.pi_b[1][0]],
        ],
        [proof.pi_c[0], proof.pi_c[1]],
        publicSignals
      );

      expect(flag).to.be.true;
    });

    it("Verification Mint Proof", async function () {
      const { keysA, mintVerifier } = await loadFixture(deployFixture);

      const { proof, publicSignals } = await createMintProof(keysA);

      const flag = await mintVerifier.verifyProof(
        [proof.pi_a[0], proof.pi_a[1]],
        [
          [proof.pi_b[0][1], proof.pi_b[0][0]],
          [proof.pi_b[1][1], proof.pi_b[1][0]],
        ],
        [proof.pi_c[0], proof.pi_c[1]],
        publicSignals
      );

      expect(flag).to.be.true;
    });

    it("Verification Transfer Proof", async function () {
      const { keysA, keysB, transferVerifier } = await loadFixture(
        deployFixture
      );

      const { proof, publicSignals } = await createTransferProof(keysA, keysB);

      const flag = await transferVerifier.verifyProof(
        [proof.pi_a[0], proof.pi_a[1]],
        [
          [proof.pi_b[0][1], proof.pi_b[0][0]],
          [proof.pi_b[1][1], proof.pi_b[1][0]],
        ],
        [proof.pi_c[0], proof.pi_c[1]],
        publicSignals
      );

      expect(flag).to.be.true;
    });
  });

  describe("snarkjs", function () {
    it("Create Registration Proof", async function () {
      const { keysA } = await loadFixture(deployFixture);

      const { proof, publicSignals } = await createRegistrationProof(keysA);

      const vKey = JSON.parse(
        fs.readFileSync("test/registration/verification_key.json")
      );

      const res = await snarkjs.groth16.verify(vKey, publicSignals, proof);

      expect(res).to.be.true;
    });

    it("Create Mint Proof", async function () {
      const { keysA, keysB } = await loadFixture(deployFixture);

      const { proof, publicSignals } = await createMintProof(keysA);

      const vKey = JSON.parse(
        fs.readFileSync("test/mint/verification_key.json")
      );

      const res = await snarkjs.groth16.verify(vKey, publicSignals, proof);

      expect(res).to.be.true;
    });

    it("Create Transfer Proof", async function () {
      const { keysA, keysB } = await loadFixture(deployFixture);

      const { proof, publicSignals } = await createTransferProof(keysA, keysB);

      const vKey = JSON.parse(
        fs.readFileSync("test/transfer/verification_key.json")
      );

      const res = await snarkjs.groth16.verify(vKey, publicSignals, proof);

      expect(res).to.be.true;
    });
  });

  describe("zkToken tests", function () {
    it("zkToken deployed", async function () {
      const { zkToken } = await loadFixture(deployFixture);
      expect(await zkToken.name()).to.eq("zkToken");
      expect(await zkToken.symbol()).to.eq("ZKT");
      expect(await zkToken.decimals()).to.eq(0);
    });

    it("Registration in zkToken", async function () {
      const { keysA, zkToken, userA } = await loadFixture(deployFixture);

      await registration(keysA, zkToken, userA);
    });

    it.skip("Transfer in zkToken", async function () {
      const { keysA, keysB, zkToken, userA, userB } = await loadFixture(
        deployFixture
      );

      await registration(keysA, zkToken, userA);
      await registration(keysB, zkToken, userB);

      await transfer(keysA, keysB, zkToken, userA, userB);
    });
  });
});
