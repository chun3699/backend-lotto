import express from "express";
import { router as login } from "./controller/login";
import { router as register } from "./controller/register";
import { router as lotto } from "./controller/lotto";
import { router as prize } from "./controller/prize";
import { router as wallet } from "./controller/wallet";
import bodyParser from "body-parser";
import * as os from "os"; // <-- แก้ตรงนี้

export const app = express();

app.use(bodyParser.text());
app.use(bodyParser.json());

app.use("/", login);
app.use("/register", register);
app.use("/lotto", lotto);
app.use("/prize", prize);
app.use("/wallet", wallet);

// หา IP ของเครื่อง
// function getLocalIP(): string {
//   const interfaces = os.networkInterfaces();
//   for (const name of Object.keys(interfaces)) {
//     for (const iface of interfaces[name]!) {
//       if (iface.family === "IPv4" && !iface.internal) {
//         return iface.address;
//       }
//     }
//   }
//   return "localhost";
// }

// const localIP = getLocalIP();

// const PORT = 3000;

//คำสั่งรันserver: npx nodemon server.ts

// app.listen(PORT, '127.0.0.1', () => {
//   console.log(`Server running at http://${localIP}:${PORT}/`);
//   console.log(`Login route: http://localhost:${PORT}/`);
//   console.log(`Register route: http://localhost:${PORT}/register`);
// });