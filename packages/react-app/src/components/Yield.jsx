import { Balance } from "./index";
import { useContractReader } from "eth-hooks";
import { useState } from "react";
import { Button, Card } from "react-bootstrap";

export default function Yield({ address, readContracts, writeContracts, tx }) {
  const UserYield = useContractReader(readContracts, "Farm", "crownYield", [address]);
  const [claiming, setClaiming] = useState();

  return (
    <Card as="h5" className="text-center">
      <Card.Header>Yield Generated</Card.Header>
      <Card.Body>
        <div style={{ padding: 8 }}>
          <Balance balance={UserYield} fontSize={64} />
        </div>

        <div style={{ padding: 8 }}>
          <Button
            disabled={claiming}
            onClick={async () => {
              setClaiming(true);
              await tx(writeContracts.Farm.updateYield());
              setClaiming(false);
            }}
          >
            Update
          </Button>

          <Button
            disabled={claiming}
            onClick={async () => {
              setClaiming(true);
              await tx(writeContracts.Farm.withdrawYield());
              setClaiming(false);
            }}
          >
            Claim
          </Button>
        </div>
      </Card.Body>
    </Card>
  );
}
