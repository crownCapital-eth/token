# Crown Capital Web3

This repo contains the Crown Capital contracts and front end.
The contracts will be deployed on the Arbitrum network. There are three contracts
1. CrownToken.sol
2. Vault.sol
3. Farm.sol
   The requirements of each of these contracts are as follows:

**CrownToken.sol**
- The token shall be an ERC20 standard.
- The token shall be called "CROWN"
- The token shall be hard-capped at 100,000,000 Tokens.
- The token shall be 100% premined.
- 75% of the token supply shall go into a time-released vault.
- 25% of the token supply shall go to the DAO multisig.
- The token shall be utilizable in DAO governance (e.g. Snapshot).

**Vault.sol**
- The vault shall initially contain 75% of the token supply.
- The vault shall emit 100% tokens in the vault linearly from time zero to five years.
- The vault shall not allow any changes to the emission schedule.
- The vault owner shall be able to emit to a configurable number of farms (addresses).
- The vault owner shall be able to add or remove farms at any time.

**Farm.sol**
- The farm shall pay in $CROWN.
- The farm shall accept $CROWN for staking.
- The farm shall pay addresses who stake $CROWN based on their percent of the total stake.
- The farm shall allow stakers to unstake at any time.
- The farm shall allow stakers to claim yield at any time.


On deployment, 100% of the staking power will go towards the single token Crown staking farm. Tokens
will then be used to initialize a Sushi LP farm against USDC. Once this token is created `Farm.sol`
will be deployed again using the sushi LP token address as the staking token.
The `vault.sol` contract will then be updated to send 60% of emissions to the Sushi LP token farm
and 40% of emissions to the single token Crown farm.

---

### Install

```bash
yarn install
```

---

### Run Locally

Open three terminals

`yarn chain` (hardhat backend)

`yarn start` (react app frontend)

`yarn deploy` (to compile, deploy, and publish your contracts to the frontend)

> http://localhost:3000

> Rerun `yarn deploy --reset` to deploy new contracts to the frontend.


---

### Deploy to testnet

`yarn deploy`


### Package for production

`yarn build`

---
### Verify contract on Etherscan

`yarn verify --network your_network`

---
