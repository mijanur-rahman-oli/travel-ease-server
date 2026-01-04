const express = require('express')
const cors = require('cors')
const { MongoClient, ServerApiVersion } = require('mongodb');
const { ObjectId } = require('mongodb');
const admin = require("firebase-admin");
require('dotenv').config()
const serviceAccount = require("./serviceAppKey.json");
const app = express()
const port = process.env.PORT || 3000

app.use(cors())
app.use(express.json())

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.rdbasnp.mongodb.net/?appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

const verifyToken = async (req, res, next) => {
  const authorization = req.headers.authorization;

  if (!authorization) {
    return res.status(401).send({
      message: "unauthorized access. Token not found!",
    });
  }

  const token = authorization.split(" ")[1];
  try {
    await admin.auth().verifyIdToken(token);
    next();
  } catch (error) {
    res.status(401).send({
      message: "unauthorized access.",
    });
  }
};

// Initialize collections as null
let vehicleCollection = null;
let bookingCollection = null;

async function run() {
  try {
    await client.connect();
    console.log("Connected to MongoDB!");

    const db = client.db('travelEase')
    vehicleCollection = db.collection('vehicles')
    bookingCollection = db.collection('bookings')

    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } catch (error) {
    console.error("MongoDB connection error:", error);
  }
}

// Run the connection
run().catch(console.dir);

// Root route
app.get('/', (req, res) => {
  res.send("server is running fine!!")
})

// ==================== VEHICLE ROUTES ====================

// GET all vehicles - PUBLIC (no auth needed)
app.get("/vehicles", async (req, res) => {
  try {
    const result = await vehicleCollection.find().toArray();
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// GET single vehicle - PUBLIC (no auth needed)
app.get("/vehicles/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const objectId = new ObjectId(id);
    const result = await vehicleCollection.findOne({ _id: objectId });
    res.send({
      success: true,
      result,
    });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// POST new vehicle - PROTECTED (needs auth)
app.post("/vehicles", verifyToken, async (req, res) => {
  try {
    const data = req.body;
    const result = await vehicleCollection.insertOne(data);
    res.send({
      success: true,
      result,
    });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// UPDATE vehicle - PROTECTED (needs auth)
app.put("/vehicles/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const objectId = new ObjectId(id);
    const filter = { _id: objectId };
    const update = {
      $set: data,
    };

    const result = await vehicleCollection.updateOne(filter, update);

    res.send({
      success: true,
      result,
    });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// DELETE vehicle - PROTECTED (needs auth)
app.delete("/vehicles/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await vehicleCollection.deleteOne({ _id: new ObjectId(id) });

    res.send({
      success: true,
      result,
    });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// GET latest vehicles - PUBLIC (no auth needed)
app.get("/latest-vehicles", async (req, res) => {
  try {
    const result = await vehicleCollection
      .find()
      .sort({ createdAt: "desc" })
      .limit(6)
      .toArray();
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// GET user's vehicles - PROTECTED (needs auth)
app.get("/my-vehicles", verifyToken, async (req, res) => {
  try {
    const email = req.query.email
    const result = await vehicleCollection.find({ userEmail: email }).toArray()
    res.send({
      success: true,
      vehicles: result
    })
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
})

// Search vehicles - PUBLIC (no auth needed)
app.get("/search", async (req, res) => {
  try {
    const search_text = req.query.search;

    if (!search_text) {
      return res.status(400).send({ error: "Search parameter is required" });
    }
    const result = await vehicleCollection.find({ 
      vehicleName: { $regex: search_text, $options: "i" } 
    }).toArray();
    res.send(result);
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).send({ error: error.message });
  }
});

// ==================== BOOKING ROUTES ====================

// POST booking - PROTECTED
app.post("/bookings", verifyToken, async (req, res) => {
  try {
    const bookingData = req.body;
    bookingData.createdAt = new Date();
    const result = await bookingCollection.insertOne(bookingData);

    res.send({
      success: true,
      insertedId: result.insertedId,
      message: "Booking created successfully"
    });
  } catch (error) {
    console.error("Booking error:", error);
    res.status(500).send({
      success: false,
      error: error.message
    });
  }
});

// GET my bookings - PROTECTED
app.get("/my-bookings", verifyToken, async (req, res) => {
  try {
    const email = req.query.email;

    if (!email) {
      return res.status(400).send({ error: "Email parameter is required" });
    }

    const result = await bookingCollection
      .find({ bookedBy: email })
      .sort({ createdAt: -1 })
      .toArray();

    res.send({
      success: true,
      bookings: result
    });
  } catch (error) {
    console.error("Fetch bookings error:", error);
    res.status(500).send({ error: error.message });
  }
});

// GET all bookings - PROTECTED
app.get("/bookings", verifyToken, async (req, res) => {
  try {
    const result = await bookingCollection
      .find()
      .sort({ createdAt: -1 })
      .toArray();

    res.send({
      success: true,
      bookings: result
    });
  } catch (error) {
    console.error("Fetch all bookings error:", error);
    res.status(500).send({ error: error.message });
  }
});

// PATCH booking - PROTECTED
app.patch("/bookings/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const objectId = new ObjectId(id);
    const filter = { _id: objectId };
    const update = {
      $set: {
        status,
        updatedAt: new Date()
      },
    };

    const result = await bookingCollection.updateOne(filter, update);

    res.send({
      success: true,
      result,
      message: "Booking status updated successfully"
    });
  } catch (error) {
    console.error("Update booking error:", error);
    res.status(500).send({ error: error.message });
  }
});

// DELETE booking - PROTECTED
app.delete("/bookings/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await bookingCollection.deleteOne({ _id: new ObjectId(id) });

    res.send({
      success: true,
      result,
      message: "Booking deleted successfully"
    });
  } catch (error) {
    console.error("Delete booking error:", error);
    res.status(500).send({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server is listening on port ${port}`)
})