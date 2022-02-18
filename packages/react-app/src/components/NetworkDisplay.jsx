import { NETWORK } from "../constants";
import React, { useState } from "react";
import { Alert, Button } from "react-bootstrap";

export default function NetworkDisplay({ userSigner, localChainId, targetNetwork }) {
  const selectedChainId =
    userSigner && userSigner.provider && userSigner.provider._network && userSigner.provider._network.chainId;

  const [show, setShow] = useState(true);

  function switchNetwork() {
    return async () => {
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
    };
  }

  if (localChainId && selectedChainId && localChainId !== selectedChainId) {
    const networkLocal = NETWORK(localChainId);
    return (
      <div style={{ zIndex: 2, position: "absolute", right: 0, top: 60, padding: 16 }}>
        <Alert variant={"danger"} onClose={() => setShow(false)} dismissible>
          <Alert.Heading>⚠️ Wrong Network</Alert.Heading>
          <p>
            To interact with Crown Capital staking you need to be on{" "}
            <Button onClick={switchNetwork()}>
              <b>{networkLocal && networkLocal.name}</b>
            </Button>
          </p>
        </Alert>
      </div>
    );
  } else {
    return (
      <div style={{ zIndex: -1, position: "absolute", right: 154, top: 28, padding: 16, color: targetNetwork.color }}>
        {targetNetwork.name}
      </div>
    );
  }
}
