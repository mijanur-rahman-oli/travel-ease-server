const express = require('express')
const cors = require('cors')
const { MongoClient, ServerApiVersion } = require('mongodb');
const { ObjectId } = require('mongodb');
const admin = require("firebase-admin");
require('dotenv').config()
const serviceAccount = require("./serviceKey.json");
const app = express()
const port = 3000

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


async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const db = client.db('travelEase')
    const vehicleCollection = db.collection('vehicles')
    const bookingCollection = db.collection('bookings')
    
    // get
    app.get("/vehicles", async (req, res) => {
      const result = await vehicleCollection.find().toArray();
      res.send(result);
    });

    app.get("/vehicles/:id", verifyToken, async (req, res) => {
      const { id } = req.params;
      const objectId = new ObjectId(id);
      const result = await vehicleCollection.findOne({ _id: objectId });
      res.send({
        success: true,
        result,
      });
    });

    // post 
    app.post("/vehicles", async (req, res) => {
      const data = req.body;
      const result = await vehicleCollection.insertOne(data);
      res.send({
        success: true,
        result,
      });
    });

    // Update
    app.put("/vehicles/:id", async (req, res) => {
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
    });

    // delete
    app.delete("/vehicles/:id", async (req, res) => {
      const { id } = req.params;
      console.log(id)
      const result = await vehicleCollection.deleteOne({ _id: new ObjectId(id) });

      res.send({
        success: true,
        result,
      });
    });

  
    app.get("/latest-vehicles", async (req, res) => {
      const result = await vehicleCollection
        .find()
        .sort({ createdAt: "desc" })
        .limit(6)
        .toArray();
      res.send(result);
    });


    app.get("/my-vehicles", verifyToken, async (req, res) => {
      const email = req.query.email
      const result = await vehicleCollection.find({ userEmail: email }).toArray()
      res.send({
        success: true,
        vehicles: result
      })
    })

    // Search
    app.get("/search", async (req, res) => {
      try {
        const search_text = req.query.search;

        if (!search_text) {
          return res.status(400).send({ error: "Search parameter is required" });
        }
        const result = await vehicleCollection.find({ vehicleName: { $regex: search_text, $options: "i" } }).toArray();
        res.send(result);
      } catch (error) {
        console.error("Search error:", error);
        res.status(500).send({ error: error.message });
      }
    });

    
    // booking
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

    // Update booking
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

    // Delete booking
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


    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send("server is running fine!!")
})

app.listen(port, () => {
  console.log(`Server is listening on port ${port}`)
})