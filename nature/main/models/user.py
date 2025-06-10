from django.contrib.auth.models import AbstractUser
from django.db import models

class AppUser(AbstractUser):
    email = models.EmailField(max_length=254)
    current_collection = models.ForeignKey(
        'main.Collection',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='current_users'
    )
