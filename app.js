const express = require('express');
const path = require('path');
require('dotenv').config();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static('public'));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

const webRoutes = require('./routes/web.routes');
const apiRoutes = require('./routes/api.routes');

app.use('/', webRoutes);
app.use('/api', apiRoutes);

app.listen(process.env.PORT, () => {
  console.log("🚀 Running on port " + process.env.PORT);
});