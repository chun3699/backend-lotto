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

