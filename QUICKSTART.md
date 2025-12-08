# Quick Start Guide

## 🚀 Démarrage rapide

### Prérequis
- Node.js 18+
- Python 3.10+
- PostgreSQL (local)

### Étape 1 : Configurer le Backend
```bash
cd packages/backend

# Créer un environnement virtuel
python -m venv venv

# Activer le venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Installer les dépendances
pip install -r requirements.txt

# Créer le fichier .env
cp .env.example .env

# Exécuter les migrations
python manage.py migrate

# Lancer le serveur (garder ce terminal ouvert)
python manage.py runserver
```

### Étape 2 : Démarrer le Frontend (nouveau terminal)
```bash
cd packages/frontend
pnpm install
pnpm dev
```

### Étape 3 : Démarrer l'API Socket.io (nouveau terminal)
```bash
cd packages/api
pnpm install
pnpm dev
```

## 📡 Ports
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:8000`
- API Socket.io: `http://localhost:8001`
- Admin Django: `http://localhost:8000/admin`

## ⚠️ Problèmes courants

### PostgreSQL ne se connecte pas
- Vérifier que PostgreSQL est lancé
- Vérifier les credentials dans `.env`

### Module non trouvé (Python)
- Assurez-vous que le venv est activé
- Réinstaller: `pip install -r requirements.txt`

### Port déjà utilisé
- Django: `python manage.py runserver 8001`
- Next.js: `next dev -p 3001`

---

Pour plus d'infos: voir `README.md`
