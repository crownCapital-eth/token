import { Balance } from "./index";
import { useContractReader } from "eth-hooks";
import { BALANCE_OF_FUNCTION, CROWN_TOKEN_CONTRACT } from "../constants";
import { Card } from "react-bootstrap";

export default function CrownBalance({ address, readContracts }) {
  const CrownTokenBalance = useContractReader(readContracts, CROWN_TOKEN_CONTRACT, BALANCE_OF_FUNCTION, [address]);

  return (
    <Card as="h5" className="text-center">
      <Card.Header>Crown Tokens Owned</Card.Header>
      <Card.Body>
        <Balance balance={CrownTokenBalance} fontSize={64} />
      </Card.Body>
    </Card>
  );
}
