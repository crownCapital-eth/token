import { Button } from "antd";
import React from "react";

export default function GasGauge(props) {
  return (
    <Button
      onClick={() => {
        window.open("https://ethgasstation.info/");
      }}
      size="large"
      shape="round"
    >
      <span style={{ marginRight: 8 }}>
        <span role="img" aria-label="fuelpump">
          ⛽️
        </span>
      </span>
      {typeof props.gasPrice === "undefined" ? 0 : parseInt(props.gasPrice, 10) / 10 ** 9}g
    </Button>
  );
}
