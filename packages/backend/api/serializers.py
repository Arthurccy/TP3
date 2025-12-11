from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import Quiz, Question, QuestionOption, QuizSession, Participant, Answer

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    """Sérialiseur pour le modèle User"""

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role', 'date_joined']
        read_only_fields = ['id', 'date_joined']


class RegisterSerializer(serializers.ModelSerializer):
    """Sérialiseur pour l'inscription d'un nouvel utilisateur"""

    password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password],
        style={'input_type': 'password'}
    )
    password_confirm = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'}
    )

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password_confirm', 'first_name', 'last_name', 'role']
        extra_kwargs = {
            'first_name': {'required': True},
            'last_name': {'required': True},
            'email': {'required': True},
        }

    def validate(self, attrs):
        """Valider que les deux mots de passe correspondent"""
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({
                "password": "Les mots de passe ne correspondent pas."
            })
        return attrs

    def validate_email(self, value):
        """Valider que l'email est unique"""
        if User.objects.filter(email=value.lower()).exists():
            raise serializers.ValidationError("Cet email est déjà utilisé.")
        return value.lower()

    def validate_username(self, value):
        """Valider que le username est unique"""
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Ce nom d'utilisateur est déjà utilisé.")
        return value

    def validate_role(self, value):
        """Valider que le rôle est valide"""
        if value not in [User.Role.TEACHER, User.Role.STUDENT]:
            raise serializers.ValidationError("Le rôle doit être 'TEACHER' ou 'STUDENT'.")
        return value

    def create(self, validated_data):
        """Créer un nouvel utilisateur"""
        validated_data.pop('password_confirm')
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name'],
            role=validated_data['role']
        )
        return user


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Sérialiseur JWT personnalisé pour inclure les informations de l'utilisateur"""

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)

        # Ajouter des claims personnalisés
        token['email'] = user.email
        token['role'] = user.role
        token['username'] = user.username

        return token

    def validate(self, attrs):
        """Valider et retourner les tokens avec les infos utilisateur"""
        data = super().validate(attrs)

        # Ajouter les informations de l'utilisateur dans la réponse
        data['user'] = UserSerializer(self.user).data

        return data


# ==================== Sérialiseurs Quiz ====================

class QuestionOptionSerializer(serializers.ModelSerializer):
    """Sérialiseur pour les options de réponse"""

    class Meta:
        model = QuestionOption
        fields = ['id', 'text', 'is_correct', 'order']
        read_only_fields = ['id']

    def validate_order(self, value):
        """Valider que l'ordre est positif"""
        if value < 0:
            raise serializers.ValidationError("L'ordre doit être un nombre positif.")
        return value


class QuestionSerializer(serializers.ModelSerializer):
    """Sérialiseur pour les questions (lecture seule pour la liste)"""

    options = QuestionOptionSerializer(many=True, read_only=True)

    class Meta:
        model = Question
        fields = ['id', 'text', 'question_type', 'order', 'time_limit', 'options']
        read_only_fields = ['id']


class QuizListSerializer(serializers.ModelSerializer):
    """
    Sérialiseur pour la liste des quiz (sans les questions).
    Utilisé pour GET /api/quizzes/ (liste)
    """

    created_by_name = serializers.CharField(
        source='created_by.get_full_name',
        read_only=True
    )
    question_count = serializers.ReadOnlyField()

    class Meta:
        model = Quiz
        fields = [
            'id',
            'title',
            'description',
            'created_by',
            'created_by_name',
            'question_count',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']


class QuizDetailSerializer(serializers.ModelSerializer):
    """
    Sérialiseur détaillé pour un quiz (avec les questions).
    Utilisé pour GET /api/quizzes/{id}/ (détail)
    """

    questions = QuestionSerializer(many=True, read_only=True)
    created_by_name = serializers.CharField(
        source='created_by.get_full_name',
        read_only=True
    )
    question_count = serializers.ReadOnlyField()

    class Meta:
        model = Quiz
        fields = [
            'id',
            'title',
            'description',
            'created_by',
            'created_by_name',
            'question_count',
            'questions',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']


class QuizCreateUpdateSerializer(serializers.ModelSerializer):
    """
    Sérialiseur pour créer ou modifier un quiz.
    Utilisé pour POST /api/quizzes/ et PUT/PATCH /api/quizzes/{id}/
    """

    class Meta:
        model = Quiz
        fields = ['id', 'title', 'description']
        read_only_fields = ['id']

    def validate_title(self, value):
        """Valider que le titre n'est pas vide"""
        if not value or not value.strip():
            raise serializers.ValidationError("Le titre ne peut pas être vide.")
        return value.strip()

    def create(self, validated_data):
        """
        Créer un quiz en assignant automatiquement l'utilisateur connecté comme créateur.
        """
        # Le created_by est automatiquement assigné dans la vue
        return super().create(validated_data)


# ==================== Sérialiseurs Question ====================

class QuestionOptionCreateSerializer(serializers.ModelSerializer):
    """
    Sérialiseur pour créer/modifier une option de question.
    Utilisé lors de la création/modification de questions.
    """

    class Meta:
        model = QuestionOption
        fields = ['text', 'is_correct', 'order']

    def validate_text(self, value):
        """Valider que le texte de l'option n'est pas vide"""
        if not value or not value.strip():
            raise serializers.ValidationError("Le texte de l'option ne peut pas être vide.")
        return value.strip()


class QuestionCreateUpdateSerializer(serializers.ModelSerializer):
    """
    Sérialiseur pour créer ou modifier une question avec ses options.
    Gère la création atomique de la question et de ses options.

    Utilisé pour POST /api/quizzes/{quiz_id}/questions/
    et PUT/PATCH /api/questions/{id}/
    """

    options = QuestionOptionCreateSerializer(many=True, required=False)

    class Meta:
        model = Question
        # AJOUTER 'quiz' DANS CETTE LISTE ▼
        fields = ['id', 'quiz', 'text', 'question_type', 'order', 'time_limit', 'options'] 
        read_only_fields = ['id']

    def validate_text(self, value):
        """Valider que le texte de la question n'est pas vide"""
        if not value or not value.strip():
            raise serializers.ValidationError("Le texte de la question ne peut pas être vide.")
        return value.strip()

    def validate_time_limit(self, value):
        """Valider que le temps limite est raisonnable"""
        if value < 5:
            raise serializers.ValidationError("Le temps limite doit être d'au moins 5 secondes.")
        if value > 300:
            raise serializers.ValidationError("Le temps limite ne peut pas dépasser 300 secondes (5 minutes).")
        return value

    def validate(self, attrs):
        """
        Validation globale de la question et ses options.

        Bonnes pratiques :
        - Validation des contraintes métier
        - Vérification de la cohérence des données
        """
        question_type = attrs.get('question_type')
        options = attrs.get('options', [])

        # Pour les questions à choix multiple ou vrai/faux, les options sont obligatoires
        if question_type in [Question.QuestionType.MULTIPLE_CHOICE, Question.QuestionType.TRUE_FALSE]:
            if not options:
                raise serializers.ValidationError({
                    "options": f"Les options sont obligatoires pour les questions de type {question_type}."
                })

            # Vérifier qu'il y a au moins une bonne réponse
            correct_options = [opt for opt in options if opt.get('is_correct', False)]
            if not correct_options:
                raise serializers.ValidationError({
                    "options": "Au moins une option doit être marquée comme correcte."
                })

            # Pour TRUE_FALSE, vérifier qu'il y a exactement 2 options
            if question_type == Question.QuestionType.TRUE_FALSE and len(options) != 2:
                raise serializers.ValidationError({
                    "options": "Les questions Vrai/Faux doivent avoir exactement 2 options."
                })

        # Pour les questions à réponse courte, pas d'options
        if question_type == Question.QuestionType.SHORT_ANSWER and options:
            raise serializers.ValidationError({
                "options": "Les questions à réponse courte ne peuvent pas avoir d'options."
            })

        return attrs

    def create(self, validated_data):
        """
        Créer une question avec ses options de manière atomique.

        Bonnes pratiques :
        - Transaction atomique (Django gère automatiquement)
        - Création en cascade des relations
        """
        options_data = validated_data.pop('options', [])
        question = Question.objects.create(**validated_data)

        # Créer les options associées
        for option_data in options_data:
            QuestionOption.objects.create(question=question, **option_data)

        return question

    def update(self, instance, validated_data):
        """
        Met à jour une question et ses options.

        Bonnes pratiques :
        - Remplacement complet des options (plus simple et plus sûr)
        - Suppression des anciennes options avant création des nouvelles
        """
        options_data = validated_data.pop('options', None)

        # Mettre à jour les champs de la question
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Si des options sont fournies, remplacer les anciennes
        if options_data is not None:
            # Supprimer les anciennes options
            instance.options.all().delete()

            # Créer les nouvelles options
            for option_data in options_data:
                QuestionOption.objects.create(question=instance, **option_data)

        return instance
    
    def validate_quiz(self, value):
        """
        Sécurité : On vérifie que l'utilisateur a le droit d'ajouter une question à ce quiz.
        """
        user = self.context['request'].user
        if value.created_by != user:
            raise serializers.ValidationError("Vous ne pouvez pas ajouter de questions au quiz d'un autre enseignant.")
        return value


# ==================== Sérialiseurs Réponses (utilisés par les vues de vos collègues) ====================

class AnswerCreateSerializer(serializers.Serializer):
    """Payload attendu pour la soumission d'une réponse."""

    questionId = serializers.IntegerField()
    selectedOptionId = serializers.IntegerField(required=False, allow_null=True)
    textAnswer = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    responseTime = serializers.IntegerField(min_value=0)


class AnswerReadSerializer(serializers.ModelSerializer):
    """Sérialiseur de réponse créé, retourné au client."""

    question_id = serializers.IntegerField(source='question.id', read_only=True)
    selected_option_id = serializers.IntegerField(source='selected_option.id', read_only=True)
    participant_id = serializers.IntegerField(source='participant.id', read_only=True)

    class Meta:
        model = Answer
        fields = [
            'id',
            'participant_id',
            'question_id',
            'selected_option_id',
            'text_answer',
            'is_correct',
            'response_time',
            'answered_at'
        ]
        read_only_fields = ['id', 'is_correct', 'answered_at']


# ==================== Sérialiseurs Session ====================

class QuizSessionListSerializer(serializers.ModelSerializer):
    """
    Sérialiseur léger pour la liste des sessions.
    Utilisé pour GET /api/sessions/ (liste)
    """

    quiz_title = serializers.CharField(
        source='quiz.title',
        read_only=True
    )
    host_name = serializers.CharField(
        source='host.get_full_name',
        read_only=True
    )
    participant_count = serializers.ReadOnlyField()

    class Meta:
        model = QuizSession
        fields = [
            'id',
            'quiz',
            'quiz_title',
            'host',
            'host_name',
            'access_code',
            'status',
            'participant_count',
            'started_at',
            'ended_at',
            'created_at'
        ]
        read_only_fields = ['id', 'access_code', 'created_at', 'started_at', 'ended_at']


class QuizSessionDetailSerializer(serializers.ModelSerializer):
    """
    Sérialiseur détaillé pour une session (avec quiz complet et participants).
    Utilisé pour GET /api/sessions/{id}/ (détail)
    """

    quiz = QuizDetailSerializer(read_only=True)
    host_name = serializers.CharField(
        source='host.get_full_name',
        read_only=True
    )
    participant_count = serializers.ReadOnlyField()
    participants = serializers.SerializerMethodField()

    class Meta:
        model = QuizSession
        fields = [
            'id',
            'quiz',
            'host',
            'host_name',
            'access_code',
            'status',
            'participant_count',
            'participants',
            'started_at',
            'ended_at',
            'created_at',
        ]
        read_only_fields = ['id', 'access_code', 'host', 'created_at', 'updated_at', 'started_at', 'ended_at']

    def get_participants(self, obj):
        """
        Retourne la liste des participants avec leurs statistiques.
        """
        participants = obj.participants.all().order_by('-score', 'user__username')
        return ParticipantSerializer(participants, many=True).data


class QuizSessionCreateSerializer(serializers.ModelSerializer):
    """
    Sérialiseur pour créer une session de quiz.
    Utilisé pour POST /api/sessions/
    """

    class Meta:
        model = QuizSession
        fields = ['id', 'quiz', 'access_code']
        read_only_fields = ['id', 'access_code']

    def validate_quiz(self, value):
        """
        Valider que le quiz existe et appartient à l'utilisateur connecté.
        """
        request = self.context.get('request')
        if not request:
            raise serializers.ValidationError("Contexte de requête manquant.")

        # Vérifier que le quiz appartient à l'utilisateur
        if value.created_by != request.user:
            raise serializers.ValidationError(
                "Vous ne pouvez créer une session que pour vos propres quiz."
            )

        # Vérifier que le quiz a au moins une question
        if not value.questions.exists():
            raise serializers.ValidationError(
                "Le quiz doit contenir au moins une question pour créer une session."
            )

        return value

    def validate(self, attrs):
        """
        Validation globale avant création.
        """
        quiz = attrs.get('quiz')
        request = self.context.get('request')

        # Vérifier qu'il n'y a pas déjà une session active pour ce quiz
        if QuizSession.objects.filter(
            quiz=quiz,
            host=request.user,
            status__in=[QuizSession.Status.WAITING, QuizSession.Status.IN_PROGRESS]
        ).exists():
            raise serializers.ValidationError({
                "quiz": "Une session active existe déjà pour ce quiz. Terminez-la avant d'en créer une nouvelle."
            })

        return attrs

    def create(self, validated_data):
        """
        Créer une session avec génération automatique du code d'accès.
        Le host est assigné automatiquement dans la vue.
        """
        return super().create(validated_data)


# ==================== Sérialiseurs Participant ====================

class ParticipantSerializer(serializers.ModelSerializer):
    """
    Sérialiseur pour lire les données d'un participant.
    Utilisé pour GET /api/participants/ ou dans les détails de session.
    """

    user_name = serializers.CharField(
        source='user.get_full_name',
        read_only=True
    )
    username = serializers.CharField(
        source='user.username',
        read_only=True
    )
    answer_count = serializers.IntegerField(
        source='total_answers_count',
        read_only=True
    )

    class Meta:
        model = Participant
        fields = [
            'id',
            'session',
            'user',
            'user_name',
            'username',
            'score',
            'answer_count',
            'joined_at'
        ]
        read_only_fields = ['id', 'score', 'joined_at']


class ParticipantJoinSerializer(serializers.Serializer):
    """
    Sérialiseur pour rejoindre une session avec un code d'accès.
    Utilisé pour POST /api/sessions/join/
    """

    access_code = serializers.CharField(
        max_length=6,
        min_length=6,
        required=True,
        help_text="Code d'accès à 6 caractères pour rejoindre la session"
    )

    def validate_access_code(self, value):
        """
        Valider que le code d'accès correspond à une session existante et active.
        """
        # Normaliser le code (uppercase)
        value = value.upper()

        # Vérifier qu'une session existe avec ce code
        try:
            session = QuizSession.objects.get(access_code=value)
        except QuizSession.DoesNotExist:
            raise serializers.ValidationError("Code d'accès invalide.")

        # Vérifier que la session est en attente (pas encore commencée ou terminée)
        if session.status != QuizSession.Status.WAITING:
            raise serializers.ValidationError(
                "Cette session n'accepte plus de nouveaux participants."
            )

        # Stocker la session pour l'utiliser dans create()
        self.context['session'] = session

        return value

    def validate(self, attrs):
        """
        Validation globale avant de rejoindre.
        """
        request = self.context.get('request')
        session = self.context.get('session')

        # Vérifier que l'utilisateur ne participe pas déjà à cette session
        if Participant.objects.filter(session=session, user=request.user).exists():
            raise serializers.ValidationError({
                "access_code": "Vous participez déjà à cette session."
            })

        return attrs

    def create(self, validated_data):
        """
        Créer un participant pour rejoindre la session.
        """
        request = self.context.get('request')
        session = self.context.get('session')

        participant = Participant.objects.create(
            session=session,
            user=request.user,
            score=0
        )

        return participant


# ==================== Sérialiseurs Answer ====================

class AnswerSerializer(serializers.ModelSerializer):
    """
    Sérialiseur pour lire l'historique des réponses.
    Utilisé pour GET /api/answers/ ou dans les détails de participant.
    """

    question_text = serializers.CharField(
        source='question.text',
        read_only=True
    )
    selected_option_text = serializers.CharField(
        source='selected_option.text',
        read_only=True
    )

    class Meta:
        model = Answer
        fields = [
            'id',
            'participant',
            'question',
            'question_text',
            'selected_option',
            'selected_option_text',
            'text_answer',
            'is_correct',
            'response_time',
            'answered_at'
        ]
        read_only_fields = ['id', 'is_correct', 'answered_at']


class AnswerSubmitSerializer(serializers.ModelSerializer):
    """
    Sérialiseur pour soumettre une réponse à une question.
    Utilisé pour POST /api/sessions/{session_id}/questions/{question_id}/answer/
    """

    class Meta:
        model = Answer
        fields = ['id', 'selected_option', 'text_answer', 'response_time']
        read_only_fields = ['id']

    def validate_response_time(self, value):
        """
        Valider que le temps pris est raisonnable.
        """
        if value < 0:
            raise serializers.ValidationError("Le temps ne peut pas être négatif.")

        # Vérifier que le temps ne dépasse pas la limite de la question (en millisecondes)
        question = self.context.get('question')
        if question and value > (question.time_limit * 1000):
            raise serializers.ValidationError(
                f"Le temps pris ({value}ms) dépasse la limite de la question ({question.time_limit * 1000}ms)."
            )

        return value

    def validate(self, attrs):
        """
        Validation globale selon le type de question.
        """
        question = self.context.get('question')
        participant = self.context.get('participant')
        selected_option = attrs.get('selected_option')
        text_answer = attrs.get('text_answer')

        # Vérifier que la question est fournie dans le contexte
        if not question:
            raise serializers.ValidationError("Question manquante dans le contexte.")

        # Vérifier que le participant n'a pas déjà répondu à cette question
        if Answer.objects.filter(participant=participant, question=question).exists():
            raise serializers.ValidationError("Vous avez déjà répondu à cette question.")

        # Validation selon le type de question
        if question.question_type in [Question.QuestionType.MULTIPLE_CHOICE, Question.QuestionType.TRUE_FALSE]:
            # Pour les QCM et Vrai/Faux, une option doit être sélectionnée
            if not selected_option:
                raise serializers.ValidationError({
                    "selected_option": "Vous devez sélectionner une option pour ce type de question."
                })

            # Vérifier que l'option appartient bien à cette question
            if selected_option.question != question:
                raise serializers.ValidationError({
                    "selected_option": "Cette option n'appartient pas à la question."
                })

            # Pas de texte pour les QCM
            if text_answer:
                raise serializers.ValidationError({
                    "text_answer": "Les réponses textuelles ne sont pas acceptées pour ce type de question."
                })

        elif question.question_type == Question.QuestionType.SHORT_ANSWER:
            # Pour les réponses courtes, un texte doit être fourni
            if not text_answer or not text_answer.strip():
                raise serializers.ValidationError({
                    "text_answer": "Vous devez fournir une réponse textuelle pour ce type de question."
                })

            # Pas d'option pour les réponses courtes
            if selected_option:
                raise serializers.ValidationError({
                    "selected_option": "Les options ne sont pas acceptées pour les questions à réponse courte."
                })

        return attrs

    def create(self, validated_data):
        """
        Créer une réponse. Le modèle Answer gère automatiquement:
        - Le calcul de is_correct
        - La mise à jour du score du participant
        """
        question = self.context.get('question')
        participant = self.context.get('participant')

        # Le modèle Answer.save() gère automatiquement is_correct et le score
        answer = Answer.objects.create(
            participant=participant,
            question=question,
            **validated_data
        )

        return answer


# ==================== Sérialiseurs Leaderboard ====================

class LeaderboardEntrySerializer(serializers.Serializer):
    """
    Sérialiseur pour les entrées du classement.
    Utilisé pour GET /api/sessions/{id}/leaderboard/

    Bonnes pratiques :
    - Serializer (pas ModelSerializer) car données agrégées, pas directement du modèle
    - Read-only pour toutes les statistiques calculées
    """

    rank = serializers.IntegerField(
        read_only=True,
        help_text="Position dans le classement (1 = premier)"
    )
    user_id = serializers.IntegerField(
        read_only=True,
        help_text="ID de l'utilisateur"
    )
    username = serializers.CharField(
        read_only=True,
        help_text="Nom d'utilisateur"
    )
    full_name = serializers.CharField(
        read_only=True,
        help_text="Nom complet de l'utilisateur"
    )
    score = serializers.IntegerField(
        read_only=True,
        help_text="Score total du participant"
    )
    answer_count = serializers.IntegerField(
        read_only=True,
        help_text="Nombre de réponses soumises"
    )
    correct_count = serializers.IntegerField(
        read_only=True,
        help_text="Nombre de réponses correctes"
    )
    accuracy = serializers.FloatField(
        read_only=True,
        help_text="Taux de réussite en pourcentage (0-100)"
    )
    average_time = serializers.FloatField(
        read_only=True,
        help_text="Temps moyen de réponse en secondes"
    )
