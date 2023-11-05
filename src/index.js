import * as dotenv from "dotenv";
import express from "express";
import cors from "cors";
import createQueue from "../rabbitmq/createQueue.js";
import createRedisClient from "../redis/client.js";
import mq_consumer from "../rabbitmq/consumer.js";
import getServerSentEvents from "./services/getServerSentEvents.js";

dotenv.config();

const app = express();
const port = process.env.PORT;

const frontEndIP = process.env.FRONT_END_IP;

const cors_option = {
	origin: frontEndIP,
	allowedHeaders: "Content-Type, Authorization",
	credentials: true,
	maxAge: 600,
};

app.use(cors(cors_option));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// connect to rabbitmq instance and create channel & queues
const { channel, queues } = await createQueue();

// connect to redis instance
const redisClient = await createRedisClient();

// create a map to store connected clients
const clients = new Map();

// create a route for server sent events
app.get("/events", async (req, res) => getServerSentEvents(req, res, clients, redisClient));

// start consuming messages from rabbitmq
mq_consumer(channel, queues, clients, redisClient);

app.listen(port, () => {
	console.log("app start listening...");
});
