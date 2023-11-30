import * as dotenv from "dotenv";
import mq_connect from "./client.js";

dotenv.config();

const mq_exchange = process.env.RABBITMQ_EXCHANGE;

export default async function createQueue() {
	const connection = await mq_connect();
	const channel = await connection.createChannel();

	// Make sure the exchange is durable
	await channel.assertExchange(mq_exchange, "topic", {
		durable: true,
	});

	const topics = [
		"notification.like",
		"notification.follow",
		"notification.uploadListing",
		"notification.message",
		"notification.order",
	];

	const queues = await Promise.all(
		topics.map(async (topic) => {
			const { queue } = await channel.assertQueue(topic, { durable: true });
			await channel.bindQueue(queue, mq_exchange, topic);
			console.log(`finish binding queue ${queue} to exchange ${mq_exchange} with topic ${topic}`);
			return queue;
		}),
	);

	return { channel, queues };
}
