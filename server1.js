const express = require("express");
const bodyParser = require("body-parser");

const supplierRoutes = require("./routes/supplier1");
const cors = require("cors");
const app = express();
app.use(cors());
// ✅ VERY IMPORTANT
app.use(express.text({ type: "text/xml" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use("/api/supplier", supplierRoutes);

app.listen(5000, () => {
  console.log("🚀 Server running on port 5000");
});

// cloudflared-windows-amd64.exe tunnel --url http://localhost:5000