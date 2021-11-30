module.exports = async app => {
  const controller = require("../controllers/collector.controller");
  let router = require("express").Router();

  router.get("/transactions", await controller.getTransactions)

  app.use("/api", router);
}
