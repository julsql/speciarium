from django.contrib.auth.models import AbstractUser
from django.db import models

from main.models.map_tiles import MapTiles


class AppUser(AbstractUser):
    email = models.EmailField(max_length=254)
    map_tiles = models.ForeignKey(MapTiles,
                                  null=True,
                                  blank=True,
                                  on_delete=models.CASCADE,
                                  related_name="users")
    current_collection = models.ForeignKey(
        'main.Collection',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='current_users'
    )
