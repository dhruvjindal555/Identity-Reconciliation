import { Request, Response } from "express"
import { resolveIdentity } from "../services/identityService"

export const identify = async (req: Request, res: Response) => {

 const { email, phoneNumber } = req.body

 const result = await resolveIdentity(email, phoneNumber)

 res.status(200).json({
  contact: result
 })
}