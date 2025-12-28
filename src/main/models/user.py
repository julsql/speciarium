from django.contrib.auth.models import AbstractUser

from main.models.map_tiles import MapTiles
from main.models.theme import Theme

from django.db import models


class AppUser(AbstractUser):
    email = models.EmailField(max_length=254, unique=True)
    map_tiles = models.ForeignKey(
        MapTiles,
        on_delete=models.PROTECT,
        related_name="users",
        null=True,
        blank=True
    )
    theme = models.ForeignKey(
        Theme,
        on_delete=models.PROTECT,
        related_name="users",
        null=True,
        blank=True
    )
    current_collection = models.ForeignKey(
        'main.Collection',
        on_delete=models.PROTECT,
        related_name='current_users',
        null=True,
        blank=True
    )
