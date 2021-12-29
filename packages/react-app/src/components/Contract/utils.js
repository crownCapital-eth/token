import React from "react";

const { utils } = require("ethers");

const tryToDisplay = thing => {
  if (thing && thing.toNumber) {
    try {
      return thing.toNumber();
    } catch (e) {
      return "Ξ" + utils.formatUnits(thing, "ether");
    }
  }
  return JSON.stringify(thing);
};

export default tryToDisplay;
