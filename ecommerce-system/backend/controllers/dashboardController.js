const dashboardModel = require('../models/dashboardModel');

function summary(req, res) {
  res.json(dashboardModel.summary());
}

module.exports = { summary };
