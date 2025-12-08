# TP3 Monorepo - Fullstack Application

Architecture fullstack avec **Next.js**, **Django REST**, **SQLite**, et **Socket.io** pour la communication temps réel.

## 📁 Structure du projet

```
tp3-monorepo/
├── packages/
│   ├── frontend/          # Application Next.js (React)
│   ├── backend/           # API Django REST (Python)
│   ├── api/               # Socket.io Server (Node.js/Express)
│   └── shared/            # Types partagés
├── QUICKSTART.md          # Guide de démarrage rapide
└── README.md             # Ce fichier
```

## 🚀 Démarrage Rapide

**⚠️ Ouvre 3 terminaux séparés et lance chacune de ces commandes :**

### Terminal 1 : Backend Django
```bash
cd packages/backend
python -m venv venv
venv\Scripts\activate          # Windows
source venv/bin/activate       # macOS/Linux

pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

### Terminal 2 : Frontend Next.js
```bash
cd packages/frontend
npm install
npm run dev
```

### Terminal 3 : API Socket.io
```bash
cd packages/api
npm install
npm run dev
```

## ✅ Vérification

Ouvre ton navigateur et vérifie que tout fonctionne :

| Service | URL | Statut |
|---------|-----|--------|
| Frontend | http://localhost:3000 | Doit charger l'app |
| Backend | http://localhost:8000/api/health/ | Doit afficher `{"status": "healthy"}` |
| Admin Django | http://localhost:8000/admin | Doit afficher la page login |
| API Socket.io | http://localhost:8001 | Doit accepter les connexions |

## 📦 Technologies

| Composant | Stack |
|-----------|-------|
| **Frontend** | Next.js 14 + TypeScript + Tailwind CSS + Zustand + TanStack Query |
| **Backend** | Django 4.2 + Django REST Framework + SQLite |
| **API Temps réel** | Express.js + Socket.io |

## 🔧 Configuration

### Fichier `.env` du Backend

Copier `.env.example` en `.env`.

Les valeurs par défaut fonctionnent avec SQLite :
```
DEBUG=True
SECRET_KEY=your-secret-key-here
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:3000
```

## 📚 Commandes utiles

### Backend Django
```bash
python manage.py migrate              # Appliquer les migrations
python manage.py makemigrations       # Créer de nouvelles migrations
python manage.py createsuperuser      # Créer un admin
python manage.py shell                # Shell interactif Django
```

### Frontend Next.js
```bash
npm run dev                # Développement avec hot-reload
npm run build              # Construire pour production
npm start                  # Démarrer la version compilée
npm run lint               # Vérifier le code
```

### API Socket.io
```bash
npm run dev                # Développement
npm run build              # Compiler TypeScript
npm start                  # Démarrer la version compilée
```

## 🔌 Utiliser Socket.io

### Frontend (React)
```typescript
import { connectSocket } from '@/lib/socket'

const socket = connectSocket()

// Envoyer un message
socket.emit('message', { text: 'Hello!' })

// Recevoir des messages
socket.on('message', (data) => {
  console.log('Message:', data)
})
```

## 🐛 Dépannage

### ❌ "Module not found"
```bash
# Frontend
cd packages/frontend
npm install

# Backend
cd packages/backend
pip install -r requirements.txt
```

### ❌ "Port déjà utilisé"
```bash
# Frontend (port 3001)
npm run dev -- -p 3001

# Backend (port 8001)
python manage.py runserver 8001
```

### ❌ "venv not activated"
```bash
# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate
```

### ❌ "django not found"
```bash
pip install -r requirements.txt
```

## 📖 Documentation

- [Next.js](https://nextjs.org/docs)
- [Django](https://docs.djangoproject.com/en/4.2/)
- [Django REST Framework](https://www.django-rest-framework.org/)
- [Socket.io](https://socket.io/docs/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Zustand](https://github.com/pmndrs/zustand)
- [TanStack Query](https://tanstack.com/query/)

## 💡 Notes importantes

- **3 terminaux ouverts en même temps** = 3 services qui tournent en parallèle
- **SQLite** = pas besoin d'installer PostgreSQL
- **Développement local** = URLs en `localhost`
- **Hot-reload activé** = modifie le code, ça recharge automatiquement
- **Admin Django** = http://localhost:8000/admin

---

**Besoin d'aide ?** Vérifiez le `QUICKSTART.md` pour des explications plus détaillées ! 🚀
