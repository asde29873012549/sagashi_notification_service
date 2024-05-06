import * as dotenv from "dotenv";
import { createClient } from "redis";

dotenv.config();

const { REDIS_URL } = process.env;

const createRedisClient = async () => {
	try {
		const redisClient = createClient({
			url: REDIS_URL,
		});
		console.log("connecting to redis client");
		await redisClient.connect();

		if (!redisClient.isReady) throw new Error("redis client is not ready");
		console.log("redis client is ready");

		redisClient.on("error", (err) => {
			throw new Error(err);
		});
		redisClient.on("connect", () => console.log("Redis Client Connected"));

		return redisClient;
	} catch (err) {
		console.log("Redis Client Connection Error", err);
		return null;
	}
};

export default createRedisClient;
