# Note sur l'utilisation de l'IA

## Contexte
Ce projet a été réalisé avec l'assistance d'outils d'Intelligence Artificielle générative pour accélérer le développement et consolider l'architecture Full-Stack.

## Outils utilisés
* **Modèles de langage** : Claude 3.5 Sonnet (planification initiale) et Gemini (développement, debugging).
* **IDE** : VS Code.

## Usage et Prompts

L'IA a été utilisée principalement comme un "Binôme de programmation" (Pair Programmer) pour les tâches suivantes :

### 1. Architecture et Structure
* *Prompt* : "Propose une architecture monorepo pour un projet Next.js + Django + Socket.io."
* *Apport* : Structuration des dossiers `packages/` et configuration TypeScript partagée.

### 2. Génération de Code (Boilerplate)
* *Prompt* : "Génère les sérialiseurs Django pour un modèle Quiz avec Questions imbriquées."
* *Apport* : Gain de temps sur l'écriture des ViewSets et Serializers standard.
* *Prompt* : "Crée un composant React pour un Timer visuel avec Tailwind CSS."
* *Apport* : Création rapide de composants UI réutilisables (`TimerBar`, `Button`, `Input`).

### 3. Logique Complexe (WebSockets)
* *Prompt* : "Comment synchroniser Django et Next.js avec Socket.io sans dupliquer la logique métier ?"
* *Apport* : Adoption de la stratégie de "Signaling" (le socket notifie, le client fetch l'API), rendant l'application plus robuste.

### 4. Debugging
* *Prompt* : "Erreur Django IntegrityError sur le champ 'order'."
* *Apport* : Identification rapide des problèmes de validation sérialiseur et proposition de correctifs (calcul automatique de l'ordre côté backend).

## Conclusion
L'IA a permis de se concentrer sur la logique d'intégration et l'expérience utilisateur (UX) en automatisant la production du code répétitif. Tout le code généré a été revu, testé et intégré manuellement.