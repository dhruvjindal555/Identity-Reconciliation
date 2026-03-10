# Identity Reconciliation

A web service that identifies and consolidates customer identities across multiple purchases, even when different contact information is used each time.

---

## 🚀 Live Endpoint

```
POST https://identity-reconciliation-1-jzls.onrender.com/identify
```

> Deployed on [Render.com](https://render.com) with [Aiven](https://aiven.io) MySQL as the database.

---
> ⚠️ Note: The live database may contain existing test data from previous runs. Results may reflect that data.

## 📋 Problem Statement

FluxKart.com customers sometimes use different emails and phone numbers for different purchases. Bitespeed needs to link all these contacts to the same person by finding shared email/phone identifiers and consolidating them under a single primary contact.

---

## 🛠️ Tech Stack

- **Runtime:** Node.js
- **Language:** TypeScript
- **Framework:** Express.js
- **Database:** MySQL
- **ORM/Query:** mysql2

---

## 📁 Project Structure

```
src/
├── server.ts                  # Entry point
├── config/
│   └── database.ts            # MySQL connection
├── controllers/
│   └── identifyController.ts  # Request handler
├── routes/
│   └── identifyRoutes.ts      # Route definitions
├── services/
│   └── identityService.ts     # Core business logic
└── types/
    └── contactTypes.ts        # TypeScript types
```

---

## ⚙️ Setup & Installation

### 1. Clone the repository

```bash
git clone https://github.com/dhruvjindal555/Identity-Reconciliation.git
cd Identity-Reconciliation
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file in the root:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=yourpassword
DB_NAME=bitespeed
PORT=8888
```

### 4. Set up the database

Run this SQL to create the Contact table:

```sql
CREATE DATABASE IF NOT EXISTS bitespeed;

USE bitespeed;

CREATE TABLE IF NOT EXISTS Contact (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  phoneNumber     VARCHAR(20)  DEFAULT NULL,
  email           VARCHAR(255) DEFAULT NULL,
  linkedId        INT          DEFAULT NULL,
  linkPrecedence  ENUM('primary', 'secondary') NOT NULL,
  createdAt       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deletedAt       DATETIME     DEFAULT NULL,
  FOREIGN KEY (linkedId) REFERENCES Contact(id)
);
```

### 5. Start the development server

```bash
npm run dev
```

Server runs at `http://localhost:8888`

---

## 📡 API Reference

### `POST /identify`

Identifies and consolidates a customer's contact information.

**Request Body:**

```json
{
  "email": "string (optional)",
  "phoneNumber": "string (optional)"
}
```

At least one of `email` or `phoneNumber` must be provided.

**Response:**

```json
{
  "contact": {
    "primaryContactId": 1,
    "emails": ["primary@email.com", "secondary@email.com"],
    "phoneNumbers": ["123456", "789012"],
    "secondaryContactIds": [2, 3]
  }
}
```

**Response fields:**
- `primaryContactId` — ID of the oldest (canonical) primary contact
- `emails` — all emails in the cluster, primary's email first
- `phoneNumbers` — all phone numbers in the cluster, primary's phone first
- `secondaryContactIds` — IDs of all secondary contacts in the cluster

---

## 🧠 Core Logic

The service uses an **iterative BFS (Breadth-First Search)** algorithm to find the full connected component of contacts that share an email or phone number, then consolidates them.

### Algorithm Steps

1. **Seed** — find all contacts directly matching the incoming email or phone
2. **BFS expand** — for each found contact, fetch all contacts sharing the same email, phone, or `linkedId` transitively until no new contacts are discovered
3. **Find primaries** — collect all primary contacts within the component
4. **Choose canonical** — the oldest primary (by `createdAt`) becomes the canonical primary
5. **Demote** — all other primaries are updated to `secondary`, their children re-parented to the canonical primary
6. **Insert if needed** — a new secondary is created only if the incoming request contains genuinely new information (new email or new phone not seen in the cluster)
7. **Return** — consolidated response with primary first in all arrays

### Key Rules

- The **oldest** contact in a linked cluster is always `primary`
- A `primary` contact can be **demoted to secondary** if a request links it to an older primary
- No duplicate rows are inserted — if both email and phone already exist in the cluster (even on separate rows), no new contact is created
- Soft-deleted contacts (`deletedAt IS NOT NULL`) are excluded from all operations

---

## 🧪 Example

**Request 1** — First purchase:
```json
{ "email": "doc@hillvalley.edu", "phoneNumber": "123456" }
```
```json
{
  "contact": {
    "primaryContatctId": 1,
    "emails": ["doc@hillvalley.edu"],
    "phoneNumbers": ["123456"],
    "secondaryContactIds": []
  }
}
```

**Request 2** — Second purchase with new email, same phone:
```json
{ "email": "emmett@hillvalley.edu", "phoneNumber": "123456" }
```
```json
{
  "contact": {
    "primaryContatctId": 1,
    "emails": ["doc@hillvalley.edu", "emmett@hillvalley.edu"],
    "phoneNumbers": ["123456"],
    "secondaryContactIds": [2]
  }
}
```

**Request 3** — Links two previously separate clusters:
```json
{ "email": "doc@hillvalley.edu", "phoneNumber": "999999" }
```
```json
{
  "contact": {
    "primaryContatctId": 1,
    "emails": ["doc@hillvalley.edu", "emmett@hillvalley.edu", "brown@hillvalley.edu"],
    "phoneNumbers": ["123456", "999999"],
    "secondaryContactIds": [2, 3]
  }
}
```

---

## 🚢 Deployment

### Database — Aiven MySQL (Free)

1. Create a free account at [aiven.io](https://aiven.io)
2. Create a new **MySQL** service
3. Copy the connection details from the **Overview** tab:
   - Host, Port, User, Password, Database name
4. The app automatically creates the `Contact` table on first startup — no manual SQL needed

### Server — Render.com (Free)

1. Push your code to GitHub
2. Go to [render.com](https://render.com) → **New Web Service**
3. Connect your GitHub repository
4. Set the following:
   - **Build Command:** `npm install && npx tsc`
   - **Start Command:** `node dist/server.js`
5. Add these environment variables in the Render dashboard:

```
DB_HOST       = your-aiven-host (e.g. mysql-xxx.aivencloud.com)
DB_PORT       = your-aiven-port (e.g. 28757 — NOT 3306)
DB_USER       = avnadmin
DB_PASSWORD   = your-aiven-password
DB_NAME       = defaultdb
```

6. Click **Deploy** — Render will give you a public URL

---

## 📝 Notes

- `phoneNumber` is accepted as a **string** (not number) to preserve leading zeros
- All queries filter out soft-deleted contacts (`deletedAt IS NULL`)
- SSL is enabled with `rejectUnauthorized: false` for Aiven cloud MySQL compatibility
- The `Contact` table is created automatically on server startup if it doesn't exist
