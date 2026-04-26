from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('main', '0008_appuser_is_demo'),
    ]

    operations = [
        migrations.AddField(
            model_name='uploadaction',
            name='images_changed',
            field=models.PositiveIntegerField(default=0),
        ),
    ]
