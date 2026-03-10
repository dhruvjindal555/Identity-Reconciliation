import express from "express"
import { identify } from "../controllers/identifyController"

const router = express.Router()

router.post("/", identify)

export default router