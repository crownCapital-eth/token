import { Balance } from "./index";
import { Card } from "antd";
import { useContractReader } from "eth-hooks";

export default function CrownBalance({ address, readContracts }) {
  const CrownTokenBalance = useContractReader(readContracts, "CrownToken", "balanceOf", [address]);

  return (
    <Card title="Crown Tokens Owned" className={"ant-card-small"}>
      <div style={{ padding: 8 }}>
        <Balance balance={CrownTokenBalance} fontSize={64} />
      </div>
    </Card>
  );
}
