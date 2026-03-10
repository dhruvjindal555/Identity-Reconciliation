export interface Contact {
 id: number
 email: string | null
 phoneNumber: string | null
 linkedId: number | null
 linkPrecedence: "primary" | "secondary"
 createdAt: Date
 updatedAt: Date
 deletedAt: Date | null
}