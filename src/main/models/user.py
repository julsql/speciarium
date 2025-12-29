from django.contrib.auth.base_user import BaseUserManager
from django.contrib.auth.models import AbstractUser

from main.models.map_tiles import MapTiles
from main.models.theme import Theme

from django.db import models


class AppUserManager(BaseUserManager):
    use_in_migrations = True

    def create_user(self, username, email=None, password=None, **extra_fields):
        if not email:
            raise ValueError("L'adresse email doit être définie")
        email = self.normalize_email(email)

        # Valeurs par défaut si non fournies
        if 'map_tiles' not in extra_fields or extra_fields['map_tiles'] is None:
            extra_fields['map_tiles'] = MapTiles.objects.get(name="default")
        if 'theme' not in extra_fields or extra_fields['theme'] is None:
            extra_fields['theme'] = Theme.objects.get(name="default")

        user = self.model(username=username, email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, username, email=None, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Le superuser doit avoir is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Le superuser doit avoir is_superuser=True.')

        # Valeurs par défaut si non fournies
        if 'map_tiles' not in extra_fields or extra_fields['map_tiles'] is None:
            extra_fields['map_tiles'] = MapTiles.objects.get(name="default")
        if 'theme' not in extra_fields or extra_fields['theme'] is None:
            extra_fields['theme'] = Theme.objects.get(name="default")

        return self.create_user(username, email, password, **extra_fields)


class AppUser(AbstractUser):
    email = models.EmailField(max_length=254, unique=True)

    map_tiles = models.ForeignKey(
        MapTiles,
        on_delete=models.PROTECT,
        related_name="users",
        null=True,
        blank=True,
    )
    theme = models.ForeignKey(
        Theme,
        on_delete=models.PROTECT,
        related_name="users",
        null=True,
        blank=True,
    )
    current_collection = models.ForeignKey(
        'main.Collection',
        on_delete=models.PROTECT,
        related_name='current_users',
        null=True,
        blank=True,
    )

    objects = AppUserManager()
    REQUIRED_FIELDS = ['email']
