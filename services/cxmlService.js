const generatePunchoutSetupResponse = (sessionId) => {
  return `
  <PunchoutSetupResponse>
    <StartPage>
      <URL>http://localhost:3001/shop?session=${sessionId}</URL>
    </StartPage>
  </PunchoutSetupResponse>
  `;
};
const generatePunchoutOrderMessage = (buyerCookie, cart) => {
  const itemsXML = cart
    .map(
      (item) => `
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
  `
    )
    .join("");

  return `
  <PunchoutOrderMessage>
    <BuyerCookie>${buyerCookie}</BuyerCookie>
    ${itemsXML}
  </PunchoutOrderMessage>
  `;
};

module.exports = {
  generatePunchoutSetupResponse,
  generatePunchoutOrderMessage,
};