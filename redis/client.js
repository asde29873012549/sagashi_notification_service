import * as dotenv from "dotenv";
import { createClient } from "redis";

dotenv.config();

const { REDIS_URL } = process.env;

const createRedisClient = async () => {
	try {
		const redisClient = createClient();
		await redisClient.connect(REDIS_URL);

		redisClient.on("error", (err) => {
			throw new Error(err);
		});
		redisClient.on("connect", () => console.log("Redis Client Connected"));

		return redisClient;
	} catch (err) {
		console.log("Redis Client Error", err);
		return null;
	}
};

export default createRedisClient;
