import * as dotenv from "dotenv";

dotenv.config();

const worker_func = {
	"notification.like": async (redisClient, message) => {
		if (!redisClient.isOpen || !redisClient.isReady) {
			console.log("redis client not ready, reconnecting...");
			await redisClient.connect();
		}
		const isMember = await redisClient.SISMEMBER("connectedClients", message.seller_name);
		if (isMember) {
			redisClient.publish(`messages:${message.seller_name}`, JSON.stringify(message));
		}
	},
	"notification.follow": async (redisClient, message) => {
		if (!redisClient.isOpen || !redisClient.isReady) {
			console.log("redis client not ready, reconnecting...");
			await redisClient.connect();
		}
		const isMember = await redisClient.SISMEMBER("connectedClients", message.followed_user);
		if (isMember) {
			redisClient.publish(`messages:${message.followed_user}`, JSON.stringify(message));
		}
	},
	"notification.uploadListing": async (redisClient, message) => {
		if (!redisClient.isOpen || !redisClient.isReady) {
			console.log("redis client not ready, reconnecting...");
			await redisClient.connect();
		}
		const followers = await redisClient.SMEMBERS(`user:${message.username}:followers`);
		if (followers) {
			followers.forEach((follower) => {
				redisClient.publish(`messages:${follower}`, JSON.stringify(message));
			});
		}
	},
	"notification.message": async (redisClient, message) => {
		if (!redisClient.isOpen || !redisClient.isReady) {
			console.log("redis client not ready, reconnecting...");
			await redisClient.connect();
		}
		const receiver = message.sender_name === message.seller_name ? message.buyer_name : message.seller_name;
		const isMember = await redisClient.SISMEMBER("connectedClients", receiver);
		if (isMember) {
			redisClient.publish(`messages:${receiver}`, JSON.stringify(message));
		}
	},
	/* "notification.order": async (redisClient, message) => {
		
	}, */
};

async function mq_consumer(channel, queues, redisClient) {
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
						worker_func[`${msg.fields.routingKey}`](redisClient, message);

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
