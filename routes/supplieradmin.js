const express = require("express");
const router = express.Router();
const db = require("../db");
const axios = require("axios");
const xml2js = require("xml2js");



router.get("/admin/sessions", (req, res) => {
  db.query("SELECT * FROM sessions ORDER BY created_at DESC", (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
});

router.get("/admin/session/:id", (req, res) => {
  const { id } = req.params;

  db.query(
    "SELECT * FROM cart_items WHERE session_id = ?",
    [id],
    (err, items) => {
      if (err) return res.status(500).json(err);

      db.query(
        "SELECT * FROM session_activity WHERE session_id = ?",
        [id],
        (err, activity) => {
          if (err) return res.status(500).json(err);

          res.json({
            items,
            activity,
          });
        }
      );
    }
  );
});

module.exports = router;