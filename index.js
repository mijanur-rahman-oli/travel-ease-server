const express = require('express')
const cors = require('cors')
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config()
const app = express()
const port = 3000

app.use(cors())
app.use(express.json())


const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.rdbasnp.mongodb.net/?appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const db = client.db('travelEase')
    const vehicleCollection = db.collection('vehicles')


    // get
    app.get("/vehicles", async (req, res) => {
      const result = await vehicleCollection.find().toArray();
      res.send(result);
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

      console.log(result);

      res.send(result);
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
