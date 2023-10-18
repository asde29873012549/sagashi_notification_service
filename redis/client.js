import * as dotenv from "dotenv";
import { createClient } from "redis";

dotenv.config();

const { REDIS_URL } = process.env;

const createRedisClient = async () => {
  const redisClient = createClient();
  await redisClient.connect(REDIS_URL);

  redisClient.on("error", (err) => console.log("Redis Client Error", err));

  return redisClient;
};

export default createRedisClient;
