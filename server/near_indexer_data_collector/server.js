const cors = require("cors");
require("dotenv").config();
const express = require("express");
const fs = require("fs");
const helmet = require("helmet");
const https = require("https");
const cron = require('node-cron')
const auth = require("./app/config/auth.config");
const txRepository = require("./app/repositories/transaction.repository");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const db = require("./app/models");
//console.log(db.url);
db.mongoose
  .connect(db.url, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => {
    console.log("Connected to the database!");
  })
  .catch(err => {
    console.log("Cannot connect to the database!", err);
    process.exit();
  });

// Starts the scheduled task.
cron.schedule('*/1 * * * *', () =>  {
  console.log('cronjob running every 1min')
  txRepository.storeTransactionsToCache();
}, { scheduled: true })

let basicAuth = (req, res, next) => {
  if (req.headers.authorization !== `Basic ${auth.authorization}`) {
    // Access denied
    return res.status(401).send('Authentication required.');
  }
  // Access granted...
  next();
};
app.use(basicAuth);

app.get('/', (req, res) => {
  res.send('Hello World!')
})

require("./app/routes/collector.routes")(app);

const options = {
  key: fs.readFileSync("/var/www/near_indexer_data_collector/server.key"),
  cert: fs.readFileSync("/var/www/near_indexer_data_collector/server.crt"),
  dhparam: fs.readFileSync("/var/www/near_indexer_data_collector/dh-strong.pem"),
};
app.use(helmet());

// Set HTTP port
app.listen(8000);

// Set HTTPS port, listen for requests
const PORT = process.env.NODE_DOCKER_PORT || 8080;
https.createServer(options, app).listen(PORT, () => {
  console.log(`Server is running on port ${PORT}.`);
});
