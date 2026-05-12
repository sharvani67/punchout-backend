const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

const buyerRoutes = require("./routes/buyer");
const supplierRoutes = require("./routes/supplier");
const supplieradminRoutes = require("./routes/supplieradmin");

const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.text({ type: "text/xml" }));

app.use("/api/buyer", buyerRoutes);
app.use("/api/supplier", supplierRoutes);
app.use("/api", supplieradminRoutes);

const PORT = 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});