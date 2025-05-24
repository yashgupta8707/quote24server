const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const bodyParser = require("body-parser");
const morgan = require("morgan");
const helmet = require("helmet");

dotenv.config();

const app = express();

// Middleware
app.use(
  cors({
    origin: [
      "http://192.168.0.147:5173",
      "http://localhost:5173",
      "https://www.yashgupta.engineer",
      "https://frontend-testing-v2-1-latest.vercel.app",
      "https://www.cgclko.com",
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use(morgan("dev"));
app.use(helmet());
app.use(bodyParser.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {})
.then(() => console.log('MongoDB Connected'))
.catch(err => console.log(err));

// API Routes
app.use('/api', require('./routes/api'));

// Serve static assets if in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static('../client/build'));
  
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../', 'client', 'build', 'index.html'));
  });
}

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));