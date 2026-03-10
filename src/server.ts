import express from "express"
import identifyRoutes from "./routes/identifyRoutes"

const app = express()
const PORT = 8888

app.use(express.json())

app.use("/identify", identifyRoutes)

app.listen(PORT, () => {
 console.log("Server running at port 8888")
})