from django.db import models

from main.models import AppUser
from main.models.collection import Collection


class UploadAction(models.Model):
    upload_id = models.UUIDField(primary_key=True)
    user = models.ForeignKey(AppUser, on_delete=models.CASCADE)
    collection = models.ForeignKey(Collection, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    images_uploaded = models.PositiveIntegerField(default=0)
    images_deleted = models.PositiveIntegerField(default=0)
