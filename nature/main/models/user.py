from django.contrib.auth.models import AbstractUser
from django.db import models

from main.models.map_tiles import MapTiles


class AppUser(AbstractUser):
    email = models.EmailField(max_length=254, unique=True)
    map_tiles = models.ForeignKey(MapTiles,
                                  on_delete=models.PROTECT,
                                  related_name="users")
    current_collection = models.ForeignKey(
        'main.Collection',
        on_delete=models.PROTECT,
        related_name='current_users'
    )
