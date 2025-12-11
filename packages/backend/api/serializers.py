from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import Quiz, Question, QuestionOption, QuizSession, Participant, Answer
from django.utils import timezone

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
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({
                "password": "Les mots de passe ne correspondent pas."
            })
        return attrs

    def validate_email(self, value):
        if User.objects.filter(email=value.lower()).exists():
            raise serializers.ValidationError("Cet email est déjà utilisé.")
        return value.lower()

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Ce nom d'utilisateur est déjà utilisé.")
        return value

    def validate_role(self, value):
        if value not in [User.Role.TEACHER, User.Role.STUDENT]:
            raise serializers.ValidationError("Le rôle doit être 'TEACHER' ou 'STUDENT'.")
        return value

    def create(self, validated_data):
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
    """Sérialiseur JWT personnalisé"""

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['email'] = user.email
        token['role'] = user.role
        token['username'] = user.username
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data['user'] = UserSerializer(self.user).data
        return data


# ==================== Sérialiseurs Quiz ====================

class QuestionOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuestionOption
        fields = ['id', 'text', 'is_correct', 'order']
        read_only_fields = ['id']

    def validate_order(self, value):
        if value < 0:
            raise serializers.ValidationError("L'ordre doit être un nombre positif.")
        return value


class QuestionSerializer(serializers.ModelSerializer):
    options = QuestionOptionSerializer(many=True, read_only=True)

    class Meta:
        model = Question
        fields = ['id', 'text', 'question_type', 'order', 'time_limit', 'options']
        read_only_fields = ['id']


class QuizListSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    question_count = serializers.ReadOnlyField()

    class Meta:
        model = Quiz
        fields = ['id', 'title', 'description', 'created_by', 'created_by_name', 'question_count', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']


class QuizDetailSerializer(serializers.ModelSerializer):
    questions = QuestionSerializer(many=True, read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    question_count = serializers.ReadOnlyField()

    class Meta:
        model = Quiz
        fields = ['id', 'title', 'description', 'created_by', 'created_by_name', 'question_count', 'questions', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']


class QuizCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Quiz
        fields = ['id', 'title', 'description']
        read_only_fields = ['id']

    def validate_title(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Le titre ne peut pas être vide.")
        return value.strip()


# ==================== Sérialiseurs Question ====================

class QuestionOptionCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuestionOption
        fields = ['text', 'is_correct', 'order']

    def validate_text(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Le texte de l'option ne peut pas être vide.")
        return value.strip()


class QuestionCreateUpdateSerializer(serializers.ModelSerializer):
    options = QuestionOptionCreateSerializer(many=True, required=False)

    class Meta:
        model = Question
        fields = ['id', 'quiz', 'text', 'question_type', 'order', 'time_limit', 'options']
        read_only_fields = ['id']

    def validate_quiz(self, value):
        user = self.context['request'].user
        if value.created_by != user:
            raise serializers.ValidationError("Vous ne pouvez pas ajouter de questions au quiz d'un autre enseignant.")
        return value

    def validate_text(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Le texte de la question ne peut pas être vide.")
        return value.strip()

    def validate_time_limit(self, value):
        if value < 5:
            raise serializers.ValidationError("Le temps limite doit être d'au moins 5 secondes.")
        if value > 300:
            raise serializers.ValidationError("Le temps limite ne peut pas dépasser 300 secondes (5 minutes).")
        return value

    def validate(self, attrs):
        question_type = attrs.get('question_type')
        options = attrs.get('options', [])

        if question_type in [Question.QuestionType.MULTIPLE_CHOICE, Question.QuestionType.TRUE_FALSE]:
            if not options:
                raise serializers.ValidationError({"options": f"Les options sont obligatoires pour les questions de type {question_type}."})
            
            correct_options = [opt for opt in options if opt.get('is_correct', False)]
            if not correct_options:
                raise serializers.ValidationError({"options": "Au moins une option doit être marquée comme correcte."})

            if question_type == Question.QuestionType.TRUE_FALSE and len(options) != 2:
                raise serializers.ValidationError({"options": "Les questions Vrai/Faux doivent avoir exactement 2 options."})

        return attrs

    def create(self, validated_data):
        options_data = validated_data.pop('options', [])
        question = Question.objects.create(**validated_data)
        for option_data in options_data:
            QuestionOption.objects.create(question=question, **option_data)
        return question

    def update(self, instance, validated_data):
        options_data = validated_data.pop('options', None)
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if options_data is not None:
            instance.options.all().delete()
            for option_data in options_data:
                QuestionOption.objects.create(question=instance, **option_data)

        return instance


# ==================== Sérialiseurs Réponses ====================

class AnswerCreateSerializer(serializers.Serializer):
    questionId = serializers.IntegerField()
    selectedOptionId = serializers.IntegerField(required=False, allow_null=True)
    textAnswer = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    responseTime = serializers.IntegerField(min_value=0)


class AnswerReadSerializer(serializers.ModelSerializer):
    question_id = serializers.IntegerField(source='question.id', read_only=True)
    selected_option_id = serializers.IntegerField(source='selected_option.id', read_only=True)
    participant_id = serializers.IntegerField(source='participant.id', read_only=True)

    class Meta:
        model = Answer
        fields = ['id', 'participant_id', 'question_id', 'selected_option_id', 'text_answer', 'is_correct', 'response_time', 'answered_at']
        read_only_fields = ['id', 'is_correct', 'answered_at']


# ==================== Sérialiseurs Session ====================

class ParticipantSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)
    answer_count = serializers.IntegerField(source='total_answers_count', read_only=True)

    class Meta:
        model = Participant
        fields = ['id', 'session', 'user', 'user_name', 'username', 'score', 'answer_count', 'joined_at']
        read_only_fields = ['id', 'score', 'joined_at']


class QuizSessionListSerializer(serializers.ModelSerializer):
    quiz_title = serializers.CharField(source='quiz.title', read_only=True)
    host_name = serializers.CharField(source='host.get_full_name', read_only=True)
    participant_count = serializers.ReadOnlyField()

    class Meta:
        model = QuizSession
        fields = ['id', 'quiz', 'quiz_title', 'host', 'host_name', 'access_code', 'status', 'participant_count', 'started_at', 'ended_at', 'created_at']
        read_only_fields = ['id', 'access_code', 'created_at', 'started_at', 'ended_at']


class QuizSessionDetailSerializer(serializers.ModelSerializer):
    quiz = QuizDetailSerializer(read_only=True)
    host_name = serializers.CharField(source='host.get_full_name', read_only=True)
    participant_count = serializers.ReadOnlyField()
    participants = serializers.SerializerMethodField()
    
    # AJOUT : Champ pour la question courante
    current_question = serializers.SerializerMethodField()

    class Meta:
        model = QuizSession
        fields = [
            'id', 'quiz', 'host', 'host_name', 'access_code', 'status', 
            'participant_count', 'participants', 'current_question', 
            'started_at', 'ended_at', 'created_at'
        ]
        read_only_fields = ['id', 'access_code', 'host', 'created_at', 'started_at', 'ended_at']

    def get_participants(self, obj):
        participants = obj.participants.all().order_by('-score', 'user__username')
        return ParticipantSerializer(participants, many=True).data

    def get_current_question(self, obj):
        # On ne renvoie la question que si la session est EN COURS
        if obj.status == QuizSession.Status.IN_PROGRESS:
            question = obj.get_current_question()
            if question:
                return {
                    "id": question.id,
                    "text": question.text,
                    "time_limit": question.time_limit,
                    # IMPORTANT : On ne renvoie PAS 'is_correct' ici pour ne pas tricher
                    "options": [
                        {"id": opt.id, "text": opt.text, "order": opt.order} 
                        for opt in question.options.all().order_by('order')
                    ]
                }
        return None


class QuizSessionCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuizSession
        fields = ['id', 'quiz', 'access_code']
        read_only_fields = ['id', 'access_code']

    def validate_quiz(self, value):
        request = self.context.get('request')
        if not request:
            raise serializers.ValidationError("Contexte de requête manquant.")
        
        if value.created_by != request.user:
            raise serializers.ValidationError("Vous ne pouvez créer une session que pour vos propres quiz.")

        if not value.questions.exists():
            raise serializers.ValidationError("Le quiz doit contenir au moins une question pour créer une session.")

        return value

    def validate(self, attrs):
        quiz = attrs.get('quiz')
        request = self.context.get('request')

        # Au lieu de lever une erreur, on nettoie les vieilles sessions qui traînent
        # On cherche les sessions actives pour ce quiz et ce prof
        old_sessions = QuizSession.objects.filter(
            quiz=quiz,
            host=request.user,
            status__in=[QuizSession.Status.WAITING, QuizSession.Status.IN_PROGRESS]
        )
        
        # Si on en trouve, on les marque comme terminées (Auto-close)
        if old_sessions.exists():
            old_sessions.update(status=QuizSession.Status.COMPLETED, ended_at=timezone.now())

        return attrs


class ParticipantJoinSerializer(serializers.Serializer):
    access_code = serializers.CharField(max_length=6, min_length=6, required=True)

    def validate_access_code(self, value):
        value = value.upper()
        try:
            session = QuizSession.objects.get(access_code=value)
        except QuizSession.DoesNotExist:
            raise serializers.ValidationError("Code d'accès invalide.")

        if session.status != QuizSession.Status.WAITING:
            raise serializers.ValidationError("Cette session n'accepte plus de nouveaux participants.")

        self.context['session'] = session
        return value

    def validate(self, attrs):
        request = self.context.get('request')
        session = self.context.get('session')

        if Participant.objects.filter(session=session, user=request.user).exists():
            raise serializers.ValidationError({"access_code": "Vous participez déjà à cette session."})
        return attrs

    def create(self, validated_data):
        request = self.context.get('request')
        session = self.context.get('session')
        participant = Participant.objects.create(session=session, user=request.user, score=0)
        return participant


class AnswerSerializer(serializers.ModelSerializer):
    question_text = serializers.CharField(source='question.text', read_only=True)
    selected_option_text = serializers.CharField(source='selected_option.text', read_only=True)

    class Meta:
        model = Answer
        fields = ['id', 'participant', 'question', 'question_text', 'selected_option', 'selected_option_text', 'text_answer', 'is_correct', 'response_time', 'answered_at']
        read_only_fields = ['id', 'is_correct', 'answered_at']


class AnswerSubmitSerializer(serializers.ModelSerializer):
    class Meta:
        model = Answer
        fields = ['id', 'selected_option', 'text_answer', 'response_time']
        read_only_fields = ['id']

    def validate_response_time(self, value):
        if value < 0:
            raise serializers.ValidationError("Le temps ne peut pas être négatif.")
        return value

    def validate(self, attrs):
        question = self.context.get('question')
        participant = self.context.get('participant')
        selected_option = attrs.get('selected_option')
        text_answer = attrs.get('text_answer')

        if not question:
            raise serializers.ValidationError("Question manquante dans le contexte.")

        if Answer.objects.filter(participant=participant, question=question).exists():
            raise serializers.ValidationError("Vous avez déjà répondu à cette question.")

        if question.question_type in [Question.QuestionType.MULTIPLE_CHOICE, Question.QuestionType.TRUE_FALSE]:
            if not selected_option:
                raise serializers.ValidationError({"selected_option": "Vous devez sélectionner une option."})
            if selected_option.question != question:
                raise serializers.ValidationError({"selected_option": "Cette option n'appartient pas à la question."})
        
        elif question.question_type == Question.QuestionType.SHORT_ANSWER:
            if not text_answer or not text_answer.strip():
                raise serializers.ValidationError({"text_answer": "Vous devez fournir une réponse textuelle."})

        return attrs

    def create(self, validated_data):
        question = self.context.get('question')
        participant = self.context.get('participant')
        answer = Answer.objects.create(participant=participant, question=question, **validated_data)
        return answer


class LeaderboardEntrySerializer(serializers.Serializer):
    rank = serializers.IntegerField(read_only=True)
    user_id = serializers.IntegerField(read_only=True)
    username = serializers.CharField(read_only=True)
    full_name = serializers.CharField(read_only=True)
    score = serializers.IntegerField(read_only=True)
    answer_count = serializers.IntegerField(read_only=True)
    correct_count = serializers.IntegerField(read_only=True)
    accuracy = serializers.FloatField(read_only=True)
    average_time = serializers.FloatField(read_only=True)