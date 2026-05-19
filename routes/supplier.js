const express = require("express");
const { v4: uuidv4 } = require("uuid");
const {
  generatePunchoutSetupResponse,
  generatePunchoutOrderMessage,
} = require("../services/cxmlService");
const db = require("../db");
const xml2js = require("xml2js");

const router = express.Router();

router.post("/punchout/setup", (req, res) => {
  const xml = req.body;

  xml2js.parseString(xml, (err, result) => {
    if (err) return res.status(500).send("Invalid XML");

    try {
      const header = result.cXML.Header[0];
      const sender = header.Sender[0].Credential[0];

      const identity = sender.Identity[0];
      const sharedSecret = sender.SharedSecret[0];

      const contact = result.cXML.Request[0].PunchOutSetupRequest[0].Contact[0];
      const buyerEmail = contact.Email[0];

      // ✅ VALIDATE BUYER
      db.query(
        "SELECT * FROM buyer_organizations WHERE identity=? AND shared_secret=?",
        [identity, sharedSecret],
        (err, results) => {
          if (err || results.length === 0) {
            return res.status(401).send("Unauthorized ❌");
          }

          // ✅ Extract request
          const request =
            result.cXML.Request[0].PunchOutSetupRequest[0];

          const buyerCookie = request.BuyerCookie[0];
          const sessionId = uuidv4();

          // ✅ Store session
         db.query(
  "INSERT INTO sessions (id, buyer_id, buyer_cookie, buyer_email, created_at, status) VALUES (?, ?, ?, ?, NOW(), ?)",
  [sessionId, identity, buyerCookie, buyerEmail, "ACTIVE"]
);

          // ✅ Log activity
          db.query(
            "INSERT INTO session_activity (session_id, action, created_at) VALUES (?, ?, NOW())",
            [sessionId, "SESSION_STARTED"]
          );

          const responseXML =
            generatePunchoutSetupResponse(sessionId);

          res.send(responseXML);
        }
      );
    } catch (err) {
      console.error(err);
      res.status(500).send("Processing error");
    }
  });
});

// 🔹 Checkout (send cart back)
router.post("/checkout", (req, res) => {
  const { sessionId, cart } = req.body;

  if (!sessionId || !cart) {
    return res.status(400).json({ error: "Missing data" });
  }

  // ✅ Check session exists
  db.query(
    "SELECT * FROM sessions WHERE id = ?",
    [sessionId],
    (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).send("DB Error");
      }

      if (results.length === 0) {
        return res.status(400).json({ error: "Invalid session" });
      }

      const session = results[0];

      // ✅ STORE EACH CART ITEM
      cart.forEach((item) => {
        db.query(
          "INSERT INTO cart_items (session_id, product_name, price, quantity) VALUES (?, ?, ?, ?)",
          [sessionId, item.name, item.price, item.qty || 1],
          (err) => {
            if (err) console.error("Cart insert error:", err);
          }
        );
      });

      // ✅ After storing cart
db.query(
  "INSERT INTO session_activity (session_id, action, created_at) VALUES (?, ?, NOW())",
  [sessionId, "CART_CHECKOUT"],
  (err) => {
    if (err) console.error("Activity log error:", err);
  }
);

      // ✅ UPDATE SESSION LAST ACTIVE
      db.query(
        "UPDATE sessions SET last_active = NOW() WHERE id = ?",
        [sessionId]
      );

      console.log("🛒 Cart Stored in DB");

      const xml = generatePunchoutOrderMessage(
        session.buyer_cookie,
        cart
      );

      res.json({
        redirectUrl: `http://localhost:3000/requisition?sessionId=${sessionId}`,
        cxml: xml,
      });
    }
  );
});
module.exports = router;