from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import Quiz, Question, QuestionOption

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
        fields = ['id', 'text', 'question_type', 'order', 'time_limit', 'options']
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
