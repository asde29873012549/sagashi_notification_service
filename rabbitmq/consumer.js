import * as dotenv from "dotenv";

dotenv.config();

const worker_func = {
	"notification.like": async (clients, redisClient, message) => {
		const isMember = await redisClient.SISMEMBER("connectedClients", message.seller_name);
		if (isMember) {
			const responseObject = clients.get(message.seller_name);
			if (responseObject) responseObject.write(`data:${JSON.stringify(message)}\n\n`);
		}
	},
	"notification.follow": async (clients, redisClient, message) => {
		const isMember = await redisClient.SISMEMBER("connectedClients", message.followed_user);
		if (isMember) {
			const responseObject = clients.get(message.followed_user);
			if (responseObject) responseObject.write(`data:${JSON.stringify(message)}\n\n`);
		}
	},
	"notification.uploadListing": async (clients, redisClient, message) => {
		const followers = await redisClient.SMEMBERS(`user:${message.username}:followers`);
		if (followers) {
			followers.forEach((follower) => {
				const responseObject = clients.get(follower);
				if (responseObject) responseObject.write(`data:${JSON.stringify(message)}\n\n`);
			});
		}
	},
	/* "notification.order": async (clients, redisClient, message) => {
		
	}, */
};

async function mq_consumer(channel, queues, clients, redisClient) {
	try {
		queues.forEach((queue) => {
			console.log(`start consuming queue ${queue}`);
			channel.consume(
				queue,
				async (msg) => {
					try {
						const message = JSON.parse(msg.content.toString());
						console.log(message, "message");
						console.log(msg.fields.routingKey, "routingKey");
						worker_func[`${msg.fields.routingKey}`](clients, redisClient, message);

						channel.ack(msg);
					} catch (err) {
						channel.nack(msg, false, true /* requeue? */);
						console.log(err);
					}
				},
				{
					noAck: false, // This turns off the auto-acknowledgement of rabbitmq's default
				},
			);
		});
	} catch (err) {
		console.log(err);
		// connection.close()
	}
}

export default mq_consumer;
