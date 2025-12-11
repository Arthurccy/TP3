from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from . import views
from .views import submit_answer

app_name = 'api'

# Configuration du router principal pour les ViewSets
# Le DefaultRouter génère automatiquement les URLs CRUD standard
router = DefaultRouter()
router.register(r'quizzes', views.QuizViewSet, basename='quiz')

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

    path('', include(router.urls)),

    # Endpoint de soumission de réponse (géré par vos collègues)
    path('sessions/<uuid:session_id>/answer/', submit_answer, name='submit_answer'),
]
