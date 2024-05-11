import * as dotenv from "dotenv";
import { createClient } from "redis";

dotenv.config();

const { REDIS_URL } = process.env;

const createRedisClient = async () => {
	try {
		const redisClient = createClient({
			url: REDIS_URL,
		});
		console.log("connecting to redis client...");

		redisClient.on("connect", () => console.log("Redis Client Connected"));
		redisClient.on("ready", () => console.log("Redis client is ready to execute commands"));
		redisClient.on("error", (err) => {
			throw new Error(err);
		});
		redisClient.on("end", () => console.log('Redis connection closed'));

		await redisClient.connect();

		return redisClient;
	} catch (err) {
		console.log("Redis Client Connection Error", err);
		return null;
	}
};

export default createRedisClient;
