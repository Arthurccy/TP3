from rest_framework import viewsets, status, generics
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from django.contrib.auth import get_user_model

from .serializers import (
    UserSerializer,
    RegisterSerializer,
    CustomTokenObtainPairSerializer
)

User = get_user_model()


@api_view(['GET'])
def health_check(request):
    return Response({'status': 'healthy'})


# ==================== Vues d'authentification ====================

class RegisterView(generics.CreateAPIView):
    """
    Vue pour l'inscription d'un nouvel utilisateur.
    POST /api/auth/register/
    """
    queryset = User.objects.all()
    permission_classes = [AllowAny]
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        return Response(
            {
                'user': UserSerializer(user).data,
                'message': 'Utilisateur créé avec succès. Vous pouvez maintenant vous connecter.'
            },
            status=status.HTTP_201_CREATED
        )


class CustomTokenObtainPairView(TokenObtainPairView):
    """
    Vue personnalisée pour la connexion (obtention du token JWT).
    POST /api/auth/login/

    Body: {
        "email": "user@example.com",
        "password": "password123"
    }

    Response: {
        "access": "...",
        "refresh": "...",
        "user": { ... }
    }
    """
    serializer_class = CustomTokenObtainPairSerializer
    permission_classes = [AllowAny]


class CurrentUserView(generics.RetrieveAPIView):
    """
    Vue pour obtenir les informations de l'utilisateur connecté.
    GET /api/auth/me/
    """
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user
