import React, { useState } from "react";

const TransferDialog = ({ onTransfer, onCancel }) => {
  const [number, setNumber] = useState("");

  const dialogStyle = {
    position: "fixed",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    backgroundColor: "white",
    padding: "20px",
    border: "1px solid #ccc",
    zIndex: 10000,
  };

  return (
    <div style={dialogStyle}>
      <h3>Transfer Call</h3>
      <input
        type="text"
        value={number}
        onChange={(e) => setNumber(e.target.value)}
        placeholder="Enter number"
      />
      <button onClick={() => onTransfer(number)}>Transfer</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  );
};

export default TransferDialog;
