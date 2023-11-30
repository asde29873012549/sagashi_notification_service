import * as dotenv from "dotenv";
import Cookies from "cookies";
import { jwtDecrypt } from "jose";
import hkdf from "@panva/hkdf";

dotenv.config();

const { JWT_TOKEN_SECRET } = process.env;
const { JWT_INFO } = process.env;
const { BACKEND_SERVER } = process.env;

async function getDerivedEncryptionKey(secret) {
	return hkdf("sha256", secret, "", JWT_INFO, 32);
}

export default async function getServerSentEvents(req, res, clients, redisClient) {
	// set headers for server sent events
	res.setHeader("Content-Type", "text/event-stream");
	res.setHeader("Cache-Control", "no-cache");
	res.setHeader("Connection", "keep-alive");
	res.flushHeaders();

	// get nextauth token from cookies
	const cookies = new Cookies(req, res);
	const NextAuthJwtToken = cookies.get("next-auth.session-token");

	const key = await getDerivedEncryptionKey(JWT_TOKEN_SECRET);

	// decrypt jwt token to get username
	const { payload } = await jwtDecrypt(NextAuthJwtToken, key, {
		clockTolerance: 15,
	});

	const jwtToken = payload.accessToken;

	// fetch user subscriber from main backend service
	try {
		const response = await fetch(`${BACKEND_SERVER}/notification/subscriber`, {
			method: "GET",
			headers: {
				Authorization: `Bearer ${jwtToken}`,
			},
		});

		const subscriber = await response.json();
		const followed_users = subscriber.status === "success" ? subscriber.data : null;

		// add client res object to Map store with username as key
		if (clients.has(payload.username)) clients.delete(payload.username);
		clients.set(payload.username, res);

		// add client to redis store for tracking
		await redisClient.sAdd("connectedClients", payload.username);

		// add all followed users as keys to redis store and the user who followed them into the SET values
		const followedUsers = followed_users && followed_users.map(
			(followed_user) => () =>
				redisClient.sAdd(`user:${followed_user.user_name}:followers`, payload.username),
		);
		// Add all followed users to redis store
		if (followedUsers) await Promise.all(followedUsers.map((followedUser) => followedUser()));
		console.log("finish adding all followed users to redis store");
	} catch (err) {
		console.log(err);
	}

	req.on("close", async () => {
		clients.delete(payload.username);
		await redisClient.sRem("connectedClients", payload.username);
		await redisClient.del(`user:${payload.username}:followers`);
	});
}
