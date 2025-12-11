from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

app_name = 'api'

urlpatterns = [
    path('health/', views.health_check, name='health'),

    # Authentification
    path('auth/register/', views.RegisterView.as_view(), name='register'),
    path('auth/login/', views.CustomTokenObtainPairView.as_view(), name='login'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/me/', views.CurrentUserView.as_view(), name='current_user'),
]
