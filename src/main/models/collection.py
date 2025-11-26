from django.conf import settings
from django.db import models

from main.models import AppUser


class Collection(models.Model):
    title = models.CharField(max_length=100)
    accounts = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name="collections"
    )
    owner = models.ForeignKey(AppUser, null=True, on_delete=models.CASCADE, related_name="collections_owned")

    def __str__(self) -> str:
        return self.title
