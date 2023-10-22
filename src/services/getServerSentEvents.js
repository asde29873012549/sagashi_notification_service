import * as dotenv from "dotenv";
import Cookies from "cookies";
import { jwtDecrypt } from "jose";
import hkdf from "@panva/hkdf";

dotenv.config();

const { JWT_TOKEN_SECRET } = process.env;
const { JWT_INFO } = process.env;

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
	const jwtToken = cookies.get("next-auth.session-token");

	const key = await getDerivedEncryptionKey(JWT_TOKEN_SECRET);

	// decrypt jwt token to get username
	const { payload } = await jwtDecrypt(jwtToken, key, {
		clockTolerance: 15,
	});

	// add client res object to Map store with username as key
	if (clients.has(payload.username)) clients.delete(payload.username);
	clients.set(payload.username, res);

	// add client to redis store for tracking
	await redisClient.lRem("connectedClients", 0, payload.username);
	await redisClient.rPush("connectedClients", payload.username);

	req.on("close", async () => {
		clients.delete(payload.username);
		await redisClient.lRem("connectedClients", 0, payload.username);

	});
}
