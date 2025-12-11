from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

app_name = 'api'

# Configuration du router principal
# Le router scanne les ViewSets et génère toutes les URLs CRUD + les @action
router = DefaultRouter()
router.register(r'quizzes', views.QuizViewSet, basename='quiz')
router.register(r'questions', views.QuestionViewSet, basename='question')
router.register(r'sessions', views.QuizSessionViewSet, basename='session')

urlpatterns = [
    # Health check
    path('health/', views.health_check, name='health'),

    # Authentification JWT
    path('auth/register/', views.RegisterView.as_view(), name='register'),
    path('auth/login/', views.CustomTokenObtainPairView.as_view(), name='login'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/me/', views.CurrentUserView.as_view(), name='current_user'),

    # Inclusion des URLs générées par le router
    # Cela inclut désormais :
    # - /sessions/join/ (POST)
    # - /sessions/{id}/start/ (POST)
    # - /sessions/{id}/answer/ (POST)
    # - /sessions/{id}/leaderboard/ (GET)
    # - Et tout le CRUD classique pour quizzes, questions et sessions
    path('', include(router.urls)),
]