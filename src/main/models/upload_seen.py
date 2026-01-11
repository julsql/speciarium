from django.db import models
from main.models import AppUser

class UploadSeen(models.Model):
    upload = models.ForeignKey("UploadAction", on_delete=models.CASCADE)
    user = models.ForeignKey(AppUser, on_delete=models.CASCADE)
    seen_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("upload", "user")
        indexes = [
            models.Index(fields=["user", "seen_at"]),
        ]
