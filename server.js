const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const crypto = require("crypto");
const path = require("path");
require("dotenv").config();

const app = express();

// ========================================
// CONFIGURAÇÕES
// ========================================

app.use(cors());
app.use(express.json({ limit: "20mb" }));
app.use(express.static(path.join(__dirname, "public")));

mongoose.set("strictQuery", true);

const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;

// CONEXÃO COMPARTILHADA COM O MONGODB (VERCEL)
let dbPromise = null;

app.use(async (req, res, next) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      if (!dbPromise) {
        dbPromise = mongoose.connect(MONGODB_URI).catch((erro) => {
          dbPromise = null;
          throw erro;
        });
      }

      await dbPromise;
    }

    next();
  } catch (erro) {
    next(erro);
  }
});

if (!MONGODB_URI) {
  console.error("ERRO: defina MONGODB_URI no arquivo .env");
  process.exit(1);
}

const newId = (prefix) => `${prefix}_${crypto.randomUUID()}`;

