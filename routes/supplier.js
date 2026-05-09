const express = require("express");
const { v4: uuidv4 } = require("uuid");
const {
  generatePunchoutSetupResponse,
  generatePunchoutOrderMessage,
} = require("../services/cxmlService");

const router = express.Router();

// In-memory storage (no DB for now)
let sessions = {};

// 🔹 Punchout Setup
router.post("/punchout/setup", (req, res) => {
  console.log("Received PunchoutSetupRequest");

  const buyerCookie = "BUYER123"; // static for now

  const sessionId = uuidv4();

  sessions[sessionId] = {
    buyerCookie,
  };

  const responseXML = generatePunchoutSetupResponse(sessionId);

  res.send(responseXML);
});

// 🔹 Checkout (send cart back)
router.post("/checkout", (req, res) => {
  const { sessionId } = req.body;

  const session = sessions[sessionId];

  if (!session) {
    return res.status(400).json({ error: "Invalid session" });
  }

  const xml = generatePunchoutOrderMessage(session.buyerCookie);

  res.json({
    redirectUrl: "http://localhost:3000/requisition",
    cxml: xml,
  });
});

module.exports = router;