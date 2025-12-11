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
