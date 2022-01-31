import { Button, Col, Layout, Row, Space } from "antd";
import "antd/dist/antd.css";
import { useContractLoader, useGasPrice, useUserProviderAndSigner } from "eth-hooks";
import React, { useEffect, useState } from "react";
import { CrownBalance, NavBar, NetworkDisplay, Staking, Yield } from "./components";
import { NETWORKS } from "./constants";
import { Transactor } from "./helpers";
import externalContracts from "./contracts/external_contracts";
import deployedContracts from "./contracts/hardhat_contracts.json";
import Wallet from "./components/Wallet";
import Title from "antd/es/typography/Title";
import WalletSetup from "./helpers/WalletSetup";

const { ethers } = require("ethers");
const { Header, Footer, Content } = Layout;

const targetNetwork = NETWORKS.rinkebyArbitrum;
const localProviderUrl = targetNetwork.rpcUrl;
const localProviderUrlFromEnv = process.env.REACT_APP_PROVIDER ? process.env.REACT_APP_PROVIDER : localProviderUrl;
const localProvider = new ethers.providers.StaticJsonRpcProvider(localProviderUrlFromEnv);
const web3Modal = WalletSetup();

function App() {
  const [injectedProvider, setInjectedProvider] = useState();
  const [address, setAddress] = useState();

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
  const tx = Transactor(userSigner, useGasPrice(targetNetwork, "fast"));
  const contractConfig = { deployedContracts: deployedContracts || {}, externalContracts: externalContracts || {} };
  const readContracts = useContractLoader(localProvider, contractConfig);
  const writeContracts = useContractLoader(userSigner, contractConfig, localChainId);

  return (
    <Layout>
      <Header className={"navbar w-nav"}>
        <NavBar />
        <Wallet web3Modal={web3Modal} injectedProvider={injectedProvider} setInjectedProvider={setInjectedProvider} />
      </Header>
      <Content>
        <Title level={2}>Crown Capital Staking</Title>
        <Space>
          <Button type={"primary"} shape="round" onClick={async () => {}}>
            Buy Crown
          </Button>
          <Button type={"primary"} shape="round" onClick={async () => {}}>
            Import Crown Token
          </Button>
        </Space>
        <div className="App">
          <NetworkDisplay userSigner={userSigner} localChainId={localChainId} targetNetwork={targetNetwork} />
          <Row style={{ alignItems: "center" }} gutter={16} justify="center" type="flex" align="middle">
            <Col span={8}>
              <CrownBalance address={address} readContracts={readContracts} />
            </Col>

            <Col span={8}>
              <Staking address={address} readContracts={readContracts} writeContracts={writeContracts} tx={tx} />
            </Col>

            <Col span={8}>
              <Yield address={address} readContracts={readContracts} writeContracts={writeContracts} tx={tx} />
            </Col>
          </Row>
        </div>
      </Content>
      <Footer />
    </Layout>
  );
}

export default App;
