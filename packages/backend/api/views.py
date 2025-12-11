from django.shortcuts import get_object_or_404
from rest_framework import viewsets, permissions, status, generics
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from django.db.models import Count, F, Avg
from django.utils import timezone

from .models import Quiz, Question, QuizSession, Participant, Answer
from .serializers import (
    # Auth
    UserSerializer, RegisterSerializer, CustomTokenObtainPairSerializer,
    # Quiz
    QuizListSerializer, QuizDetailSerializer, QuizCreateUpdateSerializer,
    # Question
    QuestionSerializer, QuestionCreateUpdateSerializer,
    # Session
    QuizSessionListSerializer, QuizSessionDetailSerializer, QuizSessionCreateSerializer,
    # Participant & Answer
    ParticipantJoinSerializer, ParticipantSerializer,
    AnswerSubmitSerializer, AnswerReadSerializer, LeaderboardEntrySerializer
)
from .permissions import IsTeacher

# ==================== Vues Utilitaires & Auth ====================

@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def health_check(request):
    return Response({"status": "ok", "message": "API opérationnelle"})

class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

class CurrentUserView(generics.RetrieveAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user

# ==================== ViewSets Métier ====================

class QuizViewSet(viewsets.ModelViewSet):
    """
    Gestion des Quiz (CRUD).
    Seuls les enseignants peuvent créer/modifier/voir leurs quiz.
    """
    permission_classes = [permissions.IsAuthenticated, IsTeacher]

    def get_queryset(self):
        return Quiz.objects.filter(created_by=self.request.user)

    def get_serializer_class(self):
        if self.action == 'list':
            return QuizListSerializer
        if self.action == 'retrieve':
            return QuizDetailSerializer
        return QuizCreateUpdateSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['get'])
    def questions(self, request, pk=None):
        """Retourne toutes les questions d'un quiz spécifique"""
        quiz = self.get_object()
        questions = quiz.questions.all().order_by('order')
        serializer = QuestionSerializer(questions, many=True)
        return Response(serializer.data)


class QuestionViewSet(viewsets.ModelViewSet):
    """
    Gestion des questions.
    Accessible uniquement aux enseignants pour leurs propres quiz.
    """
    permission_classes = [permissions.IsAuthenticated, IsTeacher]
    serializer_class = QuestionCreateUpdateSerializer

    def get_queryset(self):
        # On filtre pour ne retourner que les questions des quiz appartenant au prof connecté
        return Question.objects.filter(quiz__created_by=self.request.user)


class QuizSessionViewSet(viewsets.ModelViewSet):
    """
    Gestion complète des sessions de jeu (Cœur de l'app).
    """
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        # Si prof : voit les sessions qu'il a créées (host)
        if hasattr(user, 'role') and user.role == 'TEACHER':
            return QuizSession.objects.filter(host=user)
        # Si étudiant : voit les sessions où il est participant
        return QuizSession.objects.filter(participants__user=user)

    def get_serializer_class(self):
        if self.action == 'create':
            return QuizSessionCreateSerializer
        if self.action == 'retrieve':
            return QuizSessionDetailSerializer
        return QuizSessionListSerializer

    def perform_create(self, serializer):
        serializer.save(host=self.request.user)

    # --- Actions Enseignant (Gestion du flux) ---

    @action(detail=True, methods=['post'], permission_classes=[IsTeacher])
    def start(self, request, pk=None):
        """Démarrer la session (passe de WAITING à IN_PROGRESS)"""
        session = self.get_object()
        if session.status != QuizSession.Status.WAITING:
            return Response({"error": "La session ne peut pas être démarrée."}, status=400)
        
        session.status = QuizSession.Status.IN_PROGRESS
        session.started_at = timezone.now()
        session.save()
        return Response(QuizSessionDetailSerializer(session).data)

    @action(detail=True, methods=['post'], url_path='next-question', permission_classes=[IsTeacher])
    def next_question(self, request, pk=None):
        """Passer à la question suivante"""
        session = self.get_object()
        session.current_question_index += 1
        session.save()
        return Response({"status": "ok", "current_index": session.current_question_index})

    @action(detail=True, methods=['post'], permission_classes=[IsTeacher])
    def end(self, request, pk=None):
        """Terminer la session"""
        session = self.get_object()
        session.status = QuizSession.Status.COMPLETED
        session.ended_at = timezone.now()
        session.save()
        return Response(QuizSessionDetailSerializer(session).data)

    # --- Actions Étudiant & Publiques ---

    @action(detail=False, methods=['post'])
    def join(self, request):
        """
        Rejoindre une session via son code d'accès (access_code).
        URL: POST /api/sessions/join/ body: { "access_code": "XY123" }
        """
        serializer = ParticipantJoinSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            participant = serializer.save()
            return Response({
                "message": "Session rejointe avec succès",
                "session_id": participant.session.id,
                "participant_id": participant.id
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='answer')
    def submit_answer(self, request, pk=None):
        """
        Soumettre une réponse à la question courante.
        URL: POST /api/sessions/{id}/answer/
        """
        session = self.get_object()
        
        # Récupérer le participant lié à l'utilisateur connecté
        participant = get_object_or_404(Participant, session=session, user=request.user)
        
        current_question = session.get_current_question()
        if not current_question:
            return Response({"error": "Aucune question active"}, status=400)

        # Injecter le contexte nécessaire pour la validation (Question et Participant)
        context = {
            'request': request, 
            'question': current_question, 
            'participant': participant
        }
        
        serializer = AnswerSubmitSerializer(data=request.data, context=context)
        if serializer.is_valid():
            answer = serializer.save()
            return Response(AnswerReadSerializer(answer).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get'])
    def leaderboard(self, request, pk=None):
        """
        Obtenir le classement actuel de la session.
        URL: GET /api/sessions/{id}/leaderboard/
        """
        session = self.get_object()
        
        # Calcul agrégé performant via la DB
        participants = session.participants.all().annotate(
            answer_cnt=Count('answers'),
            correct_cnt=Count('answers', filter=F('answers__is_correct')==True),
            avg_time=Avg('answers__response_time')
        ).order_by('-score')

        leaderboard_data = []
        for index, p in enumerate(participants):
            leaderboard_data.append({
                'rank': index + 1,
                'user_id': p.user.id,
                'username': p.user.username,
                'full_name': p.user.get_full_name(),
                'score': p.score,
                'answer_count': p.answer_cnt,
                'correct_count': p.correct_cnt,
                'accuracy': (p.correct_cnt / p.answer_cnt * 100) if p.answer_cnt > 0 else 0,
                'average_time': (p.avg_time or 0) / 1000  # Conversion ms -> s
            })
            
        return Response(LeaderboardEntrySerializer(leaderboard_data, many=True).data)

# Fonction obsolète (submit_answer) supprimée car intégrée dans le ViewSet ci-dessus