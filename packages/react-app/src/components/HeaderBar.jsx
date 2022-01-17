import { PageHeader } from "antd";
import React from "react";
import CrownCapitalLogo from "../crown-capital-logo.png";

export default function HeaderBar() {
  return (
    <a href="/">
      <PageHeader
        title="Crown Capital DAO"
        subTitle="Staking"
        style={{ cursor: "pointer" }}
        avatar={{ src: CrownCapitalLogo }}
      />
    </a>
  );
}
