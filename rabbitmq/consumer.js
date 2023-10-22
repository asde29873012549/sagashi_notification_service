import * as dotenv from "dotenv";

dotenv.config();

const mq_queue = process.env.RABBITMQ_QUEUE;

async function mq_consumer(channel, clients, redisClient) {
	try {
		channel.consume(
			mq_queue,
			async (message) => {
				const res = JSON.parse(message.content.toString());

				if (res) {

					try {
						const connectedClient = await redisClient.lRange("connectedClients", 0, -1);
						connectedClient?.forEach((client) => {
							const responseObject = clients.get(client);
							if (responseObject) responseObject.write(`data:${JSON.stringify(res)}\n\n`);
						});

						channel.ack(message);
					} catch (err) {
						console.log(err);
					}
				
				}
			},
			{
				noAck: false,
			},
		);
	} catch (err) {
		console.log(err);
		// connection.close()
	}
}

export default mq_consumer;
