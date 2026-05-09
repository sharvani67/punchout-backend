const express = require("express");
const axios = require("axios");
const xml2js = require("xml2js");

const router = express.Router();

// Store requisitions
let requisitions = [];

// 🔹 Start Punchout
router.post("/punchout/start", async (req, res) => {
  try {
    const punchoutRequest = `
    <PunchoutSetupRequest>
      <BuyerCookie>BUYER123</BuyerCookie>
    </PunchoutSetupRequest>
    `;

    // Call supplier
    const response = await axios.post(
      "http://localhost:5000/api/supplier/punchout/setup",
      punchoutRequest,
      {
        headers: { "Content-Type": "text/xml" },
      }
    );

    // Parse XML
    xml2js.parseString(response.data, (err, result) => {
      const url =
        result.PunchoutSetupResponse.StartPage[0].URL[0];

      res.json({ redirectUrl: url });
    });

  } catch (error) {
    console.error(error);
    res.status(500).send("Error in Punchout");
  }
});

// 🔹 Receive Cart
router.post("/cart/receive", (req, res) => {
  const { cxml } = req.body;

  requisitions = [
    {
      id: "REQ1",
      data: cxml,
      status: "PENDING",
    },
  ];

  res.json({ message: "Cart received" });
});

router.get("/requisition", (req, res) => {
  res.json(requisitions[0] || {});
});

// 🔹 Approve
router.post("/approve", (req, res) => {
  requisitions[0].status = "APPROVED";

  res.json({
    message: "Approved",
    poNumber: "PO123",
  });
});

module.exports = router;