const express = require("express");
const app = express();
const cors = require("cors")
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
app.use(cors());
app.use(express.json());
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)



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
        const paymentCollection = client.db("tool_manufacture").collection("payment");
        const reviewCollection = client.db("tool_manufacture").collection("review");
        const userCollection = client.db("tool_manufacture").collection("users")


        //stripe order api
        app.post('/create-payment-intent', verifyJWT, async (req, res) => {
            const order = req.body;
            const price = order.price;
            const amount = price * 100;
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            });
            res.send({
                clientSecret: paymentIntent.client_secret
            })

        })





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
            const query = { _id: ObjectId(id) };
            const tools = await toolCollection.findOne(query)
            res.send(tools)
        })

        //post order collection 
        app.post('/order', async (req, res) => {
            const order = req.body;
            const orderResult = await orderCollection.insertOne(order)
            res.send(orderResult)
        })

        //
        app.patch('/order/:id', async (req, res) => {
            const id = req.params.id;
            const paymentInfo = req.body;
            const query = { _id: ObjectId(id) };

            const updateDoc = {
                $set: {
                    paid: true,
                    transactionId: paymentInfo.transactionId,
                    status: pending

                }

            }

            const updateOrder = await orderCollection.updateOne(query, updateDoc);
            const result = await paymentCollection.insertOne(paymentInfo)

            res.send(updateDoc)

        })

        //get order by email
        app.get('/orderByEmail', verifyJWT, async (req, res) => {

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

        //get order by id
        app.get('/order/:id', verifyJWT, async (req, res) => {

            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const order = await orderCollection.findOne(query)
            res.send(order)
        })



        //get all reviews
        app.get('/review', async (req, res) => {
            const query = {};
            const cursor = reviewCollection.find(query);
            const reviewResult = await cursor.toArray();
            res.send(reviewResult)
        })


        //add review api
        app.post('/review', verifyJWT, async (req, res) => {
            const review = req.body;
            const reviewResult = await reviewCollection.insertOne(review)
            res.send(reviewResult)
        })

        //add product api for admin
        app.post('/tool', verifyJWT, async (req, res) => {
            const product = req.body;
            const tools = await toolCollection.insertOne(product)
            res.send(tools)
        })
        //get all order api for admin
        app.get('/order', verifyJWT, async (req, res) => {
            const query = {};
            const cursor = await orderCollection.find(query);
            const orders = await cursor.toArray();
            res.send(orders)
        })

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

        //get admin
        app.get('/admin/:email', async (req, res) => {
            const email = req.params.email;
            const user = await userCollection.findOne({ email: email });
            const checkAdmin = user.role === 'admin';
            res.send({ admin: checkAdmin })
        })


        //set admin role
        app.put('/user/admin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const initiator = req.decoded.email;
            const initiatorAccount = await userCollection.findOne({ email: initiator });
            if (initiatorAccount.role === 'admin') {
                const filter = { email: email }
            const updateDoc = {
                $set: { role: 'admin' },
            };

            const result = await userCollection.updateOne(filter, updateDoc);
            res.send(result)
            }
            else {
                res.status(403).send({
                    message: 'Forbidden access'
                })
            }

        });

        //delete order api for normal user

        app.delete('/order/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await orderCollection.deleteOne(query);
            res.send(result)


        });

        //delete product
        app.delete('/tools/:id', async (req, res) => {
            const email = req.query.email;
            const id = req.params.id;
            const query = { _id: ObjectId(id), email }
            const result = await toolCollection.deleteOne(query);
            res.send(result)
        })

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