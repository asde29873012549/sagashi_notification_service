import * as dotenv from "dotenv";
import Cookies from "cookies";
import { jwtDecrypt } from "jose";
import hkdf from "@panva/hkdf";
import createRedisClient from "../../redis/client.js";
import mq_consumer from "../../rabbitmq/consumer.js";

dotenv.config();

const { JWT_TOKEN_SECRET } = process.env;
const { JWT_INFO } = process.env;
const { BACKEND_SERVER } = process.env;

async function getDerivedEncryptionKey(secret) {
	return hkdf("sha256", secret, "", JWT_INFO, 32);
}

export default async function getServerSentEvents(req, res, channel, queues) {
	// set headers for server sent events
	res.setHeader("Content-Type", "text/event-stream");
	res.setHeader("Cache-Control", "no-cache");
	res.setHeader("Connection", "keep-alive");
	res.flushHeaders();

	// connect to redis instance
	const redisClient = await createRedisClient();

	// start consuming messages from rabbitmq
	mq_consumer(channel, queues, redisClient);

	// get nextauth token from cookies
	const cookies = new Cookies(req, res);
	const NextAuthJwtToken = cookies.get("next-auth.session-token");
	let payload = null;

	try {
		const key = await getDerivedEncryptionKey(JWT_TOKEN_SECRET);

		// decrypt jwt token to get username
		const result = await jwtDecrypt(NextAuthJwtToken, key, {
			clockTolerance: 15,
		});

		payload = result.payload;

		const jwtToken = payload.accessToken;

		// Retrieve the list of users followed by the current user from the main backend service.
		const response = await fetch(`${BACKEND_SERVER}/notification/subscriber`, {
			method: "GET",
			headers: {
				Authorization: `Bearer ${jwtToken}`,
			},
		});

		const subscribedUserApiRes = await response.json();
		console.log("get subscribed user list", subscribedUserApiRes);
		// List of users followed by the current user
		const listOfFollowedUser = subscribedUserApiRes.status === "success" ? subscribedUserApiRes.data : null;

		// create redis pub/sub channel
		const redisPubSub = redisClient.duplicate();

		req.on("close", async () => {
			await redisPubSub.unsubscribe();
			await redisPubSub.quit();
			await redisClient.sRem("connectedClients", payload.username);
			await redisClient.del(`user:${payload.username}:followers`);
			await redisClient.quit();
		});

        await redisPubSub.connect();
		// subscribe to current connected client specific channel
        await redisPubSub.subscribe(`messages:${payload.username}`, (message) => {
            res.write(`data: ${message}\n\n`);
        });

		// add current connected client to redis store for tracking
		await redisClient.sAdd("connectedClients", payload.username);

		// add all followed users as keys to redis store and the user who followed them into the SET values
		const followedUsers = listOfFollowedUser && listOfFollowedUser.map(
			(followed_user) => () =>
				redisClient.sAdd(`user:${followed_user.user_name}:followers`, payload.username),
		);
		// Add all followed users to redis store
		if (followedUsers) await Promise.all(followedUsers.map((followedUser) => followedUser()));
		console.log("finish adding all followed users to redis store");
	} catch (err) {
		console.log("serverSentEventEndpointError", err);
	}
}
