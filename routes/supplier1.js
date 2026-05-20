const express = require("express");
const xml2js = require("xml2js");
const { v4: uuidv4 } = require("uuid");

const router = express.Router();

// ✅ In-memory session store (simple for testing)
const sessions = {};

// 🔹 STEP 1: Handle PunchOut Setup
router.post("/punchout/setup", (req, res) => {
  const xml = req.body;

  xml2js.parseString(xml, (err, result) => {
    if (err) return res.status(400).send("Invalid XML");

    try {
      const header = result.cXML.Header[0];

      const sender = header.Sender[0].Credential[0];
      const identity = sender.Identity[0];
      const secret = sender.SharedSecret[0];

      // ✅ VALIDATE (match your tester)
      if (identity !== "BuyerOrg" || secret !== "mvb@123") {
        return res.status(401).send("Unauthorized");
      }

      const request =
        result.cXML.Request[0].PunchOutSetupRequest[0];

      const buyerCookie = request.BuyerCookie[0];

      const browserPostUrl =
        request.BrowserFormPost[0].URL[0];

      const email =
        request.Extrinsic?.find(e => e.$.name === "UserEmail")?._ ||
        "unknown@test.com";

      // ✅ Create session
      const sessionId = uuidv4();

      sessions[sessionId] = {
        buyerCookie,
        browserPostUrl,
        email,
      };

      console.log("✅ Session created:", sessions[sessionId]);

      // ✅ Respond with StartPage
      const responseXML = `
<cXML payloadID="${Date.now()}" timestamp="${new Date().toISOString()}">
  <Response>
    <Status code="200" text="OK"/>
    <PunchOutSetupResponse>
      <StartPage>
        <URL>
http://localhost:3001/shop?session=${sessionId}
        </URL>
      </StartPage>
    </PunchOutSetupResponse>
  </Response>
</cXML>
      `;

      res.send(responseXML);

    } catch (e) {
      console.error(e);
      res.status(500).send("Error");
    }
  });
});

// 🔹 STEP 2: Checkout (send cart back)
router.post("/checkout", (req, res) => {
  const { sessionId, cart } = req.body;

  const session = sessions[sessionId];

  if (!session) {
    return res.status(400).send("Invalid session");
  }

  const itemsXML = cart.map(item => `
<ItemIn quantity="1">
  <ItemID>
    <SupplierPartID>${item.id}</SupplierPartID>
  </ItemID>
  <ItemDetail>
    <UnitPrice>
      <Money currency="INR">${item.price}</Money>
    </UnitPrice>
    <Description>${item.name}</Description>
  </ItemDetail>
</ItemIn>
`).join("");

  const cxml = `
<cXML payloadID="${Date.now()}" timestamp="${new Date().toISOString()}">
  <Message>
    <PunchoutOrderMessage>
      <BuyerCookie>${session.buyerCookie}</BuyerCookie>
      ${itemsXML}
    </PunchoutOrderMessage>
  </Message>
</cXML>
  `;

  // ✅ REAL PunchOut return (AUTO FORM POST)
  res.send(`
<html>
  <body onload="document.forms[0].submit()">
    <form method="POST" action="${session.browserPostUrl}">
      <input type="hidden" name="cXML" value='${cxml}' />
    </form>
  </body>
</html>
  `);
});

module.exports = router;