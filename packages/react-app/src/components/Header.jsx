import { PageHeader } from "antd";
import React from "react";

export default function Header() {
  return (
    <a href="/">
      <PageHeader
        title="Crown Capital DAO"
        subTitle="Staking"
        style={{ cursor: "pointer" }}
      />
    </a>
  );
}
