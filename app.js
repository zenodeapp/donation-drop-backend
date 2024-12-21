const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
require("dotenv").config();

const verifyRoutes = require("./routes/verify");
const signInRoutes = require("./routes/signIn");
const errorHandler = require("./middlewares/errorHandler");

const app = express();
const port = process.env.PORT || 4000;

// Middleware
app.use(bodyParser.json());
app.use(cors()); // Enable CORS for all routes

const corsOptions =
  process.env.NODE_ENV === "production"
    ? {
        origin: function (origin, callback) {
          if (allowedOrigins.includes(origin)) {
            callback(null, true);
          } else {
            const error = new Error("No access to this endpoint.");
            error.status = 403; // HTTP status code for forbidden
            callback(error);
          }
        },
      }
    : undefined;

// POST endpoint for signature verification
app.use("/verify", cors(corsOptions), verifyRoutes);

// Route to fetch namAddress using a signature
app.use("/sign-in", cors(corsOptions), signInRoutes);

// Middleware to take care of errors
app.use(errorHandler);

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
