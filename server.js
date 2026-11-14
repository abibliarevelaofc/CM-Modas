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

const toNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const roundMoney = (value) =>
  Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const isValidDate = (value) => {
  if (!value || typeof value !== "string") return false;
  const d = new Date(`${value}T12:00:00`);
  return !Number.isNaN(d.getTime());
};

const addDays = (dateString, days) => {
  const d = new Date(`${dateString}T12:00:00`);
  d.setDate(d.getDate() + days);

  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0")
  ].join("-");
};

function asyncRoute(handler) {
  return (req, res, next) =>
    Promise.resolve(handler(req, res, next)).catch(next);
}

// ========================================
// MODELO DOS PRODUTOS
// ========================================

const ProductSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true, index: true },
  gender: { type: String, default: "" },
  name: { type: String, required: true, trim: true },
  category: { type: String, default: "" },
  label: { type: String, default: "" },
  price: { type: Number, min: 0, default: 0 },
  cost: { type: Number, min: 0, default: 0 },
  stock: { type: Number, min: 0, default: 0 },
  sizes: { type: [String], default: [] },
  description: { type: String, default: "" },
  likes: { type: Number, min: 0, default: 0 },
  colors: {
    type: [{
      name: { type: String, default: "" },
      image: { type: String, default: "" }
    }],
    default: []
  }
}, { timestamps: true });

const Product = mongoose.model("Product", ProductSchema);

// ========================================
// MODELO DOS CLIENTES
// ========================================

const ClientSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  notes: { type: String, default: "" },
  active: { type: Boolean, default: true }
}, { timestamps: true });

const Client = mongoose.model("Client", ClientSchema);

// ========================================
// MODELO DAS VENDAS
// ========================================

const SaleSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  clientId: { type: String, required: true, index: true },
  clientName: { type: String, required: true },
  productId: { type: Number, required: true, index: true },
  productName: { type: String, required: true },
  qty: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  unitCost: { type: Number, required: true, min: 0, default: 0 },
  total: { type: Number, required: true, min: 0 },
  entry: { type: Number, required: true, min: 0, default: 0 },
  profit: { type: Number, required: true, default: 0 },
  installmentCount: { type: Number, required: true, min: 1, default: 1 },
  date: { type: Date, default: Date.now }
}, { timestamps: true });

const Sale = mongoose.model("Sale", SaleSchema);

// ========================================
// MODELO DAS PARCELAS
// ========================================

const InstallmentSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  saleId: { type: String, required: true, index: true },
  clientId: { type: String, required: true, index: true },
  clientName: { type: String, required: true },
  productName: { type: String, required: true },
  amount: { type: Number, required: true, min: 0 },
  dueDate: { type: String, required: true, index: true },
  paidAmount: { type: Number, min: 0, default: 0 },
  paid: { type: Boolean, default: false },
  payments: [{
    amount: { type: Number, required: true, min: 0 },
    paidAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

const Installment = mongoose.model("Installment", InstallmentSchema);

// ========================================
// MODELO DOS BANNERS
// ========================================

const BannerSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  image: {
    type: String,
    required: true
  },
  order: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

const Banner = mongoose.model("Banner", BannerSchema);

// ========================================
// STATUS DO SERVIDOR
// ========================================

app.get("/api/status", (req, res) => {
  res.json({
    sucesso: true,
    mensagem: "Servidor CM Modas funcionando!",
    banco: mongoose.connection.readyState === 1
      ? "conectado"
      : "desconectado"
  });
});

// ========================================
// PRODUTOS
// ========================================


app.get("/api/products", async (req, res) => {
  try {
    console.log("Buscando produtos...");
    console.log("Estado MongoDB:", mongoose.connection.readyState);

    const products = await Product.find()
      .sort({ createdAt: -1 })
      .lean();

    console.log("Produtos encontrados:", products.length);

    return res.json(products);

  } catch (erro) {
    console.error("ERRO EXCLUSIVO NA ROTA PRODUCTS:", erro);

    return res.status(500).json({
      erro: "Falha ao buscar produtos",
      detalhe: erro.message,
      codigo: erro.code || null,
      nome: erro.name
    });
  }
});

app.post("/api/products", asyncRoute(async (req, res) => {
  const body = req.body || {};

  const id = body.id !== undefined
    ? Number(body.id)
    : ((await Product.findOne()
        .sort({ id: -1 })
        .select("id")
        .lean())?.id || 0) + 1;

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({
      erro: "ID do produto inválido."
    });
  }

  if (!String(body.name || "").trim()) {
    return res.status(400).json({
      erro: "Informe o nome do produto."
    });
  }

  const product = await Product.create({
    id,
    gender: body.gender || "",
    name: String(body.name).trim(),
    category: body.category || "",
    label: body.label || "",
    price: Math.max(0, toNumber(body.price)),
    cost: Math.max(0, toNumber(body.cost)),
    stock: Math.max(0, Math.floor(toNumber(body.stock))),
    sizes: Array.isArray(body.sizes) ? body.sizes : [],
    description: body.description || "",
    likes: Math.max(0, Math.floor(toNumber(body.likes))),
    colors: Array.isArray(body.colors) ? body.colors : []
  });

  res.status(201).json({
    sucesso: true,
    produto: product
  });
}));

app.put("/api/products/:id", asyncRoute(async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id)) {
    return res.status(400).json({
      erro: "ID do produto inválido."
    });
  }

  const allowed = [
    "gender",
    "name",
    "category",
    "label",
    "price",
    "cost",
    "stock",
    "sizes",
    "description",
    "likes",
    "colors"
  ];

  const update = {};

  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(req.body || {}, key)) {
      update[key] = req.body[key];
    }
  }

  if (update.price !== undefined) {
    update.price = Math.max(0, toNumber(update.price));
  }

  if (update.cost !== undefined) {
    update.cost = Math.max(0, toNumber(update.cost));
  }

  if (update.stock !== undefined) {
    update.stock = Math.max(0, Math.floor(toNumber(update.stock)));
  }

  if (update.likes !== undefined) {
    update.likes = Math.max(0, Math.floor(toNumber(update.likes)));
  }

  const product = await Product.findOneAndUpdate(
    { id },
    { $set: update },
    { new: true, runValidators: true }
  );

  if (!product) {
    return res.status(404).json({
      erro: "Produto não encontrado."
    });
  }

  res.json({
    sucesso: true,
    produto: product
  });
}));

app.delete("/api/products/:id", asyncRoute(async (req, res) => {
  const id = Number(req.params.id);

  const product = await Product.findOneAndDelete({ id });

  if (!product) {
    return res.status(404).json({
      erro: "Produto não encontrado."
    });
  }

  res.json({ sucesso: true });
}));

app.post("/api/products/:id/like", asyncRoute(async (req, res) => {
  const product = await Product.findOneAndUpdate(
    { id: Number(req.params.id) },
    { $inc: { likes: 1 } },
    { new: true }
  );

  if (!product) {
    return res.status(404).json({
      erro: "Produto não encontrado."
    });
  }

  res.json({
    sucesso: true,
    likes: product.likes
  });
}));


// ========================================
// BANNERS
// ========================================

// LISTAR BANNERS
app.get("/api/banners", asyncRoute(async (req, res) => {
  const banners = await Banner.find()
    .sort({ order: 1, createdAt: 1 })
    .lean();

  res.json(banners);
}));

// ADICIONAR BANNER
app.post("/api/banners", asyncRoute(async (req, res) => {
  const image = String(req.body?.image || "");

  if (!image.startsWith("data:image/")) {
    return res.status(400).json({
      erro: "Imagem inválida."
    });
  }

  const banner = await Banner.create({
    id: newId("b"),
    image,
    order: Math.max(0, Math.floor(toNumber(req.body?.order)))
  });

  res.status(201).json({
    sucesso: true,
    banner
  });
}));

// ATUALIZAR ORDEM DOS BANNERS
app.put("/api/banners/order", asyncRoute(async (req, res) => {
  const ids = req.body?.ids;

  if (!Array.isArray(ids)) {
    return res.status(400).json({
      erro: "Lista de banners inválida."
    });
  }

  const operations = ids.map((id, index) => ({
    updateOne: {
      filter: { id: String(id) },
      update: { $set: { order: index } }
    }
  }));

  if (operations.length) {
    await Banner.bulkWrite(operations);
  }

  res.json({
    sucesso: true,
    mensagem: "Ordem dos banners atualizada."
  });
}));

// EXCLUIR BANNER
app.delete("/api/banners/:id", asyncRoute(async (req, res) => {
  const banner = await Banner.findOneAndDelete({
    id: req.params.id
  });

  if (!banner) {
    return res.status(404).json({
      erro: "Banner não encontrado."
    });
  }

  res.json({
    sucesso: true
  });
}));


// ========================================
// CLIENTES
// ========================================

app.get("/api/clients", asyncRoute(async (req, res) => {
  const clients = await Client.find({ active: true })
    .sort({ name: 1 })
    .lean();

  res.json(clients);
}));

app.post("/api/clients", asyncRoute(async (req, res) => {
  const name = String(req.body?.name || "").trim();
  const phone = String(req.body?.phone || "").trim();

  if (!name || !phone) {
    return res.status(400).json({
      erro: "Nome e telefone do cliente são obrigatórios."
    });
  }

  const client = await Client.create({
    id: newId("c"),
    name,
    phone,
    notes: String(req.body?.notes || "").trim(),
    active: true
  });

  res.status(201).json({
    sucesso: true,
    cliente: client
  });
}));

app.put("/api/clients/:id", asyncRoute(async (req, res) => {
  const update = {};

  if (req.body?.name !== undefined) {
    update.name = String(req.body.name).trim();
  }

  if (req.body?.phone !== undefined) {
    update.phone = String(req.body.phone).trim();
  }

  if (req.body?.notes !== undefined) {
    update.notes = String(req.body.notes).trim();
  }

  const client = await Client.findOneAndUpdate(
    {
      id: req.params.id,
      active: true
    },
    { $set: update },
    { new: true, runValidators: true }
  );

  if (!client) {
    return res.status(404).json({
      erro: "Cliente não encontrado."
    });
  }

  res.json({
    sucesso: true,
    cliente: client
  });
}));

app.delete("/api/clients/:id", asyncRoute(async (req, res) => {
  const client = await Client.findOneAndUpdate(
    {
      id: req.params.id,
      active: true
    },
    { $set: { active: false } },
    { new: true }
  );

  if (!client) {
    return res.status(404).json({
      erro: "Cliente não encontrado."
    });
  }

  res.json({
    sucesso: true,
    mensagem: "Cliente arquivado; histórico preservado."
  });
}));

// ========================================
// VENDAS
// REGISTRA A VENDA E BAIXA O ESTOQUE
// ========================================

app.get("/api/sales", asyncRoute(async (req, res) => {
  const sales = await Sale.find()
    .sort({ date: -1 })
    .lean();

  res.json(sales);
}));

app.post("/api/sales", asyncRoute(async (req, res) => {
  const {
    clientId,
    productId,
    qty,
    unitPrice,
    entry = 0,
    installmentCount = 1,
    firstDueDate,
    intervalDays = 30
  } = req.body || {};

  const quantity = Math.floor(toNumber(qty));
  const productNumericId = Number(productId);
  const price = roundMoney(toNumber(unitPrice, NaN));
  const entryValue = roundMoney(toNumber(entry));
  const count = Math.floor(toNumber(installmentCount));
  const interval = Math.floor(toNumber(intervalDays));

  if (
    !clientId ||
    !Number.isInteger(productNumericId) ||
    !Number.isInteger(quantity) ||
    quantity < 1 ||
    !Number.isFinite(price) ||
    price < 0 ||
    !Number.isFinite(entryValue) ||
    entryValue < 0 ||
    !Number.isInteger(count) ||
    count < 1 ||
    count > 36 ||
    ![7, 15, 30].includes(interval) ||
    !isValidDate(firstDueDate)
  ) {
    return res.status(400).json({
      erro: "Dados da venda inválidos. Confira cliente, produto, quantidade, valores e vencimento."
    });
  }

  const session = await mongoose.startSession();

  let responseData;

  try {
    await session.withTransaction(async () => {
      const client = await Client.findOne({
        id: String(clientId),
        active: true
      }).session(session);

      if (!client) {
        throw Object.assign(
          new Error("Cliente não encontrado."),
          { statusCode: 404 }
        );
      }

      const product = await Product.findOneAndUpdate(
        {
          id: productNumericId,
          stock: { $gte: quantity }
        },
        {
          $inc: { stock: -quantity }
        },
        {
          new: true,
          session
        }
      );

      if (!product) {
        const exists = await Product.findOne({
          id: productNumericId
        }).session(session);

        if (!exists) {
          throw Object.assign(
            new Error("Produto não encontrado."),
            { statusCode: 404 }
          );
        }

        throw Object.assign(
          new Error(`Estoque insuficiente. Disponível: ${exists.stock} unidade(s).`),
          { statusCode: 409 }
        );
      }

      const total = roundMoney(quantity * price);

      if (entryValue > total) {
        throw Object.assign(
          new Error("A entrada não pode ser maior que o total da venda."),
          { statusCode: 400 }
        );
      }

      const remaining = roundMoney(total - entryValue);
      const saleId = newId("v");

      const profit = roundMoney(
        (price - Number(product.cost || 0)) * quantity
      );

      const sale = new Sale({
        id: saleId,
        clientId: client.id,
        clientName: client.name,
        productId: product.id,
        productName: product.name,
        qty: quantity,
        unitPrice: price,
        unitCost: Number(product.cost || 0),
        total,
        entry: entryValue,
        profit,
        installmentCount: remaining > 0 ? count : 0,
        date: new Date()
      });

      await sale.save({ session });

      const createdInstallments = [];

      if (remaining > 0) {
        const baseAmount =
          Math.floor((remaining / count) * 100) / 100;

        let allocated = 0;

        for (let index = 0; index < count; index++) {
          const amount = index === count - 1
            ? roundMoney(remaining - allocated)
            : baseAmount;

          allocated = roundMoney(allocated + amount);

          createdInstallments.push({
            id: newId("p"),
            saleId,
            clientId: client.id,
            clientName: client.name,
            productName: product.name,
            amount,
            dueDate: addDays(
              firstDueDate,
              index * interval
            ),
            paidAmount: 0,
            paid: false,
            payments: []
          });
        }

        await Installment.insertMany(
          createdInstallments,
          { session }
        );
      }

      responseData = {
        venda: sale.toObject(),
        parcelas: createdInstallments,
        estoqueAtualizado: product.stock
      };
    });

    res.status(201).json({
      sucesso: true,
      ...responseData
    });

  } finally {
    await session.endSession();
  }
}));

// ========================================
// PARCELAS E PAGAMENTOS
// PAGAMENTO NÃO ALTERA O ESTOQUE
// ========================================

app.get("/api/installments", asyncRoute(async (req, res) => {
  const installments = await Installment.find()
    .sort({ dueDate: 1 })
    .lean();

  res.json(installments);
}));

app.post("/api/installments/:id/payments", asyncRoute(async (req, res) => {
  const amount = roundMoney(
    toNumber(req.body?.amount, NaN)
  );

  if (!Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({
      erro: "Informe um valor de pagamento válido."
    });
  }

  const installment = await Installment.findOne({
    id: req.params.id
  });

  if (!installment) {
    return res.status(404).json({
      erro: "Parcela não encontrada."
    });
  }

  const balance = roundMoney(
    installment.amount - installment.paidAmount
  );

  if (amount > balance + 0.009) {
    return res.status(400).json({
      erro: "O pagamento não pode ser maior que o saldo da parcela."
    });
  }

  installment.paidAmount = roundMoney(
    installment.paidAmount + amount
  );

  installment.paid =
    installment.paidAmount >= installment.amount - 0.009;

  installment.payments.push({
    amount,
    paidAt: new Date()
  });

  await installment.save();

  res.json({
    sucesso: true,
    parcela: installment
  });
}));

// ========================================
// DASHBOARD
// ========================================

app.get("/api/dashboard", asyncRoute(async (req, res) => {
  const [
    products,
    sales,
    clients,
    installments
  ] = await Promise.all([
    Product.find().lean(),
    Sale.find().lean(),
    Client.countDocuments({ active: true }),
    Installment.find().lean()
  ]);

  const revenue = roundMoney(
    sales.reduce(
      (sum, sale) => sum + Number(sale.total || 0),
      0
    )
  );

  const realizedProfit = roundMoney(
    sales.reduce(
      (sum, sale) => sum + Number(sale.profit || 0),
      0
    )
  );

  const inventoryInvestment = roundMoney(
    products.reduce(
      (sum, p) =>
        sum + Number(p.stock || 0) * Number(p.cost || 0),
      0
    )
  );

  const potentialProfit = roundMoney(
    products.reduce(
      (sum, p) =>
        sum +
        Number(p.stock || 0) *
        (Number(p.price || 0) - Number(p.cost || 0)),
      0
    )
  );

  const receivedFromEntries = sales.reduce(
    (sum, sale) => sum + Number(sale.entry || 0),
    0
  );

  const receivedFromInstallments = installments.reduce(
    (sum, item) => sum + Number(item.paidAmount || 0),
    0
  );

  const pending = installments
    .filter(item => !item.paid)
    .reduce(
      (sum, item) =>
        sum +
        Number(item.amount || 0) -
        Number(item.paidAmount || 0),
      0
    );

  res.json({
    sucesso: true,
    faturamento: revenue,
    lucroRealizado: realizedProfit,
    investimentoEstoque: inventoryInvestment,
    lucroPotencialEstoque: potentialProfit,
    produtosCadastrados: products.length,
    unidadesEmEstoque: products.reduce(
      (sum, p) => sum + Number(p.stock || 0),
      0
    ),
    clientes,
    pagamentosRecebidos: roundMoney(
      receivedFromEntries + receivedFromInstallments
    ),
    parcelasPendentes: roundMoney(pending),
    quantidadeParcelasPendentes:
      installments.filter(item => !item.paid).length
  });
}));

// ========================================
// TRATAMENTO DE ERROS
// ========================================

app.use((req, res) => {
  res.status(404).json({
    erro: "Rota não encontrada."
  });
});

app.use((erro, req, res, next) => {
  console.error("Erro na API:", erro);

  if (erro.code === 11000) {
    return res.status(409).json({
      erro: "Já existe um registro com esse identificador."
    });
  }

  if (
    erro.name === "ValidationError" ||
    erro.name === "CastError"
  ) {
    return res.status(400).json({
      erro: "Dados inválidos.",
      detalhe: erro.message
    });
  }

  res.status(erro.statusCode || 500).json({
    erro: erro.statusCode
      ? erro.message
      : "Erro interno do servidor."
  });
});

// ========================================
// INICIAR SERVIDOR
// ========================================

async function startServer() {
  try {
    await mongoose.connect(MONGODB_URI);

    console.log("MongoDB conectado com sucesso!");

    app.listen(PORT, () => {
      console.log(`CM Modas rodando na porta ${PORT}`);
    });

  } catch (erro) {
    console.error(
      "Não foi possível conectar ao MongoDB:",
      erro.message
    );

    process.exit(1);
  }
}
if (require.main === module) {
  startServer();
}

module.exports = app;