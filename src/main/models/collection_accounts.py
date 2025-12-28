from django.conf import settings
from django.db import models

class CollectionAccounts(models.Model):
    collection = models.ForeignKey(
        "Collection",
        on_delete=models.CASCADE
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'main_collection_accounts'
        unique_together = ("collection", "user")

    def __str__(self):
        return f"{self.user} → {self.collection}"
