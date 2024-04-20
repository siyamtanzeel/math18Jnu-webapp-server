const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.port || 5000;
require("dotenv").config();
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
app.use(
  cors({
    origin: ["http://localhost:5173", ""],
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
    const educationalVideos = eccentric18.collection("educationalVideos");
    const docs = eccentric18.collection("docs");

    //Middlewares
    const verifyToken = (req, res, next) => {
      const token = req?.cookies?.token;
      if (!token) {
        return res.status(401).send({ message: "Unauthorized Access" });
      }
      jwt.verify(token, process.env.SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "Unauthorized Access" });
        }
        req.user = decoded;
        next();
      });
    };
    const authorization = async (req, res, next) => {
      const user = req.user;
      const result = await studentInfo.findOne({ email: user.email });
      if (!result) {
      }
      if (!result.isAdmin) {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };
    //loading Gallery Images
    app.get("/gallery", async (req, res) => {
      const result = await gallery.find().toArray();
      res.send(result);
    });
    //Resources Section
    //links
    app.get("/resources", async (req, res) => {
      const result = await resources.find().toArray();
      res.send(result);
    });
    //videos
    app.get("/educationalVideos", async (req, res) => {
      const result = await educationalVideos.find().toArray();
      res.send(result);
    });
    //docs
    app.get("/docs", async (req, res) => {
      const result = await docs.find().toArray();
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
        expiresIn: "1h",
      });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: true,
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
    app.post("/logout", (req, res) => {
      res
        .clearCookie("token")
        .status(200)
        .send({ message: "logged out successfully" });
    });
    app.post("/pendingUser", async (req, res) => {
      const user = req.body;
      const result = await pendingUsers.insertOne(user);
      res.send(result);
    });
    //Admin Routes
    app.get(
      "/admin/pendingUsers",
      verifyToken,
      authorization,
      async (req, res) => {
        const result = await pendingUsers.find().toArray();
        res.send(result);
      }
    );
    app.get(
      "/admin/allStudents",
      verifyToken,
      authorization,
      async (req, res) => {
        console.log(req.query.email);
        if (req.user.email !== req.query.email) {
          return res.status(403).send({ message: "forbidden access" });
        }
        const result = await studentInfo.find().toArray();

        res.send(result);
      }
    );
    app.delete(
      "/admin/student/:id",
      verifyToken,
      authorization,
      async (req, res) => {
        const id = req.params.id;
        const result = await studentInfo.deleteOne({ _id: new ObjectId(id) });
        res.send(result);
      }
    );
    app.get(
      "/admin/video/:id",
      verifyToken,
      authorization,
      async (req, res) => {
        const id = req.params.id;
        const result = await educationalVideos.findOne({
          _id: new ObjectId(id),
        });
        res.send(result);
      }
    );
    app.put(
      "/admin/updateVideo/:id",
      verifyToken,
      authorization,
      async (req, res) => {
        const id = req.params.id;
        const { title, term, privacy, videoURLs } = req.body;
        const updatedVideo = {
          $set: {
            title: title,
            term: term,
            privacy: privacy,
            videoURLs: videoURLs,
          },
        };
        const filter = { _id: new ObjectId(id) };
        const options = { upsert: true };
        const result = await educationalVideos.updateOne(
          filter,
          updatedVideo,
          options
        );
        // const result = await educationalVideos.findOne({
        //   _id: new ObjectId(id),
        // });
        res.send(result);
      }
    );
    app.post(
      "/admin/addVideo/",
      verifyToken,
      authorization,
      async (req, res) => {
        const video = req.body;

        const result = await educationalVideos.insertOne(video);

        res.send(result);
      }
    );
    app.delete(
      "/admin/deleteVideo/:id",
      verifyToken,
      authorization,
      async (req, res) => {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const result = await educationalVideos.deleteOne(filter);
        res.send(result);
      }
    );
    app.put(
      "/admin/updateDoc/:id",
      verifyToken,
      authorization,
      async (req, res) => {
        const id = req.params.id;
        const { title, link, media, category, privacy, term, iat } = req.body;
        const updatedDoc = {
          $set: {
            title: title,
            link: link,
            media: media,
            category: category,
            privacy: privacy,
            term: term,
            iat: iat,
          },
        };
        const filter = { _id: new ObjectId(id) };
        const options = { upsert: true };
        const result = await docs.updateOne(filter, updatedDoc, options);
        // const result = await educationalVideos.findOne({
        //   _id: new ObjectId(id),
        // });
        res.send(result);
      }
    );
    app.post("/admin/addDoc/", verifyToken, authorization, async (req, res) => {
      const doc = req.body;

      const result = await docs.insertOne(doc);

      res.send(result);
    });
    app.delete(
      "/admin/deleteDoc/:id",
      verifyToken,
      authorization,
      async (req, res) => {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const result = await docs.deleteOne(filter);
        res.send(result);
      }
    );
    app.get("/admin/link/:id", verifyToken, authorization, async (req, res) => {
      const id = req.params.id;
      const result = await resources.findOne({
        _id: new ObjectId(id),
      });
      res.send(result);
    });
    app.post(
      "/admin/addLink/",
      verifyToken,
      authorization,
      async (req, res) => {
        const link = req.body;

        const result = await resources.insertOne(link);

        res.send(result);
      }
    );
    app.delete(
      "/admin/deleteLink/:id",
      verifyToken,
      authorization,
      async (req, res) => {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const result = await resources.deleteOne(filter);
        res.send(result);
      }
    );
    app.put(
      "/admin/updateLink/:id",
      verifyToken,
      authorization,
      async (req, res) => {
        const id = req.params.id;
        const { title, link, access } = req.body;
        const updatedLink = {
          $set: {
            title: title,
            link: link,
            access,
          },
        };
        const filter = { _id: new ObjectId(id) };
        const options = { upsert: true };
        const result = await resources.updateOne(filter, updatedLink, options);
        // const result = await educationalVideos.findOne({
        //   _id: new ObjectId(id),
        // });
        res.send(result);
      }
    );
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
