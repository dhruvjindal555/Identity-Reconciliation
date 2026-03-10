import { Request, Response } from "express"
import { resolveIdentity } from "../services/identityService"

export async function identify(req: Request, res: Response) {
  try {
    const { email, phoneNumber } = req.body

    if (!email && !phoneNumber) {
      return res.status(400).json({ error: "email or phoneNumber required" })
    }

    const result = await resolveIdentity(email, phoneNumber)
    return res.status(200).json({ contact: result })

  } catch (err: any) {
    console.error("CONTROLLER ERROR", err)

    return res.status(500).json({
      error: "Internal server error",
      message: err?.message ?? "Unknown error",
      code:    err?.code    ?? null,  
    })
  }
}