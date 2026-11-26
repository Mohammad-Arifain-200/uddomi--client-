# 🌱 Uddomi – Empowering People, Inspiring Change

Uddomi is a community-driven social development platform that connects people through meaningful initiatives. Users can discover community events, join volunteer activities, organize events, and contribute to positive social change.

## 🔗 Live Demo & Repositories

- **Live Website:** https://ais-pre-w4hennzj3azcwy3u4wbk7q-149637408810.asia-southeast1.run.app
- **Frontend:** https://github.com/Mohammad-Arifain-200/uddomi-client
- **Backend:** https://github.com/Mohammad-Arifain-200/uddomi-server

## ✨ Key Features

- **Event Discovery:** Browse, search, and filter upcoming community events.
- **Event Management:** Create, edit, and delete events.
- **Volunteer Participation:** Join or leave events and manage participation.
- **Authentication:** Secure email/password login and GitHub OAuth.
- **Profile Management:** Update profile information and profile photos.
- **Security:** JWT authentication, input validation, SSRF protection, and API rate limiting.
- **Database:** MongoDB Atlas with persistent local fallback storage.

## 🛠️ Tech Stack

- **Frontend:** Next.js 16, React 19, TypeScript
- **Styling:** Tailwind CSS v4, Motion
- **Backend:** Express.js 4, TypeScript
- **Authentication:** Better Auth, GitHub OAuth, JWT
- **Database:** MongoDB
- **Security:** JOSE, JWKS, Express Rate Limit

## ⚙️ Installation & Setup

**1. Clone the repository**

```bash
git clone https://github.com/Mohammad-Arifain-200/uddomi-client.git
cd uddomi-client
```

**2. Install dependencies**

```bash
npm install
```

**3. Configure environment variables**

Create a `.env` file using `.env.example` and configure the required credentials, including:

- `BETTER_AUTH_SECRET`
- `MONGODB_URI`
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `API_BACKEND_URL`

**4. Start the development server**

```bash
npm run dev
```

Frontend: `http://localhost:3000`

Backend: `http://localhost:4000`

## 📜 Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start frontend and backend |
| `npm run build` | Build production application |
| `npm start` | Start production application |
| `npm run lint` | Run TypeScript checks |
| `npm test` | Run automated tests |

---

**Uddomi – Together We Can Make a Difference! 🌱**

*Built with ❤️ to empower communities and inspire change.*
