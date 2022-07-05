/** BizTime express application. */


const express = require("express");
const companyRoutes = require("./routes/companies");
const invoiceRoutes = require("./routes/invoices");
const industryRoutes = require("./routes/industries");
const app = express();
const ExpressError = require("./expressError");

app.use(express.json());

/** Routes Section 0*/
app.use('/companies', companyRoutes);

app.use('/invoices', invoiceRoutes);

app.use('/industries', industryRoutes);

/** 404 handler */

app.use(function (req, res, next) {
  const err = new ExpressError("Not Found", 404);
  return next(err);
});

/** general error handler */

app.use((err, req, res, next) => {
  res.status(err.status || 500);

  return res.json({
    error: err
  });
});


module.exports = app;
