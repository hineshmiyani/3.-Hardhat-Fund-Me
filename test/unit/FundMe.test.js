const { deployments, getNamedAccounts, ethers } = require("hardhat");
const { assert, expect } = require("chai");
const { developmentChains } = require("../../helper-hardhat-config");

/********* Testing Fund Me : Unit Test *********/

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("FundMe", function () {
      let fundMe;
      let deployer;
      let mockV3Aggregator;
      const sendValue = ethers.utils.parseUnits("1"); // 1 ETH
      beforeEach(async function () {
        // deploy our fundMe contracts
        // using hardhat deploy
        // const accounts = await ethers.getSigners();
        // const accountZero = accounts[0];
        deployer = (await getNamedAccounts()).deployer;
        await deployments.fixture(["all"]);
        fundMe = await ethers.getContract("FundMe", deployer);
        mockV3Aggregator = await ethers.getContract(
          "MockV3Aggregator",
          deployer
        );
      });

      describe("constructor", function () {
        it("Set aggregator address conrrectly", async function () {
          let response = await fundMe.getPriceFeed();
          assert.equal(response, mockV3Aggregator.address);
        });
      });

      describe("fund", function () {
        it("Fails if you don't send enough ETH", async function () {
          await expect(fundMe.fund()).to.be.revertedWith(
            "You need to spend more ETH!"
          );
        });

        it("Update the amount funded data structure", async function () {
          await fundMe.fund({ value: sendValue });
          const response = await fundMe.getAddressTOoAmountFunded(deployer);
          assert.equal(response.toString(), sendValue.toString());
        });

        it("Adds funder to array of getFunder", async function () {
          await fundMe.fund({ value: sendValue });
          const funder = await fundMe.getFunder(0);
          assert.equal(funder, deployer);
        });
      });

      describe("withdraw", function () {
        beforeEach(async function () {
          await fundMe.fund({ value: sendValue });
        });

        // Withdraw single funder
        it("Withdraw ETH from a single funder", async function () {
          // Arrange
          const startingFundMeBalance = await fundMe.provider.getBalance(
            fundMe.address
          );
          const staringDeployerBalance = await fundMe.provider.getBalance(
            deployer
          );

          // Act
          const transectionResponse = await fundMe.withdraw();
          const transectionReceipt = await transectionResponse.wait(1);

          // gasCost
          const { gasUsed, effectiveGasPrice } = transectionReceipt;
          const gasCost = gasUsed.mul(effectiveGasPrice); // mul => multiplication bigNumber

          const endingFundMeBalance = await fundMe.provider.getBalance(
            fundMe.address
          );
          const endingDeployerBalance = await fundMe.provider.getBalance(
            deployer
          );

          // Assert
          assert.equal(endingFundMeBalance, 0);
          assert.equal(
            startingFundMeBalance.add(staringDeployerBalance).toString(),
            endingDeployerBalance.add(gasCost).toString()
          );
        });

        // Cheap withdraw single funder
        it("Cheap Withdraw ETH from a single funder", async function () {
          // Arrange
          const startingFundMeBalance = await fundMe.provider.getBalance(
            fundMe.address
          );
          const staringDeployerBalance = await fundMe.provider.getBalance(
            deployer
          );

          // Act
          const transectionResponse = await fundMe.cheaperWithdraw();
          const transectionReceipt = await transectionResponse.wait(1);

          // gasCost
          const { gasUsed, effectiveGasPrice } = transectionReceipt;
          const gasCost = gasUsed.mul(effectiveGasPrice); // mul => multiplication bigNumber

          const endingFundMeBalance = await fundMe.provider.getBalance(
            fundMe.address
          );
          const endingDeployerBalance = await fundMe.provider.getBalance(
            deployer
          );

          // Assert
          assert.equal(endingFundMeBalance, 0);
          assert.equal(
            startingFundMeBalance.add(staringDeployerBalance).toString(),
            endingDeployerBalance.add(gasCost).toString()
          );
        });

        // withdraw with multiple funders
        it("allows us to withdraw with multiple getFunder", async function () {
          // Arrange
          const accounts = await ethers.getSigners();
          // here i start with 1, becuase account[0] address in deployer address
          for (let i = 1; i < 6; i++) {
            const fundMeConnectedContract = await fundMe.connect(accounts[i]);
            await fundMeConnectedContract.fund({ value: sendValue });
          }

          const startingFundMeBalance = await fundMe.provider.getBalance(
            fundMe.address
          );
          const startingDeployerBalance = await fundMe.provider.getBalance(
            deployer
          );

          // Act
          const transectionResponse = await fundMe.withdraw();
          const transectionReceipt = await transectionResponse.wait(1);
          const { gasUsed, effectiveGasPrice } = transectionReceipt;
          const gasCost = gasUsed.mul(effectiveGasPrice);

          // Assert

          const endingFundMeBalance = await fundMe.provider.getBalance(
            fundMe.address
          );
          const endingDeployerBalance = await fundMe.provider.getBalance(
            deployer
          );

          assert.equal(endingFundMeBalance, 0);
          assert.equal(
            startingFundMeBalance.add(startingDeployerBalance).toString(),
            endingDeployerBalance.add(gasCost).toString()
          );

          // Make sure that the getFunder are reset properly
          await expect(fundMe.getFunder(0)).to.be.reverted;

          for (let i = 1; i < 6; i++) {
            assert.equal(
              await fundMe.getAddressTOoAmountFunded(accounts[i].address),
              0
            );
          }
        });

        // only allows owner to withdraw
        it("Only allows the owner to withdraw", async function () {
          const accounts = await ethers.getSigners();
          const attacker = accounts[1];
          const attackerConnectedContract = await fundMe.connect(attacker);
          await expect(attackerConnectedContract.withdraw()).to.be.revertedWith(
            "FundMe__NotOwner"
          );
        });

        // cheaper withdraw
        it("cheaperWithdraw Testing...", async function () {
          // Arrange
          const accounts = await ethers.getSigners();
          // here i start with 1, becuase account[0] address in deployer address
          for (let i = 1; i < 6; i++) {
            const fundMeConnectedContract = await fundMe.connect(accounts[i]);
            await fundMeConnectedContract.fund({ value: sendValue });
          }

          const startingFundMeBalance = await fundMe.provider.getBalance(
            fundMe.address
          );
          const startingDeployerBalance = await fundMe.provider.getBalance(
            deployer
          );

          // Act
          const transectionResponse = await fundMe.cheaperWithdraw();
          const transectionReceipt = await transectionResponse.wait(1);
          const { gasUsed, effectiveGasPrice } = transectionReceipt;
          const gasCost = gasUsed.mul(effectiveGasPrice);

          // Assert
          const endingFundMeBalance = await fundMe.provider.getBalance(
            fundMe.address
          );
          const endingDeployerBalance = await fundMe.provider.getBalance(
            deployer
          );

          assert.equal(endingFundMeBalance, 0);
          assert.equal(
            startingFundMeBalance.add(startingDeployerBalance).toString(),
            endingDeployerBalance.add(gasCost).toString()
          );

          // Make sure that the getFunder are reset properly
          await expect(fundMe.getFunder(0)).to.be.reverted;

          for (let i = 1; i < 6; i++) {
            assert.equal(
              await fundMe.getAddressTOoAmountFunded(accounts[i].address),
              0
            );
          }
        });
      });
    });
