import { ethers } from "ethers";
import { useEffect, useState } from "react";
import { useContractReader } from "eth-hooks";
import { ALLOWANCE_FUNCTION, CROWN_TOKEN_CONTRACT } from "../constants";
import { Button, Card, Nav, Tab, Tabs } from "react-bootstrap";

export default function Staking({ address, readContracts, writeContracts, tx }) {
  const farmAddress = readContracts && readContracts.Farm && readContracts.Farm.address;
  const farmApproval = useContractReader(readContracts, CROWN_TOKEN_CONTRACT, ALLOWANCE_FUNCTION, [
    address,
    farmAddress,
  ]);

  const [buying, setBuying] = useState();

  const [amountToStake, setAmountToStake] = useState();
  const [amountToUnstake, setAmountToUnstake] = useState();
  const [isStakeAmountApproved, setIsStakeAmountApproved] = useState();

  useEffect(() => {
    const amountToStakeBN = amountToStake && ethers.utils.parseEther("" + amountToStake);
    setIsStakeAmountApproved(farmApproval && amountToStake && farmApproval.gte(amountToStakeBN));
  }, [amountToStake, readContracts]);

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
          <label style={{paddingRight: "5px"}}>Stake Amount: </label>
          <input
            style={{ textAlign: "center" }}
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
            shape="round"
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

          <Button
            type={"primary"}
            loading={buying}
            shape="round"
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
          <label>Amount to Unstake: </label>
          <input
            style={{ textAlign: "center" }}
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
            Unstake
          </Button>
        </div>
      </div>
    ),
  };

  return (
    <Card as="h5" className="text-center">
      <Tabs defaultActiveKey="stake" className="mb-3 justify-content-center">
        <Tab eventKey="stake" title="Stake">
          <Tab.Content>{contentList.stake}</Tab.Content>
        </Tab>
        <Tab eventKey="unstake" title="Unstake">
          <Tab.Content style={{ borderTop: "5px" }}>{contentList.unstake}</Tab.Content>
        </Tab>
      </Tabs>
    </Card>
  );
}
