import { Balance } from "./index";
import { Card } from "antd";
import { useContractReader } from "eth-hooks";
import { BALANCE_OF_FUNCTION, CROWN_TOKEN_CONTRACT } from "../constants";

export default function CrownBalance({ address, readContracts }) {
  const CrownTokenBalance = useContractReader(readContracts, CROWN_TOKEN_CONTRACT, BALANCE_OF_FUNCTION, [address]);

  return (
    <Card title="Crown Tokens Owned" className={"ant-card-small"}>
      <div style={{ padding: 8 }}>
        <Balance balance={CrownTokenBalance} fontSize={64} />
      </div>
    </Card>
  );
}
