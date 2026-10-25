import { Router } from "express";
import { callD365Tool, chatD365, endD365Chat, listD365Tools } from "../controllers/d365.controller.js";
import { d365Guard } from "../middleware/d365Guard.js";

export const d365Router = Router();

d365Router.use(d365Guard);
d365Router.get("/tools", listD365Tools);
d365Router.post("/tools/:name", callD365Tool);
d365Router.post("/chat", chatD365);
d365Router.delete("/chat/:sessionId", endD365Chat);
