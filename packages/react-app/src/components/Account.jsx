import React from "react";
import { Button } from "react-bootstrap";

export default function Account({ web3Modal, loadWeb3Modal, logoutOfWeb3Modal }) {
  const modalButtons = [];
  if (web3Modal) {
    if (web3Modal.cachedProvider) {
      modalButtons.push(
        <Button key="disconnect-wallet" variant="warning" size="sm" onClick={logoutOfWeb3Modal}>
          Disconnect
        </Button>,
      );
    } else {
      modalButtons.push(
        <Button key="connect-wallet" variant="warning" size="sm" onClick={loadWeb3Modal}>
          Connect Wallet
        </Button>,
      );
    }
  }

  return <div>{modalButtons}</div>;
}
