import { Balance } from "./index";
import { useContractReader } from "eth-hooks";
import { CROWN_VAULT_CONTRACT, STAKED_BALANCE_FUNCTION } from "../constants";
import { Card } from "react-bootstrap";

export default function CrownStaked({ address, readContracts }) {
  const CrownStakedBalance = useContractReader(readContracts, CROWN_VAULT_CONTRACT, STAKED_BALANCE_FUNCTION, [address]);

  return (
    <Card as="h5" className="text-center">
      <Card.Header>Crown Tokens Staked</Card.Header>
      <Card.Body>
        <Balance balance={CrownStakedBalance} fontSize={64} />
      </Card.Body>
    </Card>
  );
}