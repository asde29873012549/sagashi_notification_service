import * as dotenv from "dotenv";
import amqp from "amqplib";

dotenv.config();

const rabbitmq_connection_str = process.env.RABBITMQ_CONN;

async function connect() {
  try {
    const connection = await amqp.connect(rabbitmq_connection_str);
    return connection;
  } catch (err) {
    console.log(err);
    return null;
  }
}

export default connect;
