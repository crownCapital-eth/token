import { Balance } from "./index";
import { Button, Card, Space } from "antd";
import { useContractReader } from "eth-hooks";
import { useState } from "react";

export default function Yield({ address, readContracts, writeContracts, tx }) {
  const UserYield = useContractReader(readContracts, "Farm", "crownYield", [address]);
  const [claiming, setClaiming] = useState();

  return (
    <Card title="Yield Generated" className={"ant-card-small"}>
      <div style={{ padding: 8 }}>
        <Balance balance={UserYield} fontSize={64} />
      </div>

      <div style={{ padding: 8 }}>
        <Space align="center" style={{ width: "100%", justifyContent: "center" }}>
          <Button
            type={"primary"}
            shape="round"
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
            shape="round"
            onClick={async () => {
              setClaiming(true);
              await tx(writeContracts.Farm.withdrawYield());
              setClaiming(false);
            }}
          >
            Claim
          </Button>
        </Space>
      </div>
    </Card>
  );
}
