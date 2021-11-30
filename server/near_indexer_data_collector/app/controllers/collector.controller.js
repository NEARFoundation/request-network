const txRepository = require("../repositories/transaction.repository");

exports.getTransactions = async (req, res) => {
  try {
    res.json({ success: true, data: await txRepository.getTransactionsFromCache() })
  } catch(e) {
    return res.status(500).send({ success: false, error: e.message})
  }
};
