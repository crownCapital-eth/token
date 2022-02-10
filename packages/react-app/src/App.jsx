import { useContractLoader, useGasPrice, useUserProviderAndSigner } from "eth-hooks";
import React, { useEffect, useState } from "react";
import { CrownBalance, CrownStaked, NetworkDisplay, Staking, Yield } from "./components";
import { NETWORKS, WEB2_BASE_URL } from "./constants";
import { Transactor } from "./helpers";
import externalContracts from "./contracts/external_contracts";
import deployedContracts from "./contracts/hardhat_contracts.json";
import Wallet from "./components/Wallet";
import WalletSetup from "./helpers/WalletSetup";
import { Col, Container, Nav, Navbar, Row } from "react-bootstrap";

const { ethers } = require("ethers");

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
    <>
      <header>
        <Navbar bg="dark" variant="dark" expand="lg" style={{ height: "60px", fontSize: "14px" }}>
          <Container>
            <Navbar.Brand href="#" style={{ borderRight: "2px solid hsla(0, 0%, 100%, 0.14)", paddingRight: "20px" }}>
              <img
                src="https://uploads-ssl.webflow.com/61d478ff7ed98c50aa497fe4/61d9d26295d9afcff391480b_logo.png"
                width="52"
                height="37"
                className="d-inline-block align-top"
                alt="Crown Capital DAO Logo"
              />
            </Navbar.Brand>
            <Navbar.Toggle aria-controls="navbarScroll" />
            <Navbar.Collapse
              id="navbarScroll"
              style={{ backgroundColor: "#17161b", zIndex: "3", padding: "10px" }}
              className={"text-center"}
            >
              <Nav className="me-auto my-2 my-lg-0" navbarScroll>
                <Nav.Link href={WEB2_BASE_URL + "/investors"}>INVESTORS</Nav.Link>
                <Nav.Link href={WEB2_BASE_URL + "/gamers"}>GAMERS</Nav.Link>
                <Nav.Link href={WEB2_BASE_URL + "/portfolio"}>PORTFOLIO</Nav.Link>
                <Nav.Link href={WEB2_BASE_URL + "/community"}>COMMUNITY</Nav.Link>
                <Nav.Link href={WEB2_BASE_URL + "/organization"}>ORGANIZATION</Nav.Link>
              </Nav>
              <Wallet
                web3Modal={web3Modal}
                injectedProvider={injectedProvider}
                setInjectedProvider={setInjectedProvider}
              />
            </Navbar.Collapse>
          </Container>
        </Navbar>
      </header>
      <main>
        <Container>
          <Row className="text-center justify-content-center pt-5">
            <Col lg={true} />
            <Col lg={true}>
              <h2 style={{ color: "white" }}>Crown Capital Staking</h2>
            </Col>
            <Col lg={true} />
          </Row>
          <Row className="App">
            <NetworkDisplay userSigner={userSigner} localChainId={localChainId} targetNetwork={targetNetwork} />
            <Row>
              <Col lg={true}>
                <CrownBalance address={address} readContracts={readContracts} />
                <CrownStaked address={address} readContracts={readContracts} />
              </Col>
              <Col lg={true}>
                <Staking address={address} readContracts={readContracts} writeContracts={writeContracts} tx={tx} />
              </Col>
              <Col lg={true}>
                <Yield address={address} readContracts={readContracts} writeContracts={writeContracts} tx={tx} />
              </Col>
            </Row>
          </Row>
        </Container>
      </main>
      <footer />
    </>
  );
}

export default App;
