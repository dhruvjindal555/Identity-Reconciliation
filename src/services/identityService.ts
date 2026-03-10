console.log("SERVICE FILE LOADED - V2")
import { db } from "../config/database"
import { Contact } from "../types/contactTypes"

export async function resolveIdentity(email?: string | null, phoneNumber?: string | null) {
  const inputEmail = email ?? undefined
  const inputPhone = phoneNumber ?? undefined

  // console.log("resolveIdentity  { inputEmail, inputPhone })

  if (!inputEmail && !inputPhone) {
    throw new Error("At least one of email or phoneNumber must be provided")
  }

  async function query<T = Contact>(sql: string, params: any[]): Promise<T[]> {
    const [rows]: any = await db.query(sql, params)
    return rows as T[]
  }

  const seen = new Map<number, Contact>()
  const bfsQueue: Contact[] = []

  function addToQueue(rows: Contact[]) {
    for (const r of rows) {
      if (!seen.has(r.id)) {
        seen.set(r.id, r)
        bfsQueue.push(r)

      }
    }
  }

  if (inputEmail) {
    const rows = await query(`SELECT * FROM Contact WHERE email = ? AND deletedAt IS NULL`, [inputEmail])

    addToQueue(rows)
  }
  if (inputPhone) {
    const rows = await query(`SELECT * FROM Contact WHERE phoneNumber = ? AND deletedAt IS NULL`, [inputPhone])

    addToQueue(rows)
  }

  if (bfsQueue.length === 0) {

    const [res]: any = await db.query(
      `INSERT INTO Contact (email, phoneNumber, linkPrecedence) VALUES (?, ?, 'primary')`,
      [inputEmail ?? null, inputPhone ?? null]
    )
    return {
      primaryContactId: res.insertId,
      emails: inputEmail ? [inputEmail] : [],
      phoneNumbers: inputPhone ? [inputPhone] : [],
      secondaryContactIds: []
    }
  }

  let bfsIdx = 0
  while (bfsIdx < bfsQueue.length) {
    const cur = bfsQueue[bfsIdx++]

    if (cur.email) {
      const rows = await query(`SELECT * FROM Contact WHERE email = ? AND deletedAt IS NULL`, [cur.email])

      addToQueue(rows)
    }
    if (cur.phoneNumber) {
      const rows = await query(`SELECT * FROM Contact WHERE phoneNumber = ? AND deletedAt IS NULL`, [cur.phoneNumber])

      addToQueue(rows)
    }
    const children = await query(`SELECT * FROM Contact WHERE linkedId = ? AND deletedAt IS NULL`, [cur.id])

    addToQueue(children)

    if (cur.linkedId) {
      const parents = await query(`SELECT * FROM Contact WHERE id = ? AND deletedAt IS NULL`, [cur.linkedId])

      addToQueue(parents)
    }
  }

  const component = Array.from(seen.values())


  const rootPrimaryIds = new Set<number>()
  for (const c of component) {
    if (c.linkPrecedence === "primary") rootPrimaryIds.add(c.id)
    else if (c.linkedId) rootPrimaryIds.add(c.linkedId)
  }


  let rootPrimaries: Contact[] = []
  if (rootPrimaryIds.size > 0) {
    rootPrimaries = await query(
      `SELECT * FROM Contact WHERE id IN (?) AND deletedAt IS NULL`,
      [Array.from(rootPrimaryIds)]
    )
  }
  if (rootPrimaries.length === 0) {
    rootPrimaries = component.filter(c => c.linkPrecedence === "primary")
  }

  rootPrimaries.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  const canonical = rootPrimaries[0]


  for (const p of rootPrimaries) {
    if (p.id === canonical.id) continue

    await db.query(
      `UPDATE Contact SET linkPrecedence = 'secondary', linkedId = ?, updatedAt = NOW() WHERE id = ?`,
      [canonical.id, p.id]
    )
    await db.query(
      `UPDATE Contact SET linkedId = ?, updatedAt = NOW() WHERE linkedId = ? AND deletedAt IS NULL`,
      [canonical.id, p.id]
    )
  }

  let finalContacts = await query(
    `SELECT * FROM Contact WHERE (id = ? OR linkedId = ?) AND deletedAt IS NULL`,
    [canonical.id, canonical.id]
  )


  const existingEmails = new Set(finalContacts.map(c => c.email).filter(Boolean))
  const existingPhones = new Set(finalContacts.map(c => c.phoneNumber).filter(Boolean))
  const emailIsNew = inputEmail ? !existingEmails.has(inputEmail) : false
  const phoneIsNew = inputPhone ? !existingPhones.has(inputPhone) : false
  const exactRowExists = finalContacts.some(c => {
    const emailMatch = inputEmail ? c.email === inputEmail : c.email === null
    const phoneMatch = inputPhone ? c.phoneNumber === inputPhone : c.phoneNumber === null
    return emailMatch && phoneMatch
  })
  const shouldInsert = !exactRowExists && (emailIsNew || phoneIsNew)


  if (shouldInsert) {
    await db.query(
      `INSERT INTO Contact (email, phoneNumber, linkedId, linkPrecedence) VALUES (?, ?, ?, 'secondary')`,
      [inputEmail ?? null, inputPhone ?? null, canonical.id]
    )
    finalContacts = await query(
      `SELECT * FROM Contact WHERE (id = ? OR linkedId = ?) AND deletedAt IS NULL`,
      [canonical.id, canonical.id]
    )
  }

  const seenEmails = new Set<string>()
  const seenPhones = new Set<string>()
  const emails: string[] = []
  const phoneNumbers: string[] = []

  const [canonicalFresh] = await query(`SELECT * FROM Contact WHERE id = ?`, [canonical.id])
  if (canonicalFresh.email) { emails.push(canonicalFresh.email); seenEmails.add(canonicalFresh.email) }
  if (canonicalFresh.phoneNumber) { phoneNumbers.push(canonicalFresh.phoneNumber); seenPhones.add(canonicalFresh.phoneNumber) }

  const secondaries = finalContacts
    .filter(c => c.id !== canonical.id)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

  for (const c of secondaries) {
    if (c.email && !seenEmails.has(c.email)) { emails.push(c.email); seenEmails.add(c.email) }
    if (c.phoneNumber && !seenPhones.has(c.phoneNumber)) { phoneNumbers.push(c.phoneNumber); seenPhones.add(c.phoneNumber) }
  }

  const secondaryContactIds = secondaries.map(c => c.id)
  const response = { primaryContactId: canonical.id, emails, phoneNumbers, secondaryContactIds }
  // console.log("Response", JSON.stringify(response))
  return response
}