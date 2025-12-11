from rest_framework import viewsets, status, generics
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from django.contrib.auth import get_user_model

from .serializers import (
    UserSerializer,
    RegisterSerializer,
    CustomTokenObtainPairSerializer,
    QuizListSerializer,
    QuizDetailSerializer,
    QuizCreateUpdateSerializer,
    QuestionSerializer,
    QuestionCreateUpdateSerializer,
)
from .models import Quiz, Question, QuestionOption

User = get_user_model()


@api_view(['GET'])
def health_check(request):
    return Response({'status': 'healthy'})


# ==================== Vues d'authentification ====================

class RegisterView(generics.CreateAPIView):
    """
    Vue pour l'inscription d'un nouvel utilisateur.
    POST /api/auth/register/
    """
    queryset = User.objects.all()
    permission_classes = [AllowAny]
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        return Response(
            {
                'user': UserSerializer(user).data,
                'message': 'Utilisateur créé avec succès. Vous pouvez maintenant vous connecter.'
            },
            status=status.HTTP_201_CREATED
        )


class CustomTokenObtainPairView(TokenObtainPairView):
    """
    Vue personnalisée pour la connexion (obtention du token JWT).
    POST /api/auth/login/

    Body: {
        "email": "user@example.com",
        "password": "password123"
    }

    Response: {
        "access": "...",
        "refresh": "...",
        "user": { ... }
    }
    """
    serializer_class = CustomTokenObtainPairSerializer
    permission_classes = [AllowAny]


class CurrentUserView(generics.RetrieveAPIView):
    """
    Vue pour obtenir les informations de l'utilisateur connecté.
    GET /api/auth/me/
    """
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


# ==================== ViewSets Quiz ====================

class QuizViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour gérer les quiz.

    Endpoints disponibles :
    - GET /api/quizzes/ : Liste des quiz de l'enseignant connecté
    - POST /api/quizzes/ : Créer un nouveau quiz (enseignant uniquement)
    - GET /api/quizzes/{id}/ : Détail d'un quiz avec ses questions
    - PUT /api/quizzes/{id}/ : Modifier un quiz (propriétaire uniquement)
    - PATCH /api/quizzes/{id}/ : Modifier partiellement un quiz
    - DELETE /api/quizzes/{id}/ : Supprimer un quiz (propriétaire uniquement)
    - GET /api/quizzes/{id}/questions/ : Liste des questions d'un quiz

    Permissions :
    - Liste/Détail : Enseignant connecté
    - Création : Enseignant connecté
    - Modification/Suppression : Propriétaire du quiz uniquement
    """

    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        Retourne uniquement les quiz créés par l'utilisateur connecté.

        Bonnes pratiques :
        - Utilisation de select_related pour optimiser les requêtes
        - Filtrage automatique par utilisateur pour la sécurité
        - Préchargement des relations pour éviter les N+1 queries
        """
        return Quiz.objects.filter(
            created_by=self.request.user
        ).select_related('created_by').prefetch_related('questions').order_by('-created_at')

    def get_serializer_class(self):
        """
        Retourne le serializer approprié selon l'action.

        Bonnes pratiques :
        - Utilisation de serializers différents pour chaque action
        - Séparation des responsabilités (liste vs détail vs création)
        """
        if self.action == 'list':
            return QuizListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return QuizCreateUpdateSerializer
        else:  # retrieve
            return QuizDetailSerializer

    def perform_create(self, serializer):
        """
        Assigne automatiquement l'utilisateur connecté comme créateur du quiz.

        Bonnes pratiques :
        - Validation automatique du propriétaire
        - Pas besoin de passer created_by dans le body de la requête
        """
        serializer.save(created_by=self.request.user)

    def perform_update(self, serializer):
        """
        Met à jour le quiz en vérifiant que l'utilisateur est le propriétaire.

        Cette vérification est également faite par get_queryset(),
        mais on la laisse ici pour plus de clarté.
        """
        quiz = self.get_object()
        if quiz.created_by != self.request.user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Vous n'avez pas la permission de modifier ce quiz.")
        serializer.save()

    def perform_destroy(self, instance):
        """
        Supprime le quiz en vérifiant que l'utilisateur est le propriétaire.
        """
        if instance.created_by != self.request.user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Vous n'avez pas la permission de supprimer ce quiz.")
        instance.delete()

    @action(detail=True, methods=['get'], url_path='questions')
    def questions(self, request, pk=None):
        """
        Action personnalisée pour obtenir la liste des questions d'un quiz.

        GET /api/quizzes/{id}/questions/

        Bonnes pratiques :
        - Utilisation du décorateur @action pour créer des endpoints personnalisés
        - url_path pour définir l'URL exacte
        - detail=True car on agit sur un quiz spécifique
        """
        quiz = self.get_object()
        questions = quiz.questions.all().order_by('order').prefetch_related('options')
        serializer = QuestionSerializer(questions, many=True)

        return Response({
            'quiz_id': quiz.id,
            'quiz_title': quiz.title,
            'question_count': questions.count(),
            'questions': serializer.data
        })

    def list(self, request, *args, **kwargs):
        """
        Liste les quiz avec des informations supplémentaires.

        Bonnes pratiques :
        - Ajout de métadonnées utiles dans la réponse
        - Pagination automatique via REST_FRAMEWORK settings
        """
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)

        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'count': queryset.count(),
            'results': serializer.data
        })

    def retrieve(self, request, *args, **kwargs):
        """
        Récupère le détail d'un quiz avec toutes ses questions.

        Bonnes pratiques :
        - Utilisation de prefetch_related dans get_queryset pour optimiser
        - Retourne les questions ordonnées
        """
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)


# ==================== ViewSets Question ====================

class QuestionViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour gérer les questions d'un quiz.

    Endpoints disponibles :
    - POST /api/quizzes/{quiz_id}/questions/ : Ajouter une question au quiz
    - GET /api/questions/{id}/ : Détail d'une question
    - PUT /api/questions/{id}/ : Modifier une question
    - PATCH /api/questions/{id}/ : Modifier partiellement une question
    - DELETE /api/questions/{id}/ : Supprimer une question

    Permissions :
    - Création : Enseignant propriétaire du quiz
    - Modification/Suppression : Enseignant propriétaire du quiz
    """

    permission_classes = [IsAuthenticated]
    serializer_class = QuestionCreateUpdateSerializer

    def get_queryset(self):
        """
        Retourne les questions des quiz appartenant à l'utilisateur connecté.

        Bonnes pratiques :
        - Filtrage par propriétaire du quiz pour la sécurité
        - Préchargement des relations
        - Ordre par défaut sur le champ 'order'
        """
        return Question.objects.filter(
            quiz__created_by=self.request.user
        ).select_related('quiz').prefetch_related('options').order_by('quiz', 'order')

    def get_serializer_class(self):
        """
        Retourne le serializer approprié selon l'action.
        """
        if self.action in ['create', 'update', 'partial_update']:
            return QuestionCreateUpdateSerializer
        return QuestionSerializer

    def create(self, request, *args, **kwargs):
        """
        Créer une nouvelle question pour un quiz spécifique.

        POST /api/quizzes/{quiz_id}/questions/

        Bonnes pratiques :
        - Vérification que le quiz existe et appartient à l'utilisateur
        - Assignment automatique du quiz à la question
        - Gestion d'erreurs explicites
        """
        # Récupérer le quiz_id depuis l'URL (route imbriquée)
        quiz_id = self.kwargs.get('quiz_pk')

        if not quiz_id:
            return Response(
                {'error': 'L\'ID du quiz est requis.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Vérifier que le quiz existe et appartient à l'utilisateur
        try:
            quiz = Quiz.objects.get(id=quiz_id, created_by=request.user)
        except Quiz.DoesNotExist:
            return Response(
                {'error': 'Quiz non trouvé ou vous n\'avez pas la permission.'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Créer la question
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Assigner automatiquement le quiz
        question = serializer.save(quiz=quiz)

        # Retourner la question créée avec ses options
        response_serializer = QuestionSerializer(question)
        return Response(
            response_serializer.data,
            status=status.HTTP_201_CREATED
        )

    def perform_update(self, serializer):
        """
        Met à jour la question en vérifiant que l'utilisateur est propriétaire du quiz.
        """
        question = self.get_object()
        if question.quiz.created_by != self.request.user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Vous n'avez pas la permission de modifier cette question.")
        serializer.save()

    def perform_destroy(self, instance):
        """
        Supprime la question en vérifiant que l'utilisateur est propriétaire du quiz.
        """
        if instance.quiz.created_by != self.request.user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Vous n'avez pas la permission de supprimer cette question.")
        instance.delete()

    def retrieve(self, request, *args, **kwargs):
        """
        Récupère le détail d'une question avec ses options.

        GET /api/questions/{id}/
        """
        instance = self.get_object()
        serializer = QuestionSerializer(instance)
        return Response(serializer.data)
