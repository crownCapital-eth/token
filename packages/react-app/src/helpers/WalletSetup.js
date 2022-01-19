import WalletLink from "walletlink";
import { INFURA_ID } from "../constants";
import Web3Modal from "web3modal";
import WalletConnectProvider from "@walletconnect/web3-provider";
import Portis from "@portis/web3";
import Fortmatic from "fortmatic";
import Authereum from "authereum";

const walletLink = new WalletLink({
  appName: "coinbase",
});
const walletLinkProvider = walletLink.makeWeb3Provider(`https://mainnet.infura.io/v3/${INFURA_ID}`, 1);

const WalletSetup = () =>
  new Web3Modal({
    network: "mainnet",
    cacheProvider: true,
    theme: "dark",
    providerOptions: {
      walletconnect: {
        package: WalletConnectProvider, // required
        options: {
          bridge: "https://polygon.bridge.walletconnect.org",
          infuraId: INFURA_ID,
          rpc: {
            1: `https://mainnet.infura.io/v3/${INFURA_ID}`,
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
        package: Fortmatic,
        options: {
          key: "pk_live_5A7C91B2FC585A17",
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
export default WalletSetup;
