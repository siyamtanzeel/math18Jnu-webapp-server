const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.port || 5000;
require("dotenv").config();
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());

//MongoDB configurations
const { MongoClient, ServerApiVersion, Db, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.kzkabhj.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
//custom middlewares
const verifyUser = async (req, res, next) => {
  const user = req.body;
  const result = await studentInfo.findOne({ email: user.email });
  console.log(result);
  next();
};
async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );

    // Collections
    const eccentric18 = client.db("eccentric-18");
    const studentInfo = eccentric18.collection("studentInfo");
    const gallery = eccentric18.collection("galleryContents");
    const resources = eccentric18.collection("resources");
    const committee = eccentric18.collection("committee");
    const pendingUsers = eccentric18.collection("pendingUsers");
    //loading Gallery Images
    app.get("/gallery", async (req, res) => {
      const result = await gallery.find().toArray();
      res.send(result);
    });
    // Getting all the resources
    app.get("/resources", async (req, res) => {
      const result = await resources.find().toArray();
      res.send(result);
    });
    // Getting all students
    app.get("/students", async (req, res) => {
      const query = {};
      const options = {
        sort: {},
        projection: {
          _id: 0,
          telegram: 0,
          date_of_birth: 0,
        },
      };
      const result = await studentInfo.find(query, options).toArray();
      res.send(result);
    });
    app.get("/committee", async (req, res) => {
      const result = await committee.find().toArray();
      res.send(result);
    });
    app.get("/students/:blood_group", async (req, res) => {
      const blood_group = req.params.blood_group;
      const result = await studentInfo
        .find({ blood_group: blood_group })
        .toArray();
      res.send(result);
    });
    //Getting a specific student by ID
    app.get("/student/:id", async (req, res) => {
      const userId = req.params.id;
      const student = await studentInfo.findOne({ std_id: userId });
      res.send(student);
    });
    //Updating the profile of a User
    app.put("/student/:id", async (req, res) => {
      const userId = req.params.id;
      const changes = req.body;
      const {
        name,
        bio,
        description,
        college,
        phone,
        telegram,
        facebook,
        skills,
        blood_group,
        present_address,
        varsity_bus,
        home_district,
        date_of_birth,
        photoURL,
      } = changes;
      const updatedUser = {
        $set: {
          name: name,
          bio: bio,
          description: description,
          college: college,
          phone: phone,
          telegram: telegram,
          facebook: facebook,
          skills: skills,
          blood_group: blood_group,
          present_address: present_address,
          varsity_bus: varsity_bus,
          home_district: home_district,
          date_of_birth: date_of_birth,
          photoURL: photoURL,
        },
      };
      const filter = { std_id: userId };
      const options = { upsert: true };
      const result = await studentInfo.updateOne(filter, updatedUser, options);
      res.send(result);
    });
    // JWT token Generation
    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign({ email: user.email }, process.env.SECRET, {
        expiresIn: "1hr",
      });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: false,
          sameSite: "none",
        })
        .send({ success: true });
    });
    app.post("/userAuth/", async (req, res) => {
      const requestEmail = req.body.email;
      const options = {
        projection: {
          email: 1,
          name: 1,
          photoURL: 1,
          isAdmin: 1,
        },
      };
      const result = await studentInfo.findOne({ email: requestEmail });
      res.send(result);
    });
    app.post("/pendingUser", async (req, res) => {
      const user = req.body;
      const result = await pendingUsers.insertOne(user);
      res.send(result);
    });
    app.get("/admin/pendingUsers", async (req, res) => {
      const result = await pendingUsers.find().toArray();
      res.send(result);
    });
    //Admin Routes
    app.get("/admin/allStudents", async (req, res) => {
      const result = await studentInfo.find().toArray();
      res.send(result);
    });
    app.delete("/admin/student/:id", async (req, res) => {
      const id = req.params.id;
      const result = await studentInfo.deleteOne({ _id: new ObjectId(id) });
      res.send(result);
    });
  } finally {
    // Ensures that the client will close when you finish/error
    //   await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("app is running");
});
app.listen(port, () => {
  console.log(`app is running on port ${port}`);
});
