import { NETWORK } from "../constants";
import { Alert, Button } from "antd";
import React from "react";

export default function NetworkDisplay({ userSigner, localChainId, targetNetwork }) {
  const selectedChainId =
    userSigner && userSigner.provider && userSigner.provider._network && userSigner.provider._network.chainId;

  if (localChainId && selectedChainId && localChainId !== selectedChainId) {
    const networkSelected = NETWORK(selectedChainId);
    const networkLocal = NETWORK(localChainId);
    return (
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
  } else {
    return (
      <div style={{ zIndex: -1, position: "absolute", right: 154, top: 28, padding: 16, color: targetNetwork.color }}>
        {targetNetwork.name}
      </div>
    );
  }
}
