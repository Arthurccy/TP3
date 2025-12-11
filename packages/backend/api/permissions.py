from rest_framework import permissions


class IsTeacher(permissions.BasePermission):
    """
    Permission personnalisée : seuls les enseignants peuvent accéder
    """
    message = "Seuls les enseignants peuvent accéder à cette ressource."

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.is_teacher()


class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Permission personnalisée : le propriétaire peut modifier, les autres peuvent lire
    """
    message = "Vous ne pouvez modifier que vos propres ressources."

    def has_object_permission(self, request, view, obj):
        # Lecture autorisée pour tout le monde
        if request.method in permissions.SAFE_METHODS:
            return True

        # Écriture autorisée seulement pour le propriétaire
        return obj.created_by == request.user
