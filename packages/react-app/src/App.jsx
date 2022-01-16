import Portis from "@portis/web3";
import WalletConnectProvider from "@walletconnect/web3-provider";
import { Alert, Button, Card, Divider, Input, List, Menu, Row, Col, Space } from "antd";
import "antd/dist/antd.css";
import Authereum from "authereum";
import {
  useBalance,
  useContractLoader,
  useContractReader,
  useGasPrice,
  useOnBlock,
  useUserProviderAndSigner,
} from "eth-hooks";
import { useEventListener } from "eth-hooks/events/useEventListener";
import Fortmatic from "fortmatic";
import React, { useCallback, useEffect, useState } from "react";
import { BrowserRouter, Link, Route, Switch } from "react-router-dom";
import WalletLink from "walletlink";
import Web3Modal from "web3modal";
import "./App.less";
import { Account, AddressInput, Balance, Contract, Header } from "./components";
import { INFURA_ID, NETWORK, NETWORKS } from "./constants";
import { Transactor } from "./helpers";
import Background from "./cc-waves-bg-mobile.jpeg";

// contracts
import externalContracts from "./contracts/external_contracts";
import deployedContracts from "./contracts/hardhat_contracts.json";

const { ethers } = require("ethers");

/// 📡 What chain are your contracts deployed to?
const targetNetwork = NETWORKS.rinkebyArbitrum; // <------- select your target frontend network (localhost, rinkeby, xdai, mainnet)

// 😬 Sorry for all the console logging
const DEBUG = true;
const NETWORKCHECK = true;

const scaffoldEthProvider = navigator.onLine
  ? new ethers.providers.StaticJsonRpcProvider("https://rpc.scaffoldeth.io:48544")
  : null;
const poktMainnetProvider = navigator.onLine
  ? new ethers.providers.StaticJsonRpcProvider(
      "https://eth-mainnet.gateway.pokt.network/v1/lb/611156b4a585a20035148406",
    )
  : null;
const mainnetInfura = navigator.onLine
  ? new ethers.providers.StaticJsonRpcProvider("https://mainnet.infura.io/v3/" + INFURA_ID)
  : null;

const localProviderUrl = targetNetwork.rpcUrl;

const localProviderUrlFromEnv = process.env.REACT_APP_PROVIDER ? process.env.REACT_APP_PROVIDER : localProviderUrl;
if (DEBUG) console.log("🏠 Connecting to provider:", localProviderUrlFromEnv);
const localProvider = new ethers.providers.StaticJsonRpcProvider(localProviderUrlFromEnv);

const blockExplorer = targetNetwork.blockExplorer;

const walletLink = new WalletLink({
  appName: "coinbase",
});

const walletLinkProvider = walletLink.makeWeb3Provider(`https://mainnet.infura.io/v3/${INFURA_ID}`, 1);

const web3Modal = new Web3Modal({
  network: "mainnet", // Optional. If using WalletConnect on xDai, change network to "xdai" and add RPC info below for xDai chain.
  cacheProvider: true, // optional
  theme: "dark",
  providerOptions: {
    walletconnect: {
      package: WalletConnectProvider, // required
      options: {
        bridge: "https://polygon.bridge.walletconnect.org",
        infuraId: INFURA_ID,
        rpc: {
          1: `https://mainnet.infura.io/v3/${INFURA_ID}`, // mainnet // For more WalletConnect providers: https://docs.walletconnect.org/quick-start/dapps/web3-provider#required
          42: `https://kovan.infura.io/v3/${INFURA_ID}`,
          100: "https://dai.poa.network", // xDai
        },
      },
    },
    portis: {
      display: {
        logo: "https://user-images.githubusercontent.com/9419140/128913641-d025bc0c-e059-42de-a57b-422f196867ce.png",
        name: "Portis",
        description: "Connect to Portis App",
      },
      package: Portis,
      options: {
        id: "6255fb2b-58c8-433b-a2c9-62098c05ddc9",
      },
    },
    fortmatic: {
      package: Fortmatic, // required
      options: {
        key: "pk_live_5A7C91B2FC585A17", // required
      },
    },
    "custom-walletlink": {
      display: {
        logo: "https://play-lh.googleusercontent.com/PjoJoG27miSglVBXoXrxBSLveV6e3EeBPpNY55aiUUBM9Q1RCETKCOqdOkX2ZydqVf0",
        name: "Coinbase",
        description: "Connect to Coinbase Wallet (not Coinbase App)",
      },
      package: walletLinkProvider,
      connector: async (provider, _options) => {
        await provider.enable();
        return provider;
      },
    },
    authereum: {
      package: Authereum,
    },
  },
});

function App(props) {
  const mainnetProvider =
    poktMainnetProvider && poktMainnetProvider._isProvider
      ? poktMainnetProvider
      : scaffoldEthProvider && scaffoldEthProvider._network
      ? scaffoldEthProvider
      : mainnetInfura;

  const [injectedProvider, setInjectedProvider] = useState();
  const [address, setAddress] = useState();

  const logoutOfWeb3Modal = async () => {
    await web3Modal.clearCachedProvider();
    if (injectedProvider && injectedProvider.provider && typeof injectedProvider.provider.disconnect == "function") {
      await injectedProvider.provider.disconnect();
    }
    setTimeout(() => {
      window.location.reload();
    }, 1);
  };

  const gasPrice = useGasPrice(targetNetwork, "fast");
  const userProviderAndSigner = useUserProviderAndSigner(injectedProvider, localProvider);
  const userSigner = userProviderAndSigner.signer;

  useEffect(() => {
    async function getAddress() {
      if (userSigner) {
        const newAddress = await userSigner.getAddress();
        setAddress(newAddress);
      }
    }

    getAddress();
  }, [userSigner]);

  const localChainId = localProvider && localProvider._network && localProvider._network.chainId;
  const selectedChainId =
    userSigner && userSigner.provider && userSigner.provider._network && userSigner.provider._network.chainId;

  const tx = Transactor(userSigner, gasPrice);
  const faucetTx = Transactor(localProvider, gasPrice);
  const yourLocalBalance = useBalance(localProvider, address);
  const yourMainnetBalance = useBalance(mainnetProvider, address);
  const contractConfig = { deployedContracts: deployedContracts || {}, externalContracts: externalContracts || {} };
  const readContracts = useContractLoader(localProvider, contractConfig);
  const writeContracts = useContractLoader(userSigner, contractConfig, localChainId);
  const mainnetContracts = useContractLoader(mainnetProvider, contractConfig);
  useOnBlock(mainnetProvider, () => {
    console.log(`⛓ A new mainnet block is here: ${mainnetProvider._lastBlockNumber}`);
  });

  const farmAddress = readContracts && readContracts.Farm && readContracts.Farm.address;

  const farmApproval = useContractReader(readContracts, "CrownToken", "allowance", [address, farmAddress]);
  console.log("🤏 farmApproval", farmApproval);

  const farmTokenBalance = useContractReader(readContracts, "CrownToken", "balanceOf", [farmAddress]);
  console.log("🏵 farmTokenBalance:", farmTokenBalance ? ethers.utils.formatEther(farmTokenBalance) : "...");

  const CrownTokenBalance = useContractReader(readContracts, "CrownToken", "balanceOf", [address]);
  console.log("🏵 CrownTokenBalance:", CrownTokenBalance ? ethers.utils.formatEther(CrownTokenBalance) : "...");

  const UserYield = useContractReader(readContracts, "Farm", "crownYield", [address]);
  console.log("🏵 UserYield:", UserYield ? ethers.utils.formatEther(UserYield) : "...");

  useEffect(() => {
    if (
      DEBUG &&
      mainnetProvider &&
      address &&
      selectedChainId &&
      yourLocalBalance &&
      readContracts &&
      writeContracts &&
      mainnetContracts
    ) {
      console.log("_____________________________________ Crown Capital Web3 _____________________________________");
      console.log("🌎 mainnetProvider", mainnetProvider);
      console.log("🏠 localChainId", localChainId);
      console.log("👩‍💼 selected address:", address);
      console.log("🕵🏻‍♂️ selectedChainId:", selectedChainId);
      console.log("💵 yourLocalBalance", yourLocalBalance ? ethers.utils.formatEther(yourLocalBalance) : "...");
      console.log("💵 yourMainnetBalance", yourMainnetBalance ? ethers.utils.formatEther(yourMainnetBalance) : "...");
      console.log("📝 readContracts", readContracts);
      console.log("🌍 DAI contract on mainnet:", mainnetContracts);
      console.log("🔐 writeContracts", writeContracts);
    }
  }, [
    mainnetProvider,
    address,
    selectedChainId,
    yourLocalBalance,
    yourMainnetBalance,
    readContracts,
    writeContracts,
    mainnetContracts,
  ]);

  let networkDisplay;
  if (NETWORKCHECK && localChainId && selectedChainId && localChainId !== selectedChainId) {
    const networkSelected = NETWORK(selectedChainId);
    const networkLocal = NETWORK(localChainId);
    if (selectedChainId === 1337 && localChainId === 31337) {
      networkDisplay = (
        <div style={{ zIndex: 2, position: "absolute", right: 0, top: 60, padding: 16 }}>
          <Alert
            message="⚠️ Wrong Network ID"
            description={
              <div>
                You have <b>chain id 1337</b> for localhost and you need to change it to <b>31337</b> to work with
                HardHat.
                <div>(MetaMask -&gt; Settings -&gt; Networks -&gt; Chain ID -&gt; 31337)</div>
              </div>
            }
            type="error"
            closable={false}
          />
        </div>
      );
    } else {
      networkDisplay = (
        <div style={{ zIndex: 2, position: "absolute", right: 0, top: 60, padding: 16 }}>
          <Alert
            message="⚠️ Wrong Network"
            description={
              <div>
                You have <b>{networkSelected && networkSelected.name}</b> selected and you need to be on{" "}
                <Button
                  onClick={async () => {
                    const ethereum = window.ethereum;
                    const data = [
                      {
                        chainId: "0x" + targetNetwork.chainId.toString(16),
                        chainName: targetNetwork.name,
                        nativeCurrency: targetNetwork.nativeCurrency,
                        rpcUrls: [targetNetwork.rpcUrl],
                        blockExplorerUrls: [targetNetwork.blockExplorer],
                      },
                    ];

                    let switchTx;
                    try {
                      switchTx = await ethereum.request({
                        method: "wallet_switchEthereumChain",
                        params: [{ chainId: data[0].chainId }],
                      });
                    } catch (switchError) {
                      try {
                        switchTx = await ethereum.request({
                          method: "wallet_addEthereumChain",
                          params: data,
                        });
                      } catch (addError) {
                        // handle "add" error
                      }
                    }

                    if (switchTx) {
                      console.log(switchTx);
                    }
                  }}
                >
                  <b>{networkLocal && networkLocal.name}</b>
                </Button>
              </div>
            }
            type="error"
            closable={false}
          />
        </div>
      );
    }
  } else {
    networkDisplay = (
      <div style={{ zIndex: -1, position: "absolute", right: 154, top: 28, padding: 16, color: targetNetwork.color }}>
        {targetNetwork.name}
      </div>
    );
  }

  const loadWeb3Modal = useCallback(async () => {
    const provider = await web3Modal.connect();
    setInjectedProvider(new ethers.providers.Web3Provider(provider));

    provider.on("chainChanged", chainId => {
      setInjectedProvider(new ethers.providers.Web3Provider(provider));
    });

    provider.on("accountsChanged", () => {
      setInjectedProvider(new ethers.providers.Web3Provider(provider));
    });

    provider.on("disconnect", (code, reason) => {
      logoutOfWeb3Modal();
    });
  }, [setInjectedProvider]);

  useEffect(() => {
    if (web3Modal.cachedProvider) {
      loadWeb3Modal();
    }
  }, [loadWeb3Modal]);

  const [route, setRoute] = useState();
  useEffect(() => {
    setRoute(window.location.pathname);
  }, [setRoute]);

  let faucetHint = "";
  const [faucetClicked, setFaucetClicked] = useState(false);
  if (
    !faucetClicked &&
    localProvider &&
    localProvider._network &&
    localProvider._network.chainId === 31337 &&
    yourLocalBalance &&
    ethers.utils.formatEther(yourLocalBalance) <= 0
  ) {
    faucetHint = (
      <div style={{ padding: 16 }}>
        <Button
          type="primary"
          onClick={() => {
            faucetTx({
              to: address,
              value: ethers.utils.parseEther("1"),
            });
            setFaucetClicked(true);
          }}
        >
          💰 Grab funds from the faucet ⛽️
        </Button>
      </div>
    );
  }

  const stakeTokenEvents = useEventListener(readContracts, "Farm", "Stake", localProvider, 1);
  console.log("📟 stakeTokensEvents:", stakeTokenEvents);
  const unstakeTokenEvents = useEventListener(readContracts, "Farm", "Unstake", localProvider, 1);
  console.log("📟 unstakeTokensEvents:", unstakeTokenEvents);

  const [tokenBuyAmount, setTokenBuyAmount] = useState();
  const [amountToStake, setAmountToStake] = useState();
  const [amountToUnstake, setAmountToUnstake] = useState();
  const [isStakeAmountApproved, setIsStakeAmountApproved] = useState();

  useEffect(() => {
    console.log("amountToStake", amountToStake);
    const amountToStakeBN = amountToStake && ethers.utils.parseEther("" + amountToStake);
    console.log("amountToStakeBN", amountToStakeBN);
    setIsStakeAmountApproved(farmApproval && amountToStake && farmApproval.gte(amountToStakeBN));
  }, [amountToStake, readContracts]);
  console.log("isStakeAmountApproved", isStakeAmountApproved);

  const ethCostToPurchaseTokens =
    tokenBuyAmount && tokensPerEth && ethers.utils.parseEther("" + tokenBuyAmount / parseFloat(tokensPerEth));
  console.log("ethCostToPurchaseTokens:", ethCostToPurchaseTokens);

  const [tokenSendToAddress, setTokenSendToAddress] = useState();
  const [tokenSendAmount, setTokenSendAmount] = useState();

  const [buying, setBuying] = useState();
  const [claiming, setClaiming] = useState();

  const tabList = [
    {
      key: "stake",
      tab: "Stake",
    },
    {
      key: "unstake",
      tab: "Unstake",
    },
  ];

  const contentList = {
    stake: (
      <div>
        <div style={{ padding: 8 }}>
          <Input
            style={{ textAlign: "center" }}
            placeholder={"number of tokens to stake"}
            value={amountToStake}
            onChange={e => {
              setAmountToStake(e.target.value);
            }}
          />
        </div>
        <div style={{ padding: 8 }}>
          <Button
            type={"primary"}
            loading={buying}
            onClick={async () => {
              setBuying(true);
              await tx(
                writeContracts.CrownToken.approve(
                  readContracts.Farm.address,
                  amountToStake && ethers.utils.parseEther(amountToStake),
                ),
              );
              setBuying(false);
            }}
          >
            Approve Tokens
          </Button>
        </div>

        <div style={{ padding: 8 }}>
          <Button
            type={"primary"}
            loading={buying}
            onClick={async () => {
              setBuying(true);
              await tx(writeContracts.Farm.stake(amountToStake && ethers.utils.parseEther(amountToStake)));
              setBuying(false);
            }}
          >
            Stake Tokens
          </Button>
        </div>
      </div>
    ),
    unstake: (
      <div>
        <div style={{ padding: 8 }}>
          <Input
            style={{ textAlign: "center" }}
            placeholder={"amount of tokens to unstake"}
            value={amountToUnstake}
            onChange={e => {
              setAmountToUnstake(e.target.value);
            }}
          />
        </div>
        <div style={{ padding: 8 }}>
          <Button
            type={"primary"}
            loading={buying}
            onClick={async () => {
              setBuying(true);
              await tx(writeContracts.Farm.unstake(amountToUnstake && ethers.utils.parseEther(amountToUnstake)));
              setBuying(false);
            }}
          >
            Stop Staking
          </Button>
        </div>
      </div>
    ),
  };

  const StakeCard = () => {
    const [stakeTabKey, setStakeTabKey] = useState("stake");
    const onStakeTabChange = key => {
      setStakeTabKey(key);
    };

    return (
      <Card
        title="Staking"
        tabList={tabList}
        activeTabKey={stakeTabKey}
        onTabChange={key => {
          onStakeTabChange(key);
        }}
      >
        {contentList[stakeTabKey]}
      </Card>
    );
  };

  return (
    <div className="App" style={{ backgroundImage: "url(" + Background + ")" }}>
      <Header />
      {networkDisplay}
      <BrowserRouter>
        <Menu style={{ textAlign: "center" }} selectedKeys={[route]} mode="horizontal">
          <Menu.Item key="/">
            <Link
              onClick={() => {
                setRoute("/");
              }}
              to="/"
            >
              Crown Farm
            </Link>
          </Menu.Item>
          <Menu.Item key="/contracts">
            <Link
              onClick={() => {
                setRoute("/contracts");
              }}
              to="/contracts"
            >
              Debug Contracts
            </Link>
          </Menu.Item>
        </Menu>

        <Switch>
          <Route exact path="/">
            <div className="site-card-wrapper">
              <Row gutter={16}>
                <Col span={8}>
                  <Card title="Crown Tokens Owned">
                    <div style={{ padding: 8 }}>
                      <Balance balance={CrownTokenBalance} fontSize={64} />
                    </div>
                  </Card>
                </Col>

                <Col span={8}>
                  <StakeCard />
                </Col>

                <Col span={8}>
                  <Card title="Yield Generated">
                    <div style={{ padding: 8 }}>
                      <Balance balance={UserYield} fontSize={64} />
                    </div>

                    <div style={{ padding: 8 }}>
                      <Button
                        type={"primary"}
                        loading={claiming}
                        onClick={async () => {
                          setClaiming(true);
                          await tx(writeContracts.Farm.updateYield());
                          setClaiming(false);
                        }}
                      >
                        Update
                      </Button>

                      <Button
                        type={"primary"}
                        loading={claiming}
                        onClick={async () => {
                          setClaiming(true);
                          await tx(writeContracts.Farm.withdrawYield());
                          setClaiming(false);
                        }}
                      >
                        Claim
                      </Button>
                    </div>
                  </Card>
                </Col>
              </Row>

              <div style={{ padding: 8, marginTop: 32 }}>
                <div>Farm Token Balance:</div>
                <Balance balance={farmTokenBalance} fontSize={64} />
              </div>

              <div style={{ width: 500, margin: "auto", marginTop: 64 }}>
                <div>Stake Token Events:</div>
                <List
                  dataSource={stakeTokenEvents}
                  renderItem={item => {
                    return (
                      <List.Item key={item.blockNumber + item.blockHash}>
                        {item.args[0]} staked
                        <Balance balance={item.args[1]} />
                        Tokens
                      </List.Item>
                    );
                  }}
                />
              </div>

              <div style={{ width: 500, margin: "auto", marginTop: 64 }}>
                <div>Unstake Token Events:</div>
                <List
                  dataSource={unstakeTokenEvents}
                  renderItem={item => {
                    return (
                      <List.Item key={item.blockNumber + item.blockHash}>
                        {item.args[0]} unstaked
                        <Balance balance={item.args[1]} />
                        Tokens
                      </List.Item>
                    );
                  }}
                />
              </div>
            </div>
          </Route>
          <Route path="/contracts">
            <Contract
              name="CrownToken"
              signer={userSigner}
              provider={localProvider}
              address={address}
              blockExplorer={blockExplorer}
              contractConfig={contractConfig}
            />
            <Contract
              name="Vault"
              signer={userSigner}
              provider={localProvider}
              address={address}
              blockExplorer={blockExplorer}
              contractConfig={contractConfig}
            />
            <Contract
              name="Farm"
              signer={userSigner}
              provider={localProvider}
              address={address}
              blockExplorer={blockExplorer}
              contractConfig={contractConfig}
            />
          </Route>
        </Switch>
      </BrowserRouter>

      <div style={{ position: "fixed", textAlign: "right", right: 0, top: 0, padding: 10 }}>
        <Account web3Modal={web3Modal} loadWeb3Modal={loadWeb3Modal} logoutOfWeb3Modal={logoutOfWeb3Modal} />
        {faucetHint}
      </div>
    </div>
  );
}

export default App;
