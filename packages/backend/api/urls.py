from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework_nested import routers
from . import views

app_name = 'api'

# Configuration du router principal pour les ViewSets
# Le DefaultRouter génère automatiquement les URLs CRUD standard
router = DefaultRouter()
router.register(r'quizzes', views.QuizViewSet, basename='quiz')
router.register(r'questions', views.QuestionViewSet, basename='question')

# Configuration du router imbriqué pour les questions d'un quiz
# Permet de créer des routes imbriquées : /quizzes/{quiz_id}/questions/
quiz_router = routers.NestedSimpleRouter(router, r'quizzes', lookup='quiz')
quiz_router.register(r'questions', views.QuestionViewSet, basename='quiz-questions')

urlpatterns = [
    path('health/', views.health_check, name='health'),

    # Authentification
    path('auth/register/', views.RegisterView.as_view(), name='register'),
    path('auth/login/', views.CustomTokenObtainPairView.as_view(), name='login'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/me/', views.CurrentUserView.as_view(), name='current_user'),

    # URLs générées par le router principal (Quiz ViewSet)
    # Génère automatiquement :
    # - GET    /api/quizzes/              -> list
    # - POST   /api/quizzes/              -> create
    # - GET    /api/quizzes/{id}/         -> retrieve
    # - PUT    /api/quizzes/{id}/         -> update
    # - PATCH  /api/quizzes/{id}/         -> partial_update
    # - DELETE /api/quizzes/{id}/         -> destroy
    # - GET    /api/quizzes/{id}/questions/ -> action personnalisée (liste questions)

    # URLs générées pour les questions (Question ViewSet) :
    # - GET    /api/questions/{id}/       -> retrieve
    # - PUT    /api/questions/{id}/       -> update
    # - PATCH  /api/questions/{id}/       -> partial_update
    # - DELETE /api/questions/{id}/       -> destroy

    # URLs imbriquées générées (quiz_router) :
    # - POST   /api/quizzes/{quiz_id}/questions/ -> create (ajouter une question au quiz)

    path('', include(router.urls)),
    path('', include(quiz_router.urls)),
]
