const generatePunchoutSetupResponse = (sessionId) => {
  return `
  <PunchoutSetupResponse>
    <StartPage>
      <URL>http://localhost:3001/shop?session=${sessionId}</URL>
    </StartPage>
  </PunchoutSetupResponse>
  `;
};

const generatePunchoutOrderMessage = (buyerCookie) => {
  return `
  <PunchoutOrderMessage>
    <BuyerCookie>${buyerCookie}</BuyerCookie>

    <ItemIn quantity="1">
      <ItemID>
        <SupplierPartID>101</SupplierPartID>
      </ItemID>

      <ItemDetail>
        <UnitPrice>
          <Money currency="USD">100</Money>
        </UnitPrice>
        <Description>Laptop Bag</Description>
      </ItemDetail>
    </ItemIn>

  </PunchoutOrderMessage>
  `;
};

module.exports = {
  generatePunchoutSetupResponse,
  generatePunchoutOrderMessage,
};