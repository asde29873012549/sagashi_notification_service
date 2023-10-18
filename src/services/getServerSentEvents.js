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

export default async function getServerSentEvents(
  req,
  res,
  clients,
  redisClient,
) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const cookies = new Cookies(req, res);
  const jwtToken = cookies.get("next-auth.session-token");

  const key = await getDerivedEncryptionKey(JWT_TOKEN_SECRET);

  const { payload } = await jwtDecrypt(jwtToken, key, {
    clockTolerance: 15,
  });

  clients.set(payload.username, res);

  await redisClient.set("connectedClient", JSON.stringify([payload.username]));

  req.on("close", () => {
    // clients.splice(clients.indexOf(res), 1);
  });
}
