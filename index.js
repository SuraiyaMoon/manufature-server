const express = require("express");
const app = express();
const cors = require("cors")
// const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;
require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');
app.use(cors());
app.use(express.json());



//mongodb
const uri = `mongodb+srv://${process.env.SECRET_USER}:${process.env.SECRET_PASS}@cluster0.higv1.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
async function run() {
    try {
        await client.connect();
        const toolCollection = client.db("tool_manufacture").collection("tools");
        console.log('mongo connected')



        //get all tools
        app.get('/tools', async (req, res) => {
            const query = {};
            const cursor = toolCollection.find(query);
            const tools = await cursor.toArray();
            res.send(tools)
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