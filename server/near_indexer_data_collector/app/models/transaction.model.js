module.exports = mongoose => {
  let schema = mongoose.Schema(
    {
      transaction_hash: String,
      block_hash: String,
      block_timestamp: String,
      payer: String,
      payee: String,
      deposit: String,
      method_name: String,
      to: String,
      amount: String,
      payment_reference: String
    },
    { timestamps: false }
  );

  schema.method("toJSON", function() {
    const { __v, _id, ...object } = this.toObject();
    return object;
  });

  return mongoose.model("transaction", schema);
};
