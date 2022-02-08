import { Button, Card, Input, Space } from "antd";
import { ethers } from "ethers";
import { useEffect, useState } from "react";
import { useContractReader } from "eth-hooks";
import { ALLOWANCE_FUNCTION, CROWN_TOKEN_CONTRACT } from "../constants";

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
          <Input
            style={{ textAlign: "center" }}
            placeholder={"Number of tokens to stake"}
            value={amountToStake}
            onChange={e => {
              setAmountToStake(e.target.value);
            }}
          />
        </div>
        <div style={{ padding: 8 }}>
          <Space align="center" style={{ width: "100%", justifyContent: "center" }}>
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
          </Space>
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
          <Space align="center" style={{ width: "100%", justifyContent: "center" }}>
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
          </Space>
        </div>
      </div>
    ),
  };

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
}
