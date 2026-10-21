from django.db import migrations, models

import main.models.user


class Migration(migrations.Migration):

    dependencies = [
        ('main', '0010_appuser_retrospective_share_token'),
    ]

    operations = [
        migrations.AlterField(
            model_name='appuser',
            name='retrospective_share_token',
            field=models.CharField(
                default=main.models.user.generate_share_token,
                editable=False,
                max_length=64,
                unique=True,
            ),
        ),
    ]
