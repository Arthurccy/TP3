from django.db import models
from django.contrib.auth.models import AbstractUser
import string
import random


class User(AbstractUser):
    """Modèle utilisateur personnalisé avec rôles"""

    class Role(models.TextChoices):
        TEACHER = 'TEACHER', 'Enseignant'
        STUDENT = 'STUDENT', 'Étudiant'

    email = models.EmailField(unique=True)
    role = models.CharField(
        max_length=10,
        choices=Role.choices,
        default=Role.STUDENT
    )

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'first_name', 'last_name']

    def is_teacher(self):
        return self.role == self.Role.TEACHER

    def is_student(self):
        return self.role == self.Role.STUDENT

    def __str__(self):
        return f"{self.get_full_name()} ({self.get_role_display()})"

    class Meta:
        verbose_name = 'Utilisateur'
        verbose_name_plural = 'Utilisateurs'


class Quiz(models.Model):
    """Quiz créé par un enseignant"""

    title = models.CharField(max_length=200, verbose_name='Titre')
    description = models.TextField(blank=True, verbose_name='Description')
    created_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='quizzes',
        verbose_name='Créé par'
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Créé le')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Modifié le')

    def __str__(self):
        return self.title

    @property
    def question_count(self):
        return self.questions.count()

    class Meta:
        verbose_name = 'Quiz'
        verbose_name_plural = 'Quiz'
        ordering = ['-created_at']


class Question(models.Model):
    """Question d'un quiz"""

    class QuestionType(models.TextChoices):
        MULTIPLE_CHOICE = 'MULTIPLE_CHOICE', 'Choix multiple'
        TRUE_FALSE = 'TRUE_FALSE', 'Vrai/Faux'
        SHORT_ANSWER = 'SHORT_ANSWER', 'Réponse courte'

    quiz = models.ForeignKey(
        Quiz,
        on_delete=models.CASCADE,
        related_name='questions',
        verbose_name='Quiz'
    )
    text = models.TextField(verbose_name='Question')
    question_type = models.CharField(
        max_length=20,
        choices=QuestionType.choices,
        default=QuestionType.MULTIPLE_CHOICE,
        verbose_name='Type de question'
    )
    order = models.PositiveIntegerField(default=0, verbose_name='Ordre')
    time_limit = models.PositiveIntegerField(
        default=30,
        verbose_name='Temps limite (secondes)'
    )

    def __str__(self):
        return f"{self.quiz.title} - Q{self.order}: {self.text[:50]}"

    class Meta:
        verbose_name = 'Question'
        verbose_name_plural = 'Questions'
        ordering = ['quiz', 'order']
        unique_together = ['quiz', 'order']


class QuestionOption(models.Model):
    """Option de réponse pour une question à choix multiple"""

    question = models.ForeignKey(
        Question,
        on_delete=models.CASCADE,
        related_name='options',
        verbose_name='Question'
    )
    text = models.CharField(max_length=500, verbose_name='Texte de l\'option')
    is_correct = models.BooleanField(default=False, verbose_name='Réponse correcte')
    order = models.PositiveIntegerField(default=0, verbose_name='Ordre')

    def __str__(self):
        correct = "✓" if self.is_correct else "✗"
        return f"{correct} {self.text[:50]}"

    class Meta:
        verbose_name = 'Option de réponse'
        verbose_name_plural = 'Options de réponse'
        ordering = ['question', 'order']
        unique_together = ['question', 'order']


class QuizSession(models.Model):
    """Session de quiz en direct"""

    class Status(models.TextChoices):
        WAITING = 'WAITING', 'En attente'
        IN_PROGRESS = 'IN_PROGRESS', 'En cours'
        COMPLETED = 'COMPLETED', 'Terminée'

    quiz = models.ForeignKey(
        Quiz,
        on_delete=models.CASCADE,
        related_name='sessions',
        verbose_name='Quiz'
    )
    access_code = models.CharField(
        max_length=6,
        unique=True,
        verbose_name='Code d\'accès'
    )
    host = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='hosted_sessions',
        verbose_name='Animateur'
    )
    status = models.CharField(
        max_length=15,
        choices=Status.choices,
        default=Status.WAITING,
        verbose_name='Statut'
    )
    current_question_index = models.PositiveIntegerField(
        default=0,
        verbose_name='Index de la question courante'
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Créée le')
    started_at = models.DateTimeField(null=True, blank=True, verbose_name='Démarrée le')
    ended_at = models.DateTimeField(null=True, blank=True, verbose_name='Terminée le')

    def __str__(self):
        return f"{self.quiz.title} - {self.access_code} ({self.get_status_display()})"

    def save(self, *args, **kwargs):
        if not self.access_code:
            self.access_code = self.generate_unique_code()
        super().save(*args, **kwargs)

    @staticmethod
    def generate_unique_code():
        """Génère un code d'accès unique de 6 caractères"""
        while True:
            code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
            if not QuizSession.objects.filter(access_code=code).exists():
                return code

    def get_current_question(self):
        """Retourne la question courante de la session"""
        questions = self.quiz.questions.all().order_by('order')
        if self.current_question_index < questions.count():
            return questions[self.current_question_index]
        return None

    @property
    def participant_count(self):
        return self.participants.count()

    class Meta:
        verbose_name = 'Session de quiz'
        verbose_name_plural = 'Sessions de quiz'
        ordering = ['-created_at']


class Participant(models.Model):
    """Participant à une session de quiz"""

    session = models.ForeignKey(
        QuizSession,
        on_delete=models.CASCADE,
        related_name='participants',
        verbose_name='Session'
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='participations',
        verbose_name='Utilisateur'
    )
    joined_at = models.DateTimeField(auto_now_add=True, verbose_name='Rejoint le')
    score = models.PositiveIntegerField(default=0, verbose_name='Score')

    def __str__(self):
        return f"{self.user.get_full_name()} - {self.session.access_code}"

    @property
    def correct_answers_count(self):
        return self.answers.filter(is_correct=True).count()

    @property
    def total_answers_count(self):
        return self.answers.count()

    @property
    def average_response_time(self):
        answers = self.answers.all()
        if not answers:
            return 0
        total_time = sum(answer.response_time for answer in answers)
        return total_time / answers.count()

    class Meta:
        verbose_name = 'Participant'
        verbose_name_plural = 'Participants'
        ordering = ['-score', 'joined_at']
        unique_together = ['session', 'user']


class Answer(models.Model):
    """Réponse d'un participant à une question"""

    participant = models.ForeignKey(
        Participant,
        on_delete=models.CASCADE,
        related_name='answers',
        verbose_name='Participant'
    )
    question = models.ForeignKey(
        Question,
        on_delete=models.CASCADE,
        related_name='answers',
        verbose_name='Question'
    )
    selected_option = models.ForeignKey(
        QuestionOption,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='answers',
        verbose_name='Option sélectionnée'
    )
    text_answer = models.TextField(
        blank=True,
        verbose_name='Réponse texte'
    )
    is_correct = models.BooleanField(default=False, verbose_name='Réponse correcte')
    response_time = models.PositiveIntegerField(
        verbose_name='Temps de réponse (ms)'
    )
    answered_at = models.DateTimeField(auto_now_add=True, verbose_name='Répondu le')

    def __str__(self):
        correct = "✓" if self.is_correct else "✗"
        return f"{correct} {self.participant.user.get_full_name()} - Q{self.question.order}"

    def save(self, *args, **kwargs):
        # Calculer automatiquement si la réponse est correcte
        
        # Cas 1 : QCM ou Vrai/Faux (Basé sur l'ID de l'option)
        if self.question.question_type in [Question.QuestionType.MULTIPLE_CHOICE, Question.QuestionType.TRUE_FALSE]:
            if self.selected_option:
                self.is_correct = self.selected_option.is_correct
        
        # Cas 2 : Réponse courte (Comparaison de texte)
        elif self.question.question_type == Question.QuestionType.SHORT_ANSWER:
            if self.text_answer:
                # On récupère les bonnes réponses possibles stockées dans les options
                correct_answers = self.question.options.filter(is_correct=True).values_list('text', flat=True)
                
                # Normalisation : minuscule et sans espaces inutiles
                user_text = self.text_answer.strip().lower()
                
                # On vérifie si la réponse de l'utilisateur correspond à l'une des réponses attendues
                self.is_correct = any(user_text == correct.strip().lower() for correct in correct_answers)
            else:
                self.is_correct = False

        super().save(*args, **kwargs)

        # Mettre à jour le score du participant (Code existant inchangé)
        if self.is_correct:
            time_bonus = max(0, self.question.time_limit * 1000 - self.response_time) // 100
            points = 100 + time_bonus
            self.participant.score += points
            self.participant.save()

    class Meta:
        verbose_name = 'Réponse'
        verbose_name_plural = 'Réponses'
        ordering = ['answered_at']
        unique_together = ['participant', 'question']
