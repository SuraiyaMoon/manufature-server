const express = require("express");
const app = express();
const cors = require("cors")
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;
require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');
app.use(cors());
app.use(express.json());



//mongodb
const uri = `mongodb+srv://${process.env.SECRET_USER}:${process.env.SECRET_PASS}@cluster0.higv1.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
//jwt

async function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({
            message: 'Unauthorized Access'
        })
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
        if (err) {
            return res.status(403).send({
                message: 'Forbidden access'
            })
        }
        req.decoded = decoded;
        next()

    })



}

async function run() {
    try {
        await client.connect();
        const toolCollection = client.db("tool_manufacture").collection("tools");
        const orderCollection = client.db("tool_manufacture").collection("orders");
        const userCollection = client.db("tool_manufacture").collection("users")
        console.log('mongo connected')



        //get all tools
        app.get('/tools', async (req, res) => {
            const query = {};
            const cursor = toolCollection.find(query);
            const tools = await cursor.toArray();
            res.send(tools)
        })

        //get tools by id
        app.get('/tools/:id', async (req, res) => {

            const id = req.params.id;
            const query = { _id: id };
            const tools = await toolCollection.findOne(query)
            res.send(tools)
        })

        //post order collection 
        app.post('/order', async (req, res) => {
            const order = req.body;
            const orderResult = await orderCollection.insertOne(order)
            res.send(orderResult)
        })

        //get order by email
        app.get('/order', verifyJWT, async (req, res) => {

            const email = req.query.email;
            const decodedEmail = req.decoded.email;
            if (email === decodedEmail) {
                const query = { email: email };
                const cursor = orderCollection.find(query);
                const orders = await cursor.toArray();
                res.send(orders)
            }
            else {
                res.status(403).send({
                    message: 'Forbidden access'
                })
            }


        });

        //get all users
        app.get('/user', verifyJWT, async (req, res) => {
            const query = {};
            const cursor = userCollection.find(query);
            const users = await cursor.toArray();
            res.send(users)

        })



        //user updated or insert api
        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email }
            const option = { upsert: true };
            const updateDoc = {
                $set: user,
            };

            const result = await userCollection.updateOne(filter, updateDoc, option);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN, { expiresIn: '3h' })
            res.send({ result, token })

        });


        //set admin role
        app.put('/user/admin/:email', async (req, res) => {
            const email = req.params.email;
            const filter = { email: email }
            const updateDoc = {
                $set: { role: 'admin' },
            };

            const result = await userCollection.updateOne(filter, updateDoc);
            res.send(result)

        });

    }
    finally {

    }

}
run().catch(console.dir)





app.get('/', (req, res) => {
    res.send("Manufacture Server Running")
})


app.listen(port, () => {
    console.log(port, 'Running')
})