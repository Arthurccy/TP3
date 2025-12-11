# Plateforme de Quiz Interactif (Full-Stack)

Une application de quiz en temps réel permettant aux enseignants de lancer des sessions et aux étudiants de répondre via leur appareil.

## 🏗 Architecture

Le projet est conçu comme un **Monorepo** regroupant trois services distincts :

1.  **Frontend (`/packages/frontend`)** :
    * **Techno** : Next.js 14 (App Router), TypeScript, Tailwind CSS.
    * **Rôle** : Interface utilisateur réactive. Gère l'affichage temps réel et la logique de jeu.
2.  **Backend API (`/packages/backend`)** :
    * **Techno** : Django REST Framework, SQLite.
    * **Rôle** : Source de vérité unique. Gère l'authentification (JWT), les données (Quiz, Questions, Scores) et la validation métier.
3.  **Serveur Temps Réel (`/packages/socket`)** :
    * **Techno** : Node.js, Express, Socket.io.
    * **Rôle** : Bus d'événements léger. Gère les "Rooms" de session et diffuse les signaux de mise à jour (`trigger_update` -> `session_updated`).

### 💡 Justification des choix techniques

* **Pourquoi Node.js + Socket.io à côté de Django ?**
    Bien que Django puisse gérer les WebSockets (via Channels), l'implémentation est souvent lourde (Redis requis, asgi). Nous avons choisi de déporter la charge temps réel sur un micro-service Node.js dédié, très performant pour les I/O, tout en gardant Django pour la robustesse de la gestion des données.
* **Stratégie "Signaling" :**
    Le WebSocket ne transporte pas les données métier (pour éviter la duplication de logique). Il sert de "signal". Quand une action a lieu, le socket prévient les clients qui re-fetch les données fraîches via l'API REST. Cela garantit que le Frontend est toujours synchronisé avec la base de données Django.

## 🚀 Installation et Lancement

### Prérequis
* Node.js (v18+)
* Python (v3.10+)

### 1. Backend (Django)
```bash
cd packages/backend
# Créer l'environnement virtuel et installer les dépendances
python -m venv venv
source venv/bin/activate  # ou venv\Scripts\activate sous Windows
pip install -r requirements.txt

# Migrations et démarrage
python manage.py migrate
python manage.py runserver
# > Tourne sur http://localhost:8000

cd packages/socket
npm install
npm run dev
# > Tourne sur http://localhost:4000


cd packages/frontend
npm install
# Créer le fichier .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
echo "NEXT_PUBLIC_SOCKET_URL=http://localhost:4000" >> .env.local

npm run dev
# > Tourne sur http://localhost:3000

FIN