from django.db import models


class Theme(models.Model):
    name = models.CharField(max_length=50, unique=True)
    description = models.CharField(max_length=500)

    def __str__(self):
        return self.name
