const express = require("express");
const axios = require("axios");
const xml2js = require("xml2js");
const db = require("../db");
const router = express.Router();

// Store requisitions
let requisitions = [];

// buyer login
router.post("/login", (req, res) => {
  const { email, secret } = req.body;

  db.query(
    "SELECT * FROM buyers WHERE email = ?",
    [email],
    (err, results) => {
      if (err) return res.status(500).json(err);

      // 🔹 EXISTING USER
      if (results.length > 0) {
        const user = results[0];

        if (user.secret_code !== secret) {
          return res.status(401).json({ message: "Invalid secret code" });
        }

        return res.json({
          message: "Login successful",
          buyerId: user.id,
          orgId: user.org_id, // ✅ ADD THIS
        });
      }

      // 🔹 NEW USER → Assign default org (IMPORTANT)
      const defaultOrgId = 1; // 👉 TCS (you can change later dynamically)

      db.query(
        "INSERT INTO buyers (email, secret_code, org_id) VALUES (?, ?, ?)",
        [email, secret, defaultOrgId],
        (err, result) => {
          if (err) return res.status(500).json(err);

          res.json({
            message: "User created & logged in",
            buyerId: result.insertId,
            orgId: defaultOrgId, // ✅ RETURN THIS
          });
        }
      );
    }
  );
});

// 🔹 Start Punchout
router.post("/punchout/start", async (req, res) => {
  try {
    const buyerId = req.headers["buyer-id"];
    const orgId = req.headers["org-id"];
    const buyerEmail = req.headers["buyer-email"];
    const { supplier } = req.body;

    // ✅ 1. Get org credentials
    db.query(
      "SELECT * FROM buyer_organizations WHERE id = ?",
      [orgId],
      async (err, results) => {
        if (err || results.length === 0) {
          return res.status(400).json({ error: "Invalid organization" });
        }

        const org = results[0];

        // ✅ 2. Build REAL cXML
        const punchoutRequest = `
<cXML payloadID="${Date.now()}" timestamp="${new Date().toISOString()}">
  <Header>
    <From>
      <Credential domain="NetworkID">
        <Identity>${org.identity}</Identity>
      </Credential>
    </From>

    <To>
      <Credential domain="NetworkID">
        <Identity>${supplier}_SUPPLIER</Identity>
      </Credential>
    </To>

    <Sender>
      <Credential domain="NetworkID">
        <Identity>${org.identity}</Identity>
        <SharedSecret>${org.shared_secret}</SharedSecret>
      </Credential>
      <UserAgent>MyPunchoutApp</UserAgent>
    </Sender>
  </Header>

  <Request>
    <PunchOutSetupRequest operation="create">
      <BuyerCookie>${buyerId}_${Date.now()}</BuyerCookie>

      <BrowserFormPost>
        <URL>http://localhost:5000/api/buyer/cart/receive</URL>
      </BrowserFormPost>

      <Contact role="endUser">
  <Name xml:lang="en">${org.name}</Name>
  <Email>${buyerEmail}</Email> <!-- ✅ REAL EMAIL -->
</Contact>
    </PunchOutSetupRequest>
  </Request>
</cXML>
`;

        // ✅ 3. Send to supplier
        const response = await axios.post(
          "http://localhost:5000/api/supplier/punchout/setup",
          punchoutRequest,
          {
            headers: {
              "Content-Type": "text/xml",
            },
          }
        );

        xml2js.parseString(response.data, (err, result) => {
          const url =
            result.PunchoutSetupResponse.StartPage[0].URL[0];

          res.json({ redirectUrl: url });
        });
      }
    );
  } catch (error) {
    console.error(error);
    res.status(500).send("Punchout error");
  }
});



// 🔹 Receive Cart
router.post("/cart/receive", (req, res) => {
  const { cxml, sessionId } = req.body;

  xml2js.parseString(cxml, (err, result) => {
    if (err) {
      console.error("XML parse error:", err);
      return res.status(500).json({ error: "Invalid XML" });
    }

    try {
      const items = result.PunchoutOrderMessage.ItemIn;

     const parsedItems = items.map((item) => ({
  name: item.ItemDetail[0].Description[0],
  price: item.ItemDetail[0].UnitPrice[0].Money[0]._, // ✅ FIX
  qty: item.$.quantity,
}));

      console.log("✅ Parsed Items:", parsedItems);

      db.query(
        "INSERT INTO requisitions (session_id, cart_xml, cart_json, status) VALUES (?, ?, ?, ?)",
        [sessionId, cxml, JSON.stringify(parsedItems), "PENDING"],
        (err) => {
          if (err) {
            console.error(err);
            return res.status(500).json({ error: "DB insert failed" });
          }

          res.json({ message: "Cart stored with multiple items ✅" });
        }
      );

    } catch (error) {
      console.error("Processing error:", error);
      res.status(500).json({ error: "Processing failed" });
    }
  });
});

router.get("/requisition/:sessionId", (req, res) => {
  const { sessionId } = req.params;

  db.query(
    "SELECT * FROM requisitions WHERE session_id=?",
    [sessionId],
    (err, result) => {
      if (err) return res.status(500).json(err);

      res.json(result[0]); // contains cart_xml
    }
  );
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